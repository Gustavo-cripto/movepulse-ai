#!/usr/bin/env python3
"""
gerar — manda os moldes ao ComfyUI e guarda as figuras geradas.

O ComfyUI corre na máquina do Gustavo (Mac mini, 48 GB). Este script não
gera nada sozinho: envia cada molde pela API, espera, e arruma o resultado.

    1. moldes.swift  →  ferramentas/figuras/moldes-png/<slug>/frame-N.png
    2. este script   →  ferramentas/figuras/saida/<slug>/frame-N.png
    3. revisao.html  →  aprovar ou rejeitar, um a um

Dá para interromper e recomeçar: o que já está feito é saltado.

    python3 gerar.py                      # tudo o que falta
    python3 gerar.py --so squat leg-press # só estes
    python3 gerar.py --refazer            # mesmo o que já existe
    python3 gerar.py --rejeitados         # só os que chumbaram na revisão
"""

import argparse
import json
import pathlib
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

AQUI = pathlib.Path(__file__).resolve().parent
MOLDES = AQUI / "moldes-png"
SAIDA = AQUI / "saida"
CATALOGO = AQUI / "exercicios.json"
FLUXO = AQUI / "fluxo.json"
CHUMBADOS = AQUI / "rejeitados.json"

SERVIDOR = "http://127.0.0.1:8188"
CLIENTE = str(uuid.uuid4())


# ---------------------------------------------------------------- API

def _pedir(caminho, dados=None, binario=False, tipo=None):
    url = SERVIDOR + caminho
    pedido = urllib.request.Request(url, data=dados)
    if tipo:
        pedido.add_header("Content-Type", tipo)
    with urllib.request.urlopen(pedido, timeout=600) as r:
        return r.read() if binario else json.loads(r.read())


def servidor_de_pe():
    try:
        _pedir("/system_stats")
        return True
    except Exception:
        return False


def enviar_molde(ficheiro: pathlib.Path) -> str:
    """Carrega o molde para o ComfyUI e devolve o nome com que lá ficou."""
    fronteira = "----molde" + uuid.uuid4().hex
    nome = ficheiro.name
    corpo = b"".join([
        f"--{fronteira}\r\n".encode(),
        f'Content-Disposition: form-data; name="image"; filename="{nome}"\r\n'.encode(),
        b"Content-Type: image/png\r\n\r\n",
        ficheiro.read_bytes(),
        f"\r\n--{fronteira}\r\n".encode(),
        b'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n',
        f"--{fronteira}--\r\n".encode(),
    ])
    resposta = _pedir("/upload/image", corpo,
                      tipo=f"multipart/form-data; boundary={fronteira}")
    pasta = resposta.get("subfolder") or ""
    return f"{pasta}/{resposta['name']}" if pasta else resposta["name"]


def encomendar(fluxo: dict) -> str:
    dados = json.dumps({"prompt": fluxo, "client_id": CLIENTE}).encode()
    return _pedir("/prompt", dados, tipo="application/json")["prompt_id"]


def esperar(encomenda: str, limite=600):
    """Espera que a encomenda acabe e devolve as imagens produzidas."""
    fim = time.time() + limite
    while time.time() < fim:
        historico = _pedir(f"/history/{encomenda}")
        if encomenda in historico:
            saidas = historico[encomenda].get("outputs", {})
            imagens = [img for no in saidas.values() for img in no.get("images", [])]
            if imagens:
                return imagens
            raise RuntimeError("a encomenda acabou sem imagens")
        time.sleep(1.5)
    raise TimeoutError("o ComfyUI demorou demais")


def descarregar(imagem) -> bytes:
    query = urllib.parse.urlencode({
        "filename": imagem["filename"],
        "subfolder": imagem.get("subfolder", ""),
        "type": imagem.get("type", "output"),
    })
    return _pedir(f"/view?{query}", binario=True)


# ---------------------------------------------------------------- fluxo

def texto_do_exercicio(ex: dict) -> str:
    """O que pedimos à IA para este exercício."""
    return (
        f"anatomical 3D render of a muscular human figure performing "
        f"{ex['nome_en']}, {ex['musculo']} highlighted in bright red, "
        f"all other muscles plain grey, visible muscle fibre detail, "
        f"featureless head without face, black shorts, white training shoes, "
        f"pure white background, even studio lighting, medical illustration "
        f"style, full body in frame, centred"
    )


NEGATIVO = (
    "photo, photograph, realistic skin, face, facial features, hair, text, "
    "watermark, logo, extra limbs, deformed hands, blurry, low quality, "
    "cropped, multiple people, colourful clothing, gym background, shadows"
)


def montar_fluxo(modelo: dict, molde: str, ex: dict, semente: int) -> dict:
    """Pega no fluxo guardado e enche os buracos deste exercício."""
    fluxo = json.loads(json.dumps(modelo))          # cópia
    for no in fluxo.values():
        entradas = no.get("inputs", {})
        for chave, valor in list(entradas.items()):
            if not isinstance(valor, str):
                continue
            if valor == "%MOLDE%":
                entradas[chave] = molde
            elif valor == "%TEXTO%":
                entradas[chave] = texto_do_exercicio(ex)
            elif valor == "%NEGATIVO%":
                entradas[chave] = NEGATIVO
            elif valor == "%SEMENTE%":
                entradas[chave] = semente
    return fluxo


# ---------------------------------------------------------------- correr

def main():
    global SERVIDOR

    ap = argparse.ArgumentParser()
    ap.add_argument("--so", nargs="*", help="só estes exercícios (slug)")
    ap.add_argument("--refazer", action="store_true", help="refaz o que já existe")
    ap.add_argument("--rejeitados", action="store_true",
                    help="só os que chumbaram na revisão")
    ap.add_argument("--servidor", default=SERVIDOR)
    args = ap.parse_args()

    SERVIDOR = args.servidor.rstrip("/")

    if not FLUXO.exists():
        sys.exit(f"falta o fluxo de trabalho: {FLUXO}\n"
                 "Exporta-o do ComfyUI em 'Save (API format)' e guarda-o aí.")
    if not servidor_de_pe():
        sys.exit(f"não encontrei o ComfyUI em {SERVIDOR}. Está a correr?")

    catalogo = json.loads(CATALOGO.read_text())
    modelo = json.loads(FLUXO.read_text())

    alvos = sorted(catalogo)
    if args.so:
        alvos = [s for s in alvos if s in set(args.so)]
    if args.rejeitados:
        maus = set(json.loads(CHUMBADOS.read_text())) if CHUMBADOS.exists() else set()
        alvos = [s for s in alvos if s in maus]

    tarefas = []
    for slug in alvos:
        for molde in sorted((MOLDES / slug).glob("frame-*.png")):
            destino = SAIDA / slug / molde.name
            if destino.exists() and not (args.refazer or args.rejeitados):
                continue
            tarefas.append((slug, molde, destino))

    if not tarefas:
        print("nada a fazer — está tudo gerado.")
        return

    print(f"{len(tarefas)} imagens por gerar, em {len(set(t[0] for t in tarefas))} exercícios")
    arranque = time.time()
    falhas = []

    for n, (slug, molde, destino) in enumerate(tarefas, 1):
        try:
            nome_remoto = enviar_molde(molde)
            fluxo = montar_fluxo(modelo, nome_remoto, catalogo[slug],
                                 random.randint(1, 2**31 - 1))
            imagens = esperar(encomendar(fluxo))
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(descarregar(imagens[0]))
        except Exception as erro:
            falhas.append((slug, molde.name, str(erro)))
            print(f"  ✗ {slug}/{molde.name}: {erro}")
            continue

        decorrido = time.time() - arranque
        falta = decorrido / n * (len(tarefas) - n)
        print(f"[{n}/{len(tarefas)}] {slug}/{molde.name}"
              f"   {decorrido/n:.0f}s cada · faltam {falta/60:.0f} min")

    print(f"\nfeitas {len(tarefas) - len(falhas)}, falharam {len(falhas)}")
    for f in falhas:
        print("  ", f)


if __name__ == "__main__":
    main()

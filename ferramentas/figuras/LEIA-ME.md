# Gerar as figuras dos exercícios no Mac mini

Ferramentas para criar as nossas próprias figuras anatómicas — o boneco a fazer
o exercício, com o músculo trabalhado aceso — com um modelo de IA a correr
localmente. Nada disto corre em servidores de terceiros nem custa por imagem.

## Como funciona

Os desenhos a traço que a app usa hoje entram como **molde**, não como
resultado. O ControlNet usa a forma do molde para garantir que a pose e o
aparelho saem certos; o modelo trata só do estilo. Sem molde, um "leg press"
sai com uma máquina inventada.

```
exercicios/<slug>/frame-N.svg        desenhos a traço (CC BY-SA)
          ↓  moldes.swift
moldes-png/<slug>/frame-N.png        traço preto sobre branco, recortado, 1024²
          ↓  gerar.py  →  ComfyUI
saida/<slug>/frame-N.png             a figura nova
          ↓  revisao.html
rejeitados.json                      o que chumbou, para voltar a gerar
```

## 1. Preparar os moldes

Já estão feitos (906 desenhos, 302 exercícios). Para refazer:

```bash
swiftc -O -o ferramentas/figuras/moldes ferramentas/figuras/moldes.swift
./ferramentas/figuras/moldes exercicios ferramentas/figuras/moldes-png 1024
```

Usa o WebKit do próprio macOS — não é preciso instalar rasterizadores.
Desenha sobre branco, inverte (o nosso traço é branco) e recorta à volta da
figura com 7% de margem, para o modelo receber pixéis úteis em vez de fundo.

## 2. Instalar o ComfyUI e os modelos

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py                     # abre em http://127.0.0.1:8188
```

**Modelos a descarregar** (todos com licença que permite uso comercial):

| Ficheiro | Para onde | Licença |
|---|---|---|
| SDXL base 1.0 | `models/checkpoints/` | OpenRAIL++ |
| ControlNet SDXL — lineart ou canny | `models/controlnet/` | ver no repositório de origem |

Evita o **FLUX.1 dev**: a licença é só não-comercial. O FLUX.1 *schnell*
(Apache 2.0) e o Qwen-Image (Apache 2.0) servem.

## 3. Exportar o fluxo de trabalho

No ComfyUI monta o fluxo — carregar imagem → ControlNet → KSampler → guardar —
e exporta em **Save (API format)** para `ferramentas/figuras/fluxo.json`.

O `gerar.py` substitui estes marcadores no fluxo, por isso põe-nos nos campos
certos antes de exportar:

| Marcador | Onde vai |
|---|---|
| `%MOLDE%` | nome do ficheiro no nó *Load Image* |
| `%TEXTO%` | o pedido positivo (CLIP Text Encode) |
| `%NEGATIVO%` | o pedido negativo |
| `%SEMENTE%` | a semente do KSampler |

O texto de cada exercício é montado em `texto_do_exercicio()` a partir do
`exercicios.json` — nome em inglês e o músculo a acender.

## 4. Gerar

```bash
python3 ferramentas/figuras/gerar.py --so squat bench-press   # provar primeiro
python3 ferramentas/figuras/gerar.py                          # tudo o que falta
python3 ferramentas/figuras/gerar.py --rejeitados             # repetir os maus
```

Pode interromper-se e recomeçar: o que já existe é saltado. Conta 20–40
segundos por imagem num M4 Pro, o que dá umas 10 horas para as 906 à primeira
passagem.

## 5. Rever

Com o servidor local a correr, abre
`http://localhost:8765/ferramentas/figuras/revisao.html`.

Molde à esquerda, figura gerada à direita. `A` aprova, `R` rejeita, setas
navegam, `P` salta para a primeira por ver. As decisões ficam guardadas no
navegador. No fim, **Guardar rejeitados.json** na pasta `ferramentas/figuras/`
e volta ao passo 4 com `--rejeitados`.

## O que vigiar

- **O músculo aceso** é a parte menos fiável. O modelo pinta a mancha onde
  *acha* que fica o músculo. Numa app de treino uma figura bonita que aponta o
  músculo errado é pior do que um desenho a traço honesto — por isso é que a
  revisão é uma a uma.
- **Mãos e barras** saem torcidas de vez em quando, mesmo com ControlNet.
- **Consistência**: todas as imagens têm de parecer o mesmo boneco. Se
  derrapar, a saída é treinar um LoRA do personagem a partir de 15–20 imagens
  aprovadas e voltar a gerar com ele.

## Licenças

Os moldes derivam dos desenhos do [Workout Guide](https://github.com/bryllim/workout-guide)
/ [Everkinetic](https://github.com/everkinetic/data), sob **CC BY-SA 4.0**. As
figuras geradas a partir deles são obra derivada e herdam a mesma licença —
o que é bom: continuam a poder viver num repositório público, ao contrário de
arte comprada, que obrigaria a tornar o repositório privado.

Se um dia se gerar sem molde nenhum (só texto), essa herança deixa de existir
— mas aí a pose e o equipamento passam a ser responsabilidade do modelo.

As pastas `moldes-png/` e `saida/` ficam fora do git: são muitos megabytes de
ficheiros que se voltam a gerar a partir do que está versionado.

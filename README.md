# Forja — app de treinos com plano gerado por IA

App de treinos em **HTML + CSS + JavaScript puro**: sem build, sem dependências, sem framework.
Funciona offline e instala-se como aplicação no **Android, iPhone/iPad e Mac**.

## O que faz

- **Plano IA** — fotografas as máquinas disponíveis no ginásio, indicas objetivo, experiência, dias
  por semana, tempo por sessão e lesões; a IA identifica o equipamento visível e devolve um plano
  que só usa esse equipamento. Um toque adiciona os treinos às tuas fichas.
- **Hoje** — inicia o treino a partir de uma ficha (ou livre), cronómetro, registo de séries
  (reps × carga), temporizador de descanso com aviso sonoro e volume calculado ao vivo. Se fechares
  o navegador a meio, o treino continua de onde ficou.
- **Fichas** — cria e edita fichas com exercícios, séries e repetições alvo.
- **Exercícios** — catálogo com 52 exercícios (procura + filtro por grupo muscular), exercícios
  próprios e histórico de cada um (melhor carga, 1RM estimado, últimos registos).
- **Progresso** — total de treinos, volume, tempo, gráfico de evolução por exercício (1RM estimado
  pela fórmula de Epley) e histórico completo, com opção de repetir um treino.
- **Backup** — exportar/importar tudo em `.json` (⚙️).

## Instalar nos dispositivos

É uma **PWA**: instala-se a partir do navegador, sem passar pela App Store nem pela Play Store.
Para isso tem de estar publicada em HTTPS (Netlify, Vercel, GitHub Pages — sobe a pasta, não há
build).

- **Android (Chrome):** botão "Instalar" no topo da app, ou menu ⋮ → *Instalar aplicação*.
- **iPhone/iPad (Safari):** Partilhar → *Adicionar ao ecrã principal*.
- **Mac (Chrome/Edge):** ícone de instalar na barra de endereço. Safari: *Ficheiro → Adicionar à Dock*.

Depois de instalada abre em ecrã inteiro, sem barra do navegador, e funciona sem internet (a
geração de planos, essa, precisa de ligação).

## Ligar a IA

A app fala com a API da Anthropic (`claude-opus-5`, com visão) de duas formas — escolhe em
**⚙️ → Plano com IA**:

1. **Pelo meu servidor (recomendado).** A chave fica no servidor e nunca dentro da app. Está tudo
   pronto em [`servidor/`](servidor/README.md) — um Cloudflare Worker que se publica em minutos.
2. **Direto, com a minha chave.** A chave fica guardada só neste dispositivo (localStorage). Serve
   para uso pessoal. **Não uses este modo numa app partilhada com clientes:** quem abrir a app
   consegue ler a chave e gastar a tua conta.

O custo é por utilização, na tua conta Anthropic: um plano com 4-6 fotos costuma ficar em cêntimos.

## Como correr localmente

Abrir o `index.html` no navegador chega para usar. Para o modo aplicação/offline (service worker) é
preciso servir por HTTP:

```bash
cd "/Volumes/Disco IA Privada/Projects/Site fitness" && npx serve -l 4173
```

## Estrutura

```
index.html              ecrãs e navegação
css/style.css           tema escuro, pensado primeiro para telemóvel
js/data.js              catálogo de exercícios + fichas de exemplo
js/store.js             estado e persistência (localStorage)
js/ia.js                fotos, pedido à API e importação do plano
js/ui.js                DOM, modal, avisos, gráfico SVG
js/app.js               controlador dos ecrãs
sw.js                   service worker (cache offline)
manifest.webmanifest    metadados da PWA
icons/                  ícones da app
servidor/               Cloudflare Worker que guarda a chave da API
```

## Dados e privacidade

Fichas, histórico e definições ficam em `localStorage`, **só no dispositivo** — não há servidor de
dados nem sincronização entre telemóvel e Mac (usa exportar/importar em ⚙️ para passar de um para o
outro). As fotos do ginásio ficam apenas em memória durante a sessão: não são guardadas, e só saem
do dispositivo no momento em que carregas em "Gerar plano". Limpar os dados do site apaga o
histórico — faz backup antes.

Sempre que alterares ficheiros da app, sobe a versão da cache em `sw.js`
(`const CACHE = 'forja-vN'`) para os dispositivos já instalados receberem a atualização.

## Aviso

Os planos são gerados por IA a partir de fotografias e do perfil indicado. São orientação geral de
treino, não substituem avaliação médica nem o acompanhamento de um profissional.

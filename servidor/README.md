# Servidor da IA

Existe para uma razão só: **a chave da API não pode ficar dentro da app**. Qualquer pessoa que
instale a app consegue ler tudo o que lá está — se a chave estivesse no telemóvel, estaria à vista
e podia ser usada por terceiros à tua custa.

Este Worker fica entre a app e a API: recebe o pedido da app, junta-lhe a chave (que só ele
conhece) e devolve a resposta.

## Publicar (gratuito, ~3 minutos)

```bash
npm install -g wrangler
```

```bash
cd "/Volumes/Disco IA Privada/Projects/Site fitness/servidor" && wrangler login && wrangler deploy
```

```bash
cd "/Volumes/Disco IA Privada/Projects/Site fitness/servidor" && wrangler secret put ANTHROPIC_API_KEY
```

No fim, o `wrangler deploy` mostra um endereço tipo `https://forja-ia.SEU-NOME.workers.dev`.
Põe esse endereço na app em **⚙️ → Plano com IA → Endereço do servidor**.

Depois de publicares a app, muda `ORIGEM_PERMITIDA` no `wrangler.toml` para o endereço dela e
volta a fazer `wrangler deploy` — assim só a tua app pode usar o servidor.

## Proteções já incluídas

- Só aceita o modelo `claude-opus-5` e no máximo 8 imagens por pedido.
- Rejeita pedidos com ferramentas ou blocos de conteúdo que a app não usa.
- Limita o tamanho do pedido a 12 MB.
- CORS restrito à origem que definires.

Se o Cloudflare não te servir, o mesmo ficheiro adapta-se em minutos a uma função da Vercel ou da
Netlify — a lógica é a mesma: receber, validar, acrescentar a chave, reenviar.

## Chave da API

Cria-a em <https://console.anthropic.com> → API Keys. O custo é por utilização: cada plano gerado
com 4-6 fotos custa tipicamente alguns cêntimos.

/* ============================================================
   Servidor mínimo para a app MovePulse AI (Cloudflare Worker).

   Guarda a chave da API do lado do servidor, para que ela nunca
   fique dentro da app instalada nos telemóveis.

   Publicar:
     npm install -g wrangler
     wrangler login
     wrangler deploy
     wrangler secret put ANTHROPIC_API_KEY

   Depois põe o endereço (…workers.dev/plano) em ⚙️ → Plano com IA.
   ============================================================ */

const MODELOS_PERMITIDOS = new Set(['claude-opus-5']);
const MAX_TOKENS = 16000;
const MAX_IMAGENS = 8;
const MAX_CORPO = 12 * 1024 * 1024;   // 12 MB

export default {
  async fetch(pedido, env) {
    const origem = env.ORIGEM_PERMITIDA || '*';

    if (pedido.method === 'OPTIONS') return new Response(null, { headers: cors(origem) });
    if (pedido.method !== 'POST') return erro(405, 'Usa POST.', origem);

    const tamanho = Number(pedido.headers.get('content-length') || 0);
    if (tamanho > MAX_CORPO) return erro(413, 'Pedido demasiado grande.', origem);

    let corpo;
    try {
      corpo = await pedido.json();
    } catch {
      return erro(400, 'JSON inválido.', origem);
    }

    const problema = validar(corpo);
    if (problema) return erro(400, problema, origem);

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(corpo),
    });

    return new Response(resposta.body, {
      status: resposta.status,
      headers: { ...cors(origem), 'content-type': 'application/json' },
    });
  },
};

/* Aceita apenas o formato que a app envia — impede que a chave
   seja usada para outra coisa qualquer por quem descubra o endereço. */
function validar(corpo) {
  if (!corpo || typeof corpo !== 'object') return 'Corpo inválido.';
  if (!MODELOS_PERMITIDOS.has(corpo.model)) return 'Modelo não permitido.';
  if (!Number.isInteger(corpo.max_tokens) || corpo.max_tokens > MAX_TOKENS) return 'max_tokens inválido.';
  if (!Array.isArray(corpo.messages) || corpo.messages.length !== 1) return 'messages inválido.';

  const conteudo = corpo.messages[0].content;
  if (!Array.isArray(conteudo)) return 'Conteúdo inválido.';
  const imagens = conteudo.filter(b => b.type === 'image').length;
  if (imagens > MAX_IMAGENS) return `Máximo de ${MAX_IMAGENS} imagens.`;
  if (conteudo.some(b => b.type !== 'image' && b.type !== 'text')) return 'Tipo de bloco não permitido.';
  if (corpo.tools) return 'Ferramentas não são permitidas.';

  return null;
}

function cors(origem) {
  return {
    'access-control-allow-origin': origem,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function erro(estado, mensagem, origem) {
  return new Response(JSON.stringify({ error: { message: mensagem } }), {
    status: estado,
    headers: { ...cors(origem), 'content-type': 'application/json' },
  });
}

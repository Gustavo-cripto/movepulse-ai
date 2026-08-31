/* ============================================================
   Servidor da app MovePulse AI (Cloudflare Worker).

   Guarda a chave da API do lado do servidor, para que ela nunca
   fique dentro da app instalada nos telemóveis.

   Fala com dois fornecedores, escolhidos pela variável PROVEDOR:
   - "anthropic" : Claude (visão + JSON estruturado nativo)
   - "nvidia"    : catálogo NIM (OpenAI-compatível), plano gratuito

   A app envia sempre no formato da Anthropic; quando o provedor é
   a NVIDIA, é este ficheiro que traduz o pedido e a resposta.

   Publicar:
     wrangler deploy
     wrangler secret put ANTHROPIC_API_KEY   (se usares Claude)
     wrangler secret put NVIDIA_API_KEY      (se usares NVIDIA)
   ============================================================ */

const MAX_TOKENS = 16000;
const MAX_IMAGENS = 8;
const MAX_CORPO = 12 * 1024 * 1024;   // 12 MB

const ANTHROPIC = {
  url: 'https://api.anthropic.com/v1/messages',
  modelos: new Set(['claude-opus-5']),
};

const NVIDIA = {
  url: 'https://integrate.api.nvidia.com/v1/chat/completions',
  listaModelos: 'https://integrate.api.nvidia.com/v1/models',
  modeloPadrao: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',   // etapa 1: ler fotos
  modeloTexto: 'nvidia/nemotron-3-super-120b-a12b',                // etapa 2: escrever o plano
  maxImagens: 5,                      // limite por omissão dos NIM de visão
};

export default {
  async fetch(pedido, env) {
    const origem = env.ORIGEM_PERMITIDA || '*';
    const url = new URL(pedido.url);

    if (pedido.method === 'OPTIONS') return new Response(null, { headers: cors(origem) });

    // Diagnóstico: que provedor está ativo e que modelos existem.
    if (pedido.method === 'GET') {
      if (url.pathname === '/modelos') return listarModelos(env, origem);
      return json({ provedor: provedor(env), modelo: modeloAtivo(env) }, 200, origem);
    }

    if (pedido.method !== 'POST') return erro(405, 'Usa POST.', origem);
    if (Number(pedido.headers.get('content-length') || 0) > MAX_CORPO)
      return erro(413, 'Pedido demasiado grande.', origem);

    let corpo;
    try { corpo = await pedido.json(); }
    catch { return erro(400, 'JSON inválido.', origem); }

    const problema = validar(corpo);
    if (problema) return erro(400, problema, origem);

    return provedor(env) === 'nvidia'
      ? viaNvidia(corpo, env, origem, url.searchParams.get('diagnostico') === '1')
      : viaAnthropic(corpo, env, origem);
  },
};

const provedor = env => (env.PROVEDOR || 'anthropic').toLowerCase();
const modeloAtivo = env => provedor(env) === 'nvidia'
  ? { visao: env.MODELO_NVIDIA || NVIDIA.modeloPadrao, texto: env.MODELO_TEXTO || NVIDIA.modeloTexto }
  : { visao:'claude-opus-5', texto:'claude-opus-5' };

/* ---------- Claude ---------- */
async function viaAnthropic(corpo, env, origem){
  if (!env.ANTHROPIC_API_KEY) return erro(500, 'Falta configurar ANTHROPIC_API_KEY no servidor.', origem);
  if (!ANTHROPIC.modelos.has(corpo.model)) return erro(400, 'Modelo não permitido.', origem);

  const r = await fetch(ANTHROPIC.url, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version':'2023-06-01',
    },
    body: JSON.stringify(corpo),
  });
  return new Response(r.body, {
    status: r.status,
    headers: { ...cors(origem), 'content-type':'application/json' },
  });
}

/* ---------- NVIDIA (OpenAI-compatível) ----------
   Em duas etapas, porque os modelos de visão do catálogo são lentos
   e alguns só aceitam uma imagem por pedido:
   1. cada foto é analisada em paralelo por um modelo de visão (saída curta);
   2. um modelo de texto recebe a lista de equipamento e escreve o plano.
   ------------------------------------------------ */
async function viaNvidia(corpo, env, origem, diagnostico = false){
  if (!env.NVIDIA_API_KEY) return erro(500, 'Falta configurar NVIDIA_API_KEY no servidor.', origem);

  const blocos = corpo.messages[0].content;
  const fotos = blocos.filter(b => b.type === 'image').slice(0, NVIDIA.maxImagens);
  const perfil = blocos.filter(b => b.type === 'text').map(b => b.text).join('\n');
  const esquema = corpo.output_config?.format?.schema;

  if (!fotos.length) return erro(400, 'Nenhuma fotografia recebida.', origem);

  // --- etapa 1: ler as fotos (em paralelo) ---
  // Os modelos pequenos falham fotos ao acaso: se uma não der nada, tenta outra vez.
  const leituras = await Promise.all(fotos.map(async (f, i) => {
    const primeira = await lerFoto(f, i, env);
    if (primeira.equipamentos.length) return primeira;
    return lerFoto(f, i, env);
  }));
  const equipamentos = juntarEquipamentos(leituras);

  if (diagnostico) return json({ fotos: fotos.length, leituras, equipamentos }, 200, origem);

  if (!equipamentos.length){
    return erro(502, 'Não consegui identificar equipamento nas fotos. Tenta fotos mais próximas e com a chapa do nome visível.', origem);
  }

  // --- etapa 2: escrever o plano ---
  const sistema = `${corpo.system || ''}

As fotografias do ginásio JÁ FORAM analisadas por ti noutra etapa. Este é o resultado dessa
análise — é com esta lista que trabalhas. Não peças imagens nem digas que não as recebeste:

${equipamentos.map(e => `- ${e.nome} (${e.grupo}, confiança ${e.confianca})`).join('\n')}

Usa apenas este equipamento e peso corporal. Repete a lista no campo "equipamentos" da resposta.

Escreve em português de Portugal. Nunca uses espanhol nem português do Brasil: diz "gémeos" (não
"panturrilha"), "elevação da anca" (não "elevação de pélvis"), "chão" (não "suelo"), "prancha"
(não "pranca"), "agachamento" e "flexões".
Responde APENAS com um objeto JSON válido, sem texto à volta e sem blocos de código, que obedeça
exatamente a este JSON Schema:
${JSON.stringify(esquema)}`;

  const resposta = await chamarNvidia(env, {
    model: env.MODELO_TEXTO || NVIDIA.modeloTexto,
    max_tokens: 4000,
    temperature: 0.3,
    messages: [
      { role:'system', content: sistema },
      { role:'user', content: perfil },
    ],
  });

  if (resposta.erro) return erro(resposta.estado || 502, resposta.erro, origem);

  const limpo = extrairJson(resposta.texto);
  if (!limpo) return erro(502, 'O modelo não devolveu JSON utilizável. Tenta outra vez ou muda MODELO_TEXTO.', origem);

  return json({ content:[{ type:'text', text: limpo }], stop_reason:'end_turn' }, 200, origem);
}

/** Etapa 1: uma fotografia -> lista curta de equipamento. */
async function lerFoto(foto, indice, env){
  const r = await chamarNvidia(env, {
    model: env.MODELO_NVIDIA || NVIDIA.modeloPadrao,
    max_tokens: 700,
    temperature: 0,
    messages: [
      { role:'system', content:
        'Identificas equipamento de ginásio em fotografias. Lê o texto das chapas e etiquetas das ' +
        'máquinas, que costuma dizer o nome. Não inventes: se não distingues, marca confiança "baixa". ' +
        'Responde APENAS com JSON: {"equipamentos":[{"nome":"","grupo":"","confianca":"alta|media|baixa"}]} ' +
        'com o grupo muscular em português (Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Abdómen, Cardio).' },
      { role:'user', content:[
        { type:'text', text:`Que equipamento de ginásio aparece nesta fotografia (${indice + 1})?` },
        { type:'image_url', image_url:{ url:`data:${foto.source.media_type};base64,${foto.source.data}` } },
      ]},
    ],
  });
  if (r.erro) return { erro: r.erro, equipamentos: [] };
  const limpo = extrairJson(r.texto);
  if (!limpo) return { bruto: String(r.texto).slice(0, 400), equipamentos: [] };
  try {
    return { equipamentos: JSON.parse(limpo).equipamentos || [] };
  } catch {
    return { bruto: String(r.texto).slice(0, 400), equipamentos: [] };
  }
}

/** Junta as leituras das várias fotos, sem repetir equipamento. */
function juntarEquipamentos(leituras){
  const vistos = new Map();
  for (const leitura of leituras){
    for (const e of (leitura.equipamentos || [])){
      if (!e || !e.nome) continue;
      const chave = String(e.nome).toLowerCase().trim();
      if (!vistos.has(chave)) vistos.set(chave, {
        nome: e.nome,
        grupo: e.grupo || 'Pernas',
        confianca: e.confianca || 'media',
      });
    }
  }
  return [...vistos.values()];
}

/** Uma chamada ao catálogo da NVIDIA, com tempo-limite próprio. */
async function chamarNvidia(env, pedido){
  let r;
  try {
    r = await fetch(NVIDIA.url, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'authorization':`Bearer ${env.NVIDIA_API_KEY}`,
        'accept':'application/json',
      },
      body: JSON.stringify(pedido),
      signal: AbortSignal.timeout(110000),
    });
  } catch {
    return { erro:'O fornecedor demorou demasiado a responder.', estado:504 };
  }

  const bruto = await r.text();
  if (!r.ok) return { erro:`NVIDIA: ${bruto.slice(0, 200)}`, estado: r.status };
  try {
    const texto = JSON.parse(bruto).choices?.[0]?.message?.content;
    return texto ? { texto } : { erro:'O modelo respondeu vazio.', estado:502 };
  } catch {
    return { erro:'Resposta ilegível do fornecedor.', estado:502 };
  }
}

/** Tira cercas de código e texto à volta, devolvendo só o objeto JSON. */
function extrairJson(texto){
  const semCercas = String(texto).replace(/```(?:json)?/gi, '').trim();
  const inicio = semCercas.indexOf('{');
  const fim = semCercas.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return null;
  const candidato = semCercas.slice(inicio, fim + 1);
  try { JSON.parse(candidato); return candidato; } catch { return null; }
}

async function listarModelos(env, origem){
  if (provedor(env) !== 'nvidia') return json({ modelos:['claude-opus-5'] }, 200, origem);
  if (!env.NVIDIA_API_KEY) return erro(500, 'Falta configurar NVIDIA_API_KEY no servidor.', origem);
  const r = await fetch(NVIDIA.listaModelos, {
    headers:{ authorization:`Bearer ${env.NVIDIA_API_KEY}` },
  });
  const dados = await r.json().catch(() => ({}));
  const ids = (dados.data || []).map(m => m.id).sort();
  return json({ total: ids.length, modelos: ids }, r.status, origem);
}

/* Aceita apenas o formato que a app envia — impede que a chave
   seja usada para outra coisa qualquer por quem descubra o endereço. */
function validar(corpo) {
  if (!corpo || typeof corpo !== 'object') return 'Corpo inválido.';
  if (!Number.isInteger(corpo.max_tokens) || corpo.max_tokens > MAX_TOKENS) return 'max_tokens inválido.';
  if (!Array.isArray(corpo.messages) || corpo.messages.length !== 1) return 'messages inválido.';
  if (corpo.tools) return 'Ferramentas não são permitidas.';

  const conteudo = corpo.messages[0].content;
  if (!Array.isArray(conteudo)) return 'Conteúdo inválido.';
  if (conteudo.filter(b => b.type === 'image').length > MAX_IMAGENS) return `Máximo de ${MAX_IMAGENS} imagens.`;
  if (conteudo.some(b => b.type !== 'image' && b.type !== 'text')) return 'Tipo de bloco não permitido.';
  return null;
}

function cors(origem) {
  return {
    'access-control-allow-origin': origem,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function json(dados, estado, origem){
  return new Response(JSON.stringify(dados), {
    status: estado,
    headers: { ...cors(origem), 'content-type':'application/json' },
  });
}

function erro(estado, mensagem, origem) {
  return json({ error:{ message: mensagem } }, estado, origem);
}

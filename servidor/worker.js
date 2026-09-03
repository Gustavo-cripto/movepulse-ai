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
      if (url.pathname === '/modelos'){
        const testar = url.searchParams.get('testar');
        return testar ? testarModelo(env, testar, origem) : listarModelos(env, origem);
      }
      return json({ provedor: provedor(env), modelo: modeloAtivo(env) }, 200, origem);
    }

    if (pedido.method !== 'POST') return erro(405, 'Usa POST.', origem);
    if (Number(pedido.headers.get('content-length') || 0) > MAX_CORPO)
      return erro(413, 'Pedido demasiado grande.', origem);

    let corpo;
    try { corpo = await pedido.json(); }
    catch { return erro(400, 'JSON inválido.', origem); }

    if (corpo.tipo === 'conversa'){
      const problemaConversa = validarConversa(corpo);
      if (problemaConversa) return erro(400, problemaConversa, origem);
      return conversa(corpo, env, origem);
    }

    const problema = validar(corpo);
    if (problema) return erro(400, problema, origem);

    return provedor(env) === 'nvidia'
      ? viaNvidia(corpo, env, origem, url.searchParams.get('diagnostico') || '')
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
/** diagnostico: '1' mostra o que as fotos deram, '2' mostra o texto cru do plano. */
async function viaNvidia(corpo, env, origem, diagnostico = ''){
  if (!env.NVIDIA_API_KEY) return erro(500, 'Falta configurar NVIDIA_API_KEY no servidor.', origem);

  const blocos = corpo.messages[0].content;
  const fotos = blocos.filter(b => b.type === 'image').slice(0, NVIDIA.maxImagens);
  const perfil = blocos.filter(b => b.type === 'text').map(b => b.text).join('\n');
  const esquema = corpo.output_config?.format?.schema;

  // --- etapa 1: ler as fotos, quando existirem ---
  // Sem fotos o plano faz-se na mesma: a lista de equipamento vem no texto do pedido.
  let equipamentos = [];
  if (fotos.length){
    // Os modelos pequenos falham fotos ao acaso: se uma não der nada, tenta outra vez.
    const leituras = await Promise.all(fotos.map(async (f, i) => {
      const primeira = await lerFoto(f, i, env);
      if (primeira.equipamentos.length) return primeira;
      return lerFoto(f, i, env);
    }));
    equipamentos = juntarEquipamentos(leituras);

    if (diagnostico === '1') return json({ fotos: fotos.length, leituras, equipamentos }, 200, origem);

    if (!equipamentos.length){
      return erro(502, 'Não consegui identificar equipamento nas fotos. Tenta fotos mais próximas e com a chapa do nome visível.', origem);
    }
  }

  // --- etapa 2: escrever o plano ---
  const contexto = equipamentos.length
    ? `As fotografias do ginásio JÁ FORAM analisadas por ti noutra etapa. Este é o resultado dessa
análise — é com esta lista que trabalhas. Não peças imagens nem digas que não as recebeste:

${equipamentos.map(e => `- ${e.nome} (${e.grupo}, confiança ${e.confianca})`).join('\n')}`
    : `Não há fotografias neste pedido. O equipamento disponível vem indicado na mensagem do
utilizador. Trabalha com essa lista e não peças imagens.`;

  // O contexto vem primeiro e as regras da app depois: algumas dessas regras
  // falam de "ver nas fotos", e um modelo literal, sem fotos à frente, concluía
  // que não conseguia identificar nada e devolvia a resposta sem plano.
  const sistema = `A tua tarefa nesta etapa é ESCREVER O PLANO DE TREINO. Não analisas imagens:
${contexto}

Regras do cliente (as partes sobre observar fotografias já foram cumpridas na etapa anterior):
${corpo.system || ''}

Obrigatório, mesmo que a lista de equipamento seja curta ou vazia:
- Preenche "equipamentos" com a lista dada acima, tal como está.
- Escreve sempre o plano completo em "plano", com um treino para cada dia pedido.
- Nunca respondas que não conseguiste identificar equipamento: com pouco equipamento,
  completa o plano com exercícios de peso corporal.

Usa apenas este equipamento e peso corporal.

Escreve TUDO em português de Portugal, incluindo os nomes dos treinos e dos exercícios.
Nunca uses inglês: diz "corpo inteiro" (não "full body"), "levantamento terra" (não "deadlift"),
"peso morto romeno" (não "romanian deadlift"), "puxada na polia" (não "pulldown"), "supino"
(não "bench press"), "afundo" (não "lunge"), "prancha" (não "plank").
Nunca uses espanhol nem português do Brasil: diz "gémeos" (não "panturrilha"), "elevação da anca"
(não "elevação de pélvis"), "chão" (não "suelo"), "abdómen" (não "abdômen").
Responde APENAS com um objeto JSON válido, sem texto à volta e sem blocos de código, que obedeça
exatamente a este JSON Schema:
${JSON.stringify(esquema)}`;

  const pedidoTexto = {
    model: env.MODELO_TEXTO || NVIDIA.modeloTexto,
    max_tokens: 9000,
    temperature: 0.2,
    // Obriga a saída a seguir o esquema, e limita o raciocínio (sem isso os
    // nemotron gastam minutos a "pensar"). Vai primeiro a extensão da NVIDIA,
    // porque é a que os modelos deste catálogo respeitam: há modelos que
    // aceitam o response_format padrão e depois o ignoram em silêncio, e a
    // resposta vem sem o plano. Se algum recusar a extensão, o chamarNvidia
    // troca sozinho para o formato padrão.
    nvext: {
      max_thinking_tokens: 600,
      ...(esquema ? { guided_json: esquema } : {}),
    },
    messages: [
      { role:'system', content: sistema },
      { role:'user', content: perfil },
    ],
  };

  let resposta = await chamarNvidia(env, pedidoTexto);
  if (resposta.erro) return erro(resposta.estado || 502, resposta.erro, origem);

  // O que se exige da resposta vem do esquema do pedido, não de uma lista fixa:
  // há pedidos (só detetar equipamento) que não pedem plano nenhum.
  const chavesObrigatorias = Array.isArray(esquema?.required) ? esquema.required : [];
  let limpo = extrairJson(resposta.texto, chavesObrigatorias);

  // Uma segunda tentativa, mais insistente, antes de desistir.
  if (!limpo){
    resposta = await chamarNvidia(env, {
      ...pedidoTexto,
      temperature: 0,
      messages: [
        { role:'system', content: sistema },
        { role:'user', content: perfil },
        { role:'assistant', content: resposta.texto?.slice(0, 200) || '' },
        { role:'user', content: 'A resposta anterior não era JSON válido. Responde outra vez com ' +
          'APENAS o objeto JSON completo, sem raciocínio, sem comentários e sem blocos de código.' },
      ],
    });
    if (resposta.erro) return erro(resposta.estado || 502, resposta.erro, origem);
    limpo = extrairJson(resposta.texto, chavesObrigatorias);
  }

  if (diagnostico === '2') return json({ tamanho: String(resposta.texto).length,
    fim: String(resposta.texto).slice(-600), conseguiuJson: !!limpo }, 200, origem);

  if (!limpo){
    return erro(502, `O modelo não devolveu JSON utilizável. Início da resposta: ${
      String(resposta.texto).slice(0, 160)}`, origem);
  }

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

/**
 * Uma chamada ao catálogo da NVIDIA, com tempo-limite próprio.
 * Erros passageiros (429 e 5xx) merecem nova tentativa: acontecem, e
 * repassá-los ao utilizador como "serviço indisponível" é desistir cedo.
 */
async function chamarNvidia(env, pedido, tentativa = 0){
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
    if (tentativa < 2) return chamarNvidia(env, pedido, tentativa + 1);
    return { erro:'O fornecedor demorou demasiado a responder.', estado:504 };
  }

  if ((r.status === 429 || r.status >= 500) && tentativa < 2){
    await new Promise(ok => setTimeout(ok, 1200 * (tentativa + 1)));
    return chamarNvidia(env, pedido, tentativa + 1);
  }

  const bruto = await r.text();

  // Modelos antigos não conhecem "response_format" e os novos não conhecem
  // "nvext.guided_json". Ao primeiro 400 por causa disso, troca e repete.
  if (r.status === 400 && tentativa < 2){
    const alternativo = ajustarPedido(pedido, bruto);
    if (alternativo) return chamarNvidia(env, alternativo, tentativa + 1);
  }

  if (!r.ok) return { erro:`NVIDIA ${r.status}: ${bruto.slice(0, 200)}`, estado: r.status };
  try {
    const texto = JSON.parse(bruto).choices?.[0]?.message?.content;
    if (texto) return { texto };
    if (tentativa < 2) return chamarNvidia(env, pedido, tentativa + 1);
    return { erro:'O modelo respondeu vazio.', estado:502 };
  } catch {
    return { erro:'Resposta ilegível do fornecedor.', estado:502 };
  }
}

/** Adapta o pedido quando o modelo recusa um campo que lhe mandámos.
    Cada família de modelos aceita campos diferentes; em vez de manter uma
    lista por modelo, aprende-se com o próprio erro. */
function ajustarPedido(pedido, erroBruto){
  const m = String(erroBruto).toLowerCase();

  // Extensões da NVIDIA que este modelo não conhece: se são o motivo, tira-as.
  if (pedido.nvext && (m.includes('max_thinking_tokens') || m.includes('unknown field'))
      && !m.includes('guided_json')){
    const { nvext, ...resto } = pedido;
    return resto;
  }

  const recusaFormato = m.includes('response_format') || m.includes('guided_json') || m.includes('json_schema');
  if (!recusaFormato) return null;

  if (pedido.response_format?.json_schema?.schema){
    const { response_format, ...resto } = pedido;
    return { ...resto, nvext: { ...pedido.nvext, guided_json: response_format.json_schema.schema } };
  }
  if (pedido.nvext?.guided_json){
    const { guided_json, ...outros } = pedido.nvext;
    return { ...pedido,
      nvext: Object.keys(outros).length ? outros : undefined,
      response_format: {
        type:'json_schema',
        json_schema: { name:'plano_de_treino', strict:true, schema: guided_json },
      } };
  }
  return null;
}

/** Tira cercas de código e texto à volta, devolvendo só o objeto JSON. */
function extrairJson(texto, exigidas = []){
  const t = String(texto || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')   // raciocínio de alguns modelos
    .replace(/```(?:json)?/gi, '')
    .trim();

  // Estes modelos escrevem exemplos em JSON enquanto raciocinam, por isso o
  // primeiro bloco equilibrado não é necessariamente a resposta. Recolhem-se
  // todos os candidatos e fica o que traz as chaves que pedimos — em empate,
  // o mais completo.
  let melhor = null, melhorNota = -1;

  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)){
    let nivel = 0, emTexto = false, escapado = false;
    for (let j = i; j < t.length; j++){
      const c = t[j];
      if (escapado){ escapado = false; continue; }
      if (c === '\\'){ escapado = true; continue; }
      if (c === '"'){ emTexto = !emTexto; continue; }
      if (emTexto) continue;
      if (c === '{') nivel++;
      else if (c === '}' && --nivel === 0){
        const candidato = t.slice(i, j + 1);
        let obj;
        try { obj = JSON.parse(candidato); } catch { break; }

        const temTudo = exigidas.every(k => obj && obj[k] !== undefined);
        const nota = (temTudo ? 1e9 : 0) + candidato.length;
        if (nota > melhorNota){ melhorNota = nota; melhor = candidato; }

        // Se já traz o que pedimos e engloba o resto, não vale a pena continuar.
        if (temTudo && i === t.indexOf('{')) return candidato;
        break;
      }
    }
  }

  if (!melhor) return null;
  if (!exigidas.length) return melhor;
  const obj = JSON.parse(melhor);
  return exigidas.every(k => obj[k] !== undefined) ? melhor : null;
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

/** Diagnóstico: vê se um modelo do catálogo responde a esta conta, e em quanto tempo.
    Pede 5 tokens, para custar praticamente nada mesmo que alguém abuse. */
async function testarModelo(env, modelo, origem){
  if (provedor(env) !== 'nvidia') return erro(400, 'Só se aplica ao provedor nvidia.', origem);
  const inicio = Date.now();
  const r = await chamarNvidia(env, {
    model: modelo,
    max_tokens: 5,
    messages: [{ role:'user', content:'Responde só: ok' }],
  });
  return json({
    modelo,
    segundos: Math.round((Date.now() - inicio) / 100) / 10,
    ...(r.erro ? { erro: r.erro, estado: r.estado } : { resposta: String(r.texto).slice(0, 40) }),
  }, 200, origem);
}

const CONVERSA = { maxMensagens: 24, maxTexto: 2000, maxTokens: 900 };

const SISTEMA_BOT = `És o treinador da app MovePulse AI. Respondes a dúvidas sobre treino,
técnica de exercícios, organização da semana e progressão de cargas.

Regras:
- Português de Portugal, tratamento por "tu", sem inglês desnecessário.
- Respostas curtas: três a seis frases, ou uma lista curta. Vai direto ao assunto.
- Usa o perfil e o plano da pessoa quando forem relevantes para a resposta.
- Não dás diagnósticos nem tratamentos. Perante dor, lesão, tonturas, dor no peito ou
  doença, dizes com clareza que é caso para médico ou fisioterapeuta.
- Não prescreves suplementos, medicamentos nem dietas de restrição severa.
- Se não souberes, dizes que não sabes.`;

function validarConversa(corpo){
  if (!Array.isArray(corpo.messages) || !corpo.messages.length) return 'Conversa vazia.';
  if (corpo.messages.length > CONVERSA.maxMensagens) return 'Conversa demasiado longa.';
  for (const m of corpo.messages){
    if (!['user','assistant'].includes(m.role)) return 'Papel inválido na conversa.';
    if (typeof m.content !== 'string') return 'Mensagem inválida.';
    if (m.content.length > CONVERSA.maxTexto) return 'Mensagem demasiado longa.';
  }
  if (corpo.contexto && String(corpo.contexto).length > 1200) return 'Contexto demasiado longo.';
  return null;
}

/** Perguntas ao treinador. Segue o provedor configurado. */
async function conversa(corpo, env, origem){
  const sistema = SISTEMA_BOT + (corpo.contexto ? `\n\nSobre esta pessoa:\n${corpo.contexto}` : '');

  if (provedor(env) === 'nvidia'){
    if (!env.NVIDIA_API_KEY) return erro(500, 'Falta configurar NVIDIA_API_KEY no servidor.', origem);
    const r = await chamarNvidia(env, {
      model: env.MODELO_TEXTO || NVIDIA.modeloTexto,
      max_tokens: CONVERSA.maxTokens,
      temperature: 0.6,
      // Sem isto, os nemotron respondem com o raciocínio à frente
      // ("Okay, the user is asking...") e é isso que a pessoa lê.
      nvext: { max_thinking_tokens: 0 },
      messages: [{ role:'system', content: sistema }, ...corpo.messages],
    });
    if (r.erro) return erro(r.estado || 502, r.erro, origem);
    return json({ resposta: limparResposta(r.texto) }, 200, origem);
  }

  if (!env.ANTHROPIC_API_KEY) return erro(500, 'Falta configurar ANTHROPIC_API_KEY no servidor.', origem);
  const r = await fetch(ANTHROPIC.url, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version':'2023-06-01',
    },
    body: JSON.stringify({
      model:'claude-opus-5',
      max_tokens: CONVERSA.maxTokens,
      system: sistema,
      messages: corpo.messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const dados = await r.json().catch(() => null);
  if (!r.ok || !dados) return erro(r.status || 502, 'O serviço não respondeu.', origem);
  const texto = (dados.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  return json({ resposta: limparResposta(texto) }, 200, origem);
}

/** Tira o raciocínio que alguns modelos deixam à frente da resposta. */
function limparResposta(texto){
  return String(texto || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim() || 'Não consegui responder. Tenta reformular a pergunta.';
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

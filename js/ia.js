/* ============================================================
   Integração com a IA (Claude) — identifica as máquinas nas
   fotos do ginásio e monta o plano de treino.

   Dois modos (configuráveis em ⚙️):
   - 'servidor' : a app envia o pedido ao teu servidor, que guarda
                  a chave da API. É o modo recomendado para uso real.
   - 'direto'   : a app fala diretamente com a API da Anthropic com
                  uma chave guardada só neste dispositivo. Prático
                  para uso pessoal, inseguro se a app for pública.
   ============================================================ */

const IA = {
  MODELO: 'claude-opus-5',
  MAX_FOTOS: 8,
  LADO_MAX: 1280,          // px no lado maior — mantém o custo de tokens baixo
  ENDPOINT: 'https://api.anthropic.com/v1/messages',
  VERSAO_API: '2023-06-01',
  TEMPO_LIMITE: 240000,    // 4 min: se passar disto, algo correu mal do outro lado
};

/* ---------- Fotos ---------- */

/** Redimensiona e comprime o ficheiro escolhido. Devolve {b64, dataUrl, w, h}. */
function comprimirFoto(ficheiro){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(ficheiro);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, IA.LADO_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/jpeg', 0.75);
      resolve({ b64: dataUrl.split(',')[1], dataUrl, w, h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

/* ---------- Pedido ---------- */

const ESQUEMA_PLANO = {
  type:'object',
  properties:{
    equipamentos:{
      type:'array',
      description:'Equipamentos efetivamente visíveis nas fotos.',
      items:{
        type:'object',
        properties:{
          nome:{ type:'string' },
          grupo:{ type:'string', enum: GRUPOS },
          confianca:{ type:'string', enum:['alta','media','baixa'] },
        },
        required:['nome','grupo','confianca'],
        additionalProperties:false,
      },
    },
    observacoes:{ type:'string', description:'O que não deu para identificar ou avisos sobre as fotos.' },
    plano:{
      type:'object',
      properties:{
        nome:{ type:'string' },
        resumo:{ type:'string' },
        treinos:{
          type:'array',
          items:{
            type:'object',
            properties:{
              nome:{ type:'string', description:'Ex.: "A — Peito e Tríceps"' },
              foco:{ type:'string' },
              exercicios:{
                type:'array',
                items:{
                  type:'object',
                  properties:{
                    nome:{ type:'string' },
                    grupo:{ type:'string', enum: GRUPOS },
                    equipamento:{ type:'string' },
                    series:{ type:'integer', minimum:1, maximum:10 },
                    reps:{ type:'integer', minimum:1, maximum:100 },
                    descanso_seg:{ type:'integer', minimum:15, maximum:300 },
                    nota:{ type:'string' },
                  },
                  required:['nome','grupo','equipamento','series','reps','descanso_seg','nota'],
                  additionalProperties:false,
                },
              },
            },
            required:['nome','foco','exercicios'],
            additionalProperties:false,
          },
        },
      },
      required:['nome','resumo','treinos'],
      additionalProperties:false,
    },
    progressao:{ type:'string', description:'Como evoluir cargas e volume nas próximas semanas.' },
  },
  required:['equipamentos','observacoes','plano','progressao'],
  additionalProperties:false,
};

const SISTEMA = `És um treinador de musculação experiente. A partir de fotografias do ginásio de um
cliente, identificas o equipamento disponível e montas um plano de treino realista que use APENAS
esse equipamento (mais peso corporal, halteres e barras que estejam visíveis).

Regras:
- Lista em "equipamentos" só o que consegues mesmo ver nas fotos. Se uma máquina estiver cortada ou
  desfocada, marca confiança "baixa" em vez de inventar.
- Nenhum exercício do plano pode exigir equipamento que não esteja na lista de equipamentos ou que
  não seja peso corporal.
- Respeita os dias por semana e o tempo por sessão indicados: dimensiona o número de exercícios ao
  tempo disponível (conta ~3 min por série incluindo descanso).
- Ajusta séries, repetições e descanso ao objetivo e à experiência do cliente.
- Tem em conta as limitações/lesões indicadas e evita exercícios que as agravem; explica a
  substituição no campo "nota" do exercício.
- Escreve em português de Portugal, com nomes de exercícios usados em ginásio.
- Não identifiques pessoas que apareçam nas fotos.
- Isto é orientação geral de treino, não aconselhamento médico.`;

/** Monta o corpo do pedido à Messages API. */
function construirPedido(perfil, fotos){
  const conteudo = [];
  fotos.forEach((f, i) => {
    conteudo.push({ type:'text', text:`Foto ${i + 1}:` });
    conteudo.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:f.b64 } });
  });
  const cfg = Store.estado.planoConfig;
  const listaEquip = cfg.equipamento.length
    ? cfg.equipamento.map(nomeEquipamento).join(', ')
    : 'não indicado — usa o que aparecer nas fotos';

  conteudo.push({ type:'text', text:
`${fotos.length ? 'As fotos acima são do equipamento disponível.' : 'Não há fotos: guia-te pela lista de equipamento.'}

Equipamento disponível: ${listaEquip}

Como treina:
- Local: ${cfg.local}
- Tipo de treino: ${cfg.tipo}
- Duração por sessão: ${cfg.duracao} minutos
- Foco: ${cfg.foco}
- Intensidade: ${cfg.intensidade}
- Superséries: ${cfg.superseries ? 'sim' : 'não'}

Perfil do cliente:
- Objetivo: ${perfil.objetivo}
- Experiência: ${perfil.experiencia}
- Dias por semana: ${perfil.dias}
- Limitações/lesões: ${perfil.limitacoes || 'nenhuma indicada'}
- Notas: ${perfil.notas || '—'}

Monta o plano de treino com ${perfil.dias} treinos por semana.` });

  return {
    model: IA.MODELO,
    max_tokens: 16000,
    system: SISTEMA,
    thinking: { type:'adaptive' },
    output_config: { format: { type:'json_schema', schema: ESQUEMA_PLANO } },
    messages: [{ role:'user', content: conteudo }],
  };
}

/** Envia o pedido pelo modo configurado e devolve o objeto do plano. */
async function pedirPlano(perfil, fotos){
  try {
    return await pedirPlanoInterno(perfil, fotos);
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError'){
      throw new Error('Demorou demasiado tempo. Tenta com menos fotos.');
    }
    if (e instanceof TypeError){
      throw new Error('Não consegui contactar o servidor. Verifica a ligação e o endereço em ⚙️.');
    }
    throw e;
  }
}

async function pedirPlanoInterno(perfil, fotos){
  const cfg = Store.estado.config.ia;
  const corpo = construirPedido(perfil, fotos);

  // sem isto, uma resposta que nunca chega deixa a app à espera para sempre
  const corte = AbortSignal.timeout(IA.TEMPO_LIMITE);

  let resposta;
  if (cfg.modo === 'direto'){
    if (!cfg.chave) throw new Error('Falta a chave da API nas configurações.');
    resposta = await fetch(IA.ENDPOINT, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key': cfg.chave,
        'anthropic-version': IA.VERSAO_API,
        // Necessário para a API aceitar pedidos feitos a partir do browser.
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body: JSON.stringify(corpo),
      signal: corte,
    });
  } else {
    if (!cfg.servidor) throw new Error('Falta o endereço do servidor nas configurações.');
    resposta = await fetch(cfg.servidor, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(corpo),
      signal: corte,
    });
  }

  if (!resposta.ok){
    const txt = await resposta.text().catch(() => '');
    throw new Error(mensagemErro(resposta.status, txt));
  }

  const dados = await resposta.json();
  if (dados.stop_reason === 'refusal') throw new Error('O modelo recusou o pedido.');

  const bloco = (dados.content || []).find(b => b.type === 'text');
  if (!bloco) throw new Error('Resposta sem conteúdo.');
  try {
    return JSON.parse(bloco.text);
  } catch (e) {
    throw new Error('A resposta não veio no formato esperado.');
  }
}

function mensagemErro(status, corpo){
  let detalhe = '';
  try { detalhe = JSON.parse(corpo)?.error?.message || ''; } catch (e) { detalhe = ''; }
  if (status === 401) return 'Chave da API inválida ou em falta.';
  if (status === 429) return 'Limite de pedidos atingido. Tenta daqui a pouco.';
  if (status === 413) return 'As fotos são demasiado grandes. Usa menos fotos.';
  if (status >= 500) return 'O serviço está indisponível de momento. Tenta novamente.';
  return `Erro ${status}${detalhe ? ': ' + detalhe : ''}`;
}

/* ---------- Importar o plano para dentro da app ---------- */

/** "Supino Inclinado c/ Halteres" -> "supino inclinado c halteres" */
function normalizar(txt){
  return String(txt).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/* Palavras que distinguem exercícios parecidos: se as duas variantes não
   baterem certo, são exercícios diferentes (supino reto != supino inclinado). */
const PALAVRAS_EQUIP = ['barra','halteres','halter','polia','maquina','cabo','smith','corda','elastico'];
const PALAVRAS_VARIANTE = ['reto','inclinado','declinado','frontal','lateral','alta','baixa','curvada',
  'unilateral','bulgaro','martelo','scott','concentrada','livre','fixa','sentado','deitado','invertido',
  'inverso','supra','obliquo','isometrica','isometrico'];

function conflito(listaPalavras, a, b){
  const ea = listaPalavras.filter(p => a.includes(p));
  const eb = listaPalavras.filter(p => b.includes(p));
  if (!ea.length || !eb.length) return false;      // um dos nomes não especifica — não decide nada
  return !ea.some(p => eb.includes(p));            // especificam coisas diferentes
}

/** Procura o exercício no catálogo por semelhança de nome; cria um novo se não houver. */
function resolverExercicio(ex){
  const alvo = normalizar(ex.nome);
  const palavrasAlvo = alvo.split(' ').filter(p => p.length > 2);
  let melhor = null, melhorNota = 0;

  for (const cand of Store.todosExercicios()){
    const nome = normalizar(cand.nome);
    if (nome === alvo) return cand;
    if (conflito(PALAVRAS_EQUIP, alvo, nome)) continue;
    if (conflito(PALAVRAS_VARIANTE, alvo, nome)) continue;

    const palavrasCand = nome.split(' ').filter(p => p.length > 2);
    const comuns = palavrasAlvo.filter(p => palavrasCand.includes(p)).length;
    // coeficiente de Dice: tolera nomes mais longos ou mais curtos dos dois lados
    const nota = (2 * comuns) / (palavrasAlvo.length + palavrasCand.length || 1);
    if (nota > melhorNota){ melhorNota = nota; melhor = cand; }
  }
  if (melhor && melhorNota >= 0.6) return melhor;

  return Store.criarExercicio({
    nome: ex.nome,
    grupo: GRUPOS.includes(ex.grupo) ? ex.grupo : 'Pernas',
    equip: ex.equipamento || 'Livre',
  });
}

/** Converte o plano da IA em fichas da app. Devolve as fichas criadas. */
function importarPlano(plano){
  const criadas = [];
  plano.treinos.forEach(treino => {
    const ficha = {
      id: uid('t'),
      nome: treino.nome,
      notas: treino.foco || 'Plano IA',
      itens: treino.exercicios.map(ex => ({
        exId: resolverExercicio(ex).id,
        series: ex.series,
        reps: ex.reps,
        carga: 0,
      })),
    };
    Store.salvarTreino(ficha);
    criadas.push(ficha);
  });
  return criadas;
}

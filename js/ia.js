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
        duracao_semanas:{ type:'integer', minimum:2, maximum:12,
          description:'Quantas semanas dura o programa.' },
        treinos:{
          type:'array',
          items:{
            type:'object',
            properties:{
              nome:{ type:'string', description:'Ex.: "A — Peito e Tríceps"' },
              letra:{ type:'string', description:'Identificador curto do treino, ex.: "A".' },
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
            required:['nome','letra','foco','exercicios'],
            additionalProperties:false,
          },
        },
        calendario:{
          type:'array',
          description:'Uma entrada por semana, da primeira à última.',
          items:{
            type:'object',
            properties:{
              semana:{ type:'integer', minimum:1, maximum:12 },
              foco:{ type:'string', description:'O que muda nesta semana, em poucas palavras.' },
              dias:{
                type:'array',
                items:{
                  type:'object',
                  properties:{
                    dia:{ type:'string', enum: NOMES_DIA },
                    treino:{ type:'string', description:'A letra do treino a fazer nesse dia.' },
                  },
                  required:['dia','treino'],
                  additionalProperties:false,
                },
              },
            },
            required:['semana','foco','dias'],
            additionalProperties:false,
          },
        },
      },
      required:['nome','resumo','duracao_semanas','treinos','calendario'],
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
- Montas um PROGRAMA de várias semanas, não uma semana solta:
  * "treinos" traz os treinos distintos, cada um com a sua letra (A, B, C, D...);
  * "calendario" diz, semana a semana, que treino se faz em cada dia escolhido;
  * um treino pode repetir-se em várias semanas — é assim que se progride;
  * ao longo do programa introduz treinos novos, para variar os estímulos e não
    fazer sempre o mesmo: as primeiras semanas assentam a técnica, as seguintes
    trazem variantes ou mais volume.
- Usa apenas os dias que o cliente escolheu, sem repetir dias dentro da mesma semana.
- O "calendario" tem de ter exatamente "duracao_semanas" entradas, numeradas de 1 em diante.
- Escreve em português de Portugal, com nomes de exercícios usados em ginásio.
- Quando forem indicados grupos a priorizar, dá-lhes mais volume (séries) do que aos restantes,
  sem deixar o corpo desequilibrado: mantém pelo menos um exercício para os grandes grupos que
  não foram escolhidos.
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
- Divisão do plano: ${cfg.foco}
- Grupos a priorizar: ${cfg.musculos.length ? cfg.musculos.join(', ') : 'nenhum em especial — equilibra o corpo todo'}
- Intensidade: ${cfg.intensidade}
- Superséries: ${cfg.superseries ? 'sim' : 'não'}

Perfil do cliente:
- Objetivo: ${perfil.objetivo}
- Experiência: ${perfil.experiencia}
- Dias de treino: ${perfil.diasSemana.map(d => NOMES_DIA[d]).join(', ')} (${perfil.diasSemana.length} por semana)
- Limitações/lesões: ${perfil.limitacoes || 'nenhuma indicada'}
- Notas: ${perfil.notas || '—'}

Monta um programa de ${cfg.semanas || 6} semanas, com ${perfil.diasSemana.length} treinos por semana,
um em cada dia indicado. Cria entre ${Math.max(3, perfil.diasSemana.length)} e ${
  Math.max(4, perfil.diasSemana.length * 2)} treinos distintos: repete-os ao longo das semanas e vai
introduzindo os novos a meio do programa.` });

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
async function pedirPlano(perfil, fotos, jaTentou = false){
  try {
    return await pedirPlanoInterno(perfil, fotos);
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError'){
      throw new Error('Demorou demasiado tempo. Tenta com menos fotos.');
    }
    if (e instanceof TypeError){
      // A ligação caiu a meio. Acontece no telemóvel quando o ecrã bloqueia
      // ou se sai da app: o pedido morre. Vale sempre a pena tentar de novo.
      if (!jaTentou){
        await new Promise(ok => setTimeout(ok, 1500));
        return pedirPlano(perfil, fotos, true);
      }
      throw new Error(navigator.onLine
        ? 'A ligação caiu a meio do pedido. Se saíres da app ou o ecrã bloquear, o telemóvel corta o pedido — deixa a app aberta e tenta outra vez.'
        : 'Estás sem ligação à internet. O plano precisa de rede para ser gerado.');
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
  if (status === 504) return 'O servidor da IA demorou demasiado. Tenta com menos fotos.';
  if (status >= 500) return `O fornecedor de IA falhou (erro ${status})${
    detalhe ? ': ' + detalhe.slice(0, 120) : ''}. Costuma ser passageiro — tenta outra vez.`;
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

/* Palavras que não dizem nada sobre o exercício e só estragavam as contas:
   "Supino reto com barra" tem três palavras úteis, não quatro. */
const PALAVRAS_VAZIAS = new Set(['com','sem','para','pela','pelo','uma','dos','das','nas','nos','que','ate']);

/** As palavras de um nome que contam para a comparação. */
function palavrasUteis(nome){
  return normalizar(nome).split(' ').filter(p => p.length > 2 && !PALAVRAS_VAZIAS.has(p));
}

/** Quanto dois nomes se parecem, de 0 a 1 (coeficiente de Dice). */
function semelhancaNomes(a, b){
  const pa = Array.isArray(a) ? a : palavrasUteis(a);
  const pb = Array.isArray(b) ? b : palavrasUteis(b);
  if (!pa.length || !pb.length) return 0;
  const comuns = pa.filter(p => pb.includes(p)).length;
  return (2 * comuns) / (pa.length + pb.length);
}

/* "Polia alta" e "polia baixa" são o aparelho, não a variante do exercício:
   sem isto, "Puxada na polia alta" entrava em conflito com "Puxada frontal"
   por causa do "alta". */
function semAlturaDaPolia(nome){
  return String(nome).replace(/polia (alta|baixa)/g, 'polia');
}

function conflito(listaPalavras, a, b){
  const ea = listaPalavras.filter(p => a.includes(p));
  const eb = listaPalavras.filter(p => b.includes(p));
  if (!ea.length || !eb.length) return false;      // um dos nomes não especifica — não decide nada
  return !ea.some(p => eb.includes(p));            // especificam coisas diferentes
}

/** Procura o exercício no catálogo por semelhança de nome; cria um novo se não houver. */
function resolverExercicio(ex){
  const alvo = normalizar(ex.nome);
  const palavrasAlvo = palavrasUteis(ex.nome);
  let melhor = null, melhorNota = 0;

  for (const cand of Store.todosExercicios()){
    const nome = normalizar(cand.nome);
    if (nome === alvo) return cand;
    if (conflito(PALAVRAS_EQUIP, alvo, nome)) continue;
    if (conflito(PALAVRAS_VARIANTE, semAlturaDaPolia(alvo), semAlturaDaPolia(nome))) continue;

    const nota = semelhancaNomes(palavrasAlvo, palavrasUteis(cand.nome));
    if (nota > melhorNota){ melhorNota = nota; melhor = cand; }
  }
  if (melhor && melhorNota >= 0.6) return melhor;

  return Store.criarExercicio({
    nome: ex.nome,
    grupo: GRUPOS.includes(ex.grupo) ? ex.grupo : 'Pernas',
    equip: ex.equipamento || 'Livre',
  });
}

/** "Segunda-feira" -> 1. Devolve -1 se não reconhecer. */
function diaParaNumero(nome){
  const alvo = normalizar(nome).replace(/ feira/g, '').trim();
  return NOMES_DIA.findIndex(n => normalizar(n) === alvo);
}

/** Procura um dia da semana dentro de um texto: "Segunda-Feira — Corpo Inteiro" -> 1. */
function diaNoTexto(texto){
  const t = normalizar(texto).replace(/ feira/g, ' ');
  return NOMES_DIA.findIndex(n => new RegExp(`(^| )${normalizar(n)}( |$)`).test(t));
}

/** Converte o plano da IA em fichas da app. Devolve as fichas criadas. */
function importarPlano(plano){
  // Um plano novo substitui o anterior: sem isto, cada geração deixava
  // mais um conjunto de fichas soltas na lista.
  Store.removerFichasDaIA();

  const criadas = [];
  plano.treinos.forEach((treino, i) => {
    const ficha = {
      id: uid('t'),
      origem: 'ia',
      letra: treino.letra || LETRAS_TREINO[i] || String(i + 1),
      nome: treino.nome,
      notas: treino.foco || 'Plano IA',
      // dia fixo só nos planos antigos, de uma semana; nos programas
      // quem manda é o calendário.
      dia: treino.dia ? diaParaNumero(treino.dia) : diaNoTexto(treino.nome),
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

  guardarCalendario(plano, criadas);
  return criadas;
}

/** Converte o calendário do programa em semanas de fichas, para o app usar. */
function guardarCalendario(plano, fichas){
  const ordenadas = (plano.calendario || [])
    .slice()
    .sort((a, b) => (a.semana || 0) - (b.semana || 0));

  const semanas = ordenadas
    .map(sem => {
      const mapa = { 0:null, 1:null, 2:null, 3:null, 4:null, 5:null, 6:null };
      (sem.dias || []).forEach(({ dia, treino }) => {
        const d = diaParaNumero(dia);
        const ficha = fichaPorReferencia(treino, fichas);
        if (d !== null && ficha) mapa[d] = ficha.id;
      });
      return mapa;
    })
    .filter(mapa => Object.values(mapa).some(Boolean));

  Store.guardarProgramaIA(semanas, plano.nome, ordenadas.map(sem => sem.foco || ''));
  return semanas;
}

/** Encontra a ficha a que o calendário se refere: pela letra ou pelo nome. */
function fichaPorReferencia(referencia, fichas){
  const t = normalizar(String(referencia || ''));
  if (!t) return null;

  const porLetra = fichas.find(f => normalizar(f.letra || '') === t);
  if (porLetra) return porLetra;

  const porNome = fichas.find(f => normalizar(f.nome) === t);
  if (porNome) return porNome;

  // "A" dentro de "A — Peito e Tríceps", ou o nome escrito por extenso
  return fichas.find(f => {
    const nome = normalizar(f.nome);
    return nome.startsWith(t + ' ') || nome === t || nome.includes(t);
  }) || null;
}


/* ============================================================
   Perguntas ao treinador.
   ============================================================ */

/** Resume o perfil e o plano, para o bot responder com conhecimento de causa. */
function contextoDoUtilizador(){
  const p = Store.estado.perfil;
  const plano = Store.estado.planoIA;
  const linhas = [
    `Objetivo: ${p.objetivo}`,
    `Experiência: ${p.experiencia}`,
    `Treina ${p.diasSemana.length}x por semana (${p.diasSemana.map(d => NOMES_DIA[d]).join(', ') || 'sem dias definidos'})`,
    `Sessões de ${p.minutos} minutos`,
  ];
  if (p.idade)  linhas.push(`Idade: ${p.idade}`);
  if (p.peso && p.altura) linhas.push(`${p.peso} kg, ${p.altura} cm`);
  if (p.limitacoes) linhas.push(`Limitações: ${p.limitacoes}`);
  if (plano){
    linhas.push(`Plano atual: ${plano.plano.nome} — ${plano.plano.treinos.map(t => t.nome).join(', ')}`);
  }
  const feitos = Store.estado.sessoes.length;
  linhas.push(`Treinos registados até agora: ${feitos}`);
  return linhas.join('\n');
}

/** Envia a conversa ao servidor e devolve a resposta do treinador. */
async function perguntarAoTreinador(mensagens){
  const cfg = Store.estado.config.ia;
  const corpo = {
    tipo:'conversa',
    contexto: contextoDoUtilizador(),
    messages: mensagens.slice(-12),
  };

  const corte = AbortSignal.timeout(90000);
  let resposta;
  try {
    if (cfg.modo === 'direto'){
      throw new Error('O treinador só funciona pelo servidor. Muda o modo em ⚙️.');
    }
    resposta = await fetch(cfg.servidor, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(corpo),
      signal: corte,
    });
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('Demorou demasiado tempo. Tenta outra vez.');
    throw e;
  }

  if (!resposta.ok){
    const txt = await resposta.text().catch(() => '');
    throw new Error(mensagemErro(resposta.status, txt));
  }
  const dados = await resposta.json();
  return dados.resposta || 'Não recebi resposta.';
}

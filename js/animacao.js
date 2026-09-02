/* ============================================================
   Boneco articulado que executa o exercício.

   Um esqueleto de lado, construído do chão para cima (tornozelo →
   joelho → anca → ombro → braço), com duas poses por movimento.
   A animação interpola entre elas, para trás e para a frente.
   Ângulos em graus, medidos a partir da vertical; positivo = à frente.
   ============================================================ */

const OSSOS = { perna:26, coxa:26, tronco:34, braco:19, antebraco:19, pe:11, cabeca:9 };

/* Cada movimento: pose inicial (a), pose final (b) e o que se segura. */
const MOVIMENTOS = {
  agachamento: {
    nome:'Agachamento',
    a:{ perna:2,  coxa:0,   tronco:5,  braco:8,  antebraco:8 },
    b:{ perna:26, coxa:-58, tronco:42, braco:22, antebraco:24 },
    carga:'barra-costas',
    dicas:['Pés à largura dos ombros, pontas ligeiramente para fora.',
           'Desce a anca para trás e para baixo, peito aberto.',
           'Joelhos alinhados com os pés, sem cair para dentro.',
           'Sobe a empurrar o chão com o pé todo.'],
  },
  dobradica: {
    nome:'Dobradiça da anca',
    a:{ perna:2,  coxa:0,   tronco:5,  braco:2,  antebraco:2 },
    b:{ perna:6,  coxa:-18, tronco:72, braco:0,  antebraco:0 },
    carga:'barra-maos',
    dicas:['Joelhos ligeiramente fletidos e fixos.',
           'Leva a anca atrás, deixando a barra rente às pernas.',
           'Costas direitas do princípio ao fim.',
           'Sobe contraindo os glúteos, sem hiperextender a lombar.'],
  },
  flexao: {
    nome:'Empurrar horizontal',
    a:{ perna:0, coxa:0, tronco:0, braco:92,  antebraco:92 },
    b:{ perna:0, coxa:0, tronco:0, braco:126, antebraco:56 },
    carga:'nenhum', rodar:-72, mover:46,
    dicas:['Corpo em linha reta, dos calcanhares à cabeça.',
           'Cotovelos a cerca de 45° do tronco, não abertos de todo.',
           'Desce controlado até o peito ficar perto das mãos.',
           'Empurra sem deixar a anca cair.'],
  },
  remada: {
    nome:'Puxar horizontal',
    a:{ perna:4, coxa:-12, tronco:62, braco:8,  antebraco:8 },
    b:{ perna:4, coxa:-12, tronco:62, braco:-6, antebraco:-58 },
    carga:'barra-maos',
    dicas:['Tronco inclinado e estável — não sobe e desce com a série.',
           'Puxa com os cotovelos, não com as mãos.',
           'Junta as omoplatas no fim do movimento.',
           'Desce devagar até esticar os braços.'],
  },
  puxada: {
    nome:'Puxar vertical',
    a:{ perna:2, coxa:0, tronco:8, braco:168, antebraco:172 },
    b:{ perna:2, coxa:0, tronco:14, braco:150, antebraco:96 },
    carga:'barra-cima',
    dicas:['Peito para cima e ombros afastados das orelhas.',
           'Puxa a barra até à parte alta do peito.',
           'Cotovelos descem junto ao tronco.',
           'Controla a subida, sem largar de repente.'],
  },
  desenvolvimento: {
    nome:'Empurrar vertical',
    a:{ perna:2, coxa:0, tronco:5, braco:132, antebraco:96 },
    b:{ perna:2, coxa:0, tronco:5, braco:172, antebraco:176 },
    carga:'halteres',
    dicas:['Abdominal contraído, sem arquear a lombar.',
           'Sobe até esticar os braços acima da cabeça.',
           'Cotovelos ligeiramente à frente do corpo.',
           'Desce até à altura das orelhas.'],
  },
  rosca: {
    nome:'Rosca de bíceps',
    a:{ perna:2, coxa:0, tronco:4, braco:6,  antebraco:6 },
    b:{ perna:2, coxa:0, tronco:4, braco:10, antebraco:-96 },
    carga:'halteres',
    dicas:['Cotovelos junto ao tronco e parados.',
           'Sobe sem balançar o corpo.',
           'Aperta o bíceps no topo.',
           'Desce devagar até esticar.'],
  },
  triceps: {
    nome:'Extensão de tríceps',
    a:{ perna:2, coxa:0, tronco:8, braco:14, antebraco:-72 },
    b:{ perna:2, coxa:0, tronco:8, braco:14, antebraco:12 },
    carga:'polia',
    dicas:['Cotovelos colados ao tronco.',
           'Só o antebraço se move.',
           'Estica por completo no fim.',
           'Regressa com controlo.'],
  },
  elevacaoLateral: {
    nome:'Elevação lateral',
    a:{ perna:2, coxa:0, tronco:4, braco:6,  antebraco:6 },
    b:{ perna:2, coxa:0, tronco:4, braco:92, antebraco:92 },
    carga:'halteres',
    dicas:['Sobe até à altura dos ombros, não mais.',
           'Cotovelos levemente fletidos.',
           'Sem impulso: o corpo fica quieto.',
           'Desce a contar até dois.'],
  },
  gemeos: {
    nome:'Elevação de gémeos',
    a:{ perna:0, coxa:0, tronco:2, braco:4, antebraco:4, calcanhar:0 },
    b:{ perna:0, coxa:0, tronco:2, braco:4, antebraco:4, calcanhar:16 },
    carga:'nenhum',
    dicas:['Sobe o mais alto que conseguires nas pontas dos pés.',
           'Pausa curta no topo.',
           'Desce até sentir alongar.',
           'Sem dobrar os joelhos.'],
  },
  afundo: {
    nome:'Afundo',
    a:{ perna:2,  coxa:0,   tronco:5,  braco:4, antebraco:4 },
    b:{ perna:20, coxa:-46, tronco:12, braco:4, antebraco:4 },
    carga:'halteres',
    dicas:['Passo à frente, tronco direito.',
           'Desce até o joelho de trás quase tocar no chão.',
           'Joelho da frente por cima do pé.',
           'Empurra com o calcanhar da frente para subir.'],
  },
  abdominal: {
    nome:'Abdominal',
    a:{ perna:62, coxa:-64, tronco:2,   braco:150, antebraco:158 },
    b:{ perna:62, coxa:-64, tronco:-32, braco:150, antebraco:158 },
    carga:'nenhum', rodar:-88, mover:52,
    dicas:['Lombar apoiada no chão.',
           'Sobe enrolando as costelas para a bacia.',
           'Não puxes o pescoço com as mãos.',
           'Expira ao subir.'],
  },
  prancha: {
    nome:'Prancha',
    a:{ perna:0, coxa:0, tronco:0, braco:92, antebraco:150 },
    b:{ perna:0, coxa:0, tronco:3, braco:92, antebraco:150 },
    carga:'nenhum', rodar:-74, mover:46,
    dicas:['Corpo em linha reta, sem anca ao alto nem em baixo.',
           'Cotovelos por baixo dos ombros.',
           'Abdominal e glúteos contraídos.',
           'Respira normalmente durante o tempo todo.'],
  },
  extensoraSentado: {
    nome:'Extensão de joelhos',
    a:{ perna:-82, coxa:0, tronco:14, braco:20, antebraco:60, sentado:true },
    b:{ perna:-2,  coxa:0, tronco:14, braco:20, antebraco:60, sentado:true },
    carga:'nenhum',
    dicas:['Costas apoiadas no encosto.',
           'Estica os joelhos sem dar solavancos.',
           'Pausa curta em cima.',
           'Desce controlado.'],
  },
  legPress: {
    nome:'Leg press',
    a:{ perna:-58, coxa:-24, tronco:56, braco:60, antebraco:40, sentado:true },
    b:{ perna:-14, coxa:-6,  tronco:56, braco:60, antebraco:40, sentado:true },
    carga:'plataforma',
    dicas:['Pés a meio da plataforma, à largura dos ombros.',
           'Desce até os joelhos ficarem a cerca de 90°.',
           'Não bloqueies os joelhos com força no fim.',
           'Lombar sempre apoiada.'],
  },
};

/* Que movimento serve cada exercício do catálogo. */
const MOVIMENTO_DE = {
  agachamento:'agachamento', 'bulgaro':'afundo', afundo:'afundo', 'hip-thrust':'dobradica',
  stiff:'dobradica', levantamento:'dobradica', 'leg-press':'legPress', 'ext-joelhos':'extensoraSentado',
  'flex-joelhos':'extensoraSentado', panturrilha:'gemeos', 'cadeira-abd':'extensoraSentado',
  'suo-reto':'flexao', 'sup-incl-hal':'flexao', 'sup-decl':'flexao', crucifixo:'flexao',
  crossover:'flexao', flexao:'flexao', 'peck-deck':'flexao',
  'barra-fixa':'puxada', 'puxada-frente':'puxada', pulldown:'puxada',
  'remada-curv':'remada', 'remada-uni':'remada', 'remada-baixa':'remada',
  desenvolv:'desenvolvimento', 'desenvolv-mil':'desenvolvimento', 'remada-alta':'desenvolvimento',
  'elev-lateral':'elevacaoLateral', 'elev-frontal':'elevacaoLateral', 'crucifixo-inv':'elevacaoLateral',
  encolhimento:'gemeos',
  'rosca-direta':'rosca', 'rosca-alt':'rosca', 'rosca-martelo':'rosca', 'rosca-scott':'rosca',
  'rosca-conc':'rosca',
  'triceps-polia':'triceps', 'triceps-testa':'triceps', 'triceps-franc':'triceps',
  mergulho:'flexao', paralelas:'flexao',
  prancha:'prancha', 'abd-supra':'abdominal', 'elev-pernas':'abdominal', 'abd-obliquo':'abdominal',
  'roda-abd':'prancha',
};

/* Quando o exercício não está mapeado, escolhe-se pelo grupo. */
const MOVIMENTO_POR_GRUPO = {
  'Peito':'flexao', 'Costas':'remada', 'Pernas':'agachamento', 'Ombros':'desenvolvimento',
  'Bíceps':'rosca', 'Tríceps':'triceps', 'Abdómen':'abdominal', 'Cardio':'agachamento',
};

function movimentoDoExercicio(ex){
  return MOVIMENTOS[MOVIMENTO_DE[ex.id]]
      || MOVIMENTOS[MOVIMENTO_POR_GRUPO[ex.grupo]]
      || MOVIMENTOS.agachamento;
}

/* ---------- desenho ---------- */
const rad = g => g * Math.PI / 180;
const paraCima = (p, comp, ang) => ({ x: p.x + comp * Math.sin(rad(ang)), y: p.y - comp * Math.cos(rad(ang)) });
const paraBaixo = (p, comp, ang) => ({ x: p.x + comp * Math.sin(rad(ang)), y: p.y + comp * Math.cos(rad(ang)) });

/** Calcula as articulações a partir dos ângulos da pose. */
function esqueleto(pose){
  const tornozelo = { x: 52, y: 132 - (pose.calcanhar || 0) };
  const joelho  = paraCima(tornozelo, OSSOS.perna, pose.perna);
  const anca    = paraCima(joelho,    OSSOS.coxa,  pose.coxa);
  const ombro   = paraCima(anca,      OSSOS.tronco, pose.tronco);
  const cotovelo = paraBaixo(ombro,   OSSOS.braco, pose.braco);
  const mao      = paraBaixo(cotovelo, OSSOS.antebraco, pose.antebraco);
  const cabeca   = paraCima(ombro,    OSSOS.cabeca, pose.tronco * 0.4);
  const pe       = { x: tornozelo.x + OSSOS.pe, y: 132 };
  return { tornozelo, joelho, anca, ombro, cotovelo, mao, cabeca, pe };
}

function interpolar(a, b, t){
  const pose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])){
    if (typeof a[k] === 'boolean' || typeof b[k] === 'boolean') continue;
    pose[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * t;
  }
  return pose;
}

/** Desenha o boneco e o que ele segura. */
function desenharBoneco(mov, t){
  const p = esqueleto(interpolar(mov.a, mov.b, t));
  const linha = (de, para, classe) =>
    `<line class="${classe}" x1="${de.x.toFixed(1)}" y1="${de.y.toFixed(1)}" x2="${para.x.toFixed(1)}" y2="${para.y.toFixed(1)}"/>`;

  let carga = '';
  if (mov.carga === 'halteres'){
    carga = `<rect class="an-carga" x="${(p.mao.x - 6).toFixed(1)}" y="${(p.mao.y - 3).toFixed(1)}" width="12" height="6" rx="3"/>`;
  } else if (mov.carga === 'barra-maos' || mov.carga === 'barra-cima'){
    carga = `<line class="an-barra" x1="${(p.mao.x - 16).toFixed(1)}" y1="${p.mao.y.toFixed(1)}" x2="${(p.mao.x + 16).toFixed(1)}" y2="${p.mao.y.toFixed(1)}"/>`;
  } else if (mov.carga === 'barra-costas'){
    carga = `<line class="an-barra" x1="${(p.ombro.x - 17).toFixed(1)}" y1="${(p.ombro.y - 2).toFixed(1)}" x2="${(p.ombro.x + 17).toFixed(1)}" y2="${(p.ombro.y - 2).toFixed(1)}"/>`;
  } else if (mov.carga === 'polia'){
    carga = `<line class="an-cabo" x1="${p.mao.x.toFixed(1)}" y1="${p.mao.y.toFixed(1)}" x2="${p.mao.x.toFixed(1)}" y2="8"/>
             <line class="an-barra" x1="${(p.mao.x - 9).toFixed(1)}" y1="${p.mao.y.toFixed(1)}" x2="${(p.mao.x + 9).toFixed(1)}" y2="${p.mao.y.toFixed(1)}"/>`;
  } else if (mov.carga === 'plataforma'){
    carga = `<rect class="an-carga" x="${(p.tornozelo.x - 4).toFixed(1)}" y="${(p.tornozelo.y - 12).toFixed(1)}" width="8" height="24" rx="3"/>`;
  }

  // translate primeiro, para o deslocamento ser no ecrã e não no corpo rodado
  const roda = mov.rodar
    ? ` transform="translate(${mov.mover || 0} 0) rotate(${mov.rodar} 52 132)"`
    : '';

  return `
    <line class="an-chao" x1="8" y1="133" x2="112" y2="133"/>
    ${mov.a.sentado ? '<rect class="an-banco" x="46" y="96" width="40" height="6" rx="3"/>' : ''}
    <g${roda}>
    ${linha(p.tornozelo, p.pe, 'an-osso')}
    ${linha(p.tornozelo, p.joelho, 'an-osso')}
    ${linha(p.joelho, p.anca, 'an-osso')}
    ${linha(p.anca, p.ombro, 'an-tronco')}
    ${linha(p.ombro, p.cotovelo, 'an-osso')}
    ${linha(p.cotovelo, p.mao, 'an-osso')}
    <circle class="an-cabeca" cx="${p.cabeca.x.toFixed(1)}" cy="${(p.cabeca.y - 4).toFixed(1)}" r="7"/>
    ${carga}
    </g>`;
}

/** Anima o exercício dentro de um elemento. Devolve a função para parar. */
function animarExercicio(elemento, ex){
  const mov = movimentoDoExercicio(ex);
  const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  elemento.innerHTML = `<svg class="boneco" viewBox="0 0 120 145" aria-label="Execução de ${esc(ex.nome)}">
    <g id="an-corpo">${desenharBoneco(mov, parado ? 0.5 : 0)}</g></svg>`;

  if (parado) return () => {};

  const corpo = elemento.querySelector('#an-corpo');
  const duracao = 2600;
  let inicio = null, pedido = null;

  const passo = agora => {
    if (inicio === null) inicio = agora;
    const ciclo = ((agora - inicio) % duracao) / duracao;
    // vai e volta, com travagem nos extremos
    const linear = ciclo < 0.5 ? ciclo * 2 : (1 - ciclo) * 2;
    const t = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2;
    corpo.innerHTML = desenharBoneco(mov, t);
    pedido = requestAnimationFrame(passo);
  };
  pedido = requestAnimationFrame(passo);
  return () => cancelAnimationFrame(pedido);
}

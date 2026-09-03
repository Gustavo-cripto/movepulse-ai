/* Catálogo base de exercícios e fichas de exemplo.
   Cada exercício: id, nome, grupo, equipamento, tipo ('forca' | 'cardio'). */

const GRUPOS = ['Peito','Costas','Pernas','Ombros','Bíceps','Tríceps','Abdómen','Cardio'];

/* Dias da semana, com domingo em 0 — como no getDay() do JavaScript. */
const LETRAS_DIA = ['D','S','T','Q','Q','S','S'];
const NOMES_DIA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

const EXERCICIOS_BASE = [
  // Peito
  { id:'suo-reto',      nome:'Supino reto com barra',        grupo:'Peito',   equip:'Barra' },
  { id:'sup-incl-hal',  nome:'Supino inclinado com halteres',grupo:'Peito',   equip:'Halteres' },
  { id:'sup-decl',      nome:'Supino declinado',             grupo:'Peito',   equip:'Barra' },
  { id:'crucifixo',     nome:'Crucifixo com halteres',       grupo:'Peito',   equip:'Halteres' },
  { id:'crossover',     nome:'Crossover na polia',           grupo:'Peito',   equip:'Polia' },
  { id:'flexao',        nome:'Flexão de braço',              grupo:'Peito',   equip:'Peso corporal' },
  { id:'peck-deck',     nome:'Peck deck (voador)',           grupo:'Peito',   equip:'Máquina' },

  // Costas
  { id:'barra-fixa',    nome:'Barra fixa',                   grupo:'Costas',  equip:'Peso corporal' },
  { id:'puxada-frente', nome:'Puxada frontal',               grupo:'Costas',  equip:'Polia' },
  { id:'remada-curv',   nome:'Remada curvada com barra',     grupo:'Costas',  equip:'Barra' },
  { id:'remada-uni',    nome:'Remada unilateral (serrote)',  grupo:'Costas',  equip:'Halteres' },
  { id:'remada-baixa',  nome:'Remada baixa na polia',        grupo:'Costas',  equip:'Polia' },
  { id:'levantamento',  nome:'Levantamento terra',           grupo:'Costas',  equip:'Barra' },
  { id:'pulldown',      nome:'Pullover na polia',            grupo:'Costas',  equip:'Polia' },

  // Pernas
  { id:'agachamento',   nome:'Agachamento livre',            grupo:'Pernas',  equip:'Barra' },
  { id:'leg-press',     nome:'Leg press 45°',                grupo:'Pernas',  equip:'Máquina' },
  { id:'ext-joelhos',   nome:'Cadeira extensora',            grupo:'Pernas',  equip:'Máquina' },
  { id:'flex-joelhos',  nome:'Mesa flexora',                 grupo:'Pernas',  equip:'Máquina' },
  { id:'stiff',         nome:'Stiff com barra',              grupo:'Pernas',  equip:'Barra' },
  { id:'afundo',        nome:'Afundo com halteres',          grupo:'Pernas',  equip:'Halteres' },
  { id:'bulgaro',       nome:'Agachamento búlgaro',          grupo:'Pernas',  equip:'Halteres' },
  { id:'panturrilha',   nome:'Panturrilha em pé',            grupo:'Pernas',  equip:'Máquina' },
  { id:'hip-thrust',    nome:'Elevação pélvica (hip thrust)',grupo:'Pernas',  equip:'Barra' },
  { id:'cadeira-abd',   nome:'Cadeira abdutora',             grupo:'Pernas',  equip:'Máquina' },

  // Ombros
  { id:'desenvolv',     nome:'Desenvolvimento com halteres', grupo:'Ombros',  equip:'Halteres' },
  { id:'desenvolv-mil', nome:'Desenvolvimento militar',      grupo:'Ombros',  equip:'Barra' },
  { id:'elev-lateral',  nome:'Elevação lateral',             grupo:'Ombros',  equip:'Halteres' },
  { id:'elev-frontal',  nome:'Elevação frontal',             grupo:'Ombros',  equip:'Halteres' },
  { id:'crucifixo-inv', nome:'Crucifixo inverso',            grupo:'Ombros',  equip:'Halteres' },
  { id:'remada-alta',   nome:'Remada alta',                  grupo:'Ombros',  equip:'Barra' },
  { id:'encolhimento',  nome:'Encolhimento de ombros',       grupo:'Ombros',  equip:'Halteres' },

  // Bíceps
  { id:'rosca-direta',  nome:'Rosca direta com barra',       grupo:'Bíceps',  equip:'Barra' },
  { id:'rosca-alt',     nome:'Rosca alternada',              grupo:'Bíceps',  equip:'Halteres' },
  { id:'rosca-martelo', nome:'Rosca martelo',                grupo:'Bíceps',  equip:'Halteres' },
  { id:'rosca-scott',   nome:'Rosca scott',                  grupo:'Bíceps',  equip:'Máquina' },
  { id:'rosca-conc',    nome:'Rosca concentrada',            grupo:'Bíceps',  equip:'Halteres' },

  // Tríceps
  { id:'triceps-polia', nome:'Tríceps na polia (corda)',     grupo:'Tríceps', equip:'Polia' },
  { id:'triceps-testa', nome:'Tríceps testa',                grupo:'Tríceps', equip:'Barra' },
  { id:'triceps-franc', nome:'Tríceps francês',              grupo:'Tríceps', equip:'Halteres' },
  { id:'mergulho',      nome:'Mergulho no banco',            grupo:'Tríceps', equip:'Peso corporal' },
  { id:'paralelas',     nome:'Paralelas',                    grupo:'Tríceps', equip:'Peso corporal' },

  // Abdómen
  { id:'prancha',       nome:'Prancha isométrica',           grupo:'Abdómen', equip:'Peso corporal' },
  { id:'abd-supra',     nome:'Abdominal supra',              grupo:'Abdómen', equip:'Peso corporal' },
  { id:'elev-pernas',   nome:'Elevação de pernas',           grupo:'Abdómen', equip:'Peso corporal' },
  { id:'abd-obliquo',   nome:'Abdominal oblíquo',            grupo:'Abdómen', equip:'Peso corporal' },
  { id:'roda-abd',      nome:'Roda abdominal',               grupo:'Abdómen', equip:'Acessório' },

  // Cardio
  { id:'esteira',       nome:'Esteira',                      grupo:'Cardio',  equip:'Máquina', tipo:'cardio' },
  { id:'bike',          nome:'Bicicleta ergométrica',        grupo:'Cardio',  equip:'Máquina', tipo:'cardio' },
  { id:'eliptico',      nome:'Elíptico',                     grupo:'Cardio',  equip:'Máquina', tipo:'cardio' },
  { id:'corda',         nome:'Pular corda',                  grupo:'Cardio',  equip:'Acessório', tipo:'cardio' },
  { id:'remo-ergo',     nome:'Remo ergômetro',               grupo:'Cardio',  equip:'Máquina', tipo:'cardio' },
].map(e => ({ tipo:'forca', ...e }));

/* Fichas sugeridas para quem abre o app pela primeira vez. */
const TREINOS_EXEMPLO = [
  {
    id:'t-push', nome:'A — Peito, Ombro e Tríceps', notas:'Empurrar',
    itens:[
      { exId:'suo-reto',      series:4, reps:8,  carga:0 },
      { exId:'sup-incl-hal',  series:3, reps:10, carga:0 },
      { exId:'desenvolv',     series:3, reps:10, carga:0 },
      { exId:'elev-lateral',  series:3, reps:12, carga:0 },
      { exId:'triceps-polia', series:3, reps:12, carga:0 },
    ]
  },
  {
    id:'t-pull', nome:'B — Costas e Bíceps', notas:'Puxar',
    itens:[
      { exId:'barra-fixa',    series:4, reps:8,  carga:0 },
      { exId:'remada-curv',   series:4, reps:10, carga:0 },
      { exId:'remada-baixa',  series:3, reps:12, carga:0 },
      { exId:'rosca-direta',  series:3, reps:10, carga:0 },
      { exId:'rosca-martelo', series:3, reps:12, carga:0 },
    ]
  },
  {
    id:'t-legs', nome:'C — Pernas e Abdómen', notas:'Inferiores',
    itens:[
      { exId:'agachamento',  series:4, reps:8,  carga:0 },
      { exId:'leg-press',    series:3, reps:12, carga:0 },
      { exId:'stiff',        series:3, reps:10, carga:0 },
      { exId:'flex-joelhos', series:3, reps:12, carga:0 },
      { exId:'panturrilha',  series:4, reps:15, carga:0 },
      { exId:'prancha',      series:3, reps:1,  carga:0 },
    ]
  },
];

/* ============================================================
   Catálogo de equipamento, para se escolher à mão o que existe
   no ginásio, em alternativa (ou em complemento) às fotos.
   ============================================================ */
const EQUIPAMENTOS = [
  { cat:'Pesos livres', itens:[
    { id:'barra',       nome:'Barra olímpica' },
    { id:'halteres',    nome:'Halteres' },
    { id:'kettlebell',  nome:'Kettlebells' },
    { id:'discos',      nome:'Discos / anilhas' },
    { id:'barra-ez',    nome:'Barra EZ' },
    { id:'landmine',    nome:'Landmine' },
    { id:'barra-hex',   nome:'Barra hexagonal' },
  ]},
  { cat:'Cabos e polias', itens:[
    { id:'crossover',   nome:'Crossover' },
    { id:'polia-alta',  nome:'Polia alta' },
    { id:'polia-baixa', nome:'Polia baixa' },
  ]},
  { cat:'Máquinas', itens:[
    { id:'m-leg-press', nome:'Leg press' },
    { id:'m-extensora', nome:'Cadeira extensora' },
    { id:'m-flexora',   nome:'Mesa flexora' },
    { id:'m-hack',      nome:'Hack squat' },
    { id:'m-smith',     nome:'Multipower (Smith)' },
    { id:'m-peck',      nome:'Peck deck' },
    { id:'m-supino',    nome:'Máquina de supino' },
    { id:'m-ombros',    nome:'Máquina de ombros' },
    { id:'m-puxada',    nome:'Puxada frontal' },
    { id:'m-remada',    nome:'Remada sentada' },
    { id:'m-abdutora',  nome:'Abdutora / adutora' },
    { id:'m-gemeos',    nome:'Máquina de gémeos' },
    { id:'m-gluteos',   nome:'Máquina de glúteos' },
    { id:'m-abdominal', nome:'Máquina abdominal' },
    { id:'m-multi',     nome:'Estação multifunções' },
  ]},
  { cat:'Bancos e suportes', itens:[
    { id:'banco',       nome:'Banco plano' },
    { id:'banco-incl',  nome:'Banco inclinado' },
    { id:'rack',        nome:'Rack de agachamento' },
    { id:'barra-fixa',  nome:'Barra fixa' },
    { id:'paralelas',   nome:'Paralelas' },
    { id:'espaldar',    nome:'Espaldar / cadeira romana' },
  ]},
  { cat:'Acessórios', itens:[
    { id:'elasticos',   nome:'Elásticos' },
    { id:'trx',         nome:'TRX / fitas de suspensão' },
    { id:'corda',       nome:'Corda de saltar' },
    { id:'bola',        nome:'Bola suíça' },
    { id:'roda',        nome:'Roda abdominal' },
    { id:'colchao',     nome:'Colchão' },
    { id:'caixa',       nome:'Caixa de saltos' },
  ]},
  { cat:'Cardio', itens:[
    { id:'passadeira',  nome:'Passadeira' },
    { id:'bicicleta',   nome:'Bicicleta' },
    { id:'eliptica',    nome:'Elíptica' },
    { id:'remo-erg',    nome:'Remo ergómetro' },
    { id:'escada',      nome:'Escada / stepper' },
    { id:'air-bike',    nome:'Air bike' },
  ]},
];

/* Nomes genéricos que os exercícios usam, e a peça do catálogo que os ilustra. */
const ALIAS_EQUIPAMENTO = {
  'barra':'barra', 'barra olimpica':'barra', 'halteres':'halteres',
  'maquina':'m-peck', 'polia':'polia-alta', 'acessorio':'elasticos',
  'peso corporal':null, 'livre':null,
};

function chaveEquipamento(texto){
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const MAPA_EQUIPAMENTO = (() => {
  const mapa = {};
  for (const g of EQUIPAMENTOS) for (const it of g.itens) mapa[chaveEquipamento(it.nome)] = it.id;
  return mapa;
})();

/** id do catálogo a partir de um nome livre. Devolve null quando não há ilustração. */
function idEquipamento(nome){
  const k = chaveEquipamento(nome);
  if (k in ALIAS_EQUIPAMENTO) return ALIAS_EQUIPAMENTO[k];
  return MAPA_EQUIPAMENTO[k] || null;
}

const TOTAL_EQUIPAMENTOS = EQUIPAMENTOS.reduce((t, g) => t + g.itens.length, 0);

/** Nome legível a partir do id. */
function nomeEquipamento(id){
  for (const g of EQUIPAMENTOS){
    const i = g.itens.find(x => x.id === id);
    if (i) return i.nome;
  }
  return id;
}

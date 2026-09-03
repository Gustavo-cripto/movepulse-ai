/* Persistência em localStorage + acesso ao estado da aplicação. */

const CHAVE = 'movepulse.v1';
const SERVIDOR_PADRAO = 'https://movepulse-ia.azulequatorial.workers.dev';
const CHAVE_ANTIGA = 'forja.v1';   // nome anterior da app

const ESTADO_PADRAO = {
  exercicios: [],                       // exercícios criados pelo usuário
  treinos: JSON.parse(JSON.stringify(TREINOS_EXEMPLO)),
  sessoes: [],                          // histórico de treinos concluídos
  sessaoAtiva: null,
  config: {
    descanso: 90,
    unidade: 'kg',
    // Servidor por omissão: assim qualquer dispositivo funciona sem configuração.
    // (No iOS, a app instalada tem armazenamento separado do Safari e não herda definições.)
    tema: 'auto',                       // auto | claro | escuro
    ia: { modo: 'servidor', servidor: SERVIDOR_PADRAO, chave: '' },
    saude: { peso: false, treinos: false },   // ponte para o Apple Saúde
  },
  conversa: [],                         // perguntas ao treinador
  pesos: [],                            // {data, kg} ao longo do tempo
  planoIA: null,                        // último plano gerado pela IA
  programa: { 0:null, 1:null, 2:null, 3:null, 4:null, 5:null, 6:null },  // domingo a sábado
  planoConfig: {
    local:'Ginásio', tipo:'Força e hipertrofia', duracao:'60',
    foco:'Corpo inteiro', intensidade:'Moderada', superseries:false,
    musculos:[],                         // grupos a dar prioridade; vazio = equilibrado
    equipamento:[],                      // ids do catálogo; vazio = tudo
  },
  perfil: {
    nome:'', idade:'', altura:'', peso:'', sexo:'', pesoObjetivo:'',
    objetivo:'Hipertrofia (ganho de massa)', experiencia:'Iniciante',
    diasSemana:[1, 3, 5],           // 0=domingo … 6=sábado
    minutos:'60', limitacoes:'', notas:'',
  },
};

let estado = carregar();

function carregar(){
  try {
    // migra dados guardados quando a app ainda se chamava Forja
    const bruto = localStorage.getItem(CHAVE) || localStorage.getItem(CHAVE_ANTIGA);
    if (!bruto) return JSON.parse(JSON.stringify(ESTADO_PADRAO));
    const salvo = JSON.parse(bruto);
    const base = JSON.parse(JSON.stringify(ESTADO_PADRAO));
    return { ...base, ...salvo,
      programa: { ...base.programa, ...salvo.programa },
      perfil: { ...base.perfil, ...salvo.perfil },
      conversa: salvo.conversa || [],
      pesos: salvo.pesos || [],
      planoConfig: { ...base.planoConfig, ...salvo.planoConfig },
      config: { ...base.config, ...salvo.config,
        saude: { ...base.config.saude, ...(salvo.config && salvo.config.saude) },
        ia: { ...base.config.ia, ...(salvo.config && salvo.config.ia),
          // um endereço em branco vindo de uma versão antiga volta ao padrão
          servidor: (salvo.config?.ia?.servidor || SERVIDOR_PADRAO) } } };
  } catch (e) {
    console.warn('Estado corrompido, recomeçando do zero.', e);
    return JSON.parse(JSON.stringify(ESTADO_PADRAO));
  }
}

function salvar(){
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    console.error('Não foi possível salvar.', e);
    toast('Sem espaço para salvar os dados 😕');
  }
}

const Store = {
  get estado(){ return estado; },

  salvar,

  reset(){
    estado = JSON.parse(JSON.stringify(ESTADO_PADRAO));
    salvar();
  },

  /* ---------- exercícios ---------- */
  todosExercicios(){
    return [...EXERCICIOS_BASE, ...estado.exercicios];
  },
  exercicio(id){
    return Store.todosExercicios().find(e => e.id === id)
        || { id, nome:'Exercício removido', grupo:'—', equip:'—', tipo:'forca' };
  },
  criarExercicio({ nome, grupo, equip }){
    const ex = { id: uid('ex'), nome, grupo, equip: equip || 'Livre', tipo: grupo === 'Cardio' ? 'cardio' : 'forca' };
    estado.exercicios.push(ex);
    salvar();
    return ex;
  },
  removerExercicio(id){
    estado.exercicios = estado.exercicios.filter(e => e.id !== id);
    salvar();
  },
  ehCustomizado(id){
    return estado.exercicios.some(e => e.id === id);
  },

  /* ---------- treinos (fichas) ---------- */
  treino(id){ return estado.treinos.find(t => t.id === id); },
  salvarTreino(treino){
    const i = estado.treinos.findIndex(t => t.id === treino.id);
    if (i >= 0) estado.treinos[i] = treino; else estado.treinos.push(treino);
    salvar();
  },
  /** Apaga as fichas criadas por um plano da IA. */
  removerFichasDaIA(){
    const antigas = estado.treinos.filter(t => t.origem === 'ia').map(t => t.id);
    estado.treinos = estado.treinos.filter(t => t.origem !== 'ia');
    Object.keys(estado.programa).forEach(d => {
      if (antigas.includes(estado.programa[d])) estado.programa[d] = null;
    });
    salvar();
  },

  removerTreino(id){
    estado.treinos = estado.treinos.filter(t => t.id !== id);
    salvar();
  },

  /* ---------- sessão ativa ---------- */
  iniciarSessao(treinoId){
    const treino = treinoId ? Store.treino(treinoId) : null;
    estado.sessaoAtiva = {
      id: uid('s'),
      treinoId: treinoId || null,
      nome: treino ? treino.nome : 'Treino livre',
      inicio: Date.now(),
      atual: 0,                          // exercício em que se está

      exercicios: (treino ? treino.itens : []).map(it => ({
        exId: it.exId,
        series: Array.from({ length: it.series }, () => ({
          reps: it.reps || '',
          carga: Store.ultimaCarga(it.exId) || it.carga || '',
          feito: false,
        })),
      })),
    };
    salvar();
    return estado.sessaoAtiva;
  },
  /** Muda o exercício em que se está, dentro dos limites da sessão. */
  irParaExercicio(indice){
    const s = estado.sessaoAtiva;
    if (!s) return;
    s.atual = Math.max(0, Math.min(indice, s.exercicios.length - 1));
    salvar();
  },

  cancelarSessao(){
    estado.sessaoAtiva = null;
    salvar();
  },
  finalizarSessao(){
    const s = estado.sessaoAtiva;
    if (!s) return null;
    const concluida = {
      ...s,
      fim: Date.now(),
      exercicios: s.exercicios
        .map(ex => ({ ...ex, series: ex.series.filter(se => se.feito) }))
        .filter(ex => ex.series.length),
    };
    estado.sessaoAtiva = null;
    if (!concluida.exercicios.length) { salvar(); return null; }
    estado.sessoes.unshift(concluida);
    salvar();
    return concluida;
  },

  /* ---------- consultas de histórico ---------- */
  ultimaCarga(exId){
    for (const s of estado.sessoes){
      const ex = s.exercicios.find(e => e.exId === exId);
      if (ex && ex.series.length) return num(ex.series[ex.series.length - 1].carga);
    }
    return 0;
  },
  seriesDoExercicio(exId){
    // do mais antigo para o mais recente
    const saida = [];
    for (let i = estado.sessoes.length - 1; i >= 0; i--){
      const s = estado.sessoes[i];
      const ex = s.exercicios.find(e => e.exId === exId);
      if (ex) saida.push({ data: s.fim, series: ex.series });
    }
    return saida;
  },
  guardarPlanoConfig(campo, valor){
    estado.planoConfig[campo] = valor;
    salvar();
  },

  /** Liga ou desliga um grupo muscular na prioridade do plano. */
  alternarMusculo(grupo){
    const escolhidos = new Set(estado.planoConfig.musculos);
    escolhidos.has(grupo) ? escolhidos.delete(grupo) : escolhidos.add(grupo);
    estado.planoConfig.musculos = [...escolhidos];
    salvar();
  },

  /** Regista o peso de hoje, substituindo o registo do próprio dia. */
  registarPeso(kg){
    const hoje = chaveDia(new Date());
    estado.pesos = estado.pesos.filter(p => p.data !== hoje);
    estado.pesos.push({ data: hoje, kg: num(kg) });
    estado.pesos.sort((a, b) => a.data.localeCompare(b.data));
    estado.perfil.peso = String(kg);
    salvar();
  },

  guardarPerfil(campo, valor){
    estado.perfil[campo] = valor;
    salvar();
  },

  /** Liga ou desliga um dia de treino da semana. */
  alternarDiaTreino(dia){
    const dias = new Set(estado.perfil.diasSemana);
    dias.has(dia) ? dias.delete(dia) : dias.add(dia);
    estado.perfil.diasSemana = [...dias].sort();
    salvar();
  },

  /** Chaves 'aaaa-mm-dd' dos dias em que houve treino. */
  diasTreinados(){
    return new Set(estado.sessoes.map(s => chaveDia(new Date(s.fim))));
  },
  sessoesDoDia(chave){
    return estado.sessoes.filter(s => chaveDia(new Date(s.fim)) === chave);
  },
  treinoDoDia(diaSemana){
    const id = estado.programa[diaSemana];
    return id ? Store.treino(id) : null;
  },
  definirDia(diaSemana, treinoId){
    estado.programa[diaSemana] = treinoId || null;
    salvar();
  },

  exerciciosComHistorico(){
    const ids = new Set();
    estado.sessoes.forEach(s => s.exercicios.forEach(e => ids.add(e.exId)));
    return [...ids].map(id => Store.exercicio(id)).sort((a,b) => a.nome.localeCompare(b.nome));
  },
};

/* ---------- utilitários ---------- */
/** Data como 'aaaa-mm-dd' na hora local (não em UTC, que trocava o dia). */
function chaveDia(data){
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

function uid(prefixo){
  return prefixo + '-' + Math.random().toString(36).slice(2, 9);
}
function num(v){
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : 0;
}
function volumeSessao(sessao){
  return sessao.exercicios.reduce((tot, ex) =>
    tot + ex.series.reduce((t, se) => t + num(se.reps) * num(se.carga), 0), 0);
}
function totalSeries(sessao){
  return sessao.exercicios.reduce((t, ex) => t + ex.series.length, 0);
}
/** 1RM estimado pela fórmula de Epley. */
function rm1(carga, reps){
  const c = num(carga), r = num(reps);
  if (!c || !r) return 0;
  return r === 1 ? c : c * (1 + r / 30);
}

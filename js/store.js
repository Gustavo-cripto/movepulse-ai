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
    letra: 'condensado',                // condensado | moderno
    texto: 'normal',                    // normal | grande | enorme
    ia: { modo: 'servidor', servidor: SERVIDOR_PADRAO, chave: '' },
    saude: { peso: false, treinos: false },   // ponte para o Apple Saúde
  },
  conversa: [],                         // perguntas ao treinador
  pesos: [],                            // {data, kg} ao longo do tempo
  planoIA: null,                        // último plano gerado pela IA
  programa: { 0:null, 1:null, 2:null, 3:null, 4:null, 5:null, 6:null },  // domingo a sábado
  // Programa de várias semanas gerado pela IA. Enquanto está a decorrer, é ele
  // que manda no calendário; fora do seu intervalo volta a valer o programa
  // semanal acima. { inicio, nome, semanas:[{0..6: fichaId}] }
  programaIA: null,
  planoConfig: {
    local:'Ginásio', tipo:'Força e hipertrofia', duracao:'60',
    foco:'Corpo inteiro', intensidade:'Moderada', superseries:false,
    musculos:[],                         // grupos a dar prioridade; vazio = equilibrado
    equipamento:[],                      // ids do catálogo; vazio = tudo
    semanas: 6,                          // quantas semanas dura o programa gerado
  },
  // Diário alimentar. Os dias são guardados à parte, por chave AAAA-MM-DD,
  // para não se andar a reescrever o histórico todo a cada garfada.
  nutricao: {
    dias: {},             // '2026-10-01': { refeicoes:{...}, agua: 0 }
    meus: [],             // alimentos já usados, para repetir num toque
    alvoAgua: 2000,       // ml por dia
    // Em 'auto' os alvos saem do perfil (peso, altura, idade, sexo, objetivo).
    // Em 'manual' mandam os números aqui em baixo.
    // null num nutriente quer dizer "não acompanhar"
    alvos: { modo:'auto', kcal:null, prot:null, hc:null, gord:null,
             fib:null, ac:null, sat:null, sal:null },
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
      programaIA: salvo.programaIA || null,
      perfil: { ...base.perfil, ...salvo.perfil },
      conversa: salvo.conversa || [],
      pesos: salvo.pesos || [],
      nutricao: { ...base.nutricao, ...salvo.nutricao,
        dias: (salvo.nutricao && salvo.nutricao.dias) || {},
        meus: (salvo.nutricao && salvo.nutricao.meus) || [],
        alvos: { ...base.nutricao.alvos, ...(salvo.nutricao && salvo.nutricao.alvos) } },
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
    estado.programaIA = null;
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

  /** Apaga a pesagem de um dia. */
  removerPeso(data){
    const n = estado.pesos.findIndex(p => p.data === data);
    if (n === -1) return;
    estado.pesos.splice(n, 1);
    // o peso do perfil acompanha o registo mais recente que sobrou
    const ultimo = estado.pesos[estado.pesos.length - 1];
    if (ultimo) estado.perfil.peso = String(ultimo.kg);
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
  /** Em que semana do programa cai esta data, ou null se estiver fora dele. */
  semanaDoPrograma(data = new Date()){
    const pr = estado.programaIA;
    if (!pr?.semanas?.length) return null;
    const passadas = Math.floor((inicioDaSemana(data) - pr.inicio) / 604800000);
    return passadas >= 0 && passadas < pr.semanas.length ? passadas : null;
  },

  /** A ficha marcada para uma data, seguindo o programa quando está a decorrer. */
  treinoDaData(data){
    const semana = Store.semanaDoPrograma(data);
    const mapa = semana === null ? estado.programa : estado.programaIA.semanas[semana];
    const id = mapa?.[data.getDay()];
    return id ? Store.treino(id) : null;
  },

  treinoDoDia(diaSemana){
    return Store.treinoDaData(dataDoDiaNaSemana(diaSemana));
  },

  /** Edita o que está à vista: a semana do programa, se houver, senão a base. */
  definirDia(diaSemana, treinoId){
    const semana = Store.semanaDoPrograma(new Date());
    if (semana === null) estado.programa[diaSemana] = treinoId || null;
    else estado.programaIA.semanas[semana][diaSemana] = treinoId || null;
    salvar();
  },

  /** Guarda o programa que veio da IA, a começar na semana em curso. */
  guardarProgramaIA(semanas, nome, focos = []){
    estado.programaIA = semanas?.length
      ? { inicio: +inicioDaSemana(new Date()), nome: nome || 'Programa', semanas, focos }
      : null;
    salvar();
  },

  /* ---------------- Diário alimentar ---------------- */

  /** O dia pedido, criado em branco se ainda não existir. */
  diaNutricao(chave){
    const dias = estado.nutricao.dias;
    if (!dias[chave]) dias[chave] = { refeicoes: {}, agua: 0 };
    return dias[chave];
  },

  /** Regista um alimento numa refeição. O que fica guardado são os valores
      já calculados para aquela quantidade: se a ficha do alimento mudar
      amanhã, o que comeste ontem continua a ser o que comeste. */
  adicionarAlimento(chave, refeicao, item){
    const dia = Store.diaNutricao(chave);
    (dia.refeicoes[refeicao] ||= []).push(item);
    Store.lembrarAlimento(item);
    salvar();
  },

  removerAlimento(chave, refeicao, indice){
    const lista = estado.nutricao.dias[chave]?.refeicoes[refeicao];
    if (!lista) return;
    lista.splice(indice, 1);
    if (!lista.length) delete estado.nutricao.dias[chave].refeicoes[refeicao];
    salvar();
  },

  /** Guarda o alimento na lista dos usados, para a próxima ser um toque.
      Os mais recentes ficam à frente; guardamos 80, que chega. */
  lembrarAlimento(item){
    if (!item.alimento) return;
    const meus = estado.nutricao.meus;
    const igual = a => a.nome === item.alimento.nome && (a.marca || '') === (item.alimento.marca || '');
    const jaLa = meus.findIndex(igual);
    if (jaLa !== -1) meus.splice(jaLa, 1);
    meus.unshift({ ...item.alimento, origem: 'meu' });
    if (meus.length > 80) meus.length = 80;
  },

  esquecerAlimento(nome, marca = ''){
    const meus = estado.nutricao.meus;
    const n = meus.findIndex(a => a.nome === nome && (a.marca || '') === marca);
    if (n !== -1){ meus.splice(n, 1); salvar(); }
  },

  /** Guarda os objetivos de nutrição. Passar null em tudo volta ao automático. */
  guardarAlvos(alvos){
    estado.nutricao.alvos = { ...estado.nutricao.alvos, ...alvos };
    salvar();
  },

  guardarAlvoAgua(ml){
    estado.nutricao.alvoAgua = Math.max(250, Math.min(6000, Math.round(ml / 50) * 50));
    salvar();
  },

  registarAgua(chave, ml){
    const dia = Store.diaNutricao(chave);
    dia.agua = Math.max(0, (dia.agua || 0) + ml);
    salvar();
  },

  /** Soma de tudo o que foi comido num dia. `semDados` conta os alimentos
      que não trazem cada nutriente, para a app poder dizer que o total é
      parcial em vez de fingir que é zero. */
  totaisDoDia(chave){
    const campos = ['prot', 'hc', 'gord', 'fib', 'ac', 'sat', 'sal'];
    const total = { kcal:0, itens:0, semDados:{} };
    for (const k of campos){ total[k] = 0; total.semDados[k] = 0; }

    const dia = estado.nutricao.dias[chave];
    if (!dia) return total;

    for (const lista of Object.values(dia.refeicoes || {})){
      for (const it of lista){
        total.kcal += num(it.kcal);
        total.itens++;
        for (const k of campos){
          if (it[k] === undefined || it[k] === null) total.semDados[k]++;
          else total[k] += num(it[k]);
        }
      }
    }
    total.kcal = Math.round(total.kcal);
    for (const k of campos) total[k] = Math.round(total[k] * 10) / 10;
    return total;
  },

  /** Copia um dia inteiro para outro — para quem come o mesmo à segunda. */
  copiarDia(de, para){
    const fonte = estado.nutricao.dias[de];
    if (!fonte) return 0;
    const destino = Store.diaNutricao(para);
    let n = 0;
    for (const [refeicao, lista] of Object.entries(fonte.refeicoes || {})){
      destino.refeicoes[refeicao] = [...(destino.refeicoes[refeicao] || []),
                                     ...lista.map(x => ({ ...x }))];
      n += lista.length;
    }
    salvar();
    return n;
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
/** Segunda-feira da semana a que a data pertence, às 00:00. */
function inicioDaSemana(data){
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);   // 0 = domingo → recua 6
  return d;
}

/** A data em que cai um dia da semana (0 = domingo) na semana da referência. */
function dataDoDiaNaSemana(diaSemana, referencia = new Date()){
  const d = inicioDaSemana(referencia);
  d.setDate(d.getDate() + (diaSemana + 6) % 7);
  return d;
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

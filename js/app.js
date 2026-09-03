/* ============================================================
   MovePulse AI — app de treinos. Controlador principal dos ecrãs.
   ============================================================ */

const VERSAO_APP = 60;      // sobe a cada publicação, junto com o sw.js
let viewAtual = 'inicio';
let filtroGrupo = 'Todos';
let cronoInterval = null;
let restInterval = null;
let restRestante = 0;

/* ---------------- Navegação ---------------- */
function mostrar(view){
  viewAtual = view;
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + view; });
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.view === view));
  window.scrollTo({ top: 0 });
  render();
}

function render(){
  if (viewAtual === 'inicio')     renderInicio();
  if (viewAtual === 'treino')     renderTreino();
  if (viewAtual === 'bot')        renderBot();
  if (viewAtual === 'perfil')     renderPerfil();
  if (viewAtual === 'definicoes') renderDefinicoes();
  if (viewAtual === 'saude')      renderSaude();
  if (viewAtual === 'treinos')    renderTreinos();
  if (viewAtual === 'exercicios') renderExercicios();
  if (viewAtual === 'ia')         renderIA();
  if (viewAtual === 'fotos')      renderFotos();
  atualizarSubtitulo();
}

function atualizarSubtitulo(){
  const s = Store.estado.sessaoAtiva;
  $('#topbarSub').textContent = s ? `Em treino: ${s.nome}` : 'O teu diário de treino';
  atualizarTabTreino();
}

/** O separador do treino a decorrer aparece só quando há um, e leva de volta a ele. */
function atualizarTabTreino(){
  const s = Store.estado.sessaoAtiva;
  $('#tabTreino').hidden = !s;
  if (s) iniciarCrono();
}

/* ============================================================
   TELA: HOJE
   ============================================================ */
/** O ecrã do treino a decorrer; sem sessão, volta ao Início. */
function renderTreino(){
  const s = Store.estado.sessaoAtiva;
  if (!s){ pararCrono(); return mostrar('inicio'); }
  renderSessao(s);
}

/** Compatibilidade: quem chamava renderHoje quer o ecrã certo para o estado atual. */
function renderHoje(){
  if (Store.estado.sessaoAtiva) return mostrar('treino');
  pararCrono();
  mostrar('inicio');
}

/** Quantos treinos planeados para esta semana já foram feitos. */
function renderPlanoSemana(){
  const prog = resumoPrograma();
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const treinados = Store.diasTreinados();

  let planeados = 0, feitos = 0;
  for (let i = 0; i < 7; i++){
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    if (Store.treinoDaData(d)) planeados++;
    if (treinados.has(chaveDia(d))) feitos++;
  }
  const pct = planeados ? Math.min(100, Math.round((feitos / planeados) * 100)) : 0;

  $('#planoSemana').innerHTML = `
    <div class="item">
      <div>
        <h3 style="font-size:15px">Progresso semanal</h3>
        <p class="item__meta">${planeados ? `${feitos} de ${planeados} treinos planeados` : 'Ainda não planeaste a semana'}${
          prog ? ` · semana ${prog.semana} de ${prog.total}` : ''}</p>
      </div>
      <strong style="font-size:20px">${pct}%</strong>
    </div>
    <div class="barra"><div class="barra__cheio" style="width:${pct}%"></div></div>`;
}

function renderSaudacao(){
  const nome = Store.estado.perfil.nome.trim();
  const hoje = new Date();
  const h = hoje.getHours();
  const parte = h < 6 ? 'Boa madrugada' : h < 13 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite';
  // só a primeira letra em maiúscula: "Quarta-feira, 2 de setembro"
  const data = hoje.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' });
  $('#olaData').textContent = data.charAt(0).toUpperCase() + data.slice(1);
  $('#olaNome').textContent = nome ? `${parte}, ${nome}!` : `${parte}!`;
  $('#avatarIniciais').textContent = nome
    ? nome.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()
    : '👤';
}

/** Quanto tempo leva a ficha: cada série é o trabalho mais o descanso. */
function duracaoEstimada(ficha){
  const descanso = Store.estado.config.descanso || 90;
  const segundos = ficha.itens.reduce((t, it) =>
    t + it.series * (num(it.reps) * 3 + descanso), 0);
  return Math.max(10, Math.round(segundos / 60));
}

/** Os grupos musculares que a ficha trabalha, sem repetir. */
function gruposDaFicha(ficha){
  const vistos = [];
  ficha.itens.forEach(it => {
    const g = Store.exercicio(it.exId).grupo;
    if (!vistos.includes(g)) vistos.push(g);
  });
  return vistos;
}

/** Miniaturas: foto da máquina onde exista, senão o diagrama muscular. */
async function preencherMiniaturas(ficha){
  const alvo = $('#hojeMiniaturas');
  if (!alvo) return;
  const itens = ficha.itens.slice(0, 3);
  const partes = await Promise.all(itens.map(async it => {
    const ex = Store.exercicio(it.exId);
    const foto = await Fotos.ler(it.exId).catch(() => null);
    return foto
      ? `<img src="${foto}" alt="${esc(ex.nome)}">`
      : `<span class="mini-svg" title="${esc(ex.nome)}">${diagramaMusculos(ex.grupo).replace(/<\/?div[^>]*>/g, '')}</span>`;
  }));
  alvo.innerHTML = partes.join('');
}

/** O cartão grande do topo: o que há para fazer hoje. */
function renderCartaoHoje(){
  const hoje = new Date();
  const chave = chaveDia(hoje);
  const ficha = Store.treinoDaData(hoje);
  const feitasHoje = Store.sessoesDoDia(chave);

  if (feitasHoje.length){
    const volume = feitasHoje.reduce((t, s) => t + volumeSessao(s), 0);
    const minutos = Math.round(feitasHoje.reduce((t, s) => t + (s.fim - s.inicio), 0) / 6e4);
    $('#cartaoHoje').innerHTML = `
      <div class="hoje--feito">
        <span class="hoje__etiqueta">Feito hoje ✓</span>
        <p class="hoje__tempo">${minutos} <span>min</span></p>
        <p class="hoje__onde">${feitasHoje.map(s => esc(s.nome)).join(' · ')} — ${fmtNum(volume)} kg de volume</p>
      </div>`;
    return;
  }

  if (!ficha){
    $('#cartaoHoje').innerHTML = `
      <div>
        <span class="hoje__etiqueta">Hoje</span>
        <p class="hoje__tempo">Descanso</p>
        <p class="hoje__onde">Sem treino planeado. Podes treinar à mesma.</p>
        <div class="hoje__fundo">
          <span class="item__meta">Treino livre</span>
          <button class="hoje__ir" id="btnDescansoLivre" aria-label="Começar treino livre">→</button>
        </div>
      </div>`;
    $('#btnDescansoLivre').onclick = () => confirmar(
      'Começar um treino livre, sem ficha? O cronómetro arranca já.',
      () => { Store.iniciarSessao(null); mostrar('treino'); atualizarSubtitulo(); },
      'Começar');
    return;
  }

  const grupos = gruposDaFicha(ficha).slice(0, 3).join(', ');
  $('#cartaoHoje').innerHTML = `
    <div>
      <span class="hoje__etiqueta">Especial para hoje</span>
      <p class="hoje__tempo">${duracaoEstimada(ficha)} <span>min</span></p>
      <p class="hoje__onde">${esc(ficha.nome)} • ${esc(grupos)}</p>
      <div class="hoje__fundo">
        <div class="hoje__miniaturas" id="hojeMiniaturas"></div>
        <button class="hoje__ir" data-ver-treino="${ficha.id}" aria-label="Ver ${esc(ficha.nome)}">→</button>
      </div>
    </div>`;
  preencherMiniaturas(ficha);
}

let mesVisivel = null;   // primeiro dia do mês mostrado no calendário

/** Reduz o nome da ficha à sua marca: "Treino B" e "B — Costas" dão ambos "B". */
function abreviar(nome){
  const t = nome.trim();
  const comTraco = t.match(/^([A-Za-z0-9])\s*[—\-–:]/);          // "A — Peito"
  if (comTraco) return comTraco[1].toUpperCase();
  const comPalavra = t.match(/\b(?:treino|dia|sess[ãa]o)\s+([A-Za-z0-9])\b/i);  // "Treino B"
  if (comPalavra) return comPalavra[1].toUpperCase();
  return t.slice(0, 3);
}

/** Tira de sete dias, da segunda ao domingo desta semana. */
function renderSemana(){
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const treinados = Store.diasTreinados();

  $('#semana').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    const chave = chaveDia(d);
    const ficha = Store.treinoDaData(d);
    const feito = treinados.has(chave);
    const eHoje = chave === chaveDia(hoje);
    return `<button class="dia ${ficha ? 'tem-plano' : ''} ${feito ? 'feito' : ''} ${eHoje ? 'hoje' : ''}"
              data-dia="${d.getDay()}" title="${ficha ? esc(ficha.nome) : 'Sem treino planeado'}">
      <span class="dia__letra">${eHoje ? 'HOJE' : LETRAS_DIA[d.getDay()]}</span>
      <span class="dia__bola">${feito ? '✓' : (ficha ? esc(abreviar(ficha.nome)) : d.getDate())}</span>
    </button>`;
  }).join('');
}

/** Escolher que ficha se faz em cada dia da semana. */
function editorPrograma(){
  const opcoes = id => ['<option value="">— descanso —</option>']
    .concat(Store.estado.treinos.map(t =>
      `<option value="${t.id}" ${id === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`)).join('');

  const prog = resumoPrograma();
  const semanaAtual = Store.semanaDoPrograma(new Date());
  const mapa = semanaAtual === null
    ? Store.estado.programa
    : Store.estado.programaIA.semanas[semanaAtual];

  Modal.abrir({
    titulo: prog ? `Semana ${prog.semana} de ${prog.total}` : 'Planear a semana',
    corpo: NOMES_DIA.map((nome, i) => `
      <div class="field">
        <label class="label" for="dia${i}">${nome}</label>
        <select class="input" id="dia${i}" data-dia-sel="${i}">${opcoes(mapa[i])}</select>
      </div>`).join('') +
      `<p class="item__meta">${prog
        ? 'Estás a mexer só nesta semana do programa. As outras semanas ficam como estão.'
        : 'Repete-se todas as semanas. Podes começar qualquer treino fora do plano na mesma.'}</p>`,
    acoes: [
      { texto:'Fechar', onClick: Modal.fechar },
      { texto:'Guardar', classe:'btn--primary', onClick(){
          $$('[data-dia-sel]').forEach(sel => Store.definirDia(+sel.dataset.diaSel, sel.value));
          Modal.fechar();
          render();
          toast('Semana planeada ✅');
        } },
    ],
  });
}

function renderInicio(){
  const { sessoes } = Store.estado;
  renderSaudacao();
  renderCartaoHoje();
  renderSemana();
  renderPlanoSemana();
  renderMes();
  renderProgresso();

  $('#ultimasSessoes').innerHTML = sessoes.length
    ? sessoes.slice(0, 3).map(cardSessao).join('')
    : '<p class="empty">Os treinos concluídos aparecem aqui.</p>';
}

function cardSessao(s){
  return `<button class="card card--tap" data-sessao="${s.id}">
    <div class="item">
      <div>
        <h3>${esc(s.nome)}</h3>
        <p class="item__meta">${fmtDataHora(s.fim)} · ${fmtDuracao(s.fim - s.inicio)}</p>
      </div>
      <div style="text-align:right">
        <strong>${fmtNum(volumeSessao(s))} kg</strong>
        <p class="item__meta">${totalSeries(s)} séries</p>
      </div>
    </div>
  </button>`;
}

/* ---------------- Sessão em andamento ---------------- */
function renderSessao(s){
  $('#sessaoNome').textContent = s.nome;
  $('#sessaoInfo').textContent = 'Iniciado às ' +
    new Date(s.inicio).toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });

  const total = s.exercicios.length;
  if (!total){
    $('#sessaoExercicios').innerHTML = '<p class="empty">Adiciona o primeiro exercício deste treino.</p>';
    atualizarStats();
    iniciarCrono();
    return;
  }

  const i = Math.max(0, Math.min(s.atual ?? 0, total - 1));
  const item = s.exercicios[i];
  const ex = Store.exercicio(item.exId);
  const cardio = ex.tipo === 'cardio';
  const feitasAqui = item.series.filter(se => se.feito).length;

  $('#sessaoExercicios').innerHTML = `
    <div class="tira-ex">
      ${s.exercicios.map((it, n) => {
        const e = Store.exercicio(it.exId);
        const completo = it.series.every(se => se.feito);
        return `<button class="tira-item ${n === i ? 'is-atual' : ''} ${completo ? 'is-feito' : ''}"
                  data-ir-ex="${n}" id="tira-${n}" title="${esc(e.nome)}">
          ${diagramaMusculos(e.grupo)}
          <span class="tira-num">${completo ? '✓' : n + 1}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="card" data-ex-idx="${i}">
      <p class="passo-conta">Exercício ${i + 1} de ${total} · ${feitasAqui}/${item.series.length} séries</p>
      <div class="card__title">
        <div class="ex-cabeca">
          ${diagramaMusculos(ex.grupo)}
          <div>
            <h3>${esc(ex.nome)}</h3>
            <p class="item__meta">${esc(ex.grupo)} · ${esc(ex.equip)}</p>
          </div>
        </div>
        <button class="icon-btn" data-rm-ex="${i}" aria-label="Remover exercício">🗑</button>
      </div>

      <div class="acoes-ex">
        <button class="btn btn--sm btn--primary" id="exComoFazer">▶ Como fazer</button>
        <button class="btn btn--sm btn--ghost" id="exSubstituir">⇄ Substituir</button>
        <button class="btn btn--sm btn--ghost" id="exHistorico">📈 Histórico</button>
      </div>

      <div class="set-head">
        <span>#</span><span>${cardio ? 'Minutos' : 'Reps'}</span><span>${cardio ? 'Nível/km' : 'Carga (kg)'}</span><span>OK</span>
      </div>
      ${item.series.map((se, j) => `
        <div class="set-row ${se.feito ? 'is-done' : ''}">
          <span class="set-row__n">${j + 1}</span>
          <input type="number" inputmode="decimal" step="any" min="0" value="${se.reps ?? ''}"
                 data-campo="reps" data-i="${i}" data-j="${j}" placeholder="—">
          <input type="number" inputmode="decimal" step="any" min="0" value="${se.carga ?? ''}"
                 data-campo="carga" data-i="${i}" data-j="${j}" placeholder="—">
          <button class="set-check" data-check="${i}:${j}" aria-label="Concluir série">✓</button>
        </div>`).join('')}

      <div class="row-actions" style="margin-top:10px">
        <button class="btn btn--sm btn--ghost" data-add-serie="${i}">+ Série</button>
        <button class="btn btn--sm btn--ghost" data-rm-serie="${i}">− Série</button>
      </div>
    </div>

    <div class="navegar">
      <button class="btn btn--ghost" id="exAnterior" ${i === 0 ? 'disabled' : ''}>‹ Anterior</button>
      ${i < total - 1
        ? '<button class="btn btn--primary" id="exSeguinte">Seguinte ›</button>'
        : '<button class="btn btn--primary" id="exTerminar">Terminar treino</button>'}
    </div>
    <p class="item__meta" style="text-align:center;margin-top:8px">
      desliza para o lado para mudar de exercício</p>`;

  $('#exComoFazer').onclick = () => comoFazer(item.exId);
  $('#exSubstituir').onclick = () => seletorExercicio(novo => {
    // troca o exercício mas mantém as séries já registadas
    item.exId = novo.id;
    Store.salvar();
    renderSessao(Store.estado.sessaoAtiva);
    toast(`Trocado para ${novo.nome}`);
  });
  $('#exHistorico').onclick = () => detalheExercicio(item.exId);

  $('#exAnterior').onclick = () => { Store.irParaExercicio(i - 1); renderSessao(Store.estado.sessaoAtiva); window.scrollTo({ top:0, behavior:'smooth' }); };
  const seguinte = $('#exSeguinte');
  if (seguinte) seguinte.onclick = () => { Store.irParaExercicio(i + 1); renderSessao(Store.estado.sessaoAtiva); window.scrollTo({ top:0, behavior:'smooth' }); };
  const terminar = $('#exTerminar');
  if (terminar) terminar.onclick = () => confirmar('Terminar e guardar este treino?', finalizarSessao, 'Terminar');

  setTimeout(carregarMiniaturas, 0);
  atualizarStats();
  iniciarCrono();
}

/** Põe a foto da máquina no cartão de cada exercício, se existir. */
async function carregarMiniaturas(){
  const s = Store.estado.sessaoAtiva;
  if (!s || !s.exercicios.length) return;
  const atual = Math.max(0, Math.min(s.atual ?? 0, s.exercicios.length - 1));

  for (const [n, item] of s.exercicios.entries()){
    const foto = await Fotos.ler(item.exId).catch(() => null);
    if (!foto) continue;

    const naTira = $(`#tira-${n}`);
    if (naTira && !naTira.querySelector('img')){
      const mini = document.createElement('img');
      mini.src = foto; mini.alt = '';
      naTira.querySelector('.musculos')?.replaceWith(mini);
    }
    if (n !== atual) continue;

    const cabeca = $(`[data-ex-idx="${atual}"] .ex-cabeca`);
    if (cabeca && !cabeca.querySelector('.ex-mini')){
      const img = document.createElement('img');
      img.className = 'ex-mini';
      img.src = foto; img.alt = '';
      cabeca.prepend(img);
    }
  }
}

function atualizarStats(){
  const s = Store.estado.sessaoAtiva;
  if (!s) return;
  const feitas = s.exercicios.flatMap(ex => ex.series.filter(se => se.feito));
  const volume = s.exercicios.reduce((tot, ex) =>
    tot + ex.series.filter(se => se.feito).reduce((t, se) => t + num(se.reps) * num(se.carga), 0), 0);
  $('#statSeries').textContent  = feitas.length;
  $('#statVolume').textContent  = fmtNum(volume);
  $('#statExs').textContent     = s.exercicios.filter(ex => ex.series.some(se => se.feito)).length;
}

function iniciarCrono(){
  if (cronoInterval) return;
  const tick = () => {
    const s = Store.estado.sessaoAtiva;
    if (!s) return pararCrono();
    const decorrido = fmtDuracao(Date.now() - s.inicio);
    const relogio = $('#cronometro');
    if (relogio) relogio.textContent = decorrido;
    $('#tabTreinoTempo').textContent = decorrido;
  };
  tick();
  cronoInterval = setInterval(tick, 1000);
}
function pararCrono(){
  clearInterval(cronoInterval);
  cronoInterval = null;
  if (!Store.estado.sessaoAtiva) $('#tabTreino').hidden = true;
}

/* ============================================================
   Gestos do treino: deslizar entre exercícios e marcar a série
   ============================================================ */
/** Deslizar na horizontal passa ao exercício seguinte ou anterior. */
function ligarDeslizeExercicios(){
  const vista = $op('#view-treino');
  if (!vista.addEventListener) return;
  let x0 = null, y0 = null;

  vista.addEventListener('touchstart', e => {
    // a tira de miniaturas e os campos têm gestos próprios
    if (e.target.closest('.tira-ex, input, select, textarea, button, .set-row')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive:true });

  vista.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const s = Store.estado.sessaoAtiva;
    if (!s) return;
    Store.irParaExercicio((s.atual ?? 0) + (dx < 0 ? 1 : -1));
    renderSessao(s);
    window.scrollTo({ top:0, behavior:'smooth' });
  }, { passive:true });
}

/** Arrastar a linha da série para a direita marca-a como feita. */
function ligarDeslizeSeries(){
  const vista = $op('#view-treino');
  if (!vista.addEventListener) return;
  let linha = null, x0 = 0, y0 = 0, dx = 0, horizontal = false;

  vista.addEventListener('touchstart', e => {
    if (e.target.closest('input, button')) { linha = null; return; }
    linha = e.target.closest('.set-row');
    if (!linha) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = false;
  }, { passive:true });

  vista.addEventListener('touchmove', e => {
    if (!linha) return;
    dx = e.touches[0].clientX - x0;
    const dy = e.touches[0].clientY - y0;
    if (!horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) horizontal = true;
    if (!horizontal) return;
    e.preventDefault();
    const puxado = Math.max(0, Math.min(dx, 96));
    linha.classList.add('a-arrastar');
    linha.classList.toggle('vai-marcar', puxado > 60);
    linha.style.transform = `translateX(${puxado}px)`;
  }, { passive:false });

  const largar = () => {
    if (!linha) return;
    const marcar = horizontal && dx > 60;
    linha.classList.remove('a-arrastar', 'vai-marcar');
    linha.style.transform = '';
    if (marcar) linha.querySelector('.set-check')?.click();
    linha = null;
  };
  vista.addEventListener('touchend', largar, { passive:true });
  vista.addEventListener('touchcancel', largar, { passive:true });
}

/* ---------------- Descanso ---------------- */
const VOLTA_ANEL = 2 * Math.PI * 19;   // perímetro do anel do descanso

function pintarAnel(restante, total){
  const anel = $('#restAnel');
  if (anel) anel.style.strokeDashoffset = VOLTA_ANEL * (1 - Math.max(0, restante) / total);
}

function iniciarDescanso(){
  const seg = Store.estado.config.descanso;
  if (!seg) return;
  restRestante = seg;
  $('#rest').hidden = false;
  $('#restTempo').textContent = restRestante;
  // sem transição no arranque, senão o anel roda para trás à vista
  $('#restAnel').style.transition = 'none';
  pintarAnel(seg, seg);
  requestAnimationFrame(() => { $('#restAnel').style.transition = ''; });

  clearInterval(restInterval);
  restInterval = setInterval(() => {
    restRestante--;
    $('#restTempo').textContent = Math.max(0, restRestante);
    pintarAnel(restRestante, seg);
    if (restRestante <= 0){ pararDescanso(); bipe(); toast('Descanso concluído 💪'); }
  }, 1000);
}
function pararDescanso(){
  clearInterval(restInterval);
  restInterval = null;
  $('#rest').hidden = true;
}

/* ============================================================
   TELA: FICHAS
   ============================================================ */
function renderTreinos(){
  const { treinos } = Store.estado;
  $('#listaTreinos').innerHTML = treinos.length
    ? treinos.map(t => `
      <div class="card" data-ver-treino="${t.id}">
        <div class="card__title">
          <div>
            <h3>${esc(t.nome)}</h3>
            <p class="item__meta">${t.itens.length} exercícios · ${duracaoEstimada(t)} min${t.notas ? ' · ' + esc(t.notas) : ''}</p>
          </div>
          <div style="display:flex;gap:2px">
            <button class="icon-btn" data-edit-treino="${t.id}" aria-label="Editar">✏️</button>
            <button class="icon-btn" data-del-treino="${t.id}" aria-label="Eliminar">🗑</button>
          </div>
        </div>
        <p class="item__meta" style="margin:8px 0 12px">
          ${t.itens.slice(0, 4).map(i => esc(Store.exercicio(i.exId).nome)).join(' · ')}${t.itens.length > 4 ? ' …' : ''}
        </p>
        <button class="btn btn--sm btn--primary btn--block" data-ver-treino="${t.id}">Ver treino</button>
      </div>`).join('')
    : '<p class="empty">Cria a tua primeira ficha para começar.</p>';
}

/** O que aconteceu (ou vai acontecer) num dia do calendário. */
function abrirDia(chave, diaSemana){
  const sessoes = Store.sessoesDoDia(chave);
  const [ano, mes, dia] = chave.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const ficha = Store.treinoDaData(data);
  const titulo = data.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' });

  if (sessoes.length === 1) return detalheSessao(sessoes[0].id);

  if (sessoes.length > 1){
    return Modal.abrir({
      titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      corpo: `<div class="stack">${sessoes.map(cardSessao).join('')}</div>`,
      acoes: [{ texto:'Fechar', onClick: Modal.fechar }],
    });
  }

  if (ficha) return detalheTreino(ficha.id);

  Modal.abrir({
    titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
    corpo: `<p class="empty">Sem treino planeado para este dia.</p>`,
    acoes: [
      { texto:'Fechar', onClick: Modal.fechar },
      { texto:'Planear semana', classe:'btn--primary', onClick(){ Modal.fechar(); editorPrograma(); } },
    ],
  });
}

/** Mostra o que a ficha tem antes de começar — nada arranca sem se carregar em Iniciar. */
/** Equipamento distinto que uma ficha precisa, pela ordem dos exercícios.
    "Barra olímpica" e "Barra" são a mesma peça: junta-se pelo id do catálogo
    e fica o nome do catálogo, que é o mais claro dos dois. */
function equipamentoDaFicha(ficha){
  const vistos = [];
  for (const it of ficha.itens){
    const nome = Store.exercicio(it.exId)?.equip;
    if (!nome) continue;
    const id = idEquipamento(nome);
    if (vistos.some(e => (id && e.id === id) || e.nome === nome)) continue;
    vistos.push({ id, nome: id ? nomeEquipamento(id) : nome });
  }
  return vistos;
}

/** Fita de equipamento necessário, com a ilustração de cada peça. */
function chipsEquipamento(ficha){
  const nomes = equipamentoDaFicha(ficha);
  if (!nomes.length) return '';
  return `<label class="label" style="margin-top:12px">Equipamento necessário</label>
    <div class="chips-eq">${nomes.map(e =>
      `<span class="chip-eq">${e.id ? iconeEquipamento(e.id) : ''}${esc(e.nome)}</span>`).join('')}</div>`;
}

async function detalheTreino(id){
  const ficha = Store.treino(id);
  if (!ficha) return;
  const grupos = gruposDaFicha(ficha).join(', ');

  Modal.abrir({
    titulo: ficha.nome,
    corpo: `
      <div class="previa-topo">
        <div class="grid grid--stats" style="flex:1">
          ${statBox(duracaoEstimada(ficha) + ' min', 'duração')}
          ${statBox(ficha.itens.length, 'exercícios')}
          ${statBox(ficha.itens.reduce((t, i) => t + i.series, 0), 'séries')}
        </div>
        <div class="previa-corpo">${diagramaMusculos(gruposDaFicha(ficha))}</div>
      </div>
      <p class="item__meta" style="margin-top:10px">${esc(grupos)}</p>
      ${chipsEquipamento(ficha)}
      <div class="stack" style="margin-top:14px">
        ${ficha.itens.map(it => {
          const ex = Store.exercicio(it.exId);
          const carga = Store.ultimaCarga(it.exId);
          return `<div class="ia-ex ia-ex--toca" data-prev-ex="${it.exId}" role="button" tabindex="0">
            <span class="ia-media">${diagramaMusculos(ex.grupo)}</span>
            <div>
              <b>${esc(ex.nome)}</b>
              <span> · ${esc(ex.equip)}</span>
              ${carga ? `<div><span>última carga ${fmtPeso(carga)} kg</span></div>` : ''}
            </div>
            <div class="prescricao">${it.series}×${it.reps}</div>
          </div>`;
        }).join('')}
      </div>`,
    acoes: [
      { texto:'Fechar', onClick: Modal.fechar },
      { texto:'Iniciar treino', classe:'btn--primary', onClick(){
          if (Store.estado.sessaoAtiva) return toast('Já tens um treino a decorrer.');
          Modal.fechar();
          Store.iniciarSessao(ficha.id);
          mostrar('treino');
        } },
    ],
  });

  // tocar num exercício mostra como se executa, e volta a esta lista ao fechar
  $('#modalCorpo').onclick = e => {
    const linha = e.target.closest('[data-prev-ex]');
    if (linha) comoFazer(linha.dataset.prevEx, () => detalheTreino(ficha.id));
  };

  // miniaturas das máquinas, quando existirem
  for (const it of ficha.itens){
    const foto = await Fotos.ler(it.exId).catch(() => null);
    if (!foto) continue;
    const media = $(`[data-prev-ex="${it.exId}"] .ia-media`);
    if (media && !media.querySelector('.ex-mini')){
      const img = document.createElement('img');
      img.className = 'ex-mini'; img.src = foto; img.alt = '';
      media.prepend(img);
    }
  }
}

function editorTreino(id){
  const treino = id
    ? JSON.parse(JSON.stringify(Store.treino(id)))
    : { id: uid('t'), nome:'', notas:'', itens:[] };

  const desenhar = () => {
    Modal.abrir({
      titulo: id ? 'Editar ficha' : 'Nova ficha',
      corpo: `
        <div class="field">
          <label class="label" for="fNome">Nome da ficha</label>
          <input class="input" id="fNome" value="${esc(treino.nome)}" placeholder="Ex.: A — Superiores">
        </div>
        <div class="field">
          <label class="label" for="fNotas">Observação (opcional)</label>
          <input class="input" id="fNotas" value="${esc(treino.notas)}" placeholder="Ex.: Empurrar">
        </div>
        <label class="label">Exercícios</label>
        <div class="stack">
          ${treino.itens.map((it, i) => `
            <div class="card" style="padding:11px">
              <div class="card__title">
                <h3 style="font-size:14px">${esc(Store.exercicio(it.exId).nome)}</h3>
                <button class="icon-btn" data-rm-item="${i}" aria-label="Remover">🗑</button>
              </div>
              <div class="field-row" style="margin-top:9px">
                <div>
                  <label class="label">Séries</label>
                  <input class="input" type="number" min="1" max="20" value="${it.series}" data-item="${i}" data-prop="series">
                </div>
                <div>
                  <label class="label">Reps</label>
                  <input class="input" type="number" min="1" max="500" value="${it.reps}" data-item="${i}" data-prop="reps">
                </div>
              </div>
            </div>`).join('') || '<p class="empty">Nenhum exercício adicionado.</p>'}
        </div>
        <button class="btn btn--ghost btn--block" id="fAddEx" style="margin-top:12px">+ Adicionar exercício</button>`,
      acoes: [
        { texto:'Cancelar', onClick: Modal.fechar },
        { texto:'Guardar', classe:'btn--primary', onClick(){
            const nome = $('#fNome').value.trim();
            if (!nome) return toast('Dá um nome à ficha.');
            if (!treino.itens.length) return toast('Adiciona pelo menos um exercício.');
            treino.nome  = nome;
            treino.notas = $('#fNotas').value.trim();
            Store.salvarTreino(treino);
            Modal.fechar();
            render();
            toast('Ficha guardada ✅');
          } },
      ],
    });

    const capturarCampos = () => {
      treino.nome  = $('#fNome').value;
      treino.notas = $('#fNotas').value;
    };

    $('#modalCorpo').oninput = e => {
      const alvo = e.target;
      if (alvo.dataset.item !== undefined){
        const it = treino.itens[+alvo.dataset.item];
        it[alvo.dataset.prop] = Math.max(1, parseInt(alvo.value, 10) || 1);
      }
    };
    $('#modalCorpo').onclick = e => {
      const rm = e.target.closest('[data-rm-item]');
      if (rm){
        capturarCampos();
        treino.itens.splice(+rm.dataset.rmItem, 1);
        desenhar();
        return;
      }
      if (e.target.closest('#fAddEx')){
        capturarCampos();
        seletorExercicio(ex => {
          treino.itens.push({ exId: ex.id, series:3, reps: ex.tipo === 'cardio' ? 20 : 10, carga:0 });
          desenhar();
        });
      }
    };
  };
  desenhar();
}

/* ---------------- Seletor de exercício ---------------- */
function seletorExercicio(aoEscolher){
  const desenhar = (busca = '') => {
    const termo = busca.toLowerCase();
    const lista = Store.todosExercicios()
      .filter(e => e.nome.toLowerCase().includes(termo) || e.grupo.toLowerCase().includes(termo))
      .slice(0, 60);
    $('#modalCorpo').innerHTML = `
      <input class="input" id="pBusca" placeholder="Buscar…" value="${esc(busca)}" autocomplete="off">
      <div class="stack" style="margin-top:12px">
        ${lista.map(e => `
          <button class="card card--tap" data-pick="${e.id}" style="padding:11px">
            <div class="item">
              <div><h3 style="font-size:14px">${esc(e.nome)}</h3>
                   <p class="item__meta">${esc(e.equip)}</p></div>
              <span class="tag">${esc(e.grupo)}</span>
            </div>
          </button>`).join('') || '<p class="empty">Nada encontrado.</p>'}
      </div>`;
    const inp = $('#pBusca');
    inp.oninput = () => { const v = inp.value; desenhar(v); $('#pBusca').focus(); };
  };

  Modal.abrir({ titulo:'Escolher exercício', corpo:'', acoes:[{ texto:'Fechar', onClick: Modal.fechar }] });
  desenhar();
  $('#modalCorpo').onclick = e => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    Modal.fechar();
    aoEscolher(Store.exercicio(btn.dataset.pick));
  };
}

/* ============================================================
   TELA: EXERCÍCIOS
   ============================================================ */
function renderExercicios(){
  const chips = $('#filtrosGrupo');
  if (!chips.children.length){
    chips.innerHTML = ['Todos', ...GRUPOS]
      .map(g => `<button class="chip ${g === filtroGrupo ? 'is-active' : ''}" data-grupo="${esc(g)}">${esc(g)}</button>`).join('');
  }
  $$('.chip', chips).forEach(c => c.classList.toggle('is-active', c.dataset.grupo === filtroGrupo));

  const termo = $('#buscaEx').value.trim().toLowerCase();
  const lista = Store.todosExercicios().filter(e =>
    (filtroGrupo === 'Todos' || e.grupo === filtroGrupo) &&
    (!termo || e.nome.toLowerCase().includes(termo)));

  $('#listaExercicios').innerHTML = lista.length
    ? lista.map(e => {
        const carga = Store.ultimaCarga(e.id);
        return `<button class="card card--tap" data-ex="${e.id}">
          <div class="item">
            <div>
              <h3 style="font-size:15px">${esc(e.nome)}</h3>
              <p class="item__meta">${esc(e.equip)}${carga ? ' · última carga ' + fmtPeso(carga) + ' kg' : ''}</p>
            </div>
            <span class="tag">${esc(e.grupo)}</span>
          </div>
        </button>`;
      }).join('')
    : '<p class="empty">Nenhum exercício encontrado.</p>';
}

async function detalheExercicio(id){
  const ex = Store.exercicio(id);
  const foto = await Fotos.ler(id).catch(() => null);
  const hist = Store.seriesDoExercicio(id);
  const melhores = hist.flatMap(h => h.series);
  const melhorCarga = Math.max(0, ...melhores.map(s => num(s.carga)));
  const melhorRM = Math.max(0, ...melhores.map(s => rm1(s.carga, s.reps)));

  const acoes = [{ texto:'Fechar', onClick: Modal.fechar }];
  if (Store.estado.sessaoAtiva){
    acoes.push({ texto:'Adicionar ao treino', classe:'btn--primary', onClick(){
      adicionarExercicioSessao(ex.id);
      Modal.fechar();
      mostrar('inicio');
    }});
  }
  if (Store.ehCustomizado(id)){
    acoes.unshift({ texto:'Eliminar', classe:'btn--danger', onClick(){
      confirmar(`Eliminar "${ex.nome}"? As fichas que o usam ficam sem esse exercício.`, () => {
        Store.removerExercicio(id);
        Modal.fechar();
        render();
      }, 'Eliminar');
    }});
  }

  Modal.abrir({
    titulo: ex.nome,
    corpo: `
      <div class="ex-cabeca">
        ${diagramaMusculos(ex.grupo)}
        <div>
          <p><span class="tag">${esc(ex.grupo)}</span><span class="tag">${esc(ex.equip)}</span></p>
          <p style="margin-top:6px"><button class="btn btn--sm btn--primary" id="exDetComoFazer">▶ Como fazer</button></p>
        </div>
      </div>
      ${foto ? `<img class="foto-maquina" src="${foto}" alt="Máquina de ${esc(ex.nome)}">` : ''}
      <div class="row-actions" style="margin-top:10px">
        <button class="btn btn--sm btn--ghost" id="btnFotoMaquina">📷 ${foto ? 'Trocar foto' : 'Foto da máquina'}</button>
        ${foto ? '<button class="btn btn--sm btn--danger" id="btnApagarFoto">Remover foto</button>' : ''}
      </div>
      <input type="file" id="ficheiroMaquina" accept="image/*" capture="environment" hidden>

      <div class="grid grid--stats" style="margin-top:14px">
        ${statBox(hist.length, 'treinos')}
        ${statBox(melhorCarga ? fmtPeso(melhorCarga) + ' kg' : '—', 'melhor carga')}
        ${statBox(melhorRM ? fmtPeso(melhorRM) + ' kg' : '—', '1RM estimado')}
      </div>
      ${hist.length ? `<label class="label" style="margin-top:16px">Últimos registos</label>
      <div class="stack">
        ${hist.slice(-5).reverse().map(h => `
          <div class="card" style="padding:11px">
            <p class="item__meta">${fmtDataHora(h.data)}</p>
            <p style="margin-top:4px">${h.series.map(s => `${num(s.reps)}×${fmtPeso(s.carga)}kg`).join(' · ')}</p>
          </div>`).join('')}
      </div>` : '<p class="empty" style="margin-top:14px">Ainda sem registos.</p>'}`,
    acoes,
  });

  $('#exDetComoFazer').onclick = () => comoFazer(id);
  $('#btnFotoMaquina').onclick = () => $('#ficheiroMaquina').click();
  $('#ficheiroMaquina').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { dataUrl } = await comprimirFoto(f);
      await Fotos.guardar(id, dataUrl);
      toast('Foto guardada ✅');
      detalheExercicio(id);
      if (Store.estado.sessaoAtiva) renderSessao(Store.estado.sessaoAtiva);
    } catch (erro) {
      toast('Não consegui guardar a foto.');
    }
  };
  const btnApagar = $('#btnApagarFoto');
  if (btnApagar) btnApagar.onclick = async () => {
    await Fotos.apagar(id);
    toast('Foto removida.');
    detalheExercicio(id);
    if (Store.estado.sessaoAtiva) renderSessao(Store.estado.sessaoAtiva);
  };
}

/* A foto que o utilizador tira do exercício em si, à parte da foto da máquina. */
const CHAVE_FOTO_EX = 'ex:';

/** Mostra o boneco a executar o exercício, com as dicas de técnica. */
let pararAnimacao = null;
async function comoFazer(exId, voltar){
  const ex = Store.exercicio(exId);
  const mov = movimentoDoExercicio(ex);
  // As dicas são de um padrão de movimento. Nos exercícios do catálogo
  // alargado não há padrão próprio, e mostrar as de outro exercício seria
  // pior do que não mostrar nada.
  const proprio = temMovimentoProprio(ex);
  const foto = await Fotos.ler(CHAVE_FOTO_EX + exId).catch(() => null);
  const temFigura = !!figuraDoExercicio(ex);

  Modal.abrir({
    titulo: ex.nome,
    corpo: `
      ${temFigura
        ? `<div class="figura-ex" id="figuraEx"></div>
           <p class="figura-creditos">Ilustração: Workout Guide · Everkinetic ·
             <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>`
        : '<div class="palco" id="palcoBoneco"></div>'}
      <p class="item__meta" style="margin-top:8px">${
        proprio ? esc(mov.nome) + ' · ' : ''}${esc(ex.grupo)} · ${esc(ex.equip)}</p>
      ${foto ? `<img class="foto-exercicio" src="${foto}" alt="Foto de ${esc(ex.nome)}">` : ''}
      <div class="row-actions" style="margin-top:10px">
        <button class="btn btn--sm btn--ghost" id="btnFotoEx">📷 ${foto ? 'Trocar a minha foto' : 'Incluir foto do exercício'}</button>
        ${foto ? '<button class="btn btn--sm btn--danger" id="btnApagarFotoEx">Remover</button>' : ''}
      </div>
      <input type="file" id="ficheiroEx" accept="image/*" hidden>
      ${proprio ? `<label class="label" style="margin-top:14px">Como fazer</label>
      <ol class="dicas">${mov.dicas.map(d => `<li>${esc(d)}</li>`).join('')}</ol>`
      : `<p class="item__meta" style="margin-top:14px">Segue a figura para o padrão do movimento.
         Para a técnica ao pormenor, vê o vídeo aqui em baixo.</p>`}
      <div class="ex-cabeca" style="margin-top:14px">
        ${diagramaMusculos(ex.grupo)}
        <div>
          <p class="item__meta">Músculos trabalhados</p>
          <p style="font-size:14px;font-weight:600">${esc(ex.grupo)}</p>
          <p style="margin-top:6px">${linkDemonstracao(ex.nome)}</p>
        </div>
      </div>
      <p class="item__meta" style="margin-top:12px">O boneco mostra o padrão do movimento, não a tua
        técnica. Em caso de dúvida, procura o vídeo ou pergunta a um profissional.</p>`,
    acoes: [{ texto: voltar ? '‹ Voltar ao treino' : 'Fechar',
               onClick(){ pararAnimacao?.(); voltar ? voltar() : Modal.fechar(); } }],
  });

  $('#btnFotoEx').onclick = () => $('#ficheiroEx').click();
  $('#ficheiroEx').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { dataUrl } = await comprimirFoto(f);
      await Fotos.guardar(CHAVE_FOTO_EX + exId, dataUrl);
      toast('Foto guardada ✅');
      comoFazer(exId, voltar);
    } catch { toast('Não consegui guardar a foto.'); }
  };
  const apagarEx = $('#btnApagarFotoEx');
  if (apagarEx) apagarEx.onclick = async () => {
    await Fotos.apagar(CHAVE_FOTO_EX + exId);
    toast('Foto removida.');
    comoFazer(exId, voltar);
  };

  pararAnimacao?.();
  pararAnimacao = temFigura
    ? animarFigura($('#figuraEx'), ex)
    : animarExercicio($('#palcoBoneco'), ex);
}

function statBox(valor, rotulo){
  return `<div class="card" style="text-align:center;padding:11px">
    <strong style="font-size:17px">${esc(valor)}</strong>
    <p class="item__meta">${esc(rotulo)}</p>
  </div>`;
}

function novoExercicio(){
  Modal.abrir({
    titulo:'Novo exercício',
    corpo: `
      <div class="field">
        <label class="label" for="nNome">Nome</label>
        <input class="input" id="nNome" placeholder="Ex.: Remada cavalinho">
      </div>
      <div class="field">
        <label class="label" for="nGrupo">Grupo muscular</label>
        <select class="input" id="nGrupo">${GRUPOS.map(g => `<option>${esc(g)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label class="label" for="nEquip">Equipamento</label>
        <select class="input" id="nEquip">
          ${['Barra','Halteres','Máquina','Polia','Peso corporal','Elástico','Kettlebell','Acessório','Livre']
            .map(g => `<option>${g}</option>`).join('')}
        </select>
      </div>`,
    acoes: [
      { texto:'Cancelar', onClick: Modal.fechar },
      { texto:'Criar', classe:'btn--primary', onClick(){
          const nome = $('#nNome').value.trim();
          if (!nome) return toast('Indica o nome do exercício.');
          Store.criarExercicio({ nome, grupo: $('#nGrupo').value, equip: $('#nEquip').value });
          Modal.fechar();
          render();
          toast('Exercício criado ✅');
        } },
    ],
  });
}

/* ============================================================
   TELA: PROGRESSO
   ============================================================ */
function renderProgresso(){
  const { sessoes } = Store.estado;
  const semana = Date.now() - 7 * 864e5;
  const volumeTotal = sessoes.reduce((t, s) => t + volumeSessao(s), 0);
  const tempoTotal  = sessoes.reduce((t, s) => t + (s.fim - s.inicio), 0);

  $('#resumoStats').innerHTML = [
    statBox(sessoes.length, 'treinos'),
    statBox(sessoes.filter(s => s.fim > semana).length, 'nos 7 dias'),
    statBox(fmtNum(volumeTotal) + ' kg', 'volume total'),
    statBox(fmtTempoTotal(tempoTotal), 'tempo total'),
  ].join('');

  const comHist = Store.exerciciosComHistorico();
  const sel = $('#selEx');
  const anterior = sel.value;
  sel.innerHTML = comHist.length
    ? comHist.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')
    : '<option value="">— sem dados ainda —</option>';
  if (comHist.some(e => e.id === anterior)) sel.value = anterior;
  else if (comHist.length) sel.value = maisRegistrado(comHist).id;
  renderGraficoEx(sel.value);


}

/** Exercício com mais sessões registradas — melhor padrão para o gráfico. */
function maisRegistrado(lista){
  return lista.reduce((melhor, e) =>
    Store.seriesDoExercicio(e.id).length > Store.seriesDoExercicio(melhor.id).length ? e : melhor, lista[0]);
}

function fmtTempoTotal(ms){
  const min = Math.round(ms / 6e4);
  return min < 60 ? min + ' min' : (ms / 36e5).toFixed(1).replace('.', ',') + ' h';
}

/** Todo o histórico de treinos, que na página inicial só mostra os últimos. */
function historicoCompleto(){
  const sessoes = Store.estado.sessoes;
  Modal.abrir({
    titulo: `Histórico · ${sessoes.length} ${sessoes.length === 1 ? 'treino' : 'treinos'}`,
    corpo: sessoes.length
      ? `<div class="stack">${sessoes.map(cardSessao).join('')}</div>`
      : '<p class="empty">Conclui um treino para começar o teu histórico.</p>',
    acoes: [{ texto:'Fechar', onClick: Modal.fechar }],
  });
}

/** Calendário do mês, com os dias treinados acesos. */
function renderMes(){
  if (!mesVisivel){
    const h = new Date();
    mesVisivel = new Date(h.getFullYear(), h.getMonth(), 1);
  }
  const ano = mesVisivel.getFullYear(), mes = mesVisivel.getMonth();
  const treinados = Store.diasTreinados();
  const hoje = chaveDia(new Date());

  $('#mesNome').textContent = mesVisivel.toLocaleDateString('pt-PT', { month:'long', year:'numeric' });

  const primeiro = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const antes = (primeiro.getDay() + 6) % 7;    // semana começa à segunda

  const celulas = ['S','T','Q','Q','S','S','D'].map(l => `<div class="mes__rotulo">${l}</div>`);
  for (let i = 0; i < antes; i++) celulas.push('<div class="mes__dia vazio"></div>');

  let treinosNoMes = 0;
  for (let d = 1; d <= totalDias; d++){
    const data = new Date(ano, mes, d);
    const chave = chaveDia(data);
    const treinou = treinados.has(chave);
    const planeado = !!Store.treinoDaData(data);
    if (treinou) treinosNoMes++;
    celulas.push(`<button class="mes__dia ${treinou ? 'treinou' : ''} ${chave === hoje ? 'hoje' : ''}"
      data-dia-mes="${chave}" data-dia-semana="${data.getDay()}">${d}${
      planeado && !treinou ? '<span class="mes__ponto"></span>' : ''}</button>`);
  }
  $('#mes').innerHTML = celulas.join('');
  $('#mesResumo').textContent = treinosNoMes
    ? `${treinosNoMes} ${treinosNoMes === 1 ? 'treino' : 'treinos'} este mês.`
    : 'Ainda sem treinos neste mês.';
}

function renderGraficoEx(exId){
  if (!exId){
    $('#grafico').innerHTML = '<p class="empty">Regista treinos para veres a evolução.</p>';
    $('#recordesEx').innerHTML = '';
    return;
  }
  const hist = Store.seriesDoExercicio(exId);
  const pontos = hist.map(h => ({
    x: fmtData(h.data),
    y: Math.max(0, ...h.series.map(s => rm1(s.carga, s.reps))),
  })).filter(p => p.y > 0);

  $('#grafico').innerHTML = grafico(pontos, ' kg');

  const todas = hist.flatMap(h => h.series);
  const melhorCarga = Math.max(0, ...todas.map(s => num(s.carga)));
  const volume = todas.reduce((t, s) => t + num(s.reps) * num(s.carga), 0);
  $('#recordesEx').innerHTML = [
    statBox(hist.length, 'sessões'),
    statBox(melhorCarga ? fmtPeso(melhorCarga) + ' kg' : '—', 'carga máxima'),
    statBox(fmtNum(volume) + ' kg', 'volume acumulado'),
  ].join('');
}

function detalheSessao(id){
  const s = Store.estado.sessoes.find(x => x.id === id);
  if (!s) return;
  Modal.abrir({
    titulo: s.nome,
    corpo: `
      <p class="muted">${fmtDataHora(s.fim)} · ${fmtDuracao(s.fim - s.inicio)}</p>
      <div class="grid grid--stats" style="margin:14px 0">
        ${statBox(totalSeries(s), 'séries')}
        ${statBox(fmtNum(volumeSessao(s)) + ' kg', 'volume')}
        ${statBox(s.exercicios.length, 'exercícios')}
      </div>
      <div class="stack">
        ${s.exercicios.map(ex => `
          <div class="card" style="padding:11px">
            <h3 style="font-size:14px">${esc(Store.exercicio(ex.exId).nome)}</h3>
            <p class="item__meta" style="margin-top:4px">
              ${ex.series.map(se => `${num(se.reps)}×${fmtPeso(se.carga)}kg`).join(' · ')}
            </p>
          </div>`).join('')}
      </div>`,
    acoes: [
      { texto:'Eliminar', classe:'btn--danger', onClick(){
          confirmar('Eliminar este treino do histórico?', () => {
            Store.estado.sessoes = Store.estado.sessoes.filter(x => x.id !== id);
            Store.salvar();
            Modal.fechar();
            render();
          }, 'Eliminar');
        } },
      { texto:'Repetir treino', classe:'btn--primary', onClick(){
          if (Store.estado.sessaoAtiva) return toast('Termina primeiro o treino atual.');
          const nova = Store.iniciarSessao(null);
          nova.nome = s.nome;
          nova.exercicios = s.exercicios.map(ex => ({
            exId: ex.exId,
            series: ex.series.map(se => ({ reps: se.reps, carga: se.carga, feito:false })),
          }));
          Store.salvar();
          Modal.fechar();
          mostrar('treino');
        } },
    ],
  });
}

/* ============================================================
   TELA: TREINADOR IA
   ============================================================ */
const PERGUNTAS_SUGERIDAS = [
  'Estou a progredir bem?',
  'Como aumento a carga sem me lesionar?',
  'Quantas séries por semana para as costas?',
  'O que faço se faltar a um treino?',
  'Como aqueço antes de treinar?',
];
let aResponder = false;

/** Formatação mínima do que o modelo devolve: negrito, listas e parágrafos. */
function formatarResposta(texto){
  const seguro = esc(texto);
  const linhas = seguro.split('\n').map(l => l.trim()).filter(Boolean);
  let html = '', emLista = false;
  for (const linha of linhas){
    const item = linha.match(/^[-*•]\s+(.*)$/);
    if (item){
      if (!emLista){ html += '<ul>'; emLista = true; }
      html += `<li>${item[1]}</li>`;
    } else {
      if (emLista){ html += '</ul>'; emLista = false; }
      html += `<p>${linha}</p>`;
    }
  }
  if (emLista) html += '</ul>';
  return html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function renderBot(){
  const conversa = Store.estado.conversa;

  $('#conversa').innerHTML = conversa.length
    ? conversa.map(m => `<div class="balao balao--${m.role === 'user' ? 'eu' : 'bot'}">
        ${m.role === 'user' ? esc(m.content) : formatarResposta(m.content)}
      </div>`).join('')
    : `<div class="balao balao--bot">
        <p>Olá${Store.estado.perfil.nome ? ', ' + esc(Store.estado.perfil.nome) : ''}. Sou o treinador
        da app: pergunta-me sobre treino, técnica, descanso ou progressão.</p>
        <p style="margin-top:8px;color:var(--txt-dim);font-size:13px">Conheço o teu perfil e o teu
        plano. Não dou conselhos médicos — para dores ou lesões, procura um profissional.</p>
      </div>`;

  if (aResponder){
    $('#conversa').insertAdjacentHTML('beforeend',
      '<div class="balao balao--bot balao--espera">A escrever…</div>');
  }

  $('#botSugestoes').innerHTML = conversa.length ? '' :
    PERGUNTAS_SUGERIDAS.map(q => `<button class="sugestao" data-pergunta="${esc(q)}">${esc(q)}</button>`).join('');

  $('#conversa').lastElementChild?.scrollIntoView({ block:'end' });
}

async function enviarPergunta(texto){
  const pergunta = texto.trim();
  if (!pergunta || aResponder) return;

  Store.estado.conversa.push({ role:'user', content: pergunta });
  Store.salvar();
  aResponder = true;
  $('#botTexto').value = '';
  renderBot();

  try {
    const resposta = await perguntarAoTreinador(Store.estado.conversa);
    Store.estado.conversa.push({ role:'assistant', content: resposta });
  } catch (e) {
    Store.estado.conversa.push({ role:'assistant', content: `Não consegui responder. ${e.message}` });
  } finally {
    aResponder = false;
    Store.salvar();
    renderBot();
  }
}

/* ============================================================
   TELA: PERFIL
   ============================================================ */
function renderPerfil(){
  const perfil = Store.estado.perfil;
  $$('[data-perfil]').forEach(campo => { campo.value = perfil[campo.dataset.perfil] ?? ''; });
  renderDiasTreino();
  renderDistanciaObjetivo();
  renderPeso();
  renderComposicao();
  renderImc();
}

/** Quanto falta para o peso que a pessoa quer alcançar. */
function renderDistanciaObjetivo(){
  const alvo = $('#perfilDistanciaObjetivo');
  if (!alvo) return;
  const p = Store.estado.perfil;
  const atual = num(p.peso), objetivo = num(p.pesoObjetivo);
  if (!atual || !objetivo) return (alvo.textContent = '');

  const diferenca = Math.round((objetivo - atual) * 10) / 10;
  if (Math.abs(diferenca) < 0.1) return (alvo.textContent = 'Estás no peso que querias. 🎯');
  alvo.textContent = diferenca < 0
    ? `Faltam ${fmtPeso(Math.abs(diferenca))} kg para chegares ao teu objetivo.`
    : `Faltam ${fmtPeso(diferenca)} kg para ganhares até ao teu objetivo.`;
}

function registarPesoHoje(){
  Modal.abrir({
    titulo:'Registar peso',
    corpo: `
      <div class="field">
        <label class="label" for="pesoHoje">Peso de hoje (kg)</label>
        <input class="input" type="number" step="0.1" min="30" max="250" id="pesoHoje"
               value="${esc(Store.estado.perfil.peso)}" inputmode="decimal">
      </div>
      <p class="item__meta">Fica registado com a data de hoje. Um registo por dia — o mais recente substitui.</p>`,
    acoes: [
      { texto:'Cancelar', onClick: Modal.fechar },
      { texto:'Guardar', classe:'btn--primary', onClick(){
          const kg = num($('#pesoHoje').value);
          if (!kg) return toast('Indica um peso válido.');
          Store.registarPeso(kg);
          Modal.fechar();
          renderPerfil();
          toast('Peso registado ✅');
        } },
    ],
  });
}

/** Sete círculos, de segunda a domingo, para escolher quando se treina. */
function renderDiasTreino(){
  const escolhidos = Store.estado.perfil.diasSemana;
  const ordem = [1, 2, 3, 4, 5, 6, 0];   // semana começa à segunda
  $('#diasEscolha').innerHTML = ordem.map(d => `
    <button class="dia-opcao ${escolhidos.includes(d) ? 'is-ativa' : ''}"
            data-dia-treino="${d}" title="${NOMES_DIA[d]}">${LETRAS_DIA[d]}</button>`).join('');

  const n = escolhidos.length;
  $('#diasResumo').textContent = n
    ? `${n} ${n === 1 ? 'treino' : 'treinos'} por semana: ${escolhidos.map(d => NOMES_DIA[d]).join(', ')}.`
    : 'Escolhe pelo menos um dia.';
}

/* ---------- Composição corporal e energia ----------
   Fórmulas assumidas, todas estimativas:
   - gordura corporal: Deurenberg (a partir do IMC, idade e sexo)
   - metabolismo basal: Mifflin-St Jeor
   Uma balança de bioimpedância ou uma medição com adipómetro dão
   números melhores; estes servem para acompanhar a tendência.        */

function fatorAtividade(dias){
  if (dias <= 1) return 1.375;
  if (dias <= 3) return 1.55;
  if (dias <= 5) return 1.725;
  return 1.8;
}

function metricasCorpo(){
  const p = Store.estado.perfil;
  const peso = num(p.peso), altura = num(p.altura) / 100, idade = num(p.idade);
  if (!peso || !altura) return null;

  const imc = peso / (altura * altura);
  const sexoM = p.sexo === 'M' ? 1 : 0;
  const temSexoEIdade = !!p.sexo && idade > 0;

  const gorduraPct = temSexoEIdade
    ? Math.max(3, Math.min(60, 1.2 * imc + 0.23 * idade - 10.8 * sexoM - 5.4))
    : null;
  const massaGorda = gorduraPct !== null ? peso * gorduraPct / 100 : null;
  const massaMagra = massaGorda !== null ? peso - massaGorda : null;
  const ffmi = massaMagra !== null ? massaMagra / (altura * altura) : null;

  const tmb = temSexoEIdade
    ? 10 * peso + 6.25 * num(p.altura) - 5 * idade + (sexoM ? 5 : -161)
    : null;
  const fator = fatorAtividade(p.diasSemana.length);
  const manutencao = tmb !== null ? tmb * fator : null;

  // objetivo calórico: défice para perder, excedente moderado para ganhar
  const objetivo = /gordura/i.test(p.objetivo) ? -0.18
                 : /hipertrofia|massa/i.test(p.objetivo) ? 0.10 : 0;
  const alvoCalorico = manutencao !== null ? manutencao * (1 + objetivo) : null;
  const proteina = Math.round(peso * (objetivo < 0 ? 2.0 : 1.8));

  return { imc, gorduraPct, massaGorda, massaMagra, ffmi, tmb, fator, manutencao, alvoCalorico, proteina };
}

function renderComposicao(){
  const m = metricasCorpo();
  const p = Store.estado.perfil;

  if (!m){
    $('#composicao').innerHTML = '<p class="empty">Preenche altura e peso para veres estes números.</p>';
    $('#energia').innerHTML = '';
    $('#notaComposicao').textContent = '';
    $('#notaEnergia').textContent = '';
    return;
  }

  const faixa = m.imc < 18.5 ? 'abaixo do peso' : m.imc < 25 ? 'normal'
              : m.imc < 30 ? 'excesso de peso' : 'obesidade';

  $('#composicao').innerHTML = [
    statBox(m.imc.toFixed(1), `IMC · ${faixa}`),
    statBox(m.gorduraPct !== null ? m.gorduraPct.toFixed(1) + ' %' : '—', 'gordura estimada'),
    statBox(m.massaGorda !== null ? fmtPeso(m.massaGorda) + ' kg' : '—', 'massa gorda'),
    statBox(m.massaMagra !== null ? fmtPeso(m.massaMagra) + ' kg' : '—', 'massa magra'),
    statBox(m.ffmi !== null ? m.ffmi.toFixed(1) : '—', 'FFMI'),
    statBox(p.pesoObjetivo ? fmtPeso(num(p.pesoObjetivo)) + ' kg' : '—', 'peso objetivo'),
  ].join('');

  $('#notaComposicao').textContent = m.gorduraPct === null
    ? 'Indica o sexo e a idade para estimar a gordura corporal.'
    : 'A gordura é estimada a partir do IMC, idade e sexo — serve para ver a tendência, não é uma medição.';

  $('#energia').innerHTML = [
    statBox(m.tmb !== null ? fmtNum(m.tmb) + ' kcal' : '—', 'metabolismo basal'),
    statBox(m.manutencao !== null ? fmtNum(m.manutencao) + ' kcal' : '—', 'manutenção'),
    statBox(m.alvoCalorico !== null ? fmtNum(m.alvoCalorico) + ' kcal' : '—', 'alvo diário'),
    statBox(m.proteina + ' g', 'proteína/dia'),
  ].join('');

  const direcao = /gordura/i.test(p.objetivo) ? 'défice de 18% para perder gordura'
                : /hipertrofia|massa/i.test(p.objetivo) ? 'excedente de 10% para ganhar massa'
                : 'igual à manutenção';
  $('#notaEnergia').textContent = m.tmb === null
    ? 'Indica o sexo e a idade para calcular as calorias.'
    : `Alvo calculado com ${direcao}, e fator de atividade ${m.fator} (${p.diasSemana.length} treinos/semana). São estimativas para orientar, não uma dieta.`;
}

/** Peso ao longo do tempo. */
function renderPeso(){
  const pesos = Store.estado.pesos;
  const atual = num(Store.estado.perfil.peso);
  const objetivo = num(Store.estado.perfil.pesoObjetivo);

  $('#pesoResumo').textContent = atual
    ? `${fmtPeso(atual)} kg${objetivo ? ` · objetivo ${fmtPeso(objetivo)} kg (${
        (atual - objetivo) > 0 ? '−' : '+'}${fmtPeso(Math.abs(atual - objetivo))} kg)` : ''}`
    : 'Ainda sem peso registado.';

  $('#graficoPeso').innerHTML = pesos.length >= 2
    ? grafico(pesos.map(x => ({ x: fmtData(new Date(x.data + 'T12:00')), y: x.kg })), ' kg')
    : '<p class="empty">Regista o peso em dois dias diferentes para veres a evolução.</p>';
}

function renderImc(){
  const { altura, peso } = Store.estado.perfil;
  const a = num(altura) / 100, p = num(peso);
  if (!a || !p) return void ($('#perfilImc').textContent = '');
  const imc = p / (a * a);
  const faixa = imc < 18.5 ? 'abaixo do peso'
              : imc < 25   ? 'peso normal'
              : imc < 30   ? 'excesso de peso' : 'obesidade';
  $('#perfilImc').textContent = `IMC ${imc.toFixed(1)} — ${faixa}. É um indicador grosseiro: não distingue músculo de gordura.`;
}

/** Resumo do perfil mostrado no ecrã do Plano IA. */
function renderResumoPerfil(){
  const p = Store.estado.perfil;
  $('#iaResumoPerfil').innerHTML = [
    p.objetivo, p.experiencia, `${p.dias} dias/semana`, `${p.minutos} min`,
    p.limitacoes ? `⚠ ${p.limitacoes}` : null,
  ].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('');
}

/* ============================================================
   TELA: PLANO IA
   ============================================================ */
let fotosGinasio = [];      // só em memória — as fotos não são guardadas
let aGerarPlano = false;

function renderIA(){
  const cfg = Store.estado.planoConfig;

  // pastilhas: marca a opção guardada
  $$('[data-plano]').forEach(grupo => {
    const campo = grupo.dataset.plano;
    const valor = campo === 'descanso' ? Store.estado.config.descanso : cfg[campo];
    $$('.pastilha', grupo).forEach(b =>
      b.classList.toggle('is-ativa', b.dataset.valor === String(valor)));
  });
  $('#planoSuperseries').checked = !!cfg.superseries;
  renderMusculosPlano();

  $('#equipResumo').textContent = cfg.equipamento.length
    ? `${cfg.equipamento.length} de ${TOTAL_EQUIPAMENTOS}`
    : 'todos';
  $('#fotosResumo').textContent = fotosGinasio.length
    ? `${fotosGinasio.length} ${fotosGinasio.length === 1 ? 'foto' : 'fotos'}`
    : 'nenhuma';

  const p = Store.estado.perfil;
  $('#perfilResumo').textContent = [p.objetivo.split(' ')[0], p.experiencia,
    `${p.diasSemana.length}x/semana`, p.limitacoes ? '⚠' : null].filter(Boolean).join(' · ');

  renderPlanoAtual();

  const ultimo = Store.estado.planoIA;
  if (ultimo && !$('#iaResultado').dataset.fresco) mostrarPlano(ultimo, true);
}

/** Grelha dos grupos musculares a priorizar no plano. */
function renderMusculosPlano(){
  const escolhidos = Store.estado.planoConfig.musculos;
  $('#musculosGrelha').innerHTML = GRUPOS.map(g => `
    <button class="musculo-op ${escolhidos.includes(g) ? 'is-ativa' : ''}" data-musculo="${esc(g)}">
      ${diagramaMusculos(g)}
      <span>${esc(g)}</span>
    </button>`).join('');
}

/** Cartão do plano em vigor, com os treinos em carrossel. */
/** Em que ponto vai o programa de várias semanas, se houver um a decorrer. */
function resumoPrograma(){
  const pr = Store.estado.programaIA;
  const semana = Store.semanaDoPrograma(new Date());
  if (!pr || semana === null) return null;
  return { nome: pr.nome, semana: semana + 1, total: pr.semanas.length, foco: pr.focos?.[semana] || '' };
}

/** O dia em que uma ficha cai na semana em curso, ou null se não cair nenhum. */
function diaDaFichaEstaSemana(fichaId){
  const semana = Store.semanaDoPrograma(new Date());
  const mapa = semana === null
    ? Store.estado.programa
    : Store.estado.programaIA.semanas[semana];
  return [0,1,2,3,4,5,6].find(d => mapa?.[d] === fichaId) ?? null;
}

function renderPlanoAtual(){
  const plano = Store.estado.planoIA;
  if (!plano){
    $('#planoAtual').innerHTML = `<p class="empty">Ainda não tens um plano. Define abaixo como treinas e cria o primeiro.</p>`;
    return;
  }

  const cfg = Store.estado.planoConfig;
  const perfil = Store.estado.perfil;
  const treinados = Store.diasTreinados();
  const prog = resumoPrograma();
  const hoje = new Date();
  const chaveHoje = chaveDia(hoje);

  // cada treino do plano tem uma ficha correspondente, criada ao aceitar o plano
  const fichas = Store.estado.treinos.filter(t => t.origem === 'ia');

  const cartoes = plano.plano.treinos.map((treino, n) => {
    const ficha = fichas[n];
    // o dia verdadeiro é o do calendário, não o que a IA escreveu:
    // se dois treinos calharem no mesmo dia, um deles foi para outro sítio
    const dia = ficha ? diaDaFichaEstaSemana(ficha.id) : null;
    const feitoHoje = dia === hoje.getDay() && treinados.has(chaveHoje);
    const eHoje = dia === hoje.getDay();
    const grupos = ficha ? gruposDaFicha(ficha) : [...new Set(treino.exercicios.map(e => e.grupo))];
    const series = treino.exercicios.reduce((t, e) => t + e.series, 0);
    const minutos = ficha ? duracaoEstimada(ficha) : Math.round(series * 3);

    return `<article class="treino-cartao ${eHoje ? 'is-hoje' : ''}">
      <div class="treino-topo">
        <span class="selo ${feitoHoje ? 'selo--feito' : eHoje ? 'selo--hoje' : ''}">
          ${feitoHoje ? 'Concluído' : eHoje ? 'Hoje' : dia !== null ? 'Planeado' : 'Mais à frente'}
        </span>
        <span class="item__meta">${dia !== null ? esc(NOMES_DIA[dia])
          : resumoPrograma() ? 'noutra semana' : 'sem dia'}</span>
      </div>

      <h3>${esc(treino.nome)}</h3>

      <div class="treino-corpo">
        <div class="treino-numeros">
          <div class="plano-caixa"><strong>${minutos} min</strong><span>duração</span></div>
          <div class="plano-caixa"><strong>${series}</strong><span>séries</span></div>
        </div>
        <div class="previa-corpo">${diagramaMusculos(grupos)}</div>
      </div>

      <ul class="treino-lista">
        ${treino.exercicios.slice(0, 3).map(e =>
          `<li><b>${esc(e.nome)}</b><span>${e.series}×${e.reps}</span></li>`).join('')}
        ${treino.exercicios.length > 3
          ? `<li class="mais">+ ${treino.exercicios.length - 3} ${
              treino.exercicios.length - 3 === 1 ? 'exercício' : 'exercícios'}</li>` : ''}
      </ul>

      ${ficha
        ? `<button class="btn btn--primary btn--block" data-ver-treino="${ficha.id}">
             ${feitoHoje ? 'Repetir treino' : 'Ver treino'}
           </button>`
        : '<p class="item__meta">Ficha não encontrada.</p>'}
    </article>`;
  }).join('');

  $('#planoAtual').innerHTML = `
    <div class="card">
      <span class="hoje__etiqueta">Plano em vigor</span>
      <h3 style="margin-top:6px">${esc(plano.plano.nome)}</h3>
      <p class="item__meta" style="margin-top:4px">${esc(plano.plano.resumo)}</p>
      <div class="ia-lista" style="margin-top:10px">
        <span class="tag">${plano.plano.treinos.length} treinos diferentes</span>
        ${prog ? `<span class="tag">${prog.total} semanas</span>` : ''}
        <span class="tag">${esc(cfg.local)}</span>
        <span class="tag">${esc(cfg.duracao)} min</span>
        <span class="tag">${esc(perfil.experiencia)}</span>
      </div>
      ${prog ? `<div class="barra-semanas">
        <p class="item__meta">Semana <b>${prog.semana}</b> de ${prog.total}${
          prog.foco ? ` · ${esc(prog.foco)}` : ''}</p>
        <div class="barra"><i style="width:${Math.round(prog.semana / prog.total * 100)}%"></i></div>
      </div>` : ''}
    </div>

    <div class="carrossel" id="carrosselTreinos">${cartoes}</div>
    <div class="pontos" id="pontosTreinos">
      ${plano.plano.treinos.map((_, n) => `<span class="ponto ${n === 0 ? 'is-ativo' : ''}"></span>`).join('')}
    </div>`;

  // os pontos acompanham o deslizar
  const carrossel = $('#carrosselTreinos');
  carrossel.onscroll = () => {
    const largura = carrossel.firstElementChild?.offsetWidth || 1;
    const n = Math.round(carrossel.scrollLeft / (largura + 12));
    $$('#pontosTreinos .ponto').forEach((p, i) => p.classList.toggle('is-ativo', i === n));
  };
}

/** Troca o desenho pela fotografia, nos itens que já tenham uma. */
async function mostrarFotosEquipamento(){
  for (const grupo of EQUIPAMENTOS){
    for (const item of grupo.itens){
      const foto = await Fotos.ler('eq:' + item.id).catch(() => null);
      if (!foto) continue;
      const alvo = document.getElementById('eq-mini-' + item.id);
      if (alvo) alvo.innerHTML = `<img class="equip-foto" src="${foto}" alt="">`;
    }
  }
}

/** Vista ampliada de uma peça de equipamento. */
async function ampliarEquipamento(id){
  const nome = nomeEquipamento(id);
  const grupo = EQUIPAMENTOS.find(g => g.itens.some(i => i.id === id))?.cat || '';
  const foto = await Fotos.ler('eq:' + id).catch(() => null);

  Modal.abrir({
    titulo: nome,
    corpo: `
      <div class="equip-grande">
        ${foto ? `<img src="${foto}" alt="${esc(nome)}">` : iconeEquipamento(id)}
      </div>
      <p class="item__meta" style="margin-top:10px">${esc(grupo)}</p>
      <p class="item__meta" style="margin-top:8px">${foto
        ? 'Foto tirada por ti.'
        : 'Este é o desenho da app. Tira uma foto à máquina do teu ginásio para a veres aqui em vez do desenho.'}</p>
      <div class="row-actions" style="margin-top:12px">
        <button class="btn btn--sm btn--ghost" id="eqTirarFoto">📷 ${foto ? 'Trocar foto' : 'Fotografar máquina'}</button>
        ${foto ? '<button class="btn btn--sm btn--danger" id="eqApagarFoto">Remover</button>' : ''}
      </div>
      <input type="file" id="eqFicheiro" accept="image/*" capture="environment" hidden>`,
    acoes: [{ texto:'Voltar', onClick(){ Modal.fechar(); seletorEquipamento(); } }],
  });

  $('#eqTirarFoto').onclick = () => $('#eqFicheiro').click();
  $('#eqFicheiro').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { dataUrl } = await comprimirFoto(f);
      await Fotos.guardar('eq:' + id, dataUrl);
      toast('Foto guardada ✅');
      ampliarEquipamento(id);
    } catch (erro) { toast('Não consegui guardar a foto.'); }
  };
  const apagar = $('#eqApagarFoto');
  if (apagar) apagar.onclick = async () => {
    await Fotos.apagar('eq:' + id);
    toast('Foto removida.');
    ampliarEquipamento(id);
  };
}

/** Escolher o equipamento à mão. */
function seletorEquipamento(){
  const escolhidos = new Set(Store.estado.planoConfig.equipamento);

  const desenhar = () => {
    $('#modalCorpo').innerHTML = EQUIPAMENTOS.map(g => `
      <div class="equip-grupo">
        <p class="equip-cat">${esc(g.cat)}</p>
        ${g.itens.map(i => `
          <div class="equip-item ${escolhidos.has(i.id) ? 'is-ativa' : ''}">
            <button class="equip-item__icone" data-ampliar="${i.id}" aria-label="Ver ${esc(i.nome)}"
                    id="eq-mini-${i.id}">${iconeEquipamento(i.id)}</button>
            <button class="equip-item__nome" data-equip="${i.id}">${esc(i.nome)}</button>
            <button class="equip-item__caixa" data-equip="${i.id}" aria-label="Marcar">✓</button>
          </div>`).join('')}
      </div>`).join('');
    $('#modalTitulo').textContent = escolhidos.size
      ? `Equipamento · ${escolhidos.size} de ${TOTAL_EQUIPAMENTOS}`
      : 'Equipamento · todos';
    mostrarFotosEquipamento();
  };

  Modal.abrir({
    titulo:'Equipamento',
    corpo:'',
    acoes:[
      { texto:'Marcar tudo', onClick(){
          EQUIPAMENTOS.forEach(g => g.itens.forEach(i => escolhidos.add(i.id)));
          desenhar();
        } },
      { texto:'Guardar', classe:'btn--primary', onClick(){
          Store.guardarPlanoConfig('equipamento', [...escolhidos]);
          Modal.fechar();
          renderIA();
        } },
    ],
  });
  desenhar();

  $('#modalCorpo').onclick = e => {
    const lupa = e.target.closest('[data-ampliar]');
    if (lupa){
      Store.guardarPlanoConfig('equipamento', [...escolhidos]);
      return ampliarEquipamento(lupa.dataset.ampliar);
    }
    const btn = e.target.closest('[data-equip]');
    if (!btn) return;
    const id = btn.dataset.equip;
    escolhidos.has(id) ? escolhidos.delete(id) : escolhidos.add(id);
    desenhar();
  };
}

function renderFotos(){
  $('#fotos').innerHTML = fotosGinasio.map((f, i) => `
    <div class="foto">
      <img src="${f.dataUrl}" alt="Equipamento ${i + 1}">
      <button data-rm-foto="${i}" aria-label="Remover foto">✕</button>
    </div>`).join('');
  $('#fotosInfo').textContent = fotosGinasio.length
    ? `${fotosGinasio.length}/${IA.MAX_FOTOS} fotos. Só são enviadas quando geras o plano.`
    : `Até ${IA.MAX_FOTOS} fotos. Ficam no dispositivo e só são enviadas quando geras o plano.`;
}

async function adicionarFotos(ficheiros){
  const espaco = IA.MAX_FOTOS - fotosGinasio.length;
  if (espaco <= 0) return toast(`Máximo de ${IA.MAX_FOTOS} fotos.`);
  const lista = [...ficheiros].slice(0, espaco);
  for (const f of lista){
    try {
      fotosGinasio.push(await comprimirFoto(f));
    } catch (e) {
      toast('Não consegui ler uma das imagens.');
    }
  }
  renderFotos();
}

async function gerarPlano(){
  if (aGerarPlano) return;
  const cfg = Store.estado.planoConfig;
  if (!fotosGinasio.length && !cfg.equipamento.length){
    return toast('Escolhe o equipamento ou junta fotos do ginásio.');
  }

  const perfil = { ...Store.estado.perfil };

  aGerarPlano = true;
  $('#btnGerarPlano').disabled = true;
  const soltarEcra = await manterEcraAceso();
  $('#iaEstado').innerHTML = `<span class="a-carregar"></span>${fotosGinasio.length
    ? 'A analisar as fotos e a montar o plano…' : 'A montar o plano…'} demora meio minuto.
    <br><small>Deixa a app aberta até ao fim.</small>`;
  $('#iaResultado').innerHTML = '';

  try {
    const plano = await pedirPlano(perfil, fotosGinasio);
    plano.criadoEm = Date.now();
    plano.perfil = perfil;
    Store.estado.planoIA = plano;
    Store.salvar();

    // O plano entra logo nas fichas e no calendário, nos dias escolhidos.
    const fichas = importarPlano(plano.plano);
    espalharPelaSemana(fichas);

    $('#iaEstado').textContent = '';
    renderPlanoAtual();
    mostrarPlano(plano, false);
    toast(`Plano criado e posto no calendário ✅`);
    sincronizar(true);
  } catch (e) {
    $('#iaEstado').textContent = '';
    const problemaDeConfig = /servidor|chave|configura/i.test(e.message);
    $('#iaResultado').innerHTML = `<div class="aviso">Não foi possível gerar o plano.<br>${esc(e.message)}
      <div class="row-actions" style="margin-top:12px">
        <button class="btn btn--sm btn--primary" id="btnTentarDeNovo">Tentar de novo</button>
        ${problemaDeConfig
          ? '<button class="btn btn--sm btn--ghost" id="btnErroConfig">⚙️ Definições</button>'
          : ''}
      </div></div>`;
    $('#btnTentarDeNovo').onclick = gerarPlano;
    const btnCfg = $('#btnErroConfig');
    if (btnCfg) btnCfg.onclick = abrirConfig;
  } finally {
    aGerarPlano = false;
    $('#btnGerarPlano').disabled = false;
    soltarEcra();
  }
}

/** Impede o ecrã de bloquear enquanto se espera pela IA: no telemóvel, um
    ecrã que adormece corta o pedido a meio. Devolve a função que o liberta. */
async function manterEcraAceso(){
  if (!navigator.wakeLock?.request) return () => {};
  try {
    const trava = await navigator.wakeLock.request('screen');
    return () => trava.release().catch(() => {});
  } catch {
    return () => {};
  }
}

function mostrarPlano(plano, antigo){
  const eq = plano.equipamentos || [];
  $('#iaResultado').dataset.fresco = '1';
  $('#iaResultado').innerHTML = `
    ${antigo ? `<p class="item__meta">Último plano gerado em ${fmtDataHora(plano.criadoEm)}.</p>` : ''}
    <div class="card">
      <h3>${esc(plano.plano.nome)}</h3>
      <p class="item__meta" style="margin-top:4px">${esc(plano.plano.resumo)}</p>
      <label class="label" style="margin-top:14px">Equipamento identificado (${eq.length})</label>
      <div class="ia-lista">
        ${eq.map(e => `<span class="tag" title="confiança ${esc(e.confianca)}">${esc(e.nome)}${e.confianca === 'baixa' ? ' ?' : ''}</span>`).join('')
          || '<span class="muted">Nenhum equipamento identificado.</span>'}
      </div>
      ${plano.observacoes ? `<p class="item__meta" style="margin-top:12px">${esc(plano.observacoes)}</p>` : ''}
    </div>

    ${plano.plano.treinos.map(t => `
      <div class="card">
        <div class="card__title">
          <h3>${esc(t.nome)}</h3>
          ${t.dia ? `<span class="tag">${esc(t.dia)}</span>` : ''}
        </div>
        <p class="item__meta" style="margin:2px 0 8px">${esc(t.foco)}</p>
        ${t.exercicios.map(ex => `
          <div class="ia-ex">
            ${diagramaMusculos(ex.grupo)}
            <div>
              <b>${esc(ex.nome)}</b>
              <span> · ${esc(ex.equipamento)}</span>
              ${ex.nota ? `<div><span>${esc(ex.nota)}</span></div>` : ''}
              <div>${linkDemonstracao(ex.nome)}</div>
            </div>
            <div class="prescricao">${ex.series}×${ex.reps}<br><span style="color:var(--txt-dim);font-weight:400">${ex.descanso_seg}s</span></div>
          </div>`).join('')}
      </div>`).join('')}

    <div class="card">
      <label class="label">Progressão</label>
      <p style="font-size:14px">${esc(plano.progressao)}</p>
    </div>

    <div class="aviso">Plano gerado por IA a partir das fotos. Confirma que consegues executar cada
      exercício em segurança — não substitui a avaliação de um profissional de saúde.</div>

    <div class="aviso" style="border-color:#bfe0a4;background:#f1fae0;color:#3c6a10;margin-top:12px">
      ${antigo
        ? 'Este plano está nas tuas fichas e no calendário.'
        : `Pronto: ${plano.plano.treinos.length} fichas criadas e colocadas nos dias que escolheste.`}
    </div>
    <div class="row-actions" style="margin-top:10px">
      <button class="btn btn--ghost" id="btnReporPlano">Repor no calendário</button>
      <button class="btn btn--primary" id="btnVerInicio">Ver no Início</button>
    </div>`;

  $('#btnVerInicio').onclick = () => mostrar('inicio');
  $('#btnReporPlano').onclick = () => {
    espalharPelaSemana(importarPlano(plano.plano));
    toast('Plano reposto no calendário ✅');
    mostrar('inicio');
  };
}

/** Distribui as fichas do plano pelos dias da semana, deixando descanso pelo meio. */
/**
 * Põe as fichas do plano no calendário.
 * Manda o dia que a própria IA atribuiu a cada treino; onde faltar, usa os
 * dias escolhidos no perfil; e só em último caso reparte a semana.
 */
function espalharPelaSemana(fichas){
  if (!fichas.length) return;
  // Se o plano trouxe um programa de várias semanas, o calendário dele já
  // marcou os dias: mexer aqui só ia estragar a primeira semana.
  if (Store.estado.programaIA) return;

  const mapas = { 1:[1], 2:[1,4], 3:[1,3,5], 4:[1,2,4,5], 5:[1,2,3,4,5], 6:[1,2,3,4,5,6] };
  const doPerfil = Store.estado.perfil.diasSemana.length
    ? [...Store.estado.perfil.diasSemana]
    : (mapas[Math.min(fichas.length, 6)] || [1, 3, 5]);

  [0,1,2,3,4,5,6].forEach(d => Store.definirDia(d, null));

  const ocupados = new Set();
  const semDia = [];

  fichas.forEach(f => {
    const dia = f.dia;
    if (Number.isInteger(dia) && dia >= 0 && dia <= 6 && !ocupados.has(dia)){
      Store.definirDia(dia, f.id);
      ocupados.add(dia);
    } else {
      semDia.push(f);
    }
  });

  // as que ficaram sem dia entram nos dias do perfil que ainda estejam livres
  const livres = doPerfil.filter(d => !ocupados.has(d));
  semDia.forEach((f, i) => {
    const dia = livres[i] ?? [1,2,3,4,5,6,0].find(d => !ocupados.has(d));
    if (dia === undefined) return;
    Store.definirDia(dia, f.id);
    ocupados.add(dia);
  });
}

/* ============================================================
   Ações de sessão
   ============================================================ */
function adicionarExercicioSessao(exId){
  const s = Store.estado.sessaoAtiva;
  if (!s) return;
  const carga = Store.ultimaCarga(exId);
  s.exercicios.push({
    exId,
    series: Array.from({ length: 3 }, () => ({ reps:'', carga: carga || '', feito:false })),
  });
  s.atual = s.exercicios.length - 1;
  Store.salvar();
  renderTreino();
}

function finalizarSessao(){
  const concluida = Store.finalizarSessao();
  pararDescanso();
  pararCrono();
  mostrar('inicio');
  if (!concluida) return toast('Nenhuma série marcada — treino descartado.');
  toast(`Treino guardado: ${fmtNum(volumeSessao(concluida))} kg de volume 🔥`);
  sincronizar(true);
  if (Store.estado.config.saude.treinos) setTimeout(() => Saude.enviarTreino(concluida), 900);
}

/* ============================================================
   Definições / dados
   ============================================================ */
/* ============================================================
   Conta na nuvem
   ============================================================ */
function ecraConta(){
  if (!Nuvem.configurada){
    return textoLegal('A minha conta', [
      'A conta ainda não está ligada: falta criar o projeto na Supabase e colar as duas chaves em <b>js/nuvem.js</b>.',
      'Enquanto isso, os dados ficam <b>só neste dispositivo</b> — usa Exportar e Importar backup para os passar para outro telemóvel.',
    ]);
  }

  if (Nuvem.autenticado) return ecraSessaoIniciada();

  Modal.abrir({
    titulo:'Entrar ou criar conta',
    corpo: `
      <div class="field">
        <label class="label" for="contaEmail">Email</label>
        <input class="input" type="email" id="contaEmail" autocomplete="email" placeholder="tu@exemplo.pt">
      </div>
      <div class="field">
        <label class="label" for="contaSenha">Palavra-passe</label>
        <input class="input" type="password" id="contaSenha" autocomplete="current-password" placeholder="pelo menos 6 caracteres">
      </div>
      <p class="item__meta" id="contaEstado"></p>
      <p class="item__meta" style="margin-top:10px">
        A conta serve para guardar e sincronizar os teus treinos entre dispositivos.
        <button class="demo" id="contaEsqueci" style="border:0;background:none;cursor:pointer;padding:0">Esqueci-me da palavra-passe</button>
      </p>`,
    acoes: [
      { texto:'Criar conta', onClick: () => acaoConta('registar') },
      { texto:'Entrar', classe:'btn--primary', onClick: () => acaoConta('entrar') },
    ],
  });

  $('#contaEsqueci').onclick = async () => {
    const email = $('#contaEmail').value.trim();
    if (!email) return ($('#contaEstado').textContent = 'Escreve o email primeiro.');
    try {
      await Nuvem.recuperar(email);
      $('#contaEstado').textContent = 'Enviámos um email para recuperares a palavra-passe.';
    } catch (e) { $('#contaEstado').textContent = e.message; }
  };
}

async function acaoConta(acao){
  const email = $('#contaEmail').value.trim();
  const senha = $('#contaSenha').value;
  const estado = $('#contaEstado');
  if (!email || !senha) return (estado.textContent = 'Preenche o email e a palavra-passe.');

  estado.innerHTML = '<span class="a-carregar"></span>A falar com o servidor…';
  try {
    if (acao === 'registar'){
      const { precisaConfirmar } = await Nuvem.registar(email, senha);
      if (precisaConfirmar){
        estado.textContent = 'Conta criada. Confirma o email e depois entra.';
        return;
      }
    } else {
      await Nuvem.entrar(email, senha);
    }
    Modal.fechar();
    await primeiraSincronizacao();
  } catch (e) {
    estado.textContent = e.message;
  }
}

/** Ao entrar, decide o que fica: o que está no telemóvel ou o que está na nuvem. */
async function primeiraSincronizacao(){
  toast('Sessão iniciada ✅');
  let remoto = null;
  try { remoto = await Nuvem.ler(); } catch (e) { return toast('Entrei, mas não li a nuvem: ' + e.message); }

  const temLocal = Store.estado.sessoes.length || Store.estado.treinos.length > 3;
  if (!remoto){ return sincronizar(); }
  if (!temLocal) return aplicarRemoto(remoto);

  Modal.abrir({
    titulo:'Já tens dados na nuvem',
    corpo: `<p>Esta conta tem uma cópia de <b>${fmtDataHora(new Date(remoto.atualizado).getTime())}</b>,
      e este telemóvel também tem treinos registados. Qual queres manter?</p>
      <p class="item__meta" style="margin-top:10px">O que não escolheres é substituído.</p>`,
    acoes: [
      { texto:'Os da nuvem', onClick(){ Modal.fechar(); aplicarRemoto(remoto); } },
      { texto:'Os deste telemóvel', classe:'btn--primary', onClick(){ Modal.fechar(); sincronizar(); } },
    ],
  });
}

function aplicarRemoto(remoto){
  Object.assign(Store.estado, remoto.dados);
  Store.salvar();
  aplicarTema();
  mostrar('inicio');
  toast('Dados trazidos da nuvem ✅');
}

/** Envia o estado atual para a nuvem. */
async function sincronizar(silencioso = false){
  if (!Nuvem.configurada || !Nuvem.autenticado) return;
  try {
    await Nuvem.guardar(Store.estado);
    if (!silencioso) toast('Guardado na nuvem ✅');
    renderDefinicoes();
  } catch (e) {
    if (!silencioso) toast('Não consegui guardar na nuvem: ' + e.message);
  }
}

function ecraSessaoIniciada(){
  Modal.abrir({
    titulo:'A minha conta',
    corpo: `
      <p><b>${esc(Nuvem.email)}</b></p>
      <p class="item__meta" style="margin-top:6px">Os teus dados são guardados na nuvem sempre que
        acabas um treino ou mudas o plano, e podes trazê-los para outro telemóvel entrando com esta conta.</p>
      <div class="stack" style="margin-top:14px">
        <button class="btn btn--ghost" id="contaSincronizar">☁️ Guardar agora na nuvem</button>
        <button class="btn btn--ghost" id="contaTrazer">⬇️ Trazer os dados da nuvem</button>
      </div>`,
    acoes: [
      { texto:'Terminar sessão', classe:'btn--danger', onClick(){
          Nuvem.sair(); Modal.fechar(); renderDefinicoes(); toast('Sessão terminada.');
        } },
      { texto:'Fechar', onClick: Modal.fechar },
    ],
  });
  $('#contaSincronizar').onclick = () => { Modal.fechar(); sincronizar(); };
  $('#contaTrazer').onclick = () => confirmar(
    'Trazer os dados da nuvem substitui o que está neste telemóvel.',
    async () => {
      try {
        const remoto = await Nuvem.ler();
        if (!remoto) return toast('Ainda não há nada guardado na nuvem.');
        Modal.fechar();
        aplicarRemoto(remoto);
      } catch (e) { toast(e.message); }
    }, 'Trazer');
}

/* ============================================================
   TELA: DEFINIÇÕES
   ============================================================ */
const NOMES_TEMA = { auto:'Automático', claro:'Claro', escuro:'Escuro' };

/** Aplica o tema escolhido, seguindo o sistema quando está em automático. */
function aplicarTema(){
  const tema = Store.estado.config.tema || 'auto';
  document.documentElement.dataset.tema = tema;
  const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('sistema-escuro', sistemaEscuro);

  const escuro = tema === 'escuro' || (tema === 'auto' && sistemaEscuro);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', escuro ? '#0f1115' : '#f7faf2');
}

function renderDefinicoes(){
  const c = Store.estado.config;
  $('#defTemaValor').textContent = NOMES_TEMA[c.tema || 'auto'];
  $('#defIAValor').textContent = c.ia.modo === 'direto' ? 'chave própria' : 'servidor próprio';
  $('#defSaudeValor').textContent = resumoSaude();
  $('#defVersaoValor').textContent = VERSAO_APP;
  $('#defContaEstado').textContent = !Nuvem.configurada ? 'por ligar'
    : Nuvem.autenticado ? Nuvem.email : 'sem sessão';
}

/* ============================================================
   Apple Saúde, pela ponte dos Atalhos
   ============================================================ */
function resumoSaude(){
  const c = Store.estado.config.saude;
  const ligados = [c.peso && 'peso', c.treinos && 'treinos'].filter(Boolean);
  return ligados.length ? ligados.join(' · ') : 'desligado';
}

function guardarSaude(campo, ligado){
  Store.estado.config.saude[campo] = ligado;
  Store.salvar();
  renderSaude();
}

function renderSaude(){
  const c = Store.estado.config.saude;
  $('#saudePeso').checked = !!c.peso;
  $('#saudeTreinos').checked = !!c.treinos;

  const acoes = [];
  if (c.peso) acoes.push(`
    <p class="def-grupo">Trazer o peso agora</p>
    <div class="lista-def">
      <button id="saudeLerPeso"><span class="def-icone">1</span>Ler o peso do Saúde</button>
      <button id="saudeColarPeso"><span class="def-icone">2</span>Colar o peso na app</button>
    </div>`);
  if (c.treinos) acoes.push(`
    <p class="def-grupo">Treinos</p>
    <div class="lista-def">
      <button id="saudeEnviarUltimo"><span class="def-icone">📤</span>Enviar o último treino</button>
    </div>`);
  $('#saudeAcoes').innerHTML = acoes.join('');

  $('#saudeGuia').innerHTML = `
    <p class="def-grupo">Como se liga</p>
    <div class="cartao-saude guia-saude">
      <p>Uma app web não pode falar com o Saúde — só as apps nativas podem. Quem faz a ponte é a app <b>Atalhos</b> da Apple. Cria estes dois atalhos uma vez, com os nomes exatos.</p>

      <h4>Atalho 1 — <code>MovePulse Peso</code></h4>
      <ol>
        <li>Atalhos → <b>+</b> → muda o nome para <code>MovePulse Peso</code>.</li>
        <li>Ação <b>Encontrar amostras de saúde</b> <i>(Find Health Samples)</i>: tipo <b>Massa corporal</b>, ordenar por data, <b>limite 1</b>.</li>
        <li>Ação <b>Obter detalhes da amostra de saúde</b>: escolhe <b>Valor</b>.</li>
        <li>Ação <b>Copiar para a área de transferência</b>.</li>
      </ol>
      <p class="aviso">Depois é só usar os botões 1 e 2 aqui em cima: o 1 vai buscar o peso, o 2 mete-o na app.</p>

      <h4>Atalho 2 — <code>MovePulse Treino</code></h4>
      <ol>
        <li>Novo atalho com o nome <code>MovePulse Treino</code>.</li>
        <li>Ação <b>Obter dicionário da entrada</b> — recebe os dados que a app manda.</li>
        <li>Ação <b>Obter valor do dicionário</b> para a chave <code>minutos</code>; repete para <code>kcal</code> e <code>inicio</code>.</li>
        <li>Ação <b>Registar treino</b> <i>(Log Workout)</i>: tipo <b>Treino de força</b>, duração igual a <code>minutos</code>, calorias iguais a <code>kcal</code>, data igual a <code>inicio</code>.</li>
        <li>No Saúde, em <b>Partilha → Apps</b>, confirma que os <b>Atalhos</b> têm autorização para escrever treinos.</li>
      </ol>
      <p class="aviso">Ao terminares um treino, o iPhone salta um instante ao Atalhos e volta.</p>
      <p class="aviso"><b>Se a duração ficar a zero:</b> é um defeito conhecido da ação Registar treino em algumas versões do iOS. Escreve o número de minutos à mão nessa ação, ou atualiza o iOS.</p>

      <h4>E o Apple Watch?</h4>
      <p>O relógio não consegue correr esta app — para isso seria preciso uma app nativa. O que dá é treinares com a app <b>Treino</b> do relógio ao mesmo tempo: ela grava batimentos e calorias no Saúde, e os teus treinos da MovePulse ficam guardados lá ao lado, no mesmo sítio.</p>
    </div>`;

  const ler = $('#saudeLerPeso');
  if (ler) ler.onclick = () => Saude.pedirPeso();

  const colar = $('#saudeColarPeso');
  if (colar) colar.onclick = async () => {
    try {
      const kg = await Saude.colarPeso();
      toast(`Peso guardado: ${fmtPeso(kg)} kg`);
      renderSaude();
    } catch (e) { toast(e.message); }
  };

  const enviar = $('#saudeEnviarUltimo');
  if (enviar) enviar.onclick = () => Saude.enviarTreino(Store.estado.sessoes[0], true);
}

function escolherTema(){
  Modal.abrir({
    titulo:'Aspeto',
    corpo: ['auto','claro','escuro'].map(t => `
      <button class="equip-item ${Store.estado.config.tema === t ? 'is-ativa' : ''}" data-tema="${t}"
              style="width:100%">
        <span class="equip-item__nome">${NOMES_TEMA[t]}${t === 'auto' ? ' <small style="color:var(--txt-dim)">— segue o telemóvel</small>' : ''}</span>
        <span class="equip-item__caixa">✓</span>
      </button>`).join(''),
    acoes: [{ texto:'Fechar', onClick: Modal.fechar }],
  });
  $('#modalCorpo').onclick = e => {
    const b = e.target.closest('[data-tema]');
    if (!b) return;
    Store.estado.config.tema = b.dataset.tema;
    Store.salvar();
    aplicarTema();
    Modal.fechar();
    renderDefinicoes();
  };
}

/** Créditos das obras de terceiros usadas na app. A licença CC BY-SA
    obriga a dar crédito, ligar à licença e indicar se houve alterações. */
function creditos(){
  textoLegal('Créditos e licenças', [
    '<b>Ilustrações dos exercícios</b><br>Do projeto <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener">Workout Guide</a>, de Bryl Lim, a partir da arte original do <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a>. Licença <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Os desenhos estão tal como vieram da origem — a app só os mostra em sequência e ajusta a cor na apresentação.',
    '<b>Tipo de letra</b><br>Barlow e Barlow Condensed, de Jeremy Tribby, sob <a href="https://openfontlicense.org/" target="_blank" rel="noopener">SIL Open Font License 1.1</a>.',
    '<b>Planos e respostas do treinador</b><br>Gerados por modelos de IA da NVIDIA, através de um servidor próprio.',
    'Os restantes desenhos da app — equipamento, músculos e o boneco do movimento — foram feitos de raiz para a MovePulse AI.',
  ]);
}

function textoLegal(titulo, paragrafos){
  Modal.abrir({
    titulo,
    corpo: paragrafos.map(t => `<p style="margin-bottom:10px;font-size:14.5px">${t}</p>`).join(''),
    acoes: [{ texto:'Fechar', onClick: Modal.fechar }],
  });
}

function abrirConfig(){
  const c = Store.estado.config;
  Modal.abrir({
    titulo:'Definições',
    corpo: `
      <label class="label">Plano com IA</label>
      <div class="field">
        <label class="label" for="cModoIa">Como falar com a IA</label>
        <select class="input" id="cModoIa">
          <option value="servidor">Pelo meu servidor (recomendado)</option>
          <option value="direto">Direto, com a minha chave</option>
        </select>
      </div>
      <div class="field" id="campoServidor">
        <label class="label" for="cServidor">Endereço do servidor</label>
        <input class="input" id="cServidor" placeholder="https://o-meu-worker.workers.dev/plano" value="${esc(c.ia.servidor)}">
        <p class="item__meta" style="margin-top:6px">Está em <code>servidor/worker.js</code>, pronto a publicar.</p>
      </div>
      <div class="field" id="campoChave" hidden>
        <label class="label" for="cChave">Chave da API (sk-ant-…)</label>
        <input class="input" type="password" id="cChave" autocomplete="off" value="${esc(c.ia.chave)}">
        <p class="item__meta" style="margin-top:6px">Fica guardada só neste dispositivo. Não uses este
          modo numa app partilhada com outras pessoas — quem abrir a app consegue ler a chave.</p>
      </div>

      <label class="label">Os meus dados</label>
      <div class="stack">
        <button class="btn btn--ghost" id="cExportar">⬇️ Exportar backup (.json)</button>
        <button class="btn btn--ghost" id="cImportar">⬆️ Importar backup</button>
        <button class="btn btn--danger" id="cReset">Apagar tudo e recomeçar</button>
      </div>
      <input type="file" id="cArquivo" accept="application/json" hidden>
      <p class="item__meta" id="cVersao" style="margin-top:12px"></p>
      <p class="item__meta" style="margin-top:14px">
        Fica tudo guardado só neste navegador (localStorage). Faz backup antes de limpares os dados do site.
      </p>`,
    acoes: [
      { texto:'Fechar', onClick: Modal.fechar },
      { texto:'Guardar', classe:'btn--primary', onClick(){
          Store.estado.config.ia = {
            modo:     $('#cModoIa').value,
            servidor: $('#cServidor').value.trim(),
            chave:    $('#cChave').value.trim(),
          };
          Store.salvar();
          Modal.fechar();
          toast('Definições guardadas ✅');
        } },
    ],
  });

  const alternarModo = () => {
    const direto = $('#cModoIa').value === 'direto';
    $('#campoServidor').hidden = direto;
    $('#campoChave').hidden = !direto;
  };
  $('#cModoIa').value = c.ia.modo;
  $('#cModoIa').onchange = alternarModo;
  alternarModo();

  $('#cVersao').textContent = `Versão ${VERSAO_APP}`;
  $('#cExportar').onclick = exportarDados;
  $('#cImportar').onclick = () => $('#cArquivo').click();
  $('#cArquivo').onchange = e => importarDados(e.target.files[0]);
  $('#cReset').onclick = () => confirmar(
    'Isto apaga fichas, histórico e exercícios criados por ti.',
    () => { Store.reset(); Modal.fechar(); render(); toast('Dados apagados.'); },
    'Apagar tudo');
}

function exportarDados(){
  const blob = new Blob([JSON.stringify(Store.estado, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const data = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `movepulse-backup-${data}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup gerado ✅');
}

function importarDados(arquivo){
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const dados = JSON.parse(leitor.result);
      if (!Array.isArray(dados.treinos) || !Array.isArray(dados.sessoes)) throw new Error('formato');
      Object.assign(Store.estado, dados);
      Store.salvar();
      Modal.fechar();
      render();
      toast('Backup importado ✅');
    } catch (e) {
      toast('Arquivo inválido 😕');
    }
  };
  leitor.readAsText(arquivo);
}

/* ============================================================
   Eventos globais
   ============================================================ */
function ligarEventos(){
  $$('.tab').forEach(t => t.onclick = () => mostrar(t.dataset.view));
  $op('#btnConfig').onclick = abrirConfig;

  // Fechar modal
  $$('[data-close]').forEach(el => el.onclick = Modal.fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.fechar(); });

  // Hoje
  $op('#btnTreinoLivre').onclick = () => confirmar(
    'Começar um treino livre, sem ficha? O cronómetro arranca já.',
    () => { Store.iniciarSessao(null); mostrar('treino'); atualizarSubtitulo(); },
    'Começar');
  $op('#btnAddExSessao').onclick = () => seletorExercicio(ex => adicionarExercicioSessao(ex.id));
  $op('#btnFinalizarSessao').onclick = () =>
    confirmar('Terminar e guardar este treino?', finalizarSessao, 'Finalizar');
  $op('#btnCancelarSessao').onclick = () =>
    confirmar('Descartar o treino atual? Não fica nada guardado.', () => {
      Store.cancelarSessao(); pararDescanso(); pararCrono(); mostrar('inicio');
    }, 'Descartar');

  // Fichas / exercícios
  $op('#btnNovoTreino').onclick = () => editorTreino(null);
  $op('#btnNovoEx').onclick = novoExercicio;
  $op('#buscaEx').oninput = renderExercicios;
  $op('#filtrosGrupo').onclick = e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filtroGrupo = chip.dataset.grupo;
    renderExercicios();
  };

  // Treinador IA
  $op('#botForm').onsubmit = e => { e.preventDefault(); enviarPergunta($('#botTexto').value); };
  $op('#botSugestoes').onclick = e => {
    const b = e.target.closest('[data-pergunta]');
    if (b) enviarPergunta(b.dataset.pergunta);
  };
  $op('#botLimpar').onclick = () => confirmar('Apagar esta conversa?', () => {
    Store.estado.conversa = [];
    Store.salvar();
    renderBot();
  }, 'Apagar');

  // Perfil: guarda-se sozinho, a cada alteração
  $op('#view-perfil').addEventListener('input', e => {
    const campo = e.target.dataset.perfil;
    if (!campo) return;
    Store.guardarPerfil(campo, e.target.value);
    if (campo === 'altura' || campo === 'peso') renderImc();
    if (campo === 'nome') renderSaudacao();
    if (campo === 'peso' || campo === 'pesoObjetivo'){
      renderDistanciaObjetivo();
      renderComposicao();
    }
  });
  $op('#diasEscolha').onclick = e => {
    const b = e.target.closest('[data-dia-treino]');
    if (!b) return;
    Store.alternarDiaTreino(+b.dataset.diaTreino);
    renderDiasTreino();
  };
  $op('#btnPerfil').onclick = () => mostrar('perfil');
  $op('#btnConfig').onclick = () => mostrar('definicoes');
  $op('#defVoltar').onclick = () => mostrar('inicio');
  $op('#defTema').onclick = escolherTema;
  $op('#defIA').onclick = abrirConfig;
  $op('#defConta').onclick = ecraConta;
  $op('#defIdioma').onclick = () => textoLegal('Idioma', [
    'A app está em português de Portugal.',
    'Outros idiomas ainda não estão feitos. Se precisares de inglês ou espanhol, é trabalho de tradução dos textos — diz e trato disso.',
  ]);
  $op('#defUnidades').onclick = () => textoLegal('Unidades', [
    'Os pesos estão em quilogramas e as medidas em centímetros.',
    'Libras e polegadas ainda não estão feitas: implica converter em todos os ecrãs e no histórico já registado, para os números antigos não mudarem de significado.',
  ]);
  $op('#defExportar').onclick = exportarDados;
  $op('#defImportar').onclick = () => $('#defArquivo').click();
  $op('#defArquivo').onchange = e => importarDados(e.target.files[0]);
  $op('#defCache').onclick = () => confirmar(
    'Limpar a cópia guardada e recarregar a app? Os teus dados não são afetados.',
    async () => {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
      location.reload();
    }, 'Limpar');
  $op('#defApagar').onclick = () => confirmar(
    'Isto apaga fichas, histórico, plano e perfil deste dispositivo.',
    () => { Store.reset(); mostrar('inicio'); toast('Dados apagados.'); }, 'Apagar tudo');
  $op('#defVersao').onclick = () => textoLegal('Versão', [
    `Estás na versão <b>${VERSAO_APP}</b>.`,
    'A app atualiza-se sozinha quando a abres com ligação à internet.',
  ]);
  $op('#defPrivacidade').onclick = () => textoLegal('Privacidade', [
    'Os teus treinos, fichas, perfil, peso e fotografias ficam <b>guardados neste dispositivo</b>. Não há servidor de dados nem conta.',
    'Quando geras um plano, as <b>fotos do ginásio e o teu perfil</b> (objetivo, experiência, dias, limitações) são enviados ao fornecedor de IA para produzir a resposta. As fotos não ficam guardadas em lado nenhum depois disso.',
    'Quando falas com o Treinador, a pergunta e um resumo do perfil seguem pelo mesmo caminho.',
    'Não há publicidade, análise de utilização nem partilha com terceiros.',
  ]);
  $op('#defTermos').onclick = () => textoLegal('Termos de utilização', [
    'A MovePulse AI é uma ferramenta de registo e organização de treino.',
    'Os planos e as respostas do Treinador são <b>gerados por inteligência artificial</b> e podem conter erros. São orientação geral de treino e <b>não substituem</b> avaliação médica, fisioterapia ou acompanhamento de um profissional.',
    'Antes de começar um programa de exercício, sobretudo se tens lesões, dores ou doença, fala com um profissional de saúde.',
    'Usas a app por tua conta e risco. Confirma que consegues executar cada exercício em segurança.',
  ]);
  $op('#defCreditos').onclick = creditos;
  $op('#perfilVoltar').onclick = () => mostrar('inicio');
  $op('#btnRegistarPeso').onclick = registarPesoHoje;
  $op('#perfilIrIA').onclick = () => mostrar('ia');
  $op('#perfilDefinicoes').onclick = abrirConfig;

  ligarDeslizeExercicios();
  ligarDeslizeSeries();

  // Apple Saúde
  $op('#defSaude').onclick = () => mostrar('saude');
  $op('#saudeVoltar').onclick = () => mostrar('definicoes');
  $op('#saudePeso').onchange = e => guardarSaude('peso', e.target.checked);
  $op('#saudeTreinos').onchange = e => guardarSaude('treinos', e.target.checked);

  // Plano IA
  $op('#view-ia').addEventListener('click', e => {
    const musculo = e.target.closest('[data-musculo]');
    if (musculo){
      Store.alternarMusculo(musculo.dataset.musculo);
      return renderMusculosPlano();
    }
    const pastilha = e.target.closest('.pastilha');
    if (!pastilha) return;
    const campo = pastilha.parentElement.dataset.plano;
    if (campo === 'descanso'){
      // o descanso é usado pelo cronómetro, por isso vive nas definições do treino
      Store.estado.config.descanso = +pastilha.dataset.valor;
      Store.salvar();
    } else if (campo === 'semanas'){
      Store.guardarPlanoConfig(campo, +pastilha.dataset.valor);
    } else {
      Store.guardarPlanoConfig(campo, pastilha.dataset.valor);
    }
    renderIA();
  });
  $op('#planoSuperseries').onchange = e => Store.guardarPlanoConfig('superseries', e.target.checked);
  $op('#linhaEquipamento').onclick = seletorEquipamento;
  $op('#linhaFotos').onclick = () => mostrar('fotos');
  $op('#linhaPerfil').onclick = () => mostrar('perfil');
  $op('#fotosVoltar').onclick = () => mostrar('ia');
  $op('#btnIrExercicios').onclick = () => mostrar('exercicios');
  $op('#exVoltar').onclick = () => mostrar('treinos');
  $('#btnTirarFoto').onclick    = () => $('#fotoCamera').click();
  $op('#btnEscolherFoto').onclick = () => $('#fotoGaleria').click();
  $('#fotoCamera').onchange  = e => { adicionarFotos(e.target.files); e.target.value = ''; };
  $op('#fotoGaleria').onchange = e => { adicionarFotos(e.target.files); e.target.value = ''; };
  $op('#btnGerarPlano').onclick = gerarPlano;
  $op('#fotos').onclick = e => {
    const btn = e.target.closest('[data-rm-foto]');
    if (!btn) return;
    fotosGinasio.splice(+btn.dataset.rmFoto, 1);
    renderFotos();
  };

  // Semana
  $op('#btnHistorico').onclick = historicoCompleto;
  $op('#btnPrograma').onclick = editorPrograma;
  $op('#semana').onclick = e => {
    const dia = e.target.closest('[data-dia]');
    if (!dia) return;
    const ficha = Store.treinoDoDia(+dia.dataset.dia);
    if (!ficha) return editorPrograma();
    detalheTreino(ficha.id);
  };

  // Progresso
  $op('#mes').onclick = e => {
    const cel = e.target.closest('[data-dia-mes]');
    if (cel) abrirDia(cel.dataset.diaMes, +cel.dataset.diaSemana);
  };
  $op('#mesAnterior').onclick = () => { mesVisivel.setMonth(mesVisivel.getMonth() - 1); renderMes(); };
  $op('#mesSeguinte').onclick = () => { mesVisivel.setMonth(mesVisivel.getMonth() + 1); renderMes(); };
  $op('#selEx').onchange = e => renderGraficoEx(e.target.value);

  // Descanso
  $op('#restPular').onclick = pararDescanso;

  // Delegação geral de cliques
  document.addEventListener('click', e => {
    const alvo = e.target;

    const ver = alvo.closest('[data-ver-treino]');
    if (ver && !alvo.closest('[data-iniciar],[data-edit-treino],[data-del-treino]')){
      return detalheTreino(ver.dataset.verTreino);
    }

    const iniciar = alvo.closest('[data-iniciar]');
    if (iniciar){
      if (Store.estado.sessaoAtiva) return toast('Já tens um treino a decorrer.');
      Store.iniciarSessao(iniciar.dataset.iniciar);
      mostrar('treino');
      return;
    }
    const verSessao = alvo.closest('[data-sessao]');
    if (verSessao) return detalheSessao(verSessao.dataset.sessao);

    const verEx = alvo.closest('[data-ex]');
    if (verEx) return detalheExercicio(verEx.dataset.ex);

    const editT = alvo.closest('[data-edit-treino]');
    if (editT) return editorTreino(editT.dataset.editTreino);

    const delT = alvo.closest('[data-del-treino]');
    if (delT){
      const t = Store.treino(delT.dataset.delTreino);
      return confirmar(`Eliminar a ficha "${t.nome}"?`, () => {
        Store.removerTreino(t.id); render(); toast('Ficha excluída.');
      }, 'Eliminar');
    }

    // --- dentro da sessão ---
    const passo = alvo.closest('[data-ir-ex]');
    if (passo){
      Store.irParaExercicio(+passo.dataset.irEx);
      return renderSessao(Store.estado.sessaoAtiva);
    }

    const check = alvo.closest('[data-check]');
    if (check){
      const [i, j] = check.dataset.check.split(':').map(Number);
      const serie = Store.estado.sessaoAtiva.exercicios[i].series[j];
      serie.feito = !serie.feito;
      Store.salvar();
      renderSessao(Store.estado.sessaoAtiva);
      if (serie.feito) iniciarDescanso(); else pararDescanso();
      return;
    }
    const addSerie = alvo.closest('[data-add-serie]');
    if (addSerie){
      const item = Store.estado.sessaoAtiva.exercicios[+addSerie.dataset.addSerie];
      const ultima = item.series[item.series.length - 1];
      item.series.push({ reps: ultima?.reps ?? '', carga: ultima?.carga ?? '', feito:false });
      Store.salvar();
      return renderSessao(Store.estado.sessaoAtiva);
    }
    const rmSerie = alvo.closest('[data-rm-serie]');
    if (rmSerie){
      const item = Store.estado.sessaoAtiva.exercicios[+rmSerie.dataset.rmSerie];
      if (item.series.length > 1) item.series.pop();
      Store.salvar();
      return renderSessao(Store.estado.sessaoAtiva);
    }
    const rmEx = alvo.closest('[data-rm-ex]');
    if (rmEx){
      Store.estado.sessaoAtiva.exercicios.splice(+rmEx.dataset.rmEx, 1);
      Store.salvar();
      return renderSessao(Store.estado.sessaoAtiva);
    }
  });

  // Edição dos campos de série (sem re-render, para não perder o foco)
  $op('#sessaoExercicios').addEventListener('input', e => {
    const inp = e.target;
    if (!inp.dataset.campo) return;
    const serie = Store.estado.sessaoAtiva.exercicios[+inp.dataset.i].series[+inp.dataset.j];
    serie[inp.dataset.campo] = inp.value;
    Store.salvar();
    atualizarStats();
  });
}

/* ---------------- Início ---------------- */
ligarEventos();
aplicarTema();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);
mostrar('inicio');

// Peso trazido do Saúde por um Atalho, quando a app é aberta no Safari.
const pesoImportado = Saude.pesoDoEndereco();
if (pesoImportado) toast(`Peso do Saúde guardado: ${fmtPeso(pesoImportado)} kg`);

/* ============================================================
   PWA: instalação na tela de início e uso offline
   ============================================================ */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () =>
    // updateViaCache:'none' — o próprio service worker nunca vem da cache
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(e => console.warn('SW não registado:', e)));
}

let promptInstalar = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptInstalar = e;
  $('#btnInstalar').hidden = false;
});
$('#btnInstalar').onclick = async () => {
  if (!promptInstalar) return;
  promptInstalar.prompt();
  await promptInstalar.userChoice;
  promptInstalar = null;
  $('#btnInstalar').hidden = true;
};
window.addEventListener('appinstalled', () => {
  $('#btnInstalar').hidden = true;
  toast('App instalado 🎉');
});

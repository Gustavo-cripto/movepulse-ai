/* ============================================================
   MovePulse AI — app de treinos. Controlador principal dos ecrãs.
   ============================================================ */

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
  if (viewAtual === 'inicio')     renderHoje();
  if (viewAtual === 'perfil')     renderPerfil();
  if (viewAtual === 'treinos')    renderTreinos();
  if (viewAtual === 'exercicios') renderExercicios();
  if (viewAtual === 'ia')         renderIA();
  if (viewAtual === 'fotos')      renderFotos();
  if (viewAtual === 'progresso')  renderProgresso();
  atualizarSubtitulo();
}

function atualizarSubtitulo(){
  const s = Store.estado.sessaoAtiva;
  $('#topbarSub').textContent = s ? `Em treino: ${s.nome}` : 'O teu diário de treino';
}

/* ============================================================
   TELA: HOJE
   ============================================================ */
function renderHoje(){
  const s = Store.estado.sessaoAtiva;
  $('#hojeVazio').hidden = !!s;
  $('#hojeSessao').hidden = !s;
  if (s) renderSessao(s); else { pararCrono(); renderInicio(); }
}

/** Quantos treinos planeados para esta semana já foram feitos. */
function renderPlanoSemana(){
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const treinados = Store.diasTreinados();

  let planeados = 0, feitos = 0;
  for (let i = 0; i < 7; i++){
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    if (Store.treinoDoDia(d.getDay())) planeados++;
    if (treinados.has(chaveDia(d))) feitos++;
  }
  const pct = planeados ? Math.min(100, Math.round((feitos / planeados) * 100)) : 0;

  $('#planoSemana').innerHTML = `
    <div class="item">
      <div>
        <h3 style="font-size:15px">Progresso semanal</h3>
        <p class="item__meta">${planeados ? `${feitos} de ${planeados} treinos planeados` : 'Ainda não planeaste a semana'}</p>
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
  const ficha = Store.treinoDoDia(hoje.getDay());
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
    $('#btnDescansoLivre').onclick = () => { Store.iniciarSessao(null); renderHoje(); atualizarSubtitulo(); };
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
        <button class="hoje__ir" data-iniciar="${ficha.id}" aria-label="Começar ${esc(ficha.nome)}">→</button>
      </div>
    </div>`;
  preencherMiniaturas(ficha);
}

const LETRAS_DIA = ['D','S','T','Q','Q','S','S'];
const NOMES_DIA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
let mesVisivel = null;   // primeiro dia do mês mostrado no calendário

/** "A — Peito, Ombro e Tríceps" -> "A"; "Full body" -> "Ful" */
function abreviar(nome){
  const m = nome.trim().match(/^([A-Za-z0-9])\s*[—\-–:]/);
  return m ? m[1] : nome.trim().slice(0, 3);
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
    const ficha = Store.treinoDoDia(d.getDay());
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

  Modal.abrir({
    titulo: 'Planear a semana',
    corpo: NOMES_DIA.map((nome, i) => `
      <div class="field">
        <label class="label" for="dia${i}">${nome}</label>
        <select class="input" id="dia${i}" data-dia-sel="${i}">${opcoes(Store.estado.programa[i])}</select>
      </div>`).join('') +
      '<p class="item__meta">Repete-se todas as semanas. Podes começar qualquer treino fora do plano na mesma.</p>',
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
  const { treinos, sessoes } = Store.estado;
  renderSaudacao();
  renderCartaoHoje();
  renderSemana();
  renderPlanoSemana();
  renderMes();

  $('#listaInicio').innerHTML = treinos.length
    ? treinos.map(t => `
        <button class="card card--tap" data-ver-treino="${t.id}">
          <h3>${esc(t.nome)}</h3>
          <p class="item__meta">${t.itens.length} exercício${t.itens.length === 1 ? '' : 's'} · ${duracaoEstimada(t)} min</p>
        </button>`).join('')
    : '<p class="empty">Ainda não tens fichas. Cria uma no separador Fichas.</p>';

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

  // as miniaturas chegam depois: o IndexedDB é assíncrono
  setTimeout(carregarMiniaturas, 0);

  $('#sessaoExercicios').innerHTML = s.exercicios.length
    ? s.exercicios.map((item, i) => {
        const ex = Store.exercicio(item.exId);
        const cardio = ex.tipo === 'cardio';
        return `<div class="card" data-ex-idx="${i}">
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
        </div>`;
      }).join('')
    : '<p class="empty">Adiciona o primeiro exercício deste treino.</p>';

  atualizarStats();
  iniciarCrono();
}

/** Põe a foto da máquina no cartão de cada exercício, se existir. */
async function carregarMiniaturas(){
  const s = Store.estado.sessaoAtiva;
  if (!s) return;
  for (const [i, item] of s.exercicios.entries()){
    const foto = await Fotos.ler(item.exId).catch(() => null);
    if (!foto) continue;
    const cabeca = $(`[data-ex-idx="${i}"] .ex-cabeca`);
    if (cabeca && !cabeca.querySelector('.ex-mini')){
      const img = document.createElement('img');
      img.className = 'ex-mini';
      img.src = foto;
      img.alt = '';
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
    $('#cronometro').textContent = fmtDuracao(Date.now() - s.inicio);
  };
  tick();
  cronoInterval = setInterval(tick, 1000);
}
function pararCrono(){
  clearInterval(cronoInterval);
  cronoInterval = null;
}

/* ---------------- Descanso ---------------- */
function iniciarDescanso(){
  const seg = Store.estado.config.descanso;
  if (!seg) return;
  restRestante = seg;
  $('#rest').hidden = false;
  $('#restTempo').textContent = restRestante;
  clearInterval(restInterval);
  restInterval = setInterval(() => {
    restRestante--;
    $('#restTempo').textContent = Math.max(0, restRestante);
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
        <button class="btn btn--sm btn--primary btn--block" data-iniciar="${t.id}">Iniciar treino</button>
      </div>`).join('')
    : '<p class="empty">Cria a tua primeira ficha para começar.</p>';
}

/** O que aconteceu (ou vai acontecer) num dia do calendário. */
function abrirDia(chave, diaSemana){
  const sessoes = Store.sessoesDoDia(chave);
  const ficha = Store.treinoDoDia(diaSemana);
  const [ano, mes, dia] = chave.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
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
async function detalheTreino(id){
  const ficha = Store.treino(id);
  if (!ficha) return;
  const grupos = gruposDaFicha(ficha).join(', ');

  Modal.abrir({
    titulo: ficha.nome,
    corpo: `
      <div class="grid grid--stats">
        ${statBox(duracaoEstimada(ficha) + ' min', 'duração')}
        ${statBox(ficha.itens.length, 'exercícios')}
        ${statBox(ficha.itens.reduce((t, i) => t + i.series, 0), 'séries')}
      </div>
      <p class="item__meta" style="margin-top:10px">${esc(grupos)}</p>
      <div class="stack" style="margin-top:14px">
        ${ficha.itens.map(it => {
          const ex = Store.exercicio(it.exId);
          const carga = Store.ultimaCarga(it.exId);
          return `<div class="ia-ex" data-prev-ex="${it.exId}">
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
          mostrar('inicio');
        } },
    ],
  });

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
          <p>${linkDemonstracao(ex.nome)}</p>
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

  $('#btnFotoMaquina').onclick = () => $('#ficheiroMaquina').click();
  $('#ficheiroMaquina').onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { dataUrl } = await comprimirFoto(f);
      await Fotos.guardar(id, dataUrl);
      toast('Foto guardada ✅');
      detalheExercicio(id);
      renderHoje();
    } catch (erro) {
      toast('Não consegui guardar a foto.');
    }
  };
  const btnApagar = $('#btnApagarFoto');
  if (btnApagar) btnApagar.onclick = async () => {
    await Fotos.apagar(id);
    toast('Foto removida.');
    detalheExercicio(id);
    renderHoje();
  };
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
          ${['Barra','Halteres','Máquina','Polia','Peso corporal','Acessório','Livre']
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

  $('#historico').innerHTML = sessoes.length
    ? sessoes.map(cardSessao).join('')
    : '<p class="empty">Conclui um treino para começar o teu histórico.</p>';
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
    const planeado = !!Store.treinoDoDia(data.getDay());
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
          mostrar('inicio');
        } },
    ],
  });
}

/* ============================================================
   TELA: PERFIL
   ============================================================ */
function renderPerfil(){
  const perfil = Store.estado.perfil;
  $$('[data-perfil]').forEach(campo => { campo.value = perfil[campo.dataset.perfil] ?? ''; });
  renderImc();
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
    $$('.pastilha', grupo).forEach(b =>
      b.classList.toggle('is-ativa', b.dataset.valor === String(cfg[campo])));
  });
  $('#planoSuperseries').checked = !!cfg.superseries;

  $('#equipResumo').textContent = cfg.equipamento.length
    ? `${cfg.equipamento.length} de ${TOTAL_EQUIPAMENTOS}`
    : 'todos';
  $('#fotosResumo').textContent = fotosGinasio.length
    ? `${fotosGinasio.length} ${fotosGinasio.length === 1 ? 'foto' : 'fotos'}`
    : 'nenhuma';

  const p = Store.estado.perfil;
  $('#perfilResumo').textContent = [p.objetivo.split(' ')[0], p.experiencia,
    p.limitacoes ? '⚠' : null].filter(Boolean).join(' · ');

  renderPlanoAtual();

  const ultimo = Store.estado.planoIA;
  if (ultimo && !$('#iaResultado').dataset.fresco) mostrarPlano(ultimo, true);
}

/** Cartão do plano em vigor, no topo do ecrã. */
function renderPlanoAtual(){
  const plano = Store.estado.planoIA;
  if (!plano){
    $('#planoAtual').innerHTML = `<p class="empty">Ainda não tens um plano. Define abaixo como treinas e cria o primeiro.</p>`;
    return;
  }
  const cfg = Store.estado.planoConfig;
  const p = Store.estado.perfil;
  $('#planoAtual').innerHTML = `
    <div class="card">
      <span class="hoje__etiqueta">Plano em vigor</span>
      <h3 style="margin-top:6px">${esc(plano.plano.nome)}</h3>
      <p class="item__meta" style="margin-top:4px">${esc(plano.plano.resumo)}</p>
      <div class="plano-grelha">
        <div class="plano-caixa"><strong>${plano.plano.treinos.length} treinos</strong><span>por semana</span></div>
        <div class="plano-caixa"><strong>${esc(cfg.local)}</strong><span>local</span></div>
        <div class="plano-caixa"><strong>${esc(cfg.duracao)} min</strong><span>duração</span></div>
        <div class="plano-caixa"><strong>${esc(p.experiencia)}</strong><span>nível</span></div>
      </div>
      <p class="item__meta" style="margin-top:12px">Criado em ${fmtDataHora(plano.criadoEm)}</p>
    </div>`;
}

/** Escolher o equipamento à mão. */
function seletorEquipamento(){
  const escolhidos = new Set(Store.estado.planoConfig.equipamento);

  const desenhar = () => {
    $('#modalCorpo').innerHTML = EQUIPAMENTOS.map(g => `
      <div class="equip-grupo">
        <p class="equip-cat">${esc(g.cat)}</p>
        ${g.itens.map(i => `
          <button class="equip-item ${escolhidos.has(i.id) ? 'is-ativa' : ''}" data-equip="${i.id}">
            <span class="equip-item__icone">${iconeEquipamento(i.id)}</span>
            <span class="equip-item__nome">${esc(i.nome)}</span>
            <span class="equip-item__caixa">✓</span>
          </button>`).join('')}
      </div>`).join('');
    $('#modalTitulo').textContent = escolhidos.size
      ? `Equipamento · ${escolhidos.size} de ${TOTAL_EQUIPAMENTOS}`
      : 'Equipamento · todos';
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
  $('#iaEstado').innerHTML = `<span class="a-carregar"></span>${fotosGinasio.length
    ? 'A analisar as fotos e a montar o plano…' : 'A montar o plano…'} pode demorar um minuto.`;
  $('#iaResultado').innerHTML = '';

  try {
    const plano = await pedirPlano(perfil, fotosGinasio);
    plano.criadoEm = Date.now();
    plano.perfil = perfil;
    Store.estado.planoIA = plano;
    Store.salvar();
    $('#iaEstado').textContent = '';
    renderPlanoAtual();
    mostrarPlano(plano, false);
  } catch (e) {
    $('#iaEstado').textContent = '';
    $('#iaResultado').innerHTML = `<div class="aviso">Não foi possível gerar o plano.<br>${esc(e.message)}
      <br><br>Confirma o modo e as credenciais em Plano com IA.
      <button class="btn btn--sm btn--ghost btn--block" id="btnErroConfig" style="margin-top:12px">
        ⚙️ Abrir definições
      </button></div>`;
    $('#btnErroConfig').onclick = abrirConfig;
  } finally {
    aGerarPlano = false;
    $('#btnGerarPlano').disabled = false;
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
        <div class="card__title"><h3>${esc(t.nome)}</h3></div>
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

    <button class="btn btn--primary btn--block" id="btnImportarPlano" style="margin-top:12px">
      Adicionar ${plano.plano.treinos.length} fichas às minhas fichas
    </button>`;

  $('#btnImportarPlano').onclick = () => {
    const fichas = importarPlano(plano.plano);
    espalharPelaSemana(fichas);
    toast(`${fichas.length} fichas criadas e postas no calendário ✅`);
    mostrar('inicio');
  };
}

/** Distribui as fichas do plano pelos dias da semana, deixando descanso pelo meio. */
function espalharPelaSemana(fichas){
  if (!fichas.length) return;
  // 2 fichas -> seg e qui; 3 -> seg, qua, sex; 4 -> seg, ter, qui, sex; 5 -> seg a sex; 6 -> seg a sáb
  const mapas = {
    1:[1], 2:[1,4], 3:[1,3,5], 4:[1,2,4,5], 5:[1,2,3,4,5], 6:[1,2,3,4,5,6],
  };
  const dias = mapas[Math.min(fichas.length, 6)] || [1,3,5];
  [0,1,2,3,4,5,6].forEach(d => Store.definirDia(d, null));
  dias.forEach((dia, i) => Store.definirDia(dia, fichas[i].id));
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
  Store.salvar();
  renderHoje();
}

function finalizarSessao(){
  const concluida = Store.finalizarSessao();
  pararDescanso();
  pararCrono();
  render();
  if (!concluida) return toast('Nenhuma série marcada — treino descartado.');
  toast(`Treino guardado: ${fmtNum(volumeSessao(concluida))} kg de volume 🔥`);
}

/* ============================================================
   Definições / dados
   ============================================================ */
function abrirConfig(){
  const c = Store.estado.config;
  Modal.abrir({
    titulo:'Definições',
    corpo: `
      <div class="field">
        <label class="label" for="cDescanso">Descanso entre séries (segundos)</label>
        <input class="input" type="number" id="cDescanso" min="0" max="600" step="15" value="${c.descanso}">
        <p class="item__meta" style="margin-top:6px">Põe 0 para desligar o cronómetro automático.</p>
      </div>
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
      <p class="item__meta" style="margin-top:14px">
        Fica tudo guardado só neste navegador (localStorage). Faz backup antes de limpares os dados do site.
      </p>`,
    acoes: [
      { texto:'Fechar', onClick: Modal.fechar },
      { texto:'Guardar', classe:'btn--primary', onClick(){
          Store.estado.config.descanso = Math.max(0, parseInt($('#cDescanso').value, 10) || 0);
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
  $('#btnConfig').onclick = abrirConfig;

  // Fechar modal
  $$('[data-close]').forEach(el => el.onclick = Modal.fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.fechar(); });

  // Hoje
  $('#btnTreinoLivre').onclick = () => { Store.iniciarSessao(null); renderHoje(); atualizarSubtitulo(); };
  $('#btnAddExSessao').onclick = () => seletorExercicio(ex => adicionarExercicioSessao(ex.id));
  $('#btnFinalizarSessao').onclick = () =>
    confirmar('Terminar e guardar este treino?', finalizarSessao, 'Finalizar');
  $('#btnCancelarSessao').onclick = () =>
    confirmar('Descartar o treino atual? Não fica nada guardado.', () => {
      Store.cancelarSessao(); pararDescanso(); pararCrono(); render();
    }, 'Descartar');

  // Fichas / exercícios
  $('#btnNovoTreino').onclick = () => editorTreino(null);
  $('#btnNovoEx').onclick = novoExercicio;
  $('#buscaEx').oninput = renderExercicios;
  $('#filtrosGrupo').onclick = e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filtroGrupo = chip.dataset.grupo;
    renderExercicios();
  };

  // Perfil: guarda-se sozinho, a cada alteração
  $('#view-perfil').addEventListener('input', e => {
    const campo = e.target.dataset.perfil;
    if (!campo) return;
    Store.guardarPerfil(campo, e.target.value);
    if (campo === 'altura' || campo === 'peso') renderImc();
    if (campo === 'nome') renderSaudacao();
  });
  $('#perfilIrIA').onclick = () => mostrar('ia');
  $('#atalhoIA').onclick = () => mostrar('ia');
  $('#perfilDefinicoes').onclick = abrirConfig;

  // Plano IA
  $('#view-ia').addEventListener('click', e => {
    const pastilha = e.target.closest('.pastilha');
    if (!pastilha) return;
    const campo = pastilha.parentElement.dataset.plano;
    Store.guardarPlanoConfig(campo, pastilha.dataset.valor);
    renderIA();
  });
  $('#planoSuperseries').onchange = e => Store.guardarPlanoConfig('superseries', e.target.checked);
  $('#linhaEquipamento').onclick = seletorEquipamento;
  $('#linhaFotos').onclick = () => mostrar('fotos');
  $('#linhaPerfil').onclick = () => mostrar('perfil');
  $('#fotosVoltar').onclick = () => mostrar('ia');
  $('#btnIrExercicios').onclick = () => mostrar('exercicios');
  $('#exVoltar').onclick = () => mostrar('treinos');
  $('#btnTirarFoto').onclick    = () => $('#fotoCamera').click();
  $('#btnEscolherFoto').onclick = () => $('#fotoGaleria').click();
  $('#fotoCamera').onchange  = e => { adicionarFotos(e.target.files); e.target.value = ''; };
  $('#fotoGaleria').onchange = e => { adicionarFotos(e.target.files); e.target.value = ''; };
  $('#btnGerarPlano').onclick = gerarPlano;
  $('#fotos').onclick = e => {
    const btn = e.target.closest('[data-rm-foto]');
    if (!btn) return;
    fotosGinasio.splice(+btn.dataset.rmFoto, 1);
    renderFotos();
  };

  // Semana
  $('#btnPrograma').onclick = editorPrograma;
  $('#semana').onclick = e => {
    const dia = e.target.closest('[data-dia]');
    if (!dia) return;
    const ficha = Store.treinoDoDia(+dia.dataset.dia);
    if (!ficha) return editorPrograma();
    detalheTreino(ficha.id);
  };

  // Progresso
  $('#mes').onclick = e => {
    const cel = e.target.closest('[data-dia-mes]');
    if (cel) abrirDia(cel.dataset.diaMes, +cel.dataset.diaSemana);
  };
  $('#mesAnterior').onclick = () => { mesVisivel.setMonth(mesVisivel.getMonth() - 1); renderMes(); };
  $('#mesSeguinte').onclick = () => { mesVisivel.setMonth(mesVisivel.getMonth() + 1); renderMes(); };
  $('#selEx').onchange = e => renderGraficoEx(e.target.value);

  // Descanso
  $('#restPular').onclick = pararDescanso;

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
      mostrar('inicio');
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
  $('#sessaoExercicios').addEventListener('input', e => {
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
mostrar('inicio');

/* ============================================================
   PWA: instalação na tela de início e uso offline
   ============================================================ */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW não registrado:', e)));
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

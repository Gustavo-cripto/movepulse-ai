/* Helpers de DOM, formatação, modal, toast e gráfico. */

const $  = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/* Objeto inofensivo devolvido por $op quando o elemento já não existe. */
const SEM_ELEMENTO = {
  addEventListener(){}, removeEventListener(){},
  classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  style:{}, dataset:{},
};

/** Como $, mas nunca devolve null: se o id tiver desaparecido do HTML,
    avisa na consola e segue. Evita que uma ligação de evento antiga
    parta todas as que vêm a seguir. */
function $op(sel, raiz = document){
  const el = $(sel, raiz);
  if (el) return el;
  console.warn('MovePulse: elemento em falta,', sel);
  return SEM_ELEMENTO;
}

/** Escapa texto vindo do usuário antes de injetar em innerHTML. */
function esc(txt){
  return String(txt ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function fmtPeso(v){
  const n = num(v);
  return (Number.isInteger(n) ? n : n.toFixed(1)).toString().replace('.', ',');
}
function fmtNum(n){
  return Math.round(n).toLocaleString('pt-PT');
}
function fmtDuracao(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(seg).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function fmtData(ts){
  return new Date(ts).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit' });
}
function fmtDataHora(ts){
  return new Date(ts).toLocaleDateString('pt-PT', {
    day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
  });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------- Modal ---------- */
const Modal = {
  /** abrir({titulo, corpo, acoes:[{texto, classe, onClick}]}) */
  abrir({ titulo, corpo, acoes = [] }){
    $('#modalTitulo').textContent = titulo;
    const body = $('#modalCorpo');
    // limpa handlers do modal anterior antes de trocar o conteúdo
    body.onclick = null;
    body.oninput = null;
    body.innerHTML = corpo;
    const rodape = $('#modalRodape');
    rodape.innerHTML = '';
    acoes.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.classe || 'btn--ghost');
      b.textContent = a.texto;
      b.onclick = () => a.onClick?.();
      rodape.appendChild(b);
    });
    rodape.hidden = !acoes.length;
    $('#modal').hidden = false;
    setTimeout(() => $('#modalCorpo input, #modalCorpo select')?.focus(), 60);
  },
  fechar(){ $('#modal').hidden = true; },
};

function confirmar(msg, aoConfirmar, textoOk = 'Confirmar'){
  Modal.abrir({
    titulo: 'Tem certeza?',
    corpo: `<p class="muted">${esc(msg)}</p>`,
    acoes: [
      { texto:'Cancelar', onClick: Modal.fechar },
      { texto: textoOk, classe:'btn--danger', onClick(){ Modal.fechar(); aoConfirmar(); } },
    ],
  });
}

/* ---------- Gráfico de linha (SVG) ---------- */
/** pontos: [{x:'01 mar', y:1234}] */
function grafico(pontos, sufixo = ''){
  if (pontos.length < 2){
    return '<p class="empty">Regista este exercício em pelo menos 2 treinos para veres a evolução.</p>';
  }
  const L = 40, R = 10, T = 12, B = 24, W = 320, H = 150;
  const iw = W - L - R, ih = H - T - B;
  const ys = pontos.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max){ min = min * 0.9; max = max * 1.1 || 1; }
  const px = i => L + (pontos.length === 1 ? iw / 2 : (i / (pontos.length - 1)) * iw);
  const py = v => T + ih - ((v - min) / (max - min)) * ih;

  const linha = pontos.map((p, i) => `${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
  const area  = `${L},${T + ih} ${linha} ${px(pontos.length - 1).toFixed(1)},${T + ih}`;
  const dots  = pontos.map((p, i) =>
    `<circle class="g-dot" cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3"><title>${esc(p.x)}: ${fmtNum(p.y)}${esc(sufixo)}</title></circle>`).join('');
  const grades = [0, .5, 1].map(f => {
    const y = (T + ih - f * ih).toFixed(1);
    const v = min + f * (max - min);
    return `<line class="g-grid" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/>
            <text class="g-lbl" x="4" y="${(+y + 3).toFixed(1)}">${fmtNum(v)}</text>`;
  }).join('');
  const rotulos = [0, pontos.length - 1].map(i =>
    `<text class="g-lbl" x="${px(i).toFixed(1)}" y="${H - 6}" text-anchor="${i ? 'end' : 'start'}">${esc(pontos[i].x)}</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de evolução">
    <defs><linearGradient id="gFade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#c6f24e" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#c6f24e" stop-opacity="0"/>
    </linearGradient></defs>
    ${grades}
    <polygon class="g-area" points="${area}"/>
    <polyline class="g-line" points="${linha}"/>
    ${dots}${rotulos}
  </svg>`;
}

/** Bipe curto para o fim do descanso (sem arquivo de áudio). */
function bipe(){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.25, ctx.currentTime + .02);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .5);
    setTimeout(() => ctx.close(), 800);
  } catch (e) { /* áudio bloqueado pelo navegador — silencioso de propósito */ }
}

/* ============================================================
   Diagrama do corpo em SVG, com o músculo trabalhado destacado.
   Desenhado à mão em formas simples: sem imagens externas, sem
   licenças de terceiros e funciona offline.
   ============================================================ */

/* Que regiões acender para cada grupo do catálogo. */
const REGIOES_POR_GRUPO = {
  'Peito':   ['peito'],
  'Costas':  ['dorsais', 'trapezio'],
  'Ombros':  ['deltoide'],
  'Bíceps':  ['biceps'],
  'Tríceps': ['triceps'],
  'Abdómen': ['abdominais'],
  'Pernas':  ['quadriceps', 'isquiotibiais', 'gemeos', 'gluteos'],
  'Cardio':  ['peito', 'quadriceps', 'gemeos', 'isquiotibiais'],
};

/* Cada região: as formas que a compõem, e em que vista aparece.
   Coordenadas pensadas para uma figura de 100x190 por vista. */
const FIGURA = {
  frente: [
    { r:'cabeca',      f:`<circle cx="50" cy="16" r="11"/>` },
    { r:'pescoco',     f:`<rect x="44" y="26" width="12" height="7" rx="3"/>` },
    { r:'deltoide',    f:`<circle cx="28" cy="42" r="9"/><circle cx="72" cy="42" r="9"/>` },
    { r:'peito',       f:`<path d="M36 36h12v16c0 4-3 6-7 6s-7-3-7-7z"/><path d="M52 36h12v15c0 4-3 7-7 7s-7-2-7-6z"/>` },
    { r:'abdominais',  f:`<rect x="41" y="60" width="8" height="9" rx="2"/><rect x="51" y="60" width="8" height="9" rx="2"/>
                          <rect x="41" y="71" width="8" height="9" rx="2"/><rect x="51" y="71" width="8" height="9" rx="2"/>
                          <rect x="41" y="82" width="8" height="9" rx="2"/><rect x="51" y="82" width="8" height="9" rx="2"/>` },
    { r:'biceps',      f:`<rect x="18" y="50" width="10" height="22" rx="5"/><rect x="72" y="50" width="10" height="22" rx="5"/>` },
    { r:'antebraco',   f:`<rect x="16" y="73" width="9" height="22" rx="4"/><rect x="75" y="73" width="9" height="22" rx="4"/>` },
    { r:'quadriceps',  f:`<rect x="35" y="96" width="13" height="38" rx="6"/><rect x="52" y="96" width="13" height="38" rx="6"/>` },
    { r:'gemeos',      f:`<rect x="36" y="139" width="11" height="34" rx="5"/><rect x="53" y="139" width="11" height="34" rx="5"/>` },
  ],
  costas: [
    { r:'cabeca',        f:`<circle cx="50" cy="16" r="11"/>` },
    { r:'trapezio',      f:`<path d="M38 30h24l-6 14H44z"/>` },
    { r:'deltoide',      f:`<circle cx="28" cy="42" r="9"/><circle cx="72" cy="42" r="9"/>` },
    { r:'dorsais',       f:`<path d="M36 44h28l-5 30H41z"/>` },
    { r:'triceps',       f:`<rect x="18" y="50" width="10" height="22" rx="5"/><rect x="72" y="50" width="10" height="22" rx="5"/>` },
    { r:'antebraco',     f:`<rect x="16" y="73" width="9" height="22" rx="4"/><rect x="75" y="73" width="9" height="22" rx="4"/>` },
    { r:'lombar',        f:`<rect x="42" y="76" width="16" height="12" rx="4"/>` },
    { r:'gluteos',       f:`<path d="M36 90h28v14c0 5-6 8-14 8s-14-3-14-8z"/>` },
    { r:'isquiotibiais', f:`<rect x="35" y="114" width="13" height="30" rx="6"/><rect x="52" y="114" width="13" height="30" rx="6"/>` },
    { r:'gemeos',        f:`<rect x="36" y="147" width="11" height="28" rx="5"/><rect x="53" y="147" width="11" height="28" rx="5"/>` },
  ],
};

/** Desenha uma vista, acendendo as regiões pedidas. */
function vista(nome, acesas){
  const partes = FIGURA[nome].map(p => {
    const ativa = acesas.includes(p.r);
    return `<g class="${ativa ? 'm-ativo' : 'm-base'}">${p.f}</g>`;
  }).join('');
  return `<svg viewBox="0 0 100 190" class="corpo" aria-hidden="true">${partes}</svg>`;
}

/**
 * Diagrama para um grupo muscular.
 * Mostra só a vista onde o músculo se vê — as duas quando o trabalho é dos dois lados.
 */
function diagramaMusculos(grupo){
  const acesas = REGIOES_POR_GRUPO[grupo] || [];
  if (!acesas.length) return '';

  const naFrente = FIGURA.frente.some(p => acesas.includes(p.r));
  const atras    = FIGURA.costas.some(p => acesas.includes(p.r));

  const vistas = [];
  if (naFrente) vistas.push(vista('frente', acesas));
  if (atras)    vistas.push(vista('costas', acesas));

  return `<div class="musculos" title="${esc(grupo)}">${vistas.join('')}</div>`;
}

/** Procura de demonstração em vídeo, para quem não conhece o exercício. */
function linkDemonstracao(nome){
  const busca = encodeURIComponent(`como fazer ${nome} exercício técnica`);
  return `<a class="demo" href="https://www.youtube.com/results?search_query=${busca}"
             target="_blank" rel="noopener noreferrer">▶ Ver execução</a>`;
}

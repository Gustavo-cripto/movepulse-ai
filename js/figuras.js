/* ============================================================
   Figuras que mostram a execução de cada exercício.

   São três desenhos por exercício (início, meio, fim) que se
   alternam para dar a ideia do movimento. Ficheiros em
   /exercicios, do projeto Workout Guide (Bryl Lim) a partir do
   Everkinetic, sob CC BY-SA 4.0 — ver exercicios/CREDITOS.md.

   Carregam-se a pedido: são 3,8 MB no total e não fazia sentido
   guardá-los todos à cabeça só para ver um exercício.
   ============================================================ */

/** Que desenho serve cada exercício do catálogo. */
const FIGURA_DE = {
  'suo-reto':'bench-press', 'sup-incl-hal':'incline-dumbbell-press',
  'sup-decl':'decline-bench-press', 'crucifixo':'dumbbell-fly',
  'crossover':'cable-fly', 'flexao':'push-up', 'peck-deck':'pec-deck',

  'barra-fixa':'pull-up', 'puxada-frente':'lat-pulldown', 'remada-curv':'barbell-row',
  'remada-uni':'one-arm-dumbbell-row', 'remada-baixa':'seated-row',
  'levantamento':'deadlift', 'pulldown':'straight-arm-pulldown',

  'agachamento':'squat', 'leg-press':'leg-press', 'ext-joelhos':'leg-extension',
  'flex-joelhos':'lying-leg-curl', 'stiff':'romanian-deadlift', 'afundo':'walking-lunge',
  'bulgaro':'bulgarian-split-squat', 'panturrilha':'standing-calf-raise',
  'hip-thrust':'hip-thrust', 'cadeira-abd':'hip-abduction-machine',

  'desenvolv':'seated-dumbbell-press', 'desenvolv-mil':'overhead-press',
  'elev-lateral':'lateral-raise', 'elev-frontal':'front-raise',
  'crucifixo-inv':'rear-delt-fly', 'remada-alta':'upright-row',
  'encolhimento':'dumbbell-shrug',

  'rosca-direta':'ez-bar-curl', 'rosca-alt':'bicep-curl', 'rosca-martelo':'hammer-curl',
  'rosca-scott':'preacher-curl', 'rosca-conc':'concentration-curl',

  'triceps-polia':'rope-tricep-pushdown', 'triceps-testa':'skull-crusher',
  'triceps-franc':'dumbbell-overhead-tricep-extension', 'mergulho':'bench-dip',
  'paralelas':'dip',

  'prancha':'plank', 'abd-supra':'crunch', 'elev-pernas':'lying-leg-raise',
  'abd-obliquo':'bicycle-crunch', 'roda-abd':'ab-wheel',

  'esteira':'running', 'bike':'cycling', 'eliptico':'elliptical',
  'corda':'jump-rope', 'remo-ergo':'rowing',
};

/** O desenho de um exercício, ou null se ainda não tiver. */
function figuraDoExercicio(exId){
  return FIGURA_DE[exId] || null;
}

/** Vai e volta pelos três desenhos: 1 → 2 → 3 → 2 → … */
const ORDEM_FIGURA = [1, 2, 3, 2];
const TEMPO_FIGURA = 620;   // ms em cada desenho

/**
 * Mostra o exercício a mexer dentro de `palco`.
 * Devolve a função que pára a animação.
 */
function animarFigura(palco, exId){
  const slug = figuraDoExercicio(exId);
  if (!palco || !slug) return () => {};

  palco.innerHTML = ORDEM_FIGURA
    .filter((n, i) => ORDEM_FIGURA.indexOf(n) === i)      // um <img> por desenho
    .map(n => `<img class="figura-ex__frame" src="exercicios/${slug}/frame-${n}.svg"
                    alt="" data-frame="${n}" loading="lazy">`).join('');

  const imagens = new Map([...palco.querySelectorAll('[data-frame]')]
    .map(img => [+img.dataset.frame, img]));

  const mostrar = n => imagens.forEach((img, k) => img.classList.toggle('is-visivel', k === n));
  mostrar(1);

  // quem pediu menos movimento fica com o desenho do meio, parado
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    mostrar(2);
    return () => {};
  }

  let i = 0;
  const relogio = setInterval(() => {
    i = (i + 1) % ORDEM_FIGURA.length;
    mostrar(ORDEM_FIGURA[i]);
  }, TEMPO_FIGURA);

  return () => clearInterval(relogio);
}

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

/* Os exercícios do catálogo alargado usam o próprio id como nome da pasta. */
const FIGURAS_PROPRIAS = new Set([
  'active-hang', 'archer-push-up', 'arm-circles', 'arnold-press', 'assault-bike',
  'assisted-chin-up', 'assisted-dip', 'assisted-pistol-squat', 'assisted-pull-up',
  'back-extension', 'band-pull-apart', 'banded-clamshell', 'banded-dead-bug',
  'banded-donkey-kick', 'banded-face-pull', 'banded-fire-hydrant', 'banded-frog-pump',
  'banded-glute-bridge', 'banded-hip-thrust', 'banded-kickback', 'banded-lat-pulldown',
  'banded-lateral-walk', 'banded-monster-walk', 'banded-pallof-press', 'banded-row',
  'banded-seated-hip-abduction', 'banded-squat', 'banded-standing-hip-abduction',
  'banded-woodchop', 'barbell-glute-bridge', 'battle-ropes', 'bear-crawl', 'bear-plank',
  'belt-squat', 'bent-over-rear-delt-raise', 'bird-dog', 'bodyweight-squat', 'burpee',
  'butterfly-stretch', 'cable-crunch', 'cable-curl', 'cable-front-raise', 'cable-kickback',
  'cable-lateral-raise', 'cable-pallof-hold', 'cable-pull-through', 'cable-rear-delt-fly',
  'cable-standing-hip-abduction', 'cable-standing-hip-adduction', 'cable-woodchop',
  'calf-raise', 'captains-chair-knee-raise', 'cat-cow-stretch', 'chair-dip', 'chest-dip',
  'chest-supported-row', 'childs-pose', 'chin-up', 'clamshell', 'close-grip-bench-press',
  'close-grip-lat-pulldown', 'commando-pull-up', 'copenhagen-plank', 'cossack-squat',
  'crab-walk', 'cross-body-shoulder-stretch', 'curtsy-lunge', 'dead-bug', 'dead-hang',
  'decline-dumbbell-press', 'decline-push-up', 'decline-sit-up', 'deficit-reverse-lunge',
  'diamond-push-up', 'donkey-calf-raise', 'donkey-kick', 'doorway-chest-stretch',
  'doorway-row', 'drag-curl', 'dragon-flag', 'dumbbell-bench-press', 'dumbbell-bent-over-row',
  'dumbbell-curtsy-lunge', 'dumbbell-glute-bridge', 'dumbbell-hip-thrust',
  'dumbbell-lateral-lunge', 'dumbbell-romanian-deadlift', 'dumbbell-side-bend',
  'dumbbell-skull-crusher', 'dumbbell-sumo-deadlift', 'dumbbell-sumo-squat',
  'explosive-push-up', 'face-pull', 'farmer-carry', 'fast-feet', 'feet-elevated-pike-push-up',
  'fire-hydrant', 'flutter-kick', 'forward-lunge', 'frog-pump',
  'front-foot-elevated-split-squat', 'front-squat', 'glute-bridge', 'glute-bridge-march',
  'glute-focused-back-extension', 'goblet-squat', 'good-morning', 'hack-squat', 'half-burpee',
  'half-kneeling-pallof-press', 'hamstring-stretch', 'handstand-push-up', 'hanging-knee-raise',
  'hanging-leg-raise', 'heel-elevated-goblet-squat', 'heel-tap', 'high-knees', 'hiking',
  'hindu-push-up', 'hip-adduction-machine', 'hip-airplane', 'hollow-body-hold', 'hollow-rock',
  'inchworm', 'incline-bench-press', 'incline-cable-fly', 'incline-dumbbell-curl',
  'incline-push-up', 'inverted-row', 'jump-squat', 'jumping-jack',
  'kettlebell-romanian-deadlift', 'kettlebell-swing', 'knee-push-up',
  'kneeling-hip-flexor-stretch', 'l-sit-hold', 'l-sit-pull-up', 'landmine-press',
  'landmine-romanian-deadlift', 'landmine-squat', 'lateral-lunge', 'lateral-shuffle',
  'leg-curl', 'leg-press-calf-raise', 'leg-swings-stretch', 'lying-hamstring-walkout',
  'machine-chest-press', 'machine-glute-kickback', 'machine-lateral-raise', 'machine-row',
  'machine-shoulder-press', 'meadows-row', 'mountain-climber', 'negative-pull-up',
  'neutral-grip-pull-up', 'nordic-hamstring-curl', 'overhead-tricep-extension', 'pallof-press',
  'pendlay-row', 'pike-push-up', 'pistol-squat', 'plank-jack', 'plank-shoulder-tap',
  'plate-front-raise', 'prone-t-raise', 'prone-y-raise', 'push-press', 'push-up-shoulder-tap',
  'rack-pull', 'reverse-crunch', 'reverse-curl', 'reverse-hyperextension', 'reverse-lunge',
  'reverse-pec-deck', 'reverse-snow-angel', 'rope-hammer-curl', 'russian-twist',
  'scapular-pull-up', 'scapular-push-up', 'seal-jack', 'seated-calf-raise',
  'seated-forward-fold-stretch', 'seated-knee-tuck', 'seated-leg-curl', 'shrimp-squat',
  'shrug', 'side-lying-hip-abduction', 'side-lying-leg-raise', 'side-plank',
  'side-plank-hip-dip', 'single-arm-cable-row', 'single-arm-dumbbell-tricep-extension',
  'single-dumbbell-skullcrusher', 'single-leg-box-squat', 'single-leg-calf-raise',
  'single-leg-glute-bridge', 'single-leg-romanian-deadlift', 'sissy-squat', 'skater-hop',
  'skater-squat', 'skierg', 'smith-machine-bench-press', 'smith-machine-bulgarian-split-squat',
  'smith-machine-hip-thrust', 'smith-machine-reverse-lunge', 'smith-machine-romanian-deadlift',
  'smith-machine-split-squat', 'smith-machine-squat', 'spider-curl', 'split-squat', 'sprawl',
  'squat-thrust', 'stability-ball-hamstring-curl', 'stair-climber', 'standing-dumbbell-press',
  'standing-quad-stretch', 'step-down', 'step-up', 'sumo-deadlift', 'superman',
  'superman-hold', 'swimming', 't-bar-row', 'toe-touch', 'torso-twist-stretch',
  'towel-hamstring-curl', 'towel-pull-up', 'towel-row', 'trap-bar-deadlift',
  'treadmill-incline-walk', 'tricep-kickback', 'tricep-pushdown', 'typewriter-push-up', 'v-up',
  'walking', 'wall-calf-stretch', 'wall-handstand-push-up', 'wall-push-up', 'wall-sit',
  'wall-walk', 'weighted-chin-up', 'weighted-crunch', 'weighted-dip', 'weighted-pull-up',
  'weighted-push-up', 'weighted-russian-twist', 'wide-grip-lat-pulldown', 'wide-push-up',
  'worlds-greatest-stretch', 'wrist-curl', 'wrist-extension',
]);

/** O desenho de um exercício. Aceita o id ou o próprio exercício —
    com o exercício inteiro ainda dá para procurar um parecido. */
function figuraDoExercicio(ex){
  const id = typeof ex === 'string' ? ex : ex?.id;
  if (FIGURA_DE[id]) return FIGURA_DE[id];
  if (FIGURAS_PROPRIAS.has(id)) return id;
  return typeof ex === 'object' ? figuraParecida(ex) : null;
}

/** Os exercícios que a IA inventa não têm figura própria. Procura-se no
    catálogo o movimento mais parecido, dentro do mesmo grupo muscular e
    sem trocar equipamento nem variante (não vale mostrar um inclinado
    quando o exercício é declinado). */
function figuraParecida(ex){
  if (!ex?.nome || typeof semelhancaNomes !== 'function') return null;

  const alvo = normalizar(ex.nome);
  const palavras = palavrasUteis(ex.nome);
  let melhor = null, melhorNota = 0;

  for (const cand of EXERCICIOS_BASE){
    if (ex.grupo && cand.grupo !== ex.grupo) continue;
    const slug = FIGURA_DE[cand.id] || (FIGURAS_PROPRIAS.has(cand.id) ? cand.id : null);
    if (!slug) continue;

    const nome = normalizar(cand.nome);
    if (conflito(PALAVRAS_EQUIP, alvo, nome)) continue;
    if (conflito(PALAVRAS_VARIANTE, semAlturaDaPolia(alvo), semAlturaDaPolia(nome))) continue;

    const palavrasCand = palavrasUteis(cand.nome);
    const nota = semelhancaNomes(palavras, palavrasCand);
    // a primeira palavra é o movimento ("agachamento", "supino", "remada"):
    // quando é a mesma, basta menos parecença no resto do nome
    const minimo = palavras[0] === palavrasCand[0] ? 0.34 : 0.5;
    if (nota >= minimo && nota > melhorNota){ melhorNota = nota; melhor = slug; }
  }
  return melhor;
}

/** Vai e volta pelos três desenhos: 1 → 2 → 3 → 2 → … */
const ORDEM_FIGURA = [1, 2, 3, 2];
const TEMPO_FIGURA = 620;   // ms em cada desenho

/**
 * Mostra o exercício a mexer dentro de `palco`.
 * Devolve a função que pára a animação.
 */
function animarFigura(palco, ex){
  const slug = figuraDoExercicio(ex);
  if (!palco || !slug) return () => {};

  palco.innerHTML = ORDEM_FIGURA
    .filter((n, i) => ORDEM_FIGURA.indexOf(n) === i)      // um <img> por desenho
    // sem loading="lazy": sobrepostas e a opacidade zero, o navegador
    // adiava o carregamento para sempre e a figura ficava em branco
    .map(n => `<img class="figura-ex__frame" src="exercicios/${slug}/frame-${n}.svg"
                    alt="" data-frame="${n}" decoding="async">`).join('');

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

/* ============================================================
   Ponte para o Apple Saúde, através da app Atalhos.

   O iOS não deixa uma app web falar diretamente com o Saúde —
   isso é exclusivo das apps nativas. O que dá para fazer é pedir
   a um Atalho, que corre fora do browser e tem essa permissão,
   que escreva ou leia por nós:

     treino  →  a app abre o Atalho com os dados do treino em JSON
     peso    ←  o Atalho lê o Saúde, copia o valor, a app cola-o

   Passa pela área de transferência e não por um endereço porque,
   no iOS, abrir um link https tira-nos da app instalada e leva-nos
   ao Safari, que tem um armazenamento à parte.
   ============================================================ */

const NOME_ATALHO_TREINO = 'MovePulse Treino';
const NOME_ATALHO_PESO   = 'MovePulse Peso';

const Saude = {
  get conf(){ return Store.estado.config.saude; },

  /** A ponte só faz sentido em aparelhos da Apple, que têm Atalhos e Saúde. */
  get noApple(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  /** Estimativa de calorias: musculação ronda os 5 MET. */
  calorias(minutos){
    const kg = num(Store.estado.perfil.peso) || 75;
    return Math.round(5 * 3.5 * kg / 200 * Math.max(1, minutos));
  },

  /** O que vai para o Atalho, em JSON, para ele registar no Saúde. */
  dadosDoTreino(sessao){
    const inicio = sessao.inicio || Date.now();
    const fim = sessao.fim || Date.now();
    const minutos = Math.max(1, Math.round((fim - inicio) / 60000));
    return {
      app: 'MovePulse AI',
      nome: sessao.nome || 'Treino',
      tipo: 'Treino de força',
      inicio: new Date(inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      minutos,
      kcal: Saude.calorias(minutos),
      series: totalSeries(sessao),
      volume: Math.round(volumeSessao(sessao)),
    };
  },

  /** Abre o Atalho que grava o treino no Saúde. */
  enviarTreino(sessao, manual = false){
    if (!sessao) return manual && toast('Ainda não há treinos guardados.');
    if (!manual && !Saude.conf.treinos) return;
    const texto = encodeURIComponent(JSON.stringify(Saude.dadosDoTreino(sessao)));
    location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(NOME_ATALHO_TREINO)}`
                  + `&input=text&text=${texto}`;
  },

  /** Abre o Atalho que copia o peso mais recente do Saúde. */
  pedirPeso(){
    location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(NOME_ATALHO_PESO)}`;
  },

  /** Lê o peso que o Atalho deixou na área de transferência. */
  async colarPeso(){
    let texto = '';
    try { texto = await navigator.clipboard.readText(); }
    catch { throw new Error('O telemóvel não deixou ler o que está copiado. Toca outra vez e autoriza "Colar".'); }

    const kg = num(String(texto).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!kg || kg < 25 || kg > 300) throw new Error(`Não encontrei um peso no que está copiado ("${String(texto).slice(0, 20)}").`);
    Store.registarPeso(kg);
    return kg;
  },

  /** Peso vindo no endereço (?peso=78.4), para quem usa a app no Safari. */
  pesoDoEndereco(){
    const kg = num(new URLSearchParams(location.search).get('peso'));
    if (!kg || kg < 25 || kg > 300) return null;
    Store.registarPeso(kg);
    history.replaceState(null, '', location.pathname);
    return kg;
  },
};

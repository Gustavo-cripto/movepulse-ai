/* ============================================================
   Alimentos: a tabela de base e a procura.

   Três sítios de onde vem comida, por esta ordem:
     1. os teus — tudo o que já registaste antes, a um toque
     2. a tabela aqui em baixo — o que se come cá, sempre disponível,
        mesmo sem rede
     3. Open Food Facts — produtos embalados, por marca e código

   Os valores da tabela são por 100 g (ou 100 ml nos líquidos) e são
   de referência: variam com a marca, o corte e o modo de preparação.
   Servem para acompanhar a tendência, não para pesar ao grama.
   ============================================================ */

/* nome, kcal, proteína, hidratos, gordura — por 100 g. porcao = porção
   habitual em gramas, para não se andar sempre a adivinhar. */
const ALIMENTOS_BASE = [
  // ---- pão, cereais e massas ----
  { nome:'Pão de trigo',               kcal:265, prot:9,    hc:49,   gord:3.2, porcao:50,  medida:'1 fatia' },
  { nome:'Pão integral',               kcal:247, prot:13,   hc:41,   gord:3.4, porcao:50,  medida:'1 fatia' },
  { nome:'Papo-seco',                  kcal:280, prot:9,    hc:55,   gord:2,   porcao:60,  medida:'1 unidade' },
  { nome:'Tostas integrais',           kcal:380, prot:12,   hc:70,   gord:5,   porcao:20,  medida:'2 tostas' },
  { nome:'Arroz cozido',               kcal:130, prot:2.7,  hc:28,   gord:0.3, porcao:150, medida:'1 chávena' },
  { nome:'Arroz integral cozido',      kcal:123, prot:2.7,  hc:26,   gord:1,   porcao:150, medida:'1 chávena' },
  { nome:'Massa cozida',               kcal:131, prot:5,    hc:25,   gord:1.1, porcao:180, medida:'1 prato' },
  { nome:'Batata cozida',              kcal:87,  prot:1.9,  hc:20,   gord:0.1, porcao:200, medida:'2 médias' },
  { nome:'Batata frita',               kcal:312, prot:3.4,  hc:41,   gord:15,  porcao:150, medida:'1 dose' },
  { nome:'Batata-doce cozida',         kcal:90,  prot:2,    hc:21,   gord:0.1, porcao:200, medida:'1 média' },
  { nome:'Aveia em flocos',            kcal:389, prot:17,   hc:66,   gord:7,   porcao:40,  medida:'4 colheres' },
  { nome:'Cereais de pequeno-almoço',  kcal:380, prot:8,    hc:80,   gord:3,   porcao:40,  medida:'1 taça' },
  { nome:'Couscous cozido',            kcal:112, prot:3.8,  hc:23,   gord:0.2, porcao:150, medida:'1 chávena' },
  { nome:'Grão-de-bico cozido',        kcal:164, prot:9,    hc:27,   gord:2.6, porcao:120, medida:'1 chávena' },
  { nome:'Feijão cozido',              kcal:127, prot:9,    hc:23,   gord:0.5, porcao:120, medida:'1 chávena' },
  { nome:'Lentilhas cozidas',          kcal:116, prot:9,    hc:20,   gord:0.4, porcao:120, medida:'1 chávena' },

  // ---- carne ----
  { nome:'Peito de frango grelhado',   kcal:165, prot:31,   hc:0,    gord:3.6, porcao:150, medida:'1 bife' },
  { nome:'Coxa de frango',             kcal:209, prot:26,   hc:0,    gord:11,  porcao:150, medida:'1 coxa' },
  { nome:'Peru grelhado',              kcal:135, prot:30,   hc:0,    gord:1,   porcao:150, medida:'1 bife' },
  { nome:'Bife de vaca grelhado',      kcal:250, prot:26,   hc:0,    gord:16,  porcao:150, medida:'1 bife' },
  { nome:'Carne picada de vaca',       kcal:254, prot:26,   hc:0,    gord:17,  porcao:120, medida:'1 dose' },
  { nome:'Lombo de porco',             kcal:143, prot:26,   hc:0,    gord:3.5, porcao:150, medida:'1 bife' },
  { nome:'Entrecosto',                 kcal:277, prot:25,   hc:0,    gord:20,  porcao:200, medida:'1 dose' },
  { nome:'Fiambre de peru',            kcal:104, prot:17,   hc:2,    gord:3,   porcao:30,  medida:'2 fatias' },
  { nome:'Presunto',                   kcal:241, prot:31,   hc:0,    gord:13,  porcao:30,  medida:'2 fatias' },
  { nome:'Chouriço',                   kcal:455, prot:24,   hc:2,    gord:38,  porcao:30,  medida:'3 rodelas' },

  // ---- peixe e marisco ----
  { nome:'Bacalhau cozido',            kcal:105, prot:23,   hc:0,    gord:0.9, porcao:150, medida:'1 posta' },
  { nome:'Pescada cozida',             kcal:92,  prot:19,   hc:0,    gord:1.5, porcao:150, medida:'1 posta' },
  { nome:'Salmão grelhado',            kcal:208, prot:20,   hc:0,    gord:13,  porcao:150, medida:'1 posta' },
  { nome:'Atum em água (lata)',        kcal:116, prot:26,   hc:0,    gord:1,   porcao:80,  medida:'1 lata' },
  { nome:'Atum em azeite (lata)',      kcal:198, prot:24,   hc:0,    gord:11,  porcao:80,  medida:'1 lata' },
  { nome:'Sardinha assada',            kcal:208, prot:25,   hc:0,    gord:11,  porcao:100, medida:'2 unidades' },
  { nome:'Dourada grelhada',           kcal:121, prot:20,   hc:0,    gord:4,   porcao:200, medida:'1 unidade' },
  { nome:'Camarão cozido',             kcal:99,  prot:24,   hc:0,    gord:0.3, porcao:100, medida:'1 dose' },
  { nome:'Polvo cozido',               kcal:164, prot:30,   hc:4,    gord:2.1, porcao:150, medida:'1 dose' },

  // ---- ovos e lacticínios ----
  { nome:'Ovo cozido',                 kcal:155, prot:13,   hc:1.1,  gord:11,  porcao:55,  medida:'1 ovo' },
  { nome:'Ovo estrelado',              kcal:196, prot:14,   hc:0.8,  gord:15,  porcao:60,  medida:'1 ovo' },
  { nome:'Clara de ovo',               kcal:52,  prot:11,   hc:0.7,  gord:0.2, porcao:33,  medida:'1 clara' },
  { nome:'Leite meio-gordo',           kcal:46,  prot:3.3,  hc:4.8,  gord:1.6, porcao:250, medida:'1 copo' },
  { nome:'Leite magro',                kcal:34,  prot:3.4,  hc:4.9,  gord:0.2, porcao:250, medida:'1 copo' },
  { nome:'Iogurte natural',            kcal:61,  prot:3.5,  hc:4.7,  gord:3.3, porcao:125, medida:'1 unidade' },
  { nome:'Iogurte grego natural',      kcal:97,  prot:9,    hc:4,    gord:5,   porcao:150, medida:'1 unidade' },
  { nome:'Skyr / iogurte proteico',    kcal:63,  prot:11,   hc:4,    gord:0.2, porcao:150, medida:'1 unidade' },
  { nome:'Queijo flamengo',            kcal:330, prot:25,   hc:1,    gord:25,  porcao:25,  medida:'1 fatia' },
  { nome:'Queijo fresco',              kcal:110, prot:12,   hc:2,    gord:6,   porcao:60,  medida:'1 unidade' },
  { nome:'Requeijão',                  kcal:136, prot:11,   hc:3,    gord:9,   porcao:50,  medida:'1 porção' },
  { nome:'Manteiga',                   kcal:717, prot:0.9,  hc:0.1,  gord:81,  porcao:10,  medida:'1 colher' },

  // ---- fruta ----
  { nome:'Maçã',                       kcal:52,  prot:0.3,  hc:14,   gord:0.2, porcao:150, medida:'1 unidade' },
  { nome:'Banana',                     kcal:89,  prot:1.1,  hc:23,   gord:0.3, porcao:120, medida:'1 unidade' },
  { nome:'Laranja',                    kcal:47,  prot:0.9,  hc:12,   gord:0.1, porcao:180, medida:'1 unidade' },
  { nome:'Pera',                       kcal:57,  prot:0.4,  hc:15,   gord:0.1, porcao:170, medida:'1 unidade' },
  { nome:'Kiwi',                       kcal:61,  prot:1.1,  hc:15,   gord:0.5, porcao:75,  medida:'1 unidade' },
  { nome:'Morangos',                   kcal:32,  prot:0.7,  hc:7.7,  gord:0.3, porcao:150, medida:'1 taça' },
  { nome:'Melancia',                   kcal:30,  prot:0.6,  hc:7.6,  gord:0.2, porcao:200, medida:'1 fatia' },
  { nome:'Uvas',                       kcal:69,  prot:0.7,  hc:18,   gord:0.2, porcao:100, medida:'1 cacho pequeno' },
  { nome:'Abacate',                    kcal:160, prot:2,    hc:9,    gord:15,  porcao:100, medida:'1/2 unidade' },

  // ---- legumes ----
  { nome:'Brócolos cozidos',           kcal:35,  prot:2.4,  hc:7,    gord:0.4, porcao:150, medida:'1 dose' },
  { nome:'Cenoura',                    kcal:41,  prot:0.9,  hc:10,   gord:0.2, porcao:80,  medida:'1 unidade' },
  { nome:'Alface',                     kcal:15,  prot:1.4,  hc:2.9,  gord:0.2, porcao:60,  medida:'1 taça' },
  { nome:'Tomate',                     kcal:18,  prot:0.9,  hc:3.9,  gord:0.2, porcao:120, medida:'1 unidade' },
  { nome:'Couve-flor cozida',          kcal:25,  prot:1.9,  hc:5,    gord:0.3, porcao:150, medida:'1 dose' },
  { nome:'Espinafres',                 kcal:23,  prot:2.9,  hc:3.6,  gord:0.4, porcao:100, medida:'1 dose' },
  { nome:'Feijão-verde',               kcal:31,  prot:1.8,  hc:7,    gord:0.1, porcao:150, medida:'1 dose' },
  { nome:'Sopa de legumes',            kcal:45,  prot:1.5,  hc:7,    gord:1.5, porcao:300, medida:'1 prato' },

  // ---- gorduras e frutos secos ----
  { nome:'Azeite',                     kcal:884, prot:0,    hc:0,    gord:100, porcao:10,  medida:'1 colher' },
  { nome:'Amêndoas',                   kcal:579, prot:21,   hc:22,   gord:50,  porcao:30,  medida:'1 mão' },
  { nome:'Nozes',                      kcal:654, prot:15,   hc:14,   gord:65,  porcao:30,  medida:'1 mão' },
  { nome:'Amendoins',                  kcal:567, prot:26,   hc:16,   gord:49,  porcao:30,  medida:'1 mão' },
  { nome:'Manteiga de amendoim',       kcal:588, prot:25,   hc:20,   gord:50,  porcao:20,  medida:'1 colher' },

  // ---- pratos e snacks ----
  { nome:'Bacalhau à Brás',            kcal:180, prot:12,   hc:12,   gord:9,   porcao:350, medida:'1 prato' },
  { nome:'Francesinha',                kcal:250, prot:14,   hc:16,   gord:14,  porcao:400, medida:'1 unidade' },
  { nome:'Pizza',                      kcal:266, prot:11,   hc:33,   gord:10,  porcao:300, medida:'1 pizza pequena' },
  { nome:'Hambúrguer',                 kcal:254, prot:13,   hc:19,   gord:14,  porcao:220, medida:'1 unidade' },
  { nome:'Sandes mista',               kcal:250, prot:13,   hc:28,   gord:9,   porcao:150, medida:'1 unidade' },
  { nome:'Pastel de nata',             kcal:298, prot:5,    hc:35,   gord:15,  porcao:60,  medida:'1 unidade' },
  { nome:'Bolacha Maria',              kcal:430, prot:7,    hc:75,   gord:11,  porcao:25,  medida:'4 bolachas' },
  { nome:'Chocolate de leite',         kcal:535, prot:8,    hc:59,   gord:30,  porcao:25,  medida:'4 quadrados' },
  { nome:'Batatas fritas de pacote',   kcal:536, prot:7,    hc:53,   gord:34,  porcao:40,  medida:'1 saco pequeno' },
  { nome:'Barra de cereais',           kcal:400, prot:6,    hc:65,   gord:12,  porcao:30,  medida:'1 barra' },

  // ---- bebidas ----
  { nome:'Água',                       kcal:0,   prot:0,    hc:0,    gord:0,   porcao:250, medida:'1 copo' },
  { nome:'Café simples',               kcal:2,   prot:0.1,  hc:0,    gord:0,   porcao:30,  medida:'1 chávena' },
  { nome:'Sumo de laranja natural',    kcal:45,  prot:0.7,  hc:10,   gord:0.2, porcao:200, medida:'1 copo' },
  { nome:'Refrigerante com açúcar',    kcal:42,  prot:0,    hc:11,   gord:0,   porcao:330, medida:'1 lata' },
  { nome:'Cerveja',                    kcal:43,  prot:0.5,  hc:3.6,  gord:0,   porcao:330, medida:'1 imperial' },
  { nome:'Vinho tinto',                kcal:85,  prot:0.1,  hc:2.6,  gord:0,   porcao:150, medida:'1 copo' },

  // ---- suplementos ----
  { nome:'Proteína em pó (whey)',      kcal:380, prot:80,   hc:7,    gord:5,   porcao:30,  medida:'1 medida' },
].map((a, i) => ({ ...a, id: 'b' + i, origem: 'base' }));


/** Procura na tabela de base e nos alimentos já usados. */
function procurarAlimentosLocais(termo){
  const t = normalizar(termo);
  if (!t) return [];
  const meus = Store.estado.nutricao.meus || [];
  // os teus primeiro: se já comeste aquilo, é provável que seja o mesmo
  return [...meus, ...ALIMENTOS_BASE]
    .filter(a => normalizar(a.nome).includes(t) || normalizar(a.marca || '').includes(t))
    .slice(0, 40);
}

/** Sem acentos e em minúsculas, para a procura não falhar por um til. */
function normalizar(s){
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ---------------- Open Food Facts ----------------
   Base de dados aberta de produtos embalados (ODbL). Não precisa de chave
   nem de conta. Só é consultada quando se procura; sem rede, a app continua
   a funcionar com a tabela de base e com os alimentos já usados. */

const OFF_PROCURA = 'https://world.openfoodfacts.org/cgi/search.pl';

async function procurarNoOpenFoodFacts(termo, sinal){
  const url = `${OFF_PROCURA}?${new URLSearchParams({
    search_terms: termo,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
    // países primeiro: o que está nas prateleiras cá é o que interessa
    tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: 'portugal',
    fields: 'code,product_name,product_name_pt,brands,nutriments,serving_quantity',
  })}`;

  const resposta = await fetch(url, { signal: sinal });
  if (!resposta.ok) throw new Error('A base de alimentos não respondeu.');
  const dados = await resposta.json();

  return (dados.products || [])
    .map(traduzirProduto)
    .filter(Boolean)
    .slice(0, 25);
}

/** Um produto do Open Food Facts no nosso formato. Devolve null se não
    trouxer os valores nutricionais — sem eles não serve para nada. */
function traduzirProduto(p){
  const n = p.nutriments || {};
  const kcal = num(n['energy-kcal_100g']);
  const nome = (p.product_name_pt || p.product_name || '').trim();
  if (!nome || !kcal) return null;

  // os valores vêm da base com casas decimais a mais; uma é que chega
  const red = v => Math.round(num(v) * 10) / 10;

  return {
    id: 'off' + p.code,
    nome,
    marca: (p.brands || '').split(',')[0].trim(),
    kcal: Math.round(kcal),
    prot: red(n.proteins_100g),
    hc:   red(n.carbohydrates_100g),
    gord: red(n.fat_100g),
    porcao: num(p.serving_quantity) || 100,
    medida: num(p.serving_quantity) ? '1 porção' : '100 g',
    origem: 'off',
  };
}

/** O que um alimento dá numa certa quantidade, em gramas. */
function porQuantidade(alimento, gramas){
  const f = num(gramas) / 100;
  return {
    kcal: Math.round(alimento.kcal * f),
    prot: Math.round(alimento.prot * f * 10) / 10,
    hc:   Math.round(alimento.hc   * f * 10) / 10,
    gord: Math.round(alimento.gord * f * 10) / 10,
  };
}

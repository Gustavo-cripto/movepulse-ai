/* ============================================================
   Ícones do equipamento, desenhados em SVG.

   Traço simples e a mesma grelha de 24x24 para todos, para a
   lista ficar coerente. Sem imagens externas nem licenças.
   ============================================================ */

const DESENHOS = {
  barra:      '<path d="M2 12h20"/><path d="M6 8v8M8.5 9.5v5M15.5 9.5v5M18 8v8"/>',
  halteres:   '<path d="M7.5 12h9"/><path d="M4 9v6M6.5 10.5v3M17.5 10.5v3M20 9v6"/>',
  kettlebell: '<path d="M9.2 8.5a2.8 2.8 0 0 1 5.6 0"/><path d="M12 20.5c-3.6 0-5.5-2.6-5.5-5.5 0-2.6 1.6-4.6 3.2-6h4.6c1.6 1.4 3.2 3.4 3.2 6 0 2.9-1.9 5.5-5.5 5.5z"/>',
  disco:      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/>',
  barraEz:    '<path d="M2 12h3.5l2-2.2 2.2 2.2 2.3-2.2 2.2 2.2 2-2.2 2 2.2H22"/><path d="M4 9.5v5M20 9.5v5"/>',
  landmine:   '<path d="M3.5 20.5h7"/><path d="M5 20.5 17.5 6"/><circle cx="19" cy="4.6" r="2.2"/>',
  barraHex:   '<path d="M8 7h8l3.2 5-3.2 5H8l-3.2-5z"/><path d="M1.5 12h3.3M19.2 12h3.3"/>',
  polia:      '<path d="M5 2.5v19M19 2.5v19"/><path d="M5 4.5h14"/><circle cx="12" cy="7" r="1.6"/><path d="M12 8.6v4.4"/><path d="M9.5 13h5"/>',
  polias2:    '<path d="M3.5 2.5v19M20.5 2.5v19"/><circle cx="3.5" cy="6" r="1.4"/><circle cx="20.5" cy="6" r="1.4"/><path d="M3.5 7.4 9 13M20.5 7.4 15 13"/>',
  legPress:   '<path d="M2.5 20h8"/><path d="M4.5 20 15.5 8"/><path d="M12.5 5.5 19 11"/><path d="M6 20v-3.5h4.5"/>',
  maqSentado: '<path d="M4 19.5V15h8"/><path d="M12 15V7.5"/><path d="M4 15v-3.5"/><path d="M16 5.5h5.5v14H16z"/><path d="M16 9.5h5.5M16 13h5.5M16 16.5h5.5"/>',
  maqEmpurrar:'<path d="M4 19.5V15h7"/><path d="M11 15V6.5"/><path d="M12.5 9h3.5M12.5 13h3.5"/><path d="M18 5.5h4v14h-4z"/><path d="M18 9.5h4M18 13h4M18 16.5h4"/>',
  maqPuxar:   '<path d="M2.5 4.5H8v15H2.5z"/><path d="M2.5 8.5H8M2.5 12H8M2.5 15.5H8"/><path d="M8 6h9.5"/><path d="M17.5 6v4.5"/><path d="M14 10.5h7"/><path d="M12 19.5V16h9"/>',
  rack:       '<path d="M4 2.5v19M20 2.5v19"/><path d="M4 8h16"/><path d="M6.5 6.5v3M17.5 6.5v3"/>',
  banco:      '<path d="M3 11.5h18"/><path d="M5.5 11.5v7.5M18.5 11.5v7.5"/><path d="M3 11.5 8.5 8.5"/>',
  barraFixa:  '<path d="M4 3.5v17M20 3.5v17"/><path d="M4 6h16"/><path d="M10 6v4M14 6v4"/>',
  paralelas:  '<path d="M3 8h8M13 8h8"/><path d="M5 8v12M9 8v12M15 8v12M19 8v12"/>',
  elastico:   '<path d="M6 8c5.5-3.5 6.5 11 12 8"/><path d="M2.5 6.5h3.5v3.5H2.5z"/><path d="M18 14h3.5v3.5H18z"/>',
  trx:        '<path d="M12 2.5v6"/><path d="M12 8.5 7 15M12 8.5 17 15"/><path d="M5.5 15h3M15.5 15h3"/>',
  corda:      '<path d="M6 5v6a6 6 0 0 0 12 0V5"/><path d="M4.5 3.5h3v3h-3zM16.5 3.5h3v3h-3z"/>',
  bola:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-3.5 3-3.5 14 0 17"/><path d="M12 3.5c3.5 3 3.5 14 0 17"/>',
  roda:       '<circle cx="12" cy="14" r="5.5"/><path d="M4 14h3M17 14h3"/><circle cx="12" cy="14" r="1.6"/>',
  colchao:    '<path d="M2.5 9.5h19v5.5h-19z"/><path d="M7 9.5v5.5M12 9.5v5.5M17 9.5v5.5"/>',
  caixa:      '<path d="M3.5 9 12 5l8.5 4-8.5 4z"/><path d="M3.5 9v6l8.5 4 8.5-4V9"/>',
  passadeira: '<path d="M3 17.5h11.5"/><path d="M4.5 17.5 6.5 13h8l1.5 4.5"/><path d="M14.5 13V5.5h4"/><path d="M16 5.5h3"/><circle cx="4.5" cy="19.3" r="1.1"/><circle cx="15" cy="19.3" r="1.1"/>',
  bicicleta:  '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5"/><path d="M10 9 8 6h4"/><path d="M15 9l3 8"/>',
  eliptica:   '<path d="M2.5 18.5 9 16M2.5 20.5 9 18"/><path d="M9 16 15.5 7"/><path d="M15.5 7V4"/><path d="M12.5 5.5h6"/><circle cx="9" cy="17" r="1.2"/>',
  remoErg:    '<path d="M2.5 18.5h17"/><path d="M5.5 18.5V16h4.5v2.5"/><path d="M10 16 17 9.5"/><path d="M15 7.5h4.5V12"/><path d="M2.5 16h3"/>',
  escada:     '<path d="M4.5 20.5V6"/><path d="M4.5 20.5h15"/><path d="M7.5 20.5V17h3.5v-3.5h3.5V10h3.5V6.5"/>',
  airBike:    '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M7.5 15.5h6"/><path d="M13.5 15.5V6"/><path d="M10.5 4 13.5 6l3-2"/><path d="M13.5 15.5h5"/>',
};

/* Que desenho serve cada peça do catálogo. */
const ICONE_DE = {
  barra:'barra', halteres:'halteres', kettlebell:'kettlebell', discos:'disco',
  'barra-ez':'barraEz', landmine:'landmine', 'barra-hex':'barraHex',
  crossover:'polias2', 'polia-alta':'polia', 'polia-baixa':'polia',
  'm-leg-press':'legPress', 'm-extensora':'maqSentado', 'm-flexora':'maqSentado',
  'm-hack':'legPress', 'm-smith':'rack', 'm-peck':'maqEmpurrar', 'm-supino':'maqEmpurrar',
  'm-ombros':'maqEmpurrar', 'm-puxada':'maqPuxar', 'm-remada':'maqPuxar',
  'm-abdutora':'maqSentado', 'm-gemeos':'maqSentado', 'm-gluteos':'maqSentado',
  'm-abdominal':'maqSentado',
  banco:'banco', 'banco-incl':'banco', rack:'rack', 'barra-fixa':'barraFixa',
  paralelas:'paralelas', espaldar:'barraFixa',
  elasticos:'elastico', trx:'trx', corda:'corda', bola:'bola', roda:'roda',
  colchao:'colchao', caixa:'caixa',
  passadeira:'passadeira', bicicleta:'bicicleta', eliptica:'eliptica',
  'remo-erg':'remoErg', escada:'escada', 'air-bike':'airBike',
};

/** SVG do equipamento, pronto a inserir. */
function iconeEquipamento(id){
  const desenho = DESENHOS[ICONE_DE[id]] || DESENHOS.disco;
  return `<svg class="icone-eq" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${desenho}</svg>`;
}

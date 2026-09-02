/* ============================================================
   Ilustrações do equipamento, desenhadas em SVG.

   Formas cheias em vez de traço, para se reconhecer o aparelho
   ao relance: estrutura escura, metal claro, estofo em lima.
   Grelha comum de 48x48, com sombra no chão.
   ============================================================ */

const DESENHOS = {
  barra: `
    <rect class="eq-met" x="4" y="22.5" width="40" height="3.5" rx="1.7"/>
    <rect class="eq-esc" x="8" y="14" width="5" height="20" rx="2"/>
    <rect class="eq-esc" x="14.5" y="17.5" width="3.5" height="13" rx="1.6"/>
    <rect class="eq-esc" x="35" y="14" width="5" height="20" rx="2"/>
    <rect class="eq-esc" x="30" y="17.5" width="3.5" height="13" rx="1.6"/>
    <rect class="eq-met2" x="18.5" y="21" width="2" height="6.5" rx="1"/>
    <rect class="eq-met2" x="27.5" y="21" width="2" height="6.5" rx="1"/>`,

  halteres: `
    <rect class="eq-met" x="16" y="22" width="16" height="4" rx="2"/>
    <path class="eq-esc" d="M8 18.5h7.5v11H8a2.5 2.5 0 0 1-2.5-2.5v-6A2.5 2.5 0 0 1 8 18.5z"/>
    <path class="eq-esc" d="M40 18.5h-7.5v11H40a2.5 2.5 0 0 0 2.5-2.5v-6a2.5 2.5 0 0 0-2.5-2.5z"/>
    <rect class="eq-met2" x="14.5" y="20" width="2.5" height="8" rx="1"/>
    <rect class="eq-met2" x="31" y="20" width="2.5" height="8" rx="1"/>`,

  kettlebell: `
    <path class="eq-esc" d="M24 17c7 0 12 5.5 12 12.5S31 41 24 41s-12-3.5-12-11.5S17 17 24 17z"/>
    <path class="eq-met" d="M17 20.5v-3a7 7 0 0 1 14 0v3h-3.5v-3a3.5 3.5 0 0 0-7 0v3z"/>
    <ellipse class="eq-luz" cx="19.5" cy="27" rx="3" ry="4.5"/>`,

  disco: `
    <circle class="eq-esc" cx="24" cy="24" r="16"/>
    <circle class="eq-met2" cx="24" cy="24" r="7"/>
    <circle class="eq-met" cx="24" cy="24" r="4"/>`,

  barraEz: `
    <path class="eq-met" d="M4 24h9l3.5-4 4 4 3.5-4 4 4 3.5-4 4 4H44" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke:currentColor"/>
    <rect class="eq-esc" x="5" y="17" width="4.5" height="14" rx="2"/>
    <rect class="eq-esc" x="38.5" y="17" width="4.5" height="14" rx="2"/>`,

  landmine: `
    <rect class="eq-esc" x="6" y="37" width="16" height="5" rx="2.5"/>
    <rect class="eq-met" x="10" y="12" width="3.6" height="28" rx="1.8" transform="rotate(-38 12 26)"/>
    <circle class="eq-esc" cx="35" cy="13" r="7"/>
    <circle class="eq-met2" cx="35" cy="13" r="2.6"/>`,

  barraHex: `
    <path class="eq-esc" d="M17 14h14l6 10-6 10H17l-6-10z" fill="none" stroke-width="3.5" style="stroke:currentColor"/>
    <rect class="eq-met" x="2" y="22.2" width="10" height="3.6" rx="1.8"/>
    <rect class="eq-met" x="36" y="22.2" width="10" height="3.6" rx="1.8"/>`,

  polia: `
    <rect class="eq-esc" x="8" y="6" width="6" height="36" rx="2"/>
    <rect class="eq-esc" x="8" y="6" width="26" height="4" rx="2"/>
    <circle class="eq-met" cx="31" cy="12.5" r="3"/>
    <rect class="eq-met2" x="30.2" y="14" width="1.6" height="11" rx=".8"/>
    <rect class="eq-esc" x="25" y="24" width="12" height="3" rx="1.5"/>
    <rect class="eq-met2" x="9.5" y="14" width="3" height="24" rx="1"/>`,

  polias2: `
    <rect class="eq-esc" x="4" y="8" width="5.5" height="34" rx="2"/>
    <rect class="eq-esc" x="38.5" y="8" width="5.5" height="34" rx="2"/>
    <rect class="eq-esc" x="4" y="8" width="40" height="4" rx="2"/>
    <circle class="eq-met" cx="12" cy="14.5" r="2.4"/>
    <circle class="eq-met" cx="36" cy="14.5" r="2.4"/>
    <path style="stroke:currentColor" class="eq-cabo" d="M12 17v6.5M36 17v6.5" fill="none" stroke-width="1.6"/>
    <rect class="eq-met2" x="9.5" y="23" width="5" height="2.6" rx="1.3"/>
    <rect class="eq-met2" x="33.5" y="23" width="5" height="2.6" rx="1.3"/>`,

  legPress: `
    <rect class="eq-esc" x="4" y="38" width="34" height="4.5" rx="2.2"/>
    <rect class="eq-met2" x="21" y="8" width="3.4" height="34" rx="1.7" transform="rotate(38 23 25)"/>
    <g transform="rotate(38 30 17)">
      <rect class="eq-esc" x="24" y="10" width="14" height="4" rx="1.5"/>
      <circle class="eq-esc" cx="27" cy="17" r="5"/>
      <circle class="eq-esc" cx="35" cy="17" r="5"/>
    </g>
    <rect class="eq-pad" x="5" y="28" width="15" height="5" rx="2.5"/>
    <rect class="eq-pad" x="16" y="20" width="5" height="10" rx="2.5"/>`,

  maqSentado: `
    <rect class="eq-esc" x="34" y="8" width="10" height="34" rx="2"/>
    <rect class="eq-met2" x="36" y="12" width="6" height="3" rx="1"/>
    <rect class="eq-met2" x="36" y="17" width="6" height="3" rx="1"/>
    <rect class="eq-met2" x="36" y="22" width="6" height="3" rx="1"/>
    <rect class="eq-pad" x="10" y="26" width="18" height="5" rx="2.5"/>
    <rect class="eq-pad" x="24" y="12" width="5" height="15" rx="2.5"/>
    <rect class="eq-pad" x="6" y="31" width="5" height="7" rx="2.5"/>
    <rect class="eq-esc" x="12" y="31" width="3" height="11" rx="1.5"/>
    <rect class="eq-esc" x="24" y="31" width="3" height="11" rx="1.5"/>`,

  maqEmpurrar: `
    <rect class="eq-esc" x="36" y="8" width="8" height="34" rx="2"/>
    <rect class="eq-met2" x="37.5" y="12" width="5" height="3" rx="1"/>
    <rect class="eq-met2" x="37.5" y="17" width="5" height="3" rx="1"/>
    <rect class="eq-pad" x="10" y="28" width="16" height="5" rx="2.5"/>
    <rect class="eq-pad" x="21" y="12" width="5.5" height="17" rx="2.7"/>
    <rect class="eq-met" x="8" y="16" width="12" height="3" rx="1.5"/>
    <rect class="eq-met" x="8" y="23" width="12" height="3" rx="1.5"/>
    <rect class="eq-esc" x="12" y="33" width="3" height="9" rx="1.5"/>
    <rect class="eq-esc" x="22" y="33" width="3" height="9" rx="1.5"/>`,

  maqPuxar: `
    <rect class="eq-esc" x="4" y="6" width="9" height="36" rx="2"/>
    <rect class="eq-met2" x="6" y="10" width="5" height="3" rx="1"/>
    <rect class="eq-met2" x="6" y="15" width="5" height="3" rx="1"/>
    <rect class="eq-met2" x="6" y="20" width="5" height="3" rx="1"/>
    <rect class="eq-esc" x="4" y="6" width="26" height="3.5" rx="1.7"/>
    <path style="stroke:currentColor" d="M27 10v6" fill="none" stroke-width="1.6"/>
    <rect class="eq-met" x="19" y="15.5" width="17" height="3" rx="1.5"/>
    <rect class="eq-pad" x="22" y="30" width="16" height="5" rx="2.5"/>
    <rect class="eq-esc" x="26" y="35" width="3" height="7" rx="1.5"/>
    <rect class="eq-esc" x="33" y="35" width="3" height="7" rx="1.5"/>`,

  rack: `
    <rect class="eq-esc" x="7" y="6" width="6" height="36" rx="2"/>
    <rect class="eq-esc" x="35" y="6" width="6" height="36" rx="2"/>
    <rect class="eq-esc" x="4" y="39" width="12" height="4" rx="2"/>
    <rect class="eq-esc" x="32" y="39" width="12" height="4" rx="2"/>
    <rect class="eq-met" x="6" y="17" width="36" height="3.4" rx="1.7"/>
    <rect class="eq-met2" x="11" y="24" width="4" height="3" rx="1"/>
    <rect class="eq-met2" x="33" y="24" width="4" height="3" rx="1"/>`,

  banco: `
    <rect class="eq-pad" x="8" y="20" width="32" height="6" rx="3"/>
    <rect class="eq-esc" x="11" y="26" width="3.5" height="15" rx="1.7"/>
    <rect class="eq-esc" x="33.5" y="26" width="3.5" height="15" rx="1.7"/>
    <rect class="eq-esc" x="7" y="39" width="12" height="3.5" rx="1.7"/>
    <rect class="eq-esc" x="29" y="39" width="12" height="3.5" rx="1.7"/>`,

  barraFixa: `
    <rect class="eq-esc" x="7" y="10" width="5" height="32" rx="2"/>
    <rect class="eq-esc" x="36" y="10" width="5" height="32" rx="2"/>
    <rect class="eq-met" x="6" y="10" width="36" height="4" rx="2"/>
    <rect class="eq-esc" x="4" y="39" width="11" height="3.5" rx="1.7"/>
    <rect class="eq-esc" x="33" y="39" width="11" height="3.5" rx="1.7"/>`,

  paralelas: `
    <rect class="eq-met" x="5" y="16" width="16" height="3.6" rx="1.8"/>
    <rect class="eq-met" x="27" y="16" width="16" height="3.6" rx="1.8"/>
    <rect class="eq-esc" x="11" y="19" width="4" height="22" rx="2"/>
    <rect class="eq-esc" x="33" y="19" width="4" height="22" rx="2"/>
    <rect class="eq-esc" x="6" y="38" width="14" height="4" rx="2"/>
    <rect class="eq-esc" x="28" y="38" width="14" height="4" rx="2"/>`,

  elastico: `
    <path class="eq-pad" d="M14 24c0-6 4.5-9.5 10-9.5S34 18 34 24s-4.5 9.5-10 9.5S14 30 14 24z" fill="none" stroke-width="4" style="stroke:currentColor"/>
    <rect class="eq-esc" x="4" y="20" width="9" height="8" rx="3"/>
    <rect class="eq-esc" x="35" y="20" width="9" height="8" rx="3"/>`,

  trx: `
    <rect class="eq-esc" x="20" y="4" width="8" height="4" rx="2"/>
    <path style="stroke:currentColor" d="M24 8v7M24 15l-9 13M24 15l9 13" fill="none" stroke-width="2.6" stroke-linecap="round"/>
    <rect class="eq-pad" x="9" y="28" width="9" height="4.5" rx="2.2"/>
    <rect class="eq-pad" x="30" y="28" width="9" height="4.5" rx="2.2"/>`,

  corda: `
    <path style="stroke:currentColor" d="M13 14v9a11 11 0 0 0 22 0v-9" fill="none" stroke-width="2.6" stroke-linecap="round"/>
    <rect class="eq-esc" x="9" y="6" width="8" height="10" rx="3"/>
    <rect class="eq-esc" x="31" y="6" width="8" height="10" rx="3"/>`,

  bola: `
    <circle class="eq-pad" cx="24" cy="26" r="15"/>
    <ellipse class="eq-luz" cx="18.5" cy="20" rx="4.5" ry="3.5"/>
    <path style="stroke:currentColor" d="M24 11c-6 6-6 24 0 30M24 11c6 6 6 24 0 30" fill="none" stroke-width="1.2" opacity=".35"/>`,

  roda: `
    <circle class="eq-esc" cx="24" cy="28" r="11"/>
    <circle class="eq-met2" cx="24" cy="28" r="3.5"/>
    <rect class="eq-met" x="4" y="26" width="12" height="3.4" rx="1.7"/>
    <rect class="eq-met" x="32" y="26" width="12" height="3.4" rx="1.7"/>`,

  colchao: `
    <rect class="eq-pad" x="4" y="20" width="28" height="11" rx="3"/>
    <path class="eq-met2" d="M6 20h26v2H6zM6 29h26v2H6z" opacity=".35"/>
    <circle class="eq-pad" cx="35" cy="25.5" r="8"/>
    <path style="stroke:currentColor" d="M35 25.5a4 4 0 1 1-3.4-4" fill="none" stroke-width="1.6"/>`,

  caixa: `
    <path class="eq-esc" d="M24 8 42 17l-18 9L6 17z"/>
    <path class="eq-met2" d="M6 17v13l18 9V26z"/>
    <path class="eq-met" d="M42 17v13l-18 9V26z"/>`,

  passadeira: `
    <path class="eq-esc" d="M5 32h27l-2.5 7H7.5z"/>
    <rect class="eq-met2" x="8" y="33.5" width="21" height="3" rx="1.5"/>
    <rect class="eq-esc" x="29" y="12" width="4" height="22" rx="2"/>
    <rect class="eq-esc" x="24" y="12" width="14" height="9" rx="2.5"/>
    <rect class="eq-pad" x="26" y="14" width="10" height="5" rx="1.5"/>
    <rect class="eq-met" x="19" y="21" width="12" height="3" rx="1.5"/>`,

  bicicleta: `
    <circle class="eq-esc" cx="13" cy="30" r="10"/>
    <circle class="eq-met2" cx="13" cy="30" r="3.2"/>
    <rect class="eq-esc" x="24" y="14" width="3.6" height="26" rx="1.8"/>
    <rect class="eq-met2" x="14" y="18" width="3.2" height="14" rx="1.6" transform="rotate(-30 16 25)"/>
    <rect class="eq-pad" x="19" y="10" width="14" height="4.5" rx="2.2"/>
    <rect class="eq-met" x="8" y="14" width="12" height="3" rx="1.5"/>
    <rect class="eq-esc" x="18" y="38" width="18" height="4" rx="2"/>`,

  eliptica: `
    <circle class="eq-esc" cx="35" cy="27" r="9"/>
    <circle class="eq-met2" cx="35" cy="27" r="3"/>
    <rect class="eq-met2" x="10" y="30" width="26" height="3" rx="1.5" transform="rotate(-6 23 31)"/>
    <rect class="eq-pad" x="6" y="31" width="13" height="4.5" rx="2.2"/>
    <rect class="eq-esc" x="33" y="6" width="4" height="22" rx="2"/>
    <rect class="eq-met" x="26" y="6" width="14" height="3" rx="1.5"/>
    <rect class="eq-esc" x="28" y="38" width="14" height="4" rx="2"/>`,

  remoErg: `
    <rect class="eq-met2" x="8" y="30" width="34" height="3.2" rx="1.6" transform="rotate(-6 25 32)"/>
    <rect class="eq-pad" x="22" y="24" width="11" height="4.5" rx="2.2" transform="rotate(-6 27 26)"/>
    <circle class="eq-esc" cx="12" cy="22" r="9"/>
    <circle class="eq-met2" cx="12" cy="22" r="3"/>
    <rect class="eq-met" x="20" y="18" width="12" height="3" rx="1.5"/>
    <rect class="eq-esc" x="36" y="34" width="10" height="4" rx="2"/>
    <rect class="eq-esc" x="6" y="30" width="12" height="4" rx="2"/>`,

  escada: `
    <rect class="eq-esc" x="6" y="10" width="4" height="32" rx="2"/>
    <rect class="eq-esc" x="34" y="10" width="4" height="32" rx="2"/>
    <rect class="eq-met" x="6" y="10" width="32" height="3.2" rx="1.6"/>
    <rect class="eq-pad" x="10" y="34" width="12" height="3.4" rx="1.5"/>
    <rect class="eq-pad" x="15" y="28" width="12" height="3.4" rx="1.5"/>
    <rect class="eq-pad" x="20" y="22" width="12" height="3.4" rx="1.5"/>
    <rect class="eq-pad" x="25" y="16" width="12" height="3.4" rx="1.5"/>`,

  airBike: `
    <circle class="eq-esc" cx="16" cy="24" r="12"/>
    <circle class="eq-met2" cx="16" cy="24" r="3"/>
    <path style="stroke:currentColor" d="M16 13v22M6 24h20M9 17l14 14M23 17 9 31" fill="none" stroke-width="1.4" opacity=".5"/>
    <rect class="eq-esc" x="28" y="14" width="3.5" height="26" rx="1.7"/>
    <rect class="eq-pad" x="24" y="20" width="12" height="4.5" rx="2.2"/>
    <rect class="eq-met" x="26" y="10" width="12" height="3" rx="1.5"/>
    <rect class="eq-esc" x="22" y="38" width="16" height="4" rx="2"/>`,
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
  return `<svg class="icone-eq" viewBox="0 0 48 48" aria-hidden="true">
    <ellipse class="eq-sombra" cx="24" cy="43.5" rx="17" ry="2.4"/>${desenho}</svg>`;
}

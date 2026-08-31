/* ============================================================
   Fotos das máquinas, guardadas em IndexedDB.

   Não vão para o localStorage porque uma foto ocupa mais do que
   todo o resto do histórico junto e estouraria o limite.
   ============================================================ */

const BD = { nome: 'movepulse', versao: 1, loja: 'fotos' };
let bdPromessa = null;

function abrirBD(){
  if (bdPromessa) return bdPromessa;
  bdPromessa = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BD.nome, BD.versao);
    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains(BD.loja)) bd.createObjectStore(BD.loja);
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
  return bdPromessa;
}

function transacao(modo, acao){
  return abrirBD().then(bd => new Promise((resolve, reject) => {
    const t = bd.transaction(BD.loja, modo);
    const pedido = acao(t.objectStore(BD.loja));
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  }));
}

const Fotos = {
  guardar: (exId, dataUrl) => transacao('readwrite', loja => loja.put(dataUrl, exId)),
  ler:     (exId)          => transacao('readonly',  loja => loja.get(exId)),
  apagar:  (exId)          => transacao('readwrite', loja => loja.delete(exId)),
  chaves:  ()              => transacao('readonly',  loja => loja.getAllKeys()),
};

/* Service worker: guarda a app inteira em cache para funcionar offline. */
const CACHE = 'movepulse-v43';
const ARQUIVOS = [
  './', './index.html', './css/style.css',
  './js/data.js', './js/store.js', './js/db.js', './js/ia.js', './js/ui.js', './js/musculos.js', './js/animacao.js', './js/icones.js', './js/app.js',
  './manifest.webmanifest',
  './icons/icone-192.png', './icons/icone-512.png',
  './icons/maskable-512.png', './icons/apple-touch-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Cache primeiro (app pequeno e offline-first); atualiza em segundo plano. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // O documento vai primeiro à rede: assim uma versão nova entra logo na
  // abertura seguinte, em vez de a app ficar sempre uma versão atrasada.
  // Sem rede, cai na cópia guardada e continua a abrir.
  if (e.request.mode === 'navigate'){
    e.respondWith(
      // cache:'reload' ignora a cópia do navegador (o GitHub Pages guarda o
      // HTML por 10 minutos) e vai mesmo buscar a versão publicada
      fetch(new Request(e.request.url, { cache: 'reload' }))
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
          return resp;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then(hit => hit || caches.match('./index.html', { ignoreSearch: true })))
    );
    return;
  }

  // Procura pelo endereço exato, com o ?v=N incluído: assim uma versão nova
  // não é servida a partir da cópia antiga. Se falhar e não houver rede,
  // aceita-se qualquer versão guardada do mesmo ficheiro.
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request)
        .then(resp => {
          if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }));
    })
  );
});

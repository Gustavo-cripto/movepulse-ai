/* Service worker: guarda a app inteira em cache para funcionar offline. */
const CACHE = 'movepulse-v6';
const ARQUIVOS = [
  './', './index.html', './css/style.css',
  './js/data.js', './js/store.js', './js/db.js', './js/ia.js', './js/ui.js', './js/musculos.js', './js/app.js',
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
  e.respondWith(
    caches.match(e.request).then(hit => {
      const rede = fetch(e.request).then(resp => {
        if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});

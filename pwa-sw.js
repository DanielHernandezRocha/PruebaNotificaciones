const CACHE_NAME = "cherry-pwa-1.0";
const GH_REPO = "/cherry-PWA"; // ← exactamente como aparece en la URL

const urlsToCache = [
  `${GH_REPO}/`,
  `${GH_REPO}/index.html`,
  `${GH_REPO}/offline.html`,
  `${GH_REPO}/css/style.css`,
  `${GH_REPO}/js/main.js`,
  `${GH_REPO}/pwa-manifest.json`,
  `${GH_REPO}/img/fav-192.png`,
  `${GH_REPO}/img/fav-512.png`
];

self.addEventListener("install", e => {
  self.skipWaiting(); // Activar inmediatamente
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.log("Error al cachear algunos recursos:", err);
      });
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Tomar control inmediatamente
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, devolverlo
      if (response) {
        return response;
      }
      // Intentar fetch
      return fetch(e.request).then(fetchResponse => {
        // Si es una respuesta válida, cachearla
        if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return fetchResponse;
      }).catch(() => {
        // Si falla y es una navegación, devolver offline.html
        if (e.request.mode === 'navigate') {
          return caches.match(`${GH_REPO}/offline.html`);
        }
        // Para otros recursos, intentar devolver del caché o error
        return caches.match(e.request);
      });
    })
  );
});

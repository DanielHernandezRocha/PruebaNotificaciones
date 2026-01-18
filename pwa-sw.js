// Actualizar la versión del caché para forzar actualización
const CACHE_NAME = "cherry-pwa-2.0";
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
      // Eliminar todos los cachés antiguos
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("Eliminando caché antiguo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Tomar control inmediatamente
});

self.addEventListener("fetch", e => {
  // Estrategia Network-First: Intenta la red primero, luego el caché
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Si la respuesta es válida, actualizar el caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar el caché
        return caches.match(e.request).then(response => {
          // Si no está en caché y es una navegación, devolver offline.html
          if (!response && e.request.mode === 'navigate') {
            return caches.match(`${GH_REPO}/offline.html`);
          }
          return response;
        });
      })
  );
});

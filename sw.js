const CACHE_NAME = 'chaozhou-guide-v4';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/points.json',
  './data/points.js',
  './images/floor-plan-styled-1200.jpg',
  './images/visit-map.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).catch((err) => {
      console.error('Service Worker 缓存失败:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    }).catch(() => {
      return new Response('离线状态，无法加载资源');
    })
  );
});

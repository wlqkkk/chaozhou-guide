const CACHE_NAME = 'chaozhou-guide-v6';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/points.json',
  './data/points.js',
  './images/floor-plan-styled-1200.jpg',
  './images/visit-map.jpg',
  './audio/p01.mp3',
  './audio/p02.mp3',
  './audio/p03.mp3',
  './audio/p04.mp3',
  './audio/p05.mp3',
  './audio/p06.mp3',
  './audio/p07.mp3',
  './audio/p08.mp3',
  './audio/p09.mp3',
  './audio/p10.mp3',
  './audio/p11.mp3',
  './audio/p12.mp3',
  './audio/p13.mp3',
  './audio/p14.mp3',
  './audio/p15.mp3',
  './audio/p16.mp3',
  './audio/p17.mp3',
  './audio/p18.mp3',
  './audio/p19.mp3',
  './audio/p20.mp3',
  './audio/p21.mp3',
  './audio/p22.mp3',
  './audio/p23.mp3',
  './audio/p24.mp3',
  './audio/p25.mp3',
  './audio/p26.mp3',
  './audio/p27.mp3',
  './audio/p28.mp3',
  './audio/p29.mp3',
  './audio/p30.mp3'
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

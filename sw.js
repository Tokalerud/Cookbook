// Service Worker — Рецептник PWA
const CACHE_NAME = 'receptnik-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Nunito:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Сторонние запросы (CORS-прокси, шрифты) — network-first без кэша
  if (
    url.includes('allorigins.win') ||
    url.includes('corsproxy.io') ||
    url.includes('codetabs.com') ||
    url.includes('thingproxy') ||
    url.includes('corsproxy.org') ||
    url.includes('fonts.google')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Основное приложение — network-first:
  // Если сеть доступна — берём свежую версию с сервера и обновляем кэш.
  // Если сети нет — отдаём из кэша (офлайн-режим).
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});

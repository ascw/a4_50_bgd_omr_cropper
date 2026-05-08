const CACHE_NAME = 'omr-v1';
const urlsToCache = [
  '/',                       // your site root (optional, but safe)
  '/index.html',
  '/sw.js',
  '/manifest.json',
  '/theme-bridge.js'
  // Libraries are cached dynamically by index.html – do not list them here to avoid conflicts
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Filter out any URLs that might fail (e.g., missing icons)
      return cache.addAll(urlsToCache).catch(err => console.warn('Cache addAll failed:', err));
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

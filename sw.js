const CACHE_NAME = 'omr-v1';
const urlsToCache = [
  '/',                       // your site root
  '/index.html',
  '/sw.js',
  '/manifest.json',
  '/theme-bridge.js',        // <-- must exist in root
  '/libs/opencv.js',
  '/libs/pdf.min.js',
  '/libs/pdf.worker.min.js',
  '/libs/xlsx.full.min.js',
  '/libs/jszip.min.js',
  '/libs/pdf-lib.min.js',
  '/libs/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

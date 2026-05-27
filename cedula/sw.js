// Service Worker — Semáforo Electoral PWA
// Estrategia: Cache First para assets, Network First para API
const CACHE_NAME = 'semaforo-electoral-v1';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // API calls: Network first, no cache (datos en tiempo real)
  if (url.pathname.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => 
        new Response(JSON.stringify({ error: true, source: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }
  
  // Static assets: Cache first
  e.respondWith(
    caches.match(e.request).then(cached => 
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});

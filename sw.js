// ============================================================
// SW.JS — Service Worker para Suporte a PWA e Offline Caching
// ============================================================

const CACHE_NAME = 'ciacapivara-cache-v1.0.1';
const ASSETS = [
  '/',
  '/index',
  '/index.html',
  '/login',
  '/login.html',
  '/css/style.css',
  '/logo.png',
  '/js/storage.js?v=2.0.0',
  '/js/auth.js?v=2.0.0',
  '/js/app.js?v=2.0.0',
  '/js/dashboard.js?v=2.0.0',
  '/js/clientes.js?v=2.0.0',
  '/js/fluxo.js?v=2.0.0',
  '/js/pacotes.js?v=2.0.0',
  '/js/fornecedores.js?v=2.0.0',
  '/js/carros.js?v=2.0.0',
  '/js/caixa.js?v=2.0.0',
  '/js/documentos.js?v=2.0.0'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => console.warn('PWA Pre-cache assets warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignorar chamadas de API do servidor para sempre ter dados reais e atualizados do banco
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Se a resposta for válida, serve ela
        if (response && response.status === 200) {
          return response;
        }
        return caches.match(e.request);
      })
      .catch(() => {
        // Se falhar rede (offline), serve do cache
        return caches.match(e.request);
      })
  );
});

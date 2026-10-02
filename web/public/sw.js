// Service worker do ReadUp (PWA): torna o app instalável e mostra uma página offline quando não
// há rede. Não guarda respostas da API (dados da conta mudam o tempo todo e são privados).
const VERSION = "readup-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/mascot.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // páginas: sempre da rede; sem rede, a página offline
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // arquivos estáticos com hash no nome: cache primeiro (nunca mudam)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

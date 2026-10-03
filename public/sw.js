const CACHE_NAME = "bahnconnections-static-v44-0";
const STATIC_ASSETS = ["/", "/install", "/manifest.webmanifest", "/app-icon.svg", "/app-icon-maskable.svg", "/app-icon-192.png", "/app-icon-512.png", "/app-icon-maskable-512.png"];
const AUTH_PATHS = ["/signin-with-chatgpt", "/auth", "/api/auth", "/oauth", "/cdn-cgi/"];

function isAuthenticationRequest(url) {
  return AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`) || (path.endsWith("/") && url.pathname.startsWith(path)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.registration.navigationPreload?.enable(),
  ]).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Authentication redirects must be handled by the browser itself. Following
  // them inside a service worker can fail CORS and incorrectly show "offline".
  if (event.request.mode === "navigate" && isAuthenticationRequest(url)) return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await event.preloadResponse || await fetch(event.request);
        if (response?.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      } catch {
        return await caches.match(event.request) || await caches.match("/") || new Response(`<!doctype html><html lang="de"><meta name="viewport" content="width=device-width"><title>BahnConnections offline</title><style>body{font:16px Arial;margin:0;padding:28px;color:#27313a;background:#f3f4f5}main{max-width:520px;margin:auto;background:#fff;border-top:5px solid #ec0016;padding:24px}button{border:0;background:#ec0016;color:#fff;padding:12px 18px;font-weight:700;margin:8px 8px 0 0}.secondary{background:#fff;color:#27313a;border:1px solid #87929d}</style><main><h1>Gerade keine Verbindung</h1><p>Die App benötigt für Fahrplan und Live-Daten eine Internetverbindung.</p><button onclick="location.reload()">Erneut versuchen</button><button class="secondary" onclick="Promise.all([navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))),caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))]).then(()=>location.replace('/'))">App-Verbindung reparieren</button></main></html>`, { headers:{ "Content-Type":"text/html; charset=utf-8" } });
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && ["style", "script", "image", "font", "manifest"].includes(event.request.destination)) void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});

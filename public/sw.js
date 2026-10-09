const CACHE_NAME = "bahnconnections-static-v51-0";
const STATIC_ASSETS = [ "/manifest.webmanifest", "/app-icon.svg", "/app-icon-maskable.svg", "/app-icon-192.png", "/app-icon-512.png", "/app-icon-maskable-512.png"];
const AUTH_PATHS = ["/signin-with-chatgpt", "/auth", "/api/auth", "/oauth", "/cdn-cgi/"];

function isAuthenticationRequest(url) {
  return AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`) || (path.endsWith("/") && url.pathname.startsWith(path)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.all([cache.add("/offline.html"), Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))])));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("bahnconnections-static-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.registration.navigationPreload?.enable(),
  ]).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Authentication redirects must be handled by the browser itself. Following
  // them inside a service worker can fail CORS and incorrectly show "offline".
  if (isAuthenticationRequest(url) || url.pathname.startsWith("/api/") || url.pathname === "/version.json" || event.request.headers.get("RSC") === "1" || event.request.headers.get("Accept")?.includes("text/x-component")) return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // Never cache personalized documents or authentication redirects.
        return await event.preloadResponse || await fetch(event.request);
      } catch {
        return await caches.match("/offline.html") || new Response("BahnConnections: Keine Verbindung. Bitte die App bei bestehender Internetverbindung erneut öffnen.", { status:503, headers:{ "Content-Type":"text/plain; charset=utf-8" } });
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && ["style", "script", "image", "font", "manifest"].includes(event.request.destination)) void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});

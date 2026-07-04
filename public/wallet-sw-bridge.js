/** Puente Cache API: Safari ↔ PWA instalada (iOS no comparte localStorage). */

const SYNC_PATH = "/wallet/__sync";
const BRIDGE_CACHE = "wallet-bridge-v1";
const BRIDGE_KEY = "/wallet/__sync/data";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== SYNC_PATH) return;
  event.respondWith(handleSync(event.request));
});

/** Activa el SW nuevo solo cuando el usuario pulsa "Actualizar" en la app. */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function handleSync(request) {
  const cache = await caches.open(BRIDGE_CACHE);
  const cacheReq = new Request(BRIDGE_KEY);

  if (request.method === "POST") {
    const body = await request.text();
    await cache.put(cacheReq, new Response(body, {
      headers: { "Content-Type": "application/json" },
    }));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const cached = await cache.match(cacheReq);
  if (cached) return cached;

  return new Response("{}", {
    headers: { "Content-Type": "application/json" },
  });
}

/** Puente Cache API: Safari ↔ PWA instalada (iOS no comparte localStorage). */

const SYNC_PATH = "/wallet/__sync";
const BRIDGE_CACHE = "wallet-bridge-v1";
const BRIDGE_KEY = "/wallet/__sync/data";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== SYNC_PATH) return;
  event.respondWith(handleSync(event.request));
});

/** Recarga clientes /wallet al activar un SW nuevo (PWA sin pull-to-refresh). */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const walletClients = clients.filter((c) => {
        try {
          return new URL(c.url).pathname.startsWith("/wallet");
        } catch {
          return false;
        }
      });
      if (walletClients.length === 0) return;

      await Promise.all(
        walletClients.map((client) => {
          try {
            return client.navigate(client.url);
          } catch {
            return Promise.resolve();
          }
        })
      );
    })()
  );
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

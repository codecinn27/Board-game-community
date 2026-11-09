// Another app run earlier on this address (http://localhost:3000) can leave
// its service worker in the browser. That worker keeps answering
// `/_next/static` requests from its own saved copies, so after a dependency
// upgrade the page mixes old and new chunks and Turbopack throws "the module
// factory is not available".
//
// The browser checks a worker's script (`/sw.js`) for updates on every visit.
// In dev this route answers with a worker that deletes every saved copy,
// unregisters itself, and reloads the tabs the old worker was serving, so the
// stray worker removes itself. This app has no service worker of its own, so
// outside dev the route answers 404.
const CLEANUP_WORKER = `self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const tabs = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(tabs.map((tab) => tab.navigate(tab.url)));
    })(),
  );
});
`;

export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }
  return new Response(CLEANUP_WORKER, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

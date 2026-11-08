import { expect, test } from "@playwright/test";

// A service worker another app left on localhost:3000 served old chunks, and
// Turbopack threw "the module factory is not available". In dev, `/sw.js`
// answers with a worker that deletes the saved copies and unregisters itself
// (src/app/sw.js/route.ts).

test("the dev /sw.js worker deletes saved copies and unregisters itself", async ({
  page,
}) => {
  await page.goto("/en");
  // What a stray worker leaves behind: its own saved copy of a chunk.
  await page.evaluate(async () => {
    const cache = await caches.open("stray-app-v1");
    await cache.put("/_next/static/chunks/old.js", new Response("old"));
  });
  expect(await page.evaluate(() => caches.keys())).toEqual(["stray-app-v1"]);

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
  });

  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    )
    .toBe(0);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
});

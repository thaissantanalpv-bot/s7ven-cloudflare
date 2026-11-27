import { readdir } from "node:fs/promises";
import { createServer, type RequestListener } from "node:http";
import { once } from "node:events";
import { expect, test } from "@playwright/test";

async function listen(handler: RequestListener) {
  const server = createServer(handler).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture address");
  return { server, url: `http://127.0.0.1:${address.port}` };
}

test("serves the generated worker and its cleanup script from the Cloudflare asset route", async ({
  request,
}) => {
  for (const path of ["/sw.js", "/catalog-cache-cleanup.js"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/javascript/);
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});

test("upgrades a legacy worker, purges private caches and respects expiry across sessions", async ({
  page,
}) => {
  const asset = (await readdir("dist/client/assets")).find((file) => /^index-.*\.js$/.test(file));
  if (!asset) throw new Error("Missing built public asset");
  let legacy = true;
  let session = "first";
  let requests = 0;
  let expired = false;
  const app = await listen(async (request, response) => {
    if (request.url === "/sw.js" && legacy) {
      response.setHeader("content-type", "application/javascript");
      response.end(`self.skipWaiting();
        self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));`);
      return;
    }
    if (request.url === "/fixture") {
      response.setHeader("content-type", "text/html");
      response.end("<!doctype html><title>Service worker fixture</title>");
      return;
    }
    try {
      const upstream = await fetch(`http://127.0.0.1:4175${request.url}`);
      response.statusCode = upstream.status;
      response.setHeader("content-type", upstream.headers.get("content-type") ?? "text/plain");
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      response.statusCode = 502;
      response.end();
    }
  });
  const storage = await listen((request, response) => {
    requests += 1;
    const url = new URL(request.url ?? "/", "http://fixture.invalid");
    if (expired || url.searchParams.get("token") !== session) {
      response.statusCode = 403;
      response.end();
      return;
    }
    // Deliberately cacheable at the origin. The worker must still enforce a network read.
    response.setHeader("cache-control", "public, max-age=31536000, immutable");
    response.setHeader("content-type", "image/svg+xml");
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  });

  try {
    await page.goto(`${app.url}/fixture`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const path = "/storage/v1/object/sign/product-photos/uploads/private.jpg";
      for (const name of [
        "s7ven-public-photos-v1",
        "s7ven-public-photos-v2",
        "s7ven-public-pages-v1",
      ]) {
        await (await caches.open(name)).put(path, new Response("legacy"));
      }
    });
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    legacy = false;
    await page.evaluate(async () => {
      const changed = new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      await changed;
    });
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await caches.keys()).filter((name) => /s7ven-public-(photos|pages)-/.test(name)),
        ),
      )
      .toEqual([]);

    const privateUrl = (token: string) =>
      `${storage.url}/storage/v1/object/sign/product-photos/uploads/private.jpg?token=${token}`;
    const load = async (url: string) => {
      // Start a new document in the warmed context so a previously decoded bitmap
      // in the old document cannot short-circuit the request being tested.
      const tab = await page.context().newPage();
      try {
        await tab.goto(`${app.url}/fixture`);
        expect(await tab.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
        return await tab.evaluate(
          (src) =>
            new Promise<boolean>((resolve) => {
              const image = new Image();
              image.onload = () => resolve(true);
              image.onerror = () => resolve(false);
              image.src = src;
            }),
          url,
        );
      } finally {
        await tab.close();
      }
    };
    // No CORS headers: these image responses would be opaque to a caching worker.
    expect(await load(privateUrl("first"))).toBe(true);
    expect(await load(privateUrl("first"))).toBe(true);
    expect(requests).toBe(2);
    expired = true;
    expect(await load(privateUrl("first"))).toBe(false);
    expect(requests).toBe(3);
    session = ""; // Logout
    expired = false;
    expect(await load(privateUrl("first"))).toBe(false);
    session = "second";
    expect(await load(privateUrl("first"))).toBe(false);
    expect(await load(privateUrl("second"))).toBe(true);
    expect(requests).toBe(6);

    const cached = await page.evaluate(async () =>
      (await Promise.all((await caches.keys()).map(async (key) => (await caches.open(key)).keys())))
        .flat()
        .map((request) => request.url),
    );
    expect(cached.some((url) => url.includes(`/assets/${asset}`))).toBe(true);
    expect(cached.some((url) => url.includes("/storage/"))).toBe(false);
    await page.context().setOffline(true);
    expect(await page.evaluate(async (path) => (await fetch(path)).ok, `/assets/${asset}`)).toBe(
      true,
    );
  } finally {
    await page.context().setOffline(false);
    app.server.close();
    storage.server.close();
  }
});

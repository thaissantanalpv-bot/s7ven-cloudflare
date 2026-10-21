// Avisos de pedido novo no celular/computador da administração (notificações push).
// Este arquivo só mostra notificações: não guarda páginas nem dados em cache.
const DEFAULT_URL = "/painel?aba=pedidos";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Novo pedido — S7VEN";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Toque para abrir os pedidos.",
      icon: "/icons/s7ven-192.png",
      badge: "/icons/s7ven-badge-96.png",
      tag: data.tag || "s7ven-pedido",
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 150, 400, 150, 400],
      timestamp: Date.now(),
      data: { url: data.url || DEFAULT_URL },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || DEFAULT_URL, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const panel = windows.find((w) => new URL(w.url).pathname.startsWith("/painel"));
      if (panel) {
        panel.postMessage({ type: "s7ven-open-orders" });
        return panel.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});

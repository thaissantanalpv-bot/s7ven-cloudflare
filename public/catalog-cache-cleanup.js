// Previous workers cached signed image responses or HTML containing signed links.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(
      ["s7ven-public-photos-v1", "s7ven-public-photos-v2", "s7ven-public-pages-v1"].map((name) =>
        caches.delete(name),
      ),
    ),
  );
});

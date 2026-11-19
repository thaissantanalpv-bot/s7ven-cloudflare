import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const colors: Record<string, string> = {
  "a.svg": "#7c3aed",
  "b.svg": "#0f766e",
  "c.svg": "#b45309",
};

function mediaFixture(): Plugin {
  const stats = new Map<string, { requests: number; bytes: number }>();
  return {
    name: "catalog-media-fixture",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://fixture.test");
        const run = url.searchParams.get("run") ?? "default";
        if (url.pathname === "/__stats") {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(stats.get(run) ?? { requests: 0, bytes: 0 }));
          return;
        }
        if (!url.pathname.startsWith("/__media/")) {
          next();
          return;
        }
        const name = url.pathname.slice("/__media/".length);
        if (name === "missing.svg") {
          response.statusCode = 404;
          response.end("missing");
          return;
        }
        const color = colors[name];
        if (!color) {
          response.statusCode = 404;
          response.end("missing");
          return;
        }
        const body = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><rect width="512" height="256" fill="${color}"/></svg>`;
        const current = stats.get(run) ?? { requests: 0, bytes: 0 };
        stats.set(run, {
          requests: current.requests + 1,
          bytes: current.bytes + Buffer.byteLength(body),
        });
        response.setHeader("content-type", "image/svg+xml");
        response.setHeader("cache-control", "public, max-age=31536000, immutable");
        const send = () => response.end(body);
        if (name === "c.svg") setTimeout(send, 250);
        else send();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), mediaFixture()],
  server: { port: 4174, strictPort: true },
});

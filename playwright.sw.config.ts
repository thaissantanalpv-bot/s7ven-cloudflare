import { defineConfig } from "@playwright/test";
import images from "./playwright.images.config";

export default defineConfig({
  ...images,
  testMatch: "**/*.sw.ts",
  use: { ...images.use, baseURL: "http://127.0.0.1:4175" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175/robots.txt",
    timeout: 120_000,
  },
});

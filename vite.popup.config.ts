import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Extension pages load from chrome-extension://<id>/popup/index.html, not
  // from a domain root, so asset URLs must be relative — Vite's default
  // (absolute "/assets/...") 404s inside that origin and the popup renders blank.
  base: "./",
  root: `${root}src/popup`,
  build: {
    outDir: `${root}dist/popup`,
    emptyOutDir: true,
    rollupOptions: {
      input: `${root}src/popup/index.html`,
    },
  },
});

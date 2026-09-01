import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: `${root}src/popup`,
  build: {
    outDir: `${root}dist/popup`,
    emptyOutDir: true,
    rollupOptions: {
      input: `${root}src/popup/index.html`,
    },
  },
});

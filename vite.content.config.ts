import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    outDir: `${root}dist/content`,
    emptyOutDir: false,
    lib: {
      entry: `${root}src/content/index.ts`,
      formats: ["iife"],
      name: "OfferHiderContent",
      fileName: () => "index.js",
    },
  },
});

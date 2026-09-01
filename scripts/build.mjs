import { build } from "vite";
import { rm, mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const watch = process.argv.includes("--watch");

async function main() {
  await rm(`${root}dist`, { recursive: true, force: true });
  await mkdir(`${root}dist`, { recursive: true });

  await build({
    configFile: `${root}vite.popup.config.ts`,
    build: watch ? { watch: {} } : undefined,
  });

  await build({
    configFile: `${root}vite.content.config.ts`,
    build: watch ? { watch: {} } : undefined,
  });

  await copyStatic();
  console.log(watch ? "Build complete, watching for changes..." : "Build complete.");
}

async function copyStatic() {
  await cp(`${root}manifest.json`, `${root}dist/manifest.json`);
  await cp(`${root}_locales`, `${root}dist/_locales`, { recursive: true });
  await cp(`${root}public/icons`, `${root}dist/icons`, { recursive: true });
  await mkdir(`${root}dist/content`, { recursive: true });
  await cp(`${root}src/content/early-style.css`, `${root}dist/content/early-style.css`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

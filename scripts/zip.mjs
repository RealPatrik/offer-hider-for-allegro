import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = `${root}dist`;
const pkg = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(`${root}package.json`, "utf8")));
const outFile = `${root}${pkg.name}-${pkg.version}.zip`;

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

if (existsSync(outFile)) rmSync(outFile);

execFileSync("zip", ["-r", outFile, "."], { cwd: dist, stdio: "inherit" });
console.log(`Wrote ${outFile}`);

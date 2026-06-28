import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "runtime", "bridge", "src");
const sourcePath = path.join(sourceRoot, "page-bridge.js");
const outputPath = path.join(projectRoot, "runtime", "bridge", "page-bridge.js");

const parts = [
  "parts/00-bootstrap.js",
  "parts/10-runtime-data.js",
  "parts/20-baby-core.js",
  "parts/21-baby-skills.js",
  "parts/22-battle-map-actors.js",
  "parts/30-hooks.js",
  "parts/40-hangup-offline-drops.js",
  "parts/41-offline-run-state.js",
  "parts/42-progress-unlocks.js",
  "parts/43-command-ids.js",
  "parts/50-runtime-inspect.js",
  "parts/60-command-router.js",
  "parts/90-startup.js"
];

mkdirSync(path.dirname(outputPath), { recursive: true });
const output = parts
  .map((fileName) => readFileSync(path.join(sourceRoot, fileName), "utf8").trimEnd())
  .join("\n");

writeFileSync(sourcePath, output + "\n", "utf8");
writeFileSync(outputPath, output + "\n", "utf8");

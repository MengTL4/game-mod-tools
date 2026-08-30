import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "runtime", "bridge", "src");
const bridgeRoot = path.join(projectRoot, "runtime", "bridge");
const sourcePath = path.join(sourceRoot, "page-bridge.ts");
const outputPath = path.join(bridgeRoot, "page-bridge.js");
const contentSourcePath = path.join(bridgeRoot, "content.ts");
const contentOutputPath = path.join(bridgeRoot, "content.js");

const parts = [
  "parts/00-bootstrap.ts",
  "parts/10-runtime-data.ts",
  "parts/20-baby-core.ts",
  "parts/21-baby-skills.ts",
  "parts/22-battle-map-actors.ts",
  "parts/30-hooks.ts",
  "parts/40-hangup-offline-drops.ts",
  "parts/41-offline-run-state.ts",
  "parts/42-progress-unlocks.ts",
  "parts/43-command-ids.ts",
  "parts/50-runtime-inspect.ts",
  "parts/60-command-router.ts",
  "parts/90-startup.ts"
];

mkdirSync(path.dirname(outputPath), { recursive: true });
const output = parts
  .map((fileName) => readFileSync(path.join(sourceRoot, fileName), "utf8").trimEnd())
  .join("\n");

writeFileSync(sourcePath, output + "\n", "utf8");
writeFileSync(outputPath, output + "\n", "utf8");

if (existsSync(contentSourcePath)) {
  writeFileSync(contentOutputPath, readFileSync(contentSourcePath, "utf8").trimEnd() + "\n", "utf8");
}

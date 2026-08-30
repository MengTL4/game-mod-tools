import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");

const parts = [
  "runtime/bridge/src/parts/00-bootstrap.ts",
  "runtime/bridge/src/parts/10-runtime-data.ts",
  "runtime/bridge/src/parts/20-baby-core.ts",
  "runtime/bridge/src/parts/21-baby-skills.ts",
  "runtime/bridge/src/parts/22-battle-map-actors.ts",
  "runtime/bridge/src/parts/30-hooks.ts",
  "runtime/bridge/src/parts/40-hangup-offline-drops.ts",
  "runtime/bridge/src/parts/41-offline-run-state.ts",
  "runtime/bridge/src/parts/42-progress-unlocks.ts",
  "runtime/bridge/src/parts/43-command-ids.ts",
  "runtime/bridge/src/parts/50-runtime-inspect.ts",
  "runtime/bridge/src/parts/60-command-router.ts",
  "runtime/bridge/src/parts/90-startup.ts"
];

for (const relativePath of parts) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `runtime bridge source part should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `template bridge source part should exist: ${relativePath}`);
  assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), `${relativePath} should match template`);
}

const buildScript = readFileSync(path.join(projectRoot, "tools", "build-bridge.ts"), "utf8");
for (const relativePath of parts) {
  assert.match(buildScript, new RegExp(path.basename(relativePath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `build-bridge should include ${relativePath}`);
}
assert.doesNotMatch(buildScript, /const parts = \[\s*"page-bridge\.js"\s*\]/, "build-bridge should not use the monolithic source as its only part");

const joined = parts
  .map((relativePath) => readFileSync(path.join(projectRoot, relativePath), "utf8").trimEnd())
  .join("\n") + "\n";

assert.equal(joined, readFileSync(path.join(projectRoot, "runtime", "bridge", "src", "page-bridge.js"), "utf8"), "bridge source should be generated from parts");
assert.equal(joined, readFileSync(path.join(projectRoot, "runtime", "bridge", "page-bridge.js"), "utf8"), "runtime bridge should match joined source parts");

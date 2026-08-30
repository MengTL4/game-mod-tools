import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");

const modulePath = "app/gui/src/bindings.ts";
const runtimePath = path.join(projectRoot, modulePath);
const templatePath = path.join(templateRoot, modulePath);
assert.ok(existsSync(runtimePath), `runtime bindings module should exist: ${modulePath}`);
assert.ok(existsSync(templatePath), `template bindings module should exist: ${modulePath}`);
assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), "bindings module should match template");

for (const relativePath of ["app/gui/tsconfig.json", "skills/assets/zs2_modkit_template/app/gui/tsconfig.json"]) {
  const tsconfig = readFileSync(path.join(projectRoot, relativePath), "utf8");
  assert.match(tsconfig, /"src\/bindings\.ts"/, `${relativePath} should include src/bindings.ts`);
}

const appSource = readFileSync(path.join(projectRoot, "app", "gui", "app.ts"), "utf8");
assert.doesNotMatch(appSource, /function\s+bind\s*\(/, "app.ts should not define the large bind() event binding function");
assert.match(appSource, /Zs2Gui\.Bindings\.bind\(/, "app.ts should call the bindings module");

const bindingsSource = readFileSync(runtimePath, "utf8");
for (const expected of [
  "export function bind",
  "setupCatalogTools",
  "bindViewportResize",
  "offlineHuntClearTroopBtn",
  "customSendBtn",
  "openBridgeBtn"
]) {
  assert.match(bindingsSource, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

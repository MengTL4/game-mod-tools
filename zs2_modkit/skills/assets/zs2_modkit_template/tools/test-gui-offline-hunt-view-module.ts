import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");
const modulePath = "app/gui/src/offline-hunt-view.ts";

const runtimePath = path.join(projectRoot, modulePath);
const templatePath = path.join(templateRoot, modulePath);
assert.ok(existsSync(runtimePath), `runtime offline hunt view module should exist: ${modulePath}`);
assert.ok(existsSync(templatePath), `template offline hunt view module should exist: ${modulePath}`);
assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), "offline hunt view module should match template");

for (const relativePath of ["app/gui/tsconfig.json", "skills/assets/zs2_modkit_template/app/gui/tsconfig.json"]) {
  const tsconfig = readFileSync(path.join(projectRoot, relativePath), "utf8");
  assert.match(tsconfig, /"src\/offline-hunt-view\.ts"/, `${relativePath} should include src/offline-hunt-view.ts`);
}

const appSource = readFileSync(path.join(projectRoot, "app", "gui", "app.ts"), "utf8");
for (const functionName of [
  "compactListHtml",
  "chanceText",
  "previewDropRows",
  "dropKindSummary",
  "dropChipName",
  "updateOfflineHuntPanel"
]) {
  assert.doesNotMatch(appSource, new RegExp(`function\\s+${functionName}\\s*\\(`), `app.ts should not define ${functionName}`);
}
assert.match(appSource, /Zs2Gui\.OfflineHuntView\.create/);
assert.match(appSource, /offlineHuntView\.update\(/);

const moduleSource = readFileSync(runtimePath, "utf8");
assert.match(moduleSource, /namespace\s+Zs2Gui\.OfflineHuntView/);
assert.match(moduleSource, /export function create/);

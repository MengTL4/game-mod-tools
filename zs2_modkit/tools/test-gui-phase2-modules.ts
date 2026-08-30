import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");

const modules = [
  "app/gui/src/paths.ts",
  "app/gui/src/dom.ts",
  "app/gui/src/bridge-client.ts",
  "app/gui/src/catalogs.ts",
  "app/gui/src/icon-renderer.ts",
  "app/gui/src/catalog-view.ts",
  "app/gui/src/catalog-renderers.ts",
  "app/gui/src/offline-hunt-view.ts",
  "app/gui/src/bindings.ts"
];

for (const relativePath of modules) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `runtime module should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `template module should exist: ${relativePath}`);
}

for (const relativePath of ["app/gui/tsconfig.json", "skills/assets/zs2_modkit_template/app/gui/tsconfig.json"]) {
  const tsconfig = readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const modulePath of ["src/paths.ts", "src/dom.ts", "src/bridge-client.ts", "src/catalogs.ts", "src/icon-renderer.ts", "src/catalog-view.ts", "src/catalog-renderers.ts", "src/offline-hunt-view.ts", "src/bindings.ts"]) {
    assert.match(tsconfig, new RegExp(JSON.stringify(modulePath).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${relativePath} should include ${modulePath}`);
  }
}

const appSource = readFileSync(path.join(projectRoot, "app", "gui", "app.ts"), "utf8");
for (const functionName of [
  "loadCatalog",
  "loadTitleCatalog",
  "loadCostumeCatalog",
  "buildAllItemCatalog",
  "loadHuntMapCatalog",
  "loadTroopCatalog",
  "loadCommonEventCatalog",
  "cleanText",
  "cleanNote",
  "setupIconSet",
  "decryptProtectedImage",
  "unshuffleBytes",
  "iconDataUrl",
  "iconHtml",
  "actorAvatarHtml",
  "badgeHtml",
  "filterDatalistEntries",
  "filterEntries",
  "catalogRowHtml",
  "renderVirtualCatalog",
  "renderCatalogList",
  "renderItemList",
  "renderSkillList",
  "renderBabySkillList",
  "renderTitleList",
  "renderCostumeList",
  "renderActorList",
  "renderVariableList",
  "renderSwitchList",
  "renderMapList",
  "renderOfflineHuntMapList",
  "renderOfflineHuntTroopList",
  "renderCommonEventList",
  "updateCatalogLimitTools",
  "setupCatalogTools"
]) {
  assert.doesNotMatch(appSource, new RegExp(`function\\s+${functionName}\\s*\\(`), `app.ts should not define ${functionName}`);
}

assert.match(appSource, /Zs2Gui\.Catalogs\.loadCatalogs/);
assert.match(appSource, /Zs2Gui\.Paths\.create/);
assert.match(appSource, /Zs2Gui\.Dom\.create/);
assert.match(appSource, /Zs2Gui\.BridgeClient\.create/);
assert.match(appSource, /Zs2Gui\.IconRenderer\.create/);
assert.match(appSource, /Zs2Gui\.CatalogView\.create/);
assert.match(appSource, /Zs2Gui\.CatalogRenderers\.create/);

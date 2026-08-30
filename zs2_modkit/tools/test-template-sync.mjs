import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");

const pairs = [
  ["readme", "README.md"],
  ["user guide", "docs/工具使用说明.md"],
  ["technical guide", "docs/技术实现文档.md"],
  ["runtime bridge", "runtime/bridge/page-bridge.js"],
  ["runtime bridge source", "runtime/bridge/src/page-bridge.js"],
  ["bridge manifest", "runtime/bridge/manifest.json"],
  ["bridge content", "runtime/bridge/content.js"],
  ["gui tsconfig", "app/gui/tsconfig.json"],
  ["gui source", "app/gui/app.ts"],
  ["gui config source", "app/gui/src/config.ts"],
  ["gui format source", "app/gui/src/format.ts"],
  ["gui paths source", "app/gui/src/paths.ts"],
  ["gui dom source", "app/gui/src/dom.ts"],
  ["gui bridge client source", "app/gui/src/bridge-client.ts"],
  ["gui catalogs source", "app/gui/src/catalogs.ts"],
  ["gui icon renderer source", "app/gui/src/icon-renderer.ts"],
  ["gui catalog view source", "app/gui/src/catalog-view.ts"],
  ["gui catalog renderers source", "app/gui/src/catalog-renderers.ts"],
  ["gui offline hunt view source", "app/gui/src/offline-hunt-view.ts"],
  ["gui bindings source", "app/gui/src/bindings.ts"],
  ["gui main source", "app/gui/src/main.ts"],
  ["gui styles", "app/gui/styles.css"],
  ["gui base styles", "app/gui/styles/base.css"],
  ["gui layout styles", "app/gui/styles/layout.css"],
  ["gui catalog styles", "app/gui/styles/catalog.css"],
  ["gui feedback styles", "app/gui/styles/feedback.css"],
  ["gui responsive styles", "app/gui/styles/responsive.css"],
  ["gui html template", "app/gui/index.template.html"],
  ["gui sidebar html", "app/gui/html/sidebar.html"],
  ["gui core gold html", "app/gui/html/tools-core-gold.html"],
  ["gui misc lookups html", "app/gui/html/tools-misc-lookups.html"],
  ["gui catalog editors html", "app/gui/html/tools-catalog-editors.html"],
  ["gui baby html", "app/gui/html/tools-baby.html"],
  ["gui progress html", "app/gui/html/tools-progress.html"],
  ["gui offline html", "app/gui/html/tools-offline.html"],
  ["gui world html", "app/gui/html/tools-world.html"],
  ["gui core actions html", "app/gui/html/tools-core-actions.html"],
  ["gui events html", "app/gui/html/events.html"],
  ["gui datalists html", "app/gui/html/datalists.html"],
  ["gui html", "app/gui/index.html"],
  ["launch gui script", "tools/launch-gui.ps1"],
  ["launch runtime script", "tools/launch-runtime.ps1"],
  ["bridge build script", "tools/build-bridge.mjs"],
  ["gui html build script", "tools/build-gui-html.mjs"],
  ["bridge source sync test", "tools/test-bridge-source-sync.mjs"],
  ["bridge source parts test", "tools/test-bridge-source-parts.mjs"],
  ["bridge version sync test", "tools/test-bridge-version-sync.mjs"],
  ["bridge baby cooldowns test", "tools/test-bridge-baby-cooldowns.mjs"],
  ["bridge command router test", "tools/test-bridge-command-router.mjs"],
  ["bridge save paths test", "tools/test-bridge-save-paths.mjs"],
  ["launch scripts bridge build test", "tools/test-launch-scripts-build-bridge.mjs"],
  ["gui bindings module test", "tools/test-gui-bindings-module.mjs"],
  ["gui css split test", "tools/test-gui-css-split.mjs"],
  ["gui html split test", "tools/test-gui-html-split.mjs"],
  ["gui status copy test", "tools/test-gui-status-copy.mjs"],
  ["gui ui refresh test", "tools/test-gui-ui-refresh.mjs"],
  ["gui offline hunt view test", "tools/test-gui-offline-hunt-view-module.mjs"],
  ["gui phase2 modules test", "tools/test-gui-phase2-modules.mjs"]
];

for (const [label, relativePath] of pairs) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `${label} runtime file should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `${label} template file should exist: ${relativePath}`);
  assert.equal(
    readFileSync(templatePath, "utf8"),
    readFileSync(runtimePath, "utf8"),
    `${label} should match template copy: ${relativePath}`
  );
}

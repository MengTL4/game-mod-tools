import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2-modkit_template");

const cssFiles = [
  "app/gui/styles/base.css",
  "app/gui/styles/layout.css",
  "app/gui/styles/catalog.css",
  "app/gui/styles/feedback.css",
  "app/gui/styles/responsive.css"
];

for (const relativePath of cssFiles) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `runtime CSS split should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `template CSS split should exist: ${relativePath}`);
  assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), `${relativePath} should match template`);
}

const indexHtml = readFileSync(path.join(projectRoot, "app", "gui", "index.html"), "utf8");
for (const relativePath of cssFiles.map((file) => file.replace("app/gui/", ""))) {
  assert.match(indexHtml, new RegExp(`<link\\s+rel="stylesheet"\\s+href="${relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
}
assert.doesNotMatch(indexHtml, /href="styles\.css"/);

const legacyCss = readFileSync(path.join(projectRoot, "app", "gui", "styles.css"), "utf8");
assert.ok(legacyCss.split(/\r?\n/).length <= 12, "legacy styles.css should stay as a short compatibility entry");

import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2-modkit_template");
const guiRoot = path.join(projectRoot, "app", "gui");

const htmlSourceFiles = [
  "app/gui/index.template.html",
  "app/gui/html/sidebar.html",
  "app/gui/html/tools-core-gold.html",
  "app/gui/html/tools-misc-lookups.html",
  "app/gui/html/tools-catalog-editors.html",
  "app/gui/html/tools-baby.html",
  "app/gui/html/tools-progress.html",
  "app/gui/html/tools-offline.html",
  "app/gui/html/tools-world.html",
  "app/gui/html/tools-core-actions.html",
  "app/gui/html/events.html",
  "app/gui/html/datalists.html",
  "tools/build-gui-html.ts"
];

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function render(relativePath, stack = []) {
  assert.ok(!stack.includes(relativePath), `recursive HTML include: ${[...stack, relativePath].join(" -> ")}`);
  const source = read(relativePath);
  return source.replace(/^[ \t]*<!--\s*@include\s+(.+?)\s*-->\s*$/gm, (_match, includePath) => {
    const nextPath = path.posix.join(path.posix.dirname(relativePath), includePath.trim());
    return render(nextPath, [...stack, relativePath]).trimEnd();
  });
}

for (const relativePath of htmlSourceFiles) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `runtime HTML source should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `template HTML source should exist: ${relativePath}`);
  assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), `${relativePath} should match template`);
}

const rendered = render("app/gui/index.template.html").trimEnd() + "\n";
const indexHtml = read("app/gui/index.html");
assert.equal(indexHtml, rendered, "app/gui/index.html should be generated from index.template.html");
assert.doesNotMatch(indexHtml, /@include\s+/, "generated index.html should not contain include markers");

const templateHtml = read("app/gui/index.template.html");
assert.ok(templateHtml.split(/\r?\n/).length <= 110, "index.template.html should stay as a thin entry template");
for (const relativePath of htmlSourceFiles.filter((file) => file.startsWith("app/gui/html/"))) {
  assert.ok(read(relativePath).split(/\r?\n/).length <= 140, `${relativePath} should stay small enough to review`);
}

const referencedIds = new Set<string>();
for (const sourcePath of ["app/gui/app.ts", "app/gui/src/dom.ts"]) {
  const source = read(sourcePath);
  for (const match of source.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)) {
    referencedIds.add(match[1]);
  }
}

const htmlIds = [...indexHtml.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((match) => match[1]);
const htmlIdSet = new Set(htmlIds);
assert.equal(htmlIds.length, htmlIdSet.size, "generated index.html should not contain duplicate id attributes");

const missingIds = [...referencedIds].filter((id) => !htmlIdSet.has(id));
assert.deepEqual(missingIds, [], "every DOM id referenced by GUI TypeScript should exist in generated index.html");

for (const href of [
  "styles/base.css",
  "styles/layout.css",
  "styles/catalog.css",
  "styles/feedback.css",
  "styles/responsive.css"
]) {
  assert.match(indexHtml, new RegExp(`<link\\s+rel="stylesheet"\\s+href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
}
assert.match(indexHtml, /<script src="app\.js"><\/script>/);

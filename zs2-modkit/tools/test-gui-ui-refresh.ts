import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2-modkit_template");

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function assertSynced(relativePath) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `runtime file should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `template file should exist: ${relativePath}`);
  assert.equal(readFileSync(runtimePath, "utf8"), readFileSync(templatePath, "utf8"), `${relativePath} should match template`);
}

for (const relativePath of [
  "app/gui/index.template.html",
  "app/gui/html/sidebar.html",
  "app/gui/html/tools-core-actions.html",
  "app/gui/styles/base.css",
  "app/gui/styles/layout.css",
  "app/gui/styles/feedback.css",
  "app/gui/styles/responsive.css",
  "app/gui/app.ts",
  "app/gui/src/bindings.ts"
]) {
  assertSynced(relativePath);
}

const indexTemplate = read("app/gui/index.template.html");
assert.match(indexTemplate, /<header class="topbar command-topbar">/);
assert.match(indexTemplate, /<div class="brand-lockup">/);
assert.match(indexTemplate, /<div class="brand-mark" aria-hidden="true">ZS<\/div>/);
assert.match(indexTemplate, /<div class="top-actions command-actions">/);

for (const tab of ["core", "catalog", "baby", "progress", "offline", "world", "misc", "debug"]) {
  assert.match(indexTemplate, new RegExp(`data-tool-tab="${tab}"[\\s\\S]*data-nav-label(?:\\s|=)`), `tab ${tab} should have a nav label span`);
  assert.match(indexTemplate, new RegExp(`data-tool-tab="${tab}"[\\s\\S]*data-nav-hint(?:\\s|=)`), `tab ${tab} should have a nav hint span`);
}

const sidebar = read("app/gui/html/sidebar.html");
assert.match(sidebar, /class="panel status-panel command-card"/);
assert.match(sidebar, /class="panel party-panel command-card"/);
assert.match(sidebar, /class="panel command-card file-actions-panel"/);
assert.match(sidebar, /class="panel save-files command-card"/);
assert.match(sidebar, /class="state-list command-state-list"/);

const coreActions = read("app/gui/html/tools-core-actions.html");
for (const [id, className] of [
  ["battleKillBtn", "danger"],
  ["battleEscapeBtn", "warning"],
  ["battleStartBtn", "warning"],
  ["partyRecoverBtn", "primary"],
  ["saveGameBtn", "primary"],
  ["customSendBtn", "warning"]
]) {
  assert.match(coreActions, new RegExp(`id="${id}"[^>]*class="[^"]*${className}`), `${id} should declare ${className} intent`);
}

const generatedHtml = read("app/gui/index.html");
assert.match(generatedHtml, /command-topbar/);
assert.match(generatedHtml, /data-nav-label/);
assert.doesNotMatch(generatedHtml, /@include\s+/, "generated HTML should not contain include markers");

const baseCss = read("app/gui/styles/base.css");
for (const token of ["--bg-deep", "--surface-glass", "--accent-copper", "--success", "--focus-ring"]) {
  assert.match(baseCss, new RegExp(token), `base.css should define ${token}`);
}
assert.match(baseCss, /button\.danger/);
assert.match(baseCss, /button\.warning/);

const layoutCss = read("app/gui/styles/layout.css");
for (const selector of [".command-topbar", ".brand-lockup", ".brand-mark", ".command-actions", ".command-card", ".tool-nav button .nav-label", ".tool-nav button .nav-hint"]) {
  assert.match(layoutCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const feedbackCss = read("app/gui/styles/feedback.css");
for (const selector of [".toast.toast-success", ".toast.toast-warning", ".toast.toast-error", ".status::before"]) {
  assert.match(feedbackCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const appSource = read("app/gui/app.ts");
assert.match(appSource, /function showToast\(message, kind = "info"\)/);
assert.match(appSource, /toast-\$\{kind\}/);
assert.match(appSource, /setAttribute\("aria-current", "page"\)/);
assert.match(appSource, /aria-current="true"/);
assert.match(appSource, /showToast\("事件已清空", "warning"\)/);

const bindingsSource = read("app/gui/src/bindings.ts");
assert.match(bindingsSource, /showToast\(`JSON 错误：\$\{error\.message\}`, "error"\)/);

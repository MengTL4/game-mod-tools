import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2_modkit_template");

const runtimeSource = path.join(projectRoot, "runtime", "bridge", "src", "page-bridge.ts");
const runtimeOutput = path.join(projectRoot, "runtime", "bridge", "page-bridge.js");
const templateSource = path.join(templateRoot, "runtime", "bridge", "src", "page-bridge.ts");
const templateOutput = path.join(templateRoot, "runtime", "bridge", "page-bridge.js");
const buildScript = path.join(projectRoot, "tools", "build-bridge.ts");

for (const file of [runtimeSource, runtimeOutput, templateSource, templateOutput, buildScript]) {
  assert.ok(existsSync(file), `expected file should exist: ${path.relative(projectRoot, file)}`);
}

assert.equal(
  readFileSync(runtimeSource, "utf8"),
  readFileSync(runtimeOutput, "utf8"),
  "runtime bridge source should match generated page-bridge.js"
);
assert.equal(
  readFileSync(templateSource, "utf8"),
  readFileSync(templateOutput, "utf8"),
  "template bridge source should match generated page-bridge.js"
);
assert.equal(
  readFileSync(templateSource, "utf8"),
  readFileSync(runtimeSource, "utf8"),
  "template bridge source should match runtime bridge source"
);

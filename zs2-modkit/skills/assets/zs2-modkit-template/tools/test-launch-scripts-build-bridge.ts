import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const scriptName of ["launch-gui.ps1", "launch-runtime.ps1"]) {
  const source = readFileSync(path.join(projectRoot, "tools", scriptName), "utf8");
  assert.match(source, /build-bridge\.ts/, `${scriptName} should rebuild bridge before launch`);
  assert.match(source, /\$BridgeOutput/, `${scriptName} should compare generated bridge output freshness`);
  assert.match(source, /\$BridgeSourceDir/, `${scriptName} should check bridge source parts`);
}

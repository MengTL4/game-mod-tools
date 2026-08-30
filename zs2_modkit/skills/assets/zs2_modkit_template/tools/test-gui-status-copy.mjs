import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app", "gui", "app.ts"), "utf8");

assert.match(appSource, /桥接版本不一致/);
assert.match(appSource, /实际/);
assert.match(appSource, /期望/);
assert.doesNotMatch(appSource, /setStatus\("error",\s*"需重启"\)/);

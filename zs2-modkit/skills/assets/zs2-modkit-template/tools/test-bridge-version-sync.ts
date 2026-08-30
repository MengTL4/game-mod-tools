import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const compiledPairs = [
  {
    label: "runtime js",
    appPath: path.join(projectRoot, "app", "gui", "app.js"),
    bridgePath: path.join(projectRoot, "runtime", "bridge", "page-bridge.js")
  }
];

function extractVersion(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `${label} version declaration should exist`);
  return match[1];
}

for (const pair of compiledPairs) {
  const appSource = readFileSync(pair.appPath, "utf8");
  const bridgeSource = readFileSync(pair.bridgePath, "utf8");
  const expected = extractVersion(appSource, /EXPECTED_BRIDGE_VERSION\s*=\s*"([^"]+)"/, `${pair.label} app`);
  const actual = extractVersion(bridgeSource, /version:\s*"([^"]+)"/, `${pair.label} bridge`);
  assert.equal(expected, actual, `${pair.label} app expected bridge version should match bridge version`);
}

const configPairs = [
  {
    label: "runtime config",
    configPath: path.join(projectRoot, "app", "gui", "src", "config.ts"),
    bridgePath: path.join(projectRoot, "runtime", "bridge", "page-bridge.js")
  },
  {
    label: "template config",
    configPath: path.join(projectRoot, "skills", "assets", "zs2-modkit_template", "app", "gui", "src", "config.ts"),
    bridgePath: path.join(projectRoot, "skills", "assets", "zs2-modkit_template", "runtime", "bridge", "page-bridge.js")
  }
];

for (const pair of configPairs) {
  const configSource = readFileSync(pair.configPath, "utf8");
  const bridgeSource = readFileSync(pair.bridgePath, "utf8");
  const expected = extractVersion(configSource, /EXPECTED_BRIDGE_VERSION\s*=\s*"([^"]+)"/, `${pair.label} app`);
  const actual = extractVersion(bridgeSource, /version:\s*"([^"]+)"/, `${pair.label} bridge`);
  assert.equal(expected, actual, `${pair.label} expected bridge version should match bridge version`);
}

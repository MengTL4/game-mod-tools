import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

class GuardrailsContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "GuardrailsContractError";
  }
}

const require = createRequire(import.meta.url);
const ts = require("typescript");

function assert(condition, message) {
  if (!condition) throw new GuardrailsContractError(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

const ADJACENT_GUARDED_ACTIONS = [
  ["battleKillBtn", "battle.killEnemies"],
  ["battleEscapeBtn", "battle.escape"],
  ["mapTransferBtn", "map.transfer"],
  ["returnPositionBtn", "map.transfer"],
  ["commonEventRunBtn", "commonEvent.run"],
  ["saveGameBtn", "save"],
  ["titleRefreshBtn", "title.refresh"],
  ["prisonRepairBtn", "prison.repair"],
  ["customSendBtn", "custom"]
];

function parseOptions(argv) {
  const options = { dropAdjacentGuard: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--drop-adjacent-guard") {
      const value = argv[index + 1];
      if (!value) throw new GuardrailsContractError("--drop-adjacent-guard requires a control id");
      options.dropAdjacentGuard = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--drop-adjacent-guard=")) {
      const value = arg.slice("--drop-adjacent-guard=".length);
      if (!value) throw new GuardrailsContractError("--drop-adjacent-guard requires a control id");
      options.dropAdjacentGuard = value;
      continue;
    }
    throw new GuardrailsContractError(`unknown argument: ${arg}`);
  }
  return options;
}

function loadGuardrails(appDir) {
  const sourcePath = path.join(appDir, "src", "command-guardrails.ts");
  if (!fs.existsSync(sourcePath)) throw new GuardrailsContractError(`guardrail source missing: ${sourcePath}`);
  const source = readText(sourcePath);
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 }
  });
  const sandbox: any = { exports: {} };
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: sourcePath });
  sandbox.NwrGuiCommandGuardrails = sandbox.exports;
  assert(sandbox.NwrGuiCommandGuardrails, "NwrGuiCommandGuardrails namespace was not created");
  return sandbox.NwrGuiCommandGuardrails;
}

function guardForPolicy(policies, commandType, controlId = "") {
  const direct = controlId ? policies.find((policy) => policy.controlId === controlId) : null;
  if (direct) return direct;
  return policies.find((policy) => policy.commandType === commandType) || null;
}

function evidenceRows(appDir) {
  const rootDir = path.resolve(appDir, "..", "..", "..");
  const evidencePath = path.join(rootDir, ".omo", "evidence", "runtime-gate-feature-audit.json");
  if (!fs.existsSync(evidencePath)) throw new GuardrailsContractError(`A1 evidence missing: ${evidencePath}`);
  return JSON.parse(readText(evidencePath));
}

function assertA1GuardrailCoverage(guardrails: any, rows: any[]) {
  const policies = guardrails.ACTION_GUARDRAILS;
  assert(Array.isArray(policies) && policies.length > 0, "ACTION_GUARDRAILS should not be empty");
  const policyByControl = new Map(policies.map((policy) => [policy.controlId, policy]));
  const rowByControl = new Map(rows.map((row) => [String(row.controlId), row]));
  for (const policy of policies) {
    const row = rowByControl.get(policy.controlId);
    assert(row, `guardrail ${policy.controlId} has no A1 row`);
    assert(row.commandType === policy.commandType, `${policy.controlId} command type drifted from A1`);
    assert(row.actionAllowed === false, `${policy.controlId} should guard only A1 actionAllowed=false commands`);
    assert(row.classification === policy.classification, `${policy.controlId} classification drifted from A1`);
    assert(
      (policy.evidenceCommands || []).length > 0 || (policy.eventIds || []).length > 0,
      `${policy.controlId} should keep A1 evidence`
    );
  }
  const expectedRows = rows.filter((row) => {
    const controlId = String(row.controlId || "");
    const commandType = String(row.commandType || "");
    if (!commandType || commandType === "custom") return false;
    if (controlId.startsWith("candidate:")) return false;
    return row.actionAllowed === false;
  });
  for (const row of expectedRows) {
    assert(policyByControl.has(String(row.controlId)), `missing guardrail for A1 action ${row.controlId}`);
  }
}

function assertLookupBehavior(guardrails) {
  const gold = guardrails.guardFor("gold.set", "goldSetBtn");
  assert(gold?.controlId === "goldSetBtn", "gold.set should resolve the direct button guard");
  const goldFallback = guardrails.guardFor("gold.set", "");
  assert(goldFallback?.commandType === "gold.set", "gold.set should have a command-type fallback guard");
  const diagnostic = guardrails.guardFor("ping", "candidate:ping");
  assert(diagnostic === null, "read-only ping diagnostic should not require a guard");
  const custom = guardrails.guardFor("anything.custom", "customSendBtn");
  assert(custom?.controlId === "customSendBtn", "custom JSON sender should keep A1 metadata");
  assert(custom?.classification === "disable-guard", "custom JSON sender should keep the disable-guard classification");
}

function assertAdjacentGuardCoverage(guardrails, dropControlId = "") {
  const policies = guardrails.ACTION_GUARDRAILS.filter((policy) => policy.controlId !== dropControlId);
  for (const [controlId, commandType] of ADJACENT_GUARDED_ACTIONS) {
    const guard = guardForPolicy(policies, commandType, controlId);
    assert(
      guard?.controlId === controlId,
      `adjacent action ${controlId} (${commandType}) must keep its own A1 metadata`
    );
    assert(
      (guard.evidenceCommands || []).length > 0 || (guard.eventIds || []).length > 0,
      `${controlId} should keep A1 evidence metadata`
    );
  }
}

function assertSourceWiring(appDir, guardrails) {
  const appTs = readText(path.join(appDir, "src/App.tsx"));
  const indexHtml = readText(path.join(appDir, "index.html"));
  const tsconfigApp = JSON.parse(readText(path.join(appDir, "tsconfig.app.json")));
  const hasGuardrails = (tsconfigApp.files || []).includes("src/command-guardrails.ts") || (tsconfigApp.include || []).some((pattern: string) => pattern.includes("src"));
  assert(hasGuardrails, "tsconfig must include command guardrail module before app.ts");
  assert(!appTs.includes("window.confirm"), "runtime commands should send without a secondary confirmation popup");
  assert(!appTs.includes("NwrGuiCommandGuardrails.confirmationText"), "confirmation text must not be wired into sendCommand");
  assert(appTs.includes("sendCommand"), "app.tsx should still use the bridge command writer");
  assert(!/[^.]sendCommand\(command\);/.test(appTs), "custom JSON command must not be sent without guardrail context");
  assert(appTs.includes('"debug"'), "Debug diagnostics tab should remain present");
  for (const policy of guardrails.ACTION_GUARDRAILS) {
    if (policy.controlId.startsWith("selector:")) continue;
    const hasId = appTs.includes(`id="${policy.controlId}"`);
    const hasCommand = appTs.includes(policy.commandType) || appTs.includes(policy.commandType.replace(/\./g, "-"));
    assert(hasId || hasCommand, `app.tsx should pass guardrail control id ${policy.controlId} or command ${policy.commandType}`);
  }
}

function run() {
  const options = parseOptions(process.argv.slice(2));
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const appDir = path.resolve(testsDir, "..");
  const guardrails = loadGuardrails(appDir);
  const rows = evidenceRows(appDir);
  assertA1GuardrailCoverage(guardrails, rows);
  assertLookupBehavior(guardrails);
  assertAdjacentGuardCoverage(guardrails, options.dropAdjacentGuard);
  assertSourceWiring(appDir, guardrails);
  console.log(`guardrails: ${guardrails.ACTION_GUARDRAILS.length} A1-backed action guards`);
}

try {
  run();
} catch (error) {
  if (error instanceof GuardrailsContractError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}

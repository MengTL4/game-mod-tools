import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

class DiagnosticsContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "DiagnosticsContractError";
  }
}

const require = createRequire(import.meta.url);
const ts = require("typescript");
const REMOVED_DOMAIN = ["fi", "sh", "ing"].join("");
const REMOVED_COMMAND_PREFIX = [REMOVED_DOMAIN, ""].join(".");
const REMOVED_LABEL = `${REMOVED_DOMAIN[0].toUpperCase()}${REMOVED_DOMAIN.slice(1)}`;

function assert(condition, message) {
  if (!condition) throw new DiagnosticsContractError(message);
}

function loadNamespaces(appDir) {
  const sourcePaths = [
    path.join(appDir, "src", "bridge-commands.ts"),
    path.join(appDir, "src", "bridge-io.ts"),
    path.join(appDir, "src", "diagnostics.ts")
  ];
  const moduleExports: Record<string, any> = {};
  for (const sourcePath of sourcePaths) {
    if (!fs.existsSync(sourcePath)) throw new DiagnosticsContractError(`diagnostic source missing: ${sourcePath}`);
    const source = fs.readFileSync(sourcePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 }
    });
    const sandbox: any = { exports: {} };
    sandbox.require = (name: string) => {
      if (name === "path") return path;
      if (name === "fs") return fs;
      if (name.startsWith(".")) {
        const resolved = path.resolve(path.dirname(sourcePath), name);
        const tsPath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
        return moduleExports[tsPath] || {};
      }
      return require(name);
    };
    vm.runInNewContext(transpiled.outputText, sandbox, { filename: sourcePath });
    moduleExports[sourcePath] = sandbox.exports;
  }
  const namespaces: any = {
    commands: moduleExports[sourcePaths[0]],
    bridgeIo: moduleExports[sourcePaths[1]],
    diagnostics: moduleExports[sourcePaths[2]]
  };
  assert(namespaces.commands, "NwrGuiBridgeCommands namespace was not created");
  assert(namespaces.bridgeIo, "NwrGuiBridgeIO namespace was not created");
  assert(namespaces.diagnostics, "NwrGuiDiagnostics namespace was not created");
  return namespaces;
}

function evidenceRows(appDir) {
  const rootDir = path.resolve(appDir, "..", "..", "..");
  const evidencePath = path.join(rootDir, ".omo", "evidence", "runtime-gate-feature-audit.json");
  if (!fs.existsSync(evidencePath)) throw new DiagnosticsContractError(`A1 evidence missing: ${evidencePath}`);
  return JSON.parse(fs.readFileSync(evidencePath, "utf8"));
}

function assertA1BackedDefinitions(diagnostics: any, rows: any[]) {
  const byControl = new Map(rows.map((row) => [String(row.controlId), row]));
  assert(diagnostics.DIAGNOSTICS.length >= 7, "expected read-only diagnostics for R2/A1 candidate commands");
  for (const definition of diagnostics.DIAGNOSTICS) {
    assert(!String(definition.id).startsWith(REMOVED_COMMAND_PREFIX), `removed diagnostic must be absent: ${definition.id}`);
    assert(!String(definition.commandType).startsWith(REMOVED_COMMAND_PREFIX), `removed diagnostic command must be absent: ${definition.commandType}`);
    assert(!String(definition.label).includes(REMOVED_LABEL), `removed diagnostic label must be absent: ${definition.label}`);
    const row = byControl.get(definition.a1ControlId);
    assert(row, `missing A1 row for ${definition.id}`);
    assert(row.commandType === definition.commandType, `${definition.id} command type does not match A1`);
    assert(row.actionAllowed === true, `${definition.id} should be actionAllowed in A1`);
    assert(["candidate-add", "keep"].includes(row.classification), `${definition.id} has unsupported A1 classification ${row.classification}`);
    assert((row.eventIds || []).length > 0, `${definition.id} should have live A1 event evidence`);
    assert(definition.mutates === false, `${definition.id} must be non-mutating`);
  }
}

function assertCommandBuilders(diagnostics) {
  const types = diagnostics.DIAGNOSTICS.map((definition) => diagnostics.commandForDiagnostic(definition.id).type);
  const removedDiagnostic = ["hangup", "info"].join(".");
  const expected = [
    "ping", "runtime.inspect", "runtime.search", "trainer.options.get",
    "trainer.hooks.info", "data.dump", "map.current"
  ];
  for (const type of expected) assert(types.includes(type), `missing diagnostic command ${type}`);
  assert(!types.includes(removedDiagnostic), "removed hangup diagnostic must not be exposed as a diagnostic control");
  const removedTypes = types.filter((type) => String(type).startsWith(REMOVED_COMMAND_PREFIX));
  assert(removedTypes.length === 0, `removed diagnostics must not be exposed: ${removedTypes.join(", ")}`);
}

function assertPingJsonlWrite(bridgeIo, diagnostics) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nwr-diagnostics-"));
  try {
    const paths = bridgeIo.createBridgePaths(path, tempRoot);
    const payload = bridgeIo.sendCommand(
      fs,
      paths,
      diagnostics.commandForDiagnostic("ping"),
      () => 2000,
      () => 0.25
    );
    const written = JSON.parse(fs.readFileSync(paths.commandPath, "utf8").trim());
    assert(payload.type === "ping", "ping payload should be returned");
    assert(written.type === "ping", "ping JSONL command should be written without game globals");
    assert(written.commandId === "2000-4", `unexpected ping commandId ${written.commandId}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assertUiControls(appDir, diagnostics) {
  const appTs = fs.readFileSync(path.join(appDir, "src/App.tsx"), "utf8");
  for (const definition of diagnostics.DIAGNOSTICS) {
    assert(
      appTs.includes(definition.commandType) || appTs.includes(definition.id),
      `missing UI diagnostic reference ${definition.id}`
    );
  }
  assert(!appTs.includes("hangup"), "removed hangup diagnostic must not be exposed in diagnostics UI");
  assert(appTs.includes("debug"), "Debug tab should remain reachable");
  assert(appTs.includes('"core"'), "Core tab should be the default operator surface");
  assert(appTs.includes("activeToolTab"), "GUI should track active tool tab in state");
}

function assertToolNavigationReachable(appDir) {
  const appTs = fs.readFileSync(path.join(appDir, "src/App.tsx"), "utf8");
  const expectedTabs = ["core", "catalog", "world", "misc", "debug"];
  for (const tab of expectedTabs) assert(appTs.includes(`"${tab}"`), `missing top-level tool tab ${tab}`);
  assert(appTs.includes("data-tool-tab"), "tool tabs should be marked with data-tool-tab");
}

function run() {
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const appDir = path.resolve(testsDir, "..");
  const namespaces = loadNamespaces(appDir);
  assertA1BackedDefinitions(namespaces.diagnostics, evidenceRows(appDir));
  assertCommandBuilders(namespaces.diagnostics);
  assertUiControls(appDir, namespaces.diagnostics);
  assertToolNavigationReachable(appDir);
  assertPingJsonlWrite(namespaces.bridgeIo, namespaces.diagnostics);
  console.log(`diagnostics: ${namespaces.diagnostics.DIAGNOSTICS.length} read-only commands backed by A1 evidence`);
}

try {
  run();
} catch (error) {
  if (error instanceof DiagnosticsContractError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}

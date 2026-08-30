import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgeSource = readFileSync(path.join(projectRoot, "runtime", "bridge", "page-bridge.js"), "utf8");

const existsChecks = [];
const stateWrites = [];
const fakeFs = {
  mkdirSync() {},
  appendFileSync() {},
  existsSync(file) {
    existsChecks.push(file);
    return false;
  },
  readdirSync() {
    return [];
  },
  readFileSync() {
    return "";
  },
  writeFileSync(file, contents) {
    if (path.basename(String(file)) === "state.json") {
      stateWrites.push(JSON.parse(String(contents)));
    }
  }
};

const storageManager = {} as { localFilePath: (id: any) => string; localFileExists: (id: any) => boolean; localFileBackupExists: (id: any) => boolean };
const tkStorage = {} as { localFilePath: (id: any) => string; localFileExists: (id: any) => boolean; localFileBackupExists: (id: any) => boolean };
const windowObject = {
  location: { href: "file:///www/index.html" },
  document: { title: "再刷一把2" },
  StorageManager: storageManager,
  TK: {
    $: {
      StorageMrg: tkStorage,
      gameParty: () => null,
      gameVariables: () => null,
      gameSwitches: () => null,
      DataMrg: null
    }
  }
};

const intervals = [];
const context = vm.createContext({
  window: windowObject,
  document: windowObject.document,
  location: windowObject.location,
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  RegExp,
  setInterval(callback) {
    intervals.push(callback);
    return intervals.length;
  },
  clearInterval() {},
  process: {
    env: {
      ZS2_GAME_ROOT: "F:\\Game",
      ZS2_MODKIT_ROOT: projectRoot
    },
    cwd: () => "F:\\Game"
  },
  require(name) {
    if (name === "fs") return fakeFs;
    if (name === "path") return path;
    throw new Error(`unexpected require: ${name}`);
  }
});
context.global = context;

vm.runInContext(bridgeSource, context, { filename: "page-bridge.js" });

for (const storage of [storageManager, tkStorage]) {
  assert.equal(path.basename(storage.localFilePath(-1)), "config.rpgsave");
  assert.equal(path.basename(storage.localFilePath("-1")), "config.rpgsave");
  assert.equal(path.basename(storage.localFilePath("config")), "config.rpgsave");
  assert.equal(path.basename(storage.localFilePath(0)), "global.rpgsave");
  assert.equal(path.basename(storage.localFilePath("0")), "global.rpgsave");
  assert.equal(path.basename(storage.localFilePath("global")), "global.rpgsave");
  assert.equal(path.basename(storage.localFilePath(3)), "file3.rpgsave");
}

storageManager.localFileExists(-1);
tkStorage.localFileBackupExists("config");

const checkedBaseNames = existsChecks.map((file) => path.basename(String(file)));
assert.ok(checkedBaseNames.includes("config.rpgsave"), "config existence checks should target config.rpgsave");
assert.ok(!checkedBaseNames.includes("file-1.rpgsave"), "config existence checks should not target file-1.rpgsave");
assert.ok(!checkedBaseNames.includes("fileNaN.rpgsave"), "named save ids should not target fileNaN.rpgsave");

assert.ok(stateWrites.length > 0, "bridge should write state diagnostics");
const latestState = stateWrites[stateWrites.length - 1];
assert.equal(path.basename(latestState.saveTargets.config), "config.rpgsave");
assert.equal(path.basename(latestState.saveTargets.global), "global.rpgsave");
assert.equal(path.basename(latestState.saveTargets.slot1), "file1.rpgsave");
assert.equal(path.basename(latestState.saveTargets.legacyConfig), "file-1.rpgsave");
assert.equal(latestState.saveTargets.configUsesLegacyPath, false);

(function () {
  if (window.location && String(window.location.href).includes("_generated_background_page.html")) return;
  if (window.__codexLocalTrainerBridge) return;

  const BABY_PASSIVE_STORE_KEY = "_zs2ModkitBabyPassives";

  const bridge = {
    version: "0.2.40",
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    processed: Object.create(null),
    originals: Object.create(null),
    options: {
      expRate: 1,
      goldRate: 1,
      dropRate: 1,
      noSkillCost: false,
      oneHitKill: false,
      invincible: false
    },
    rateDepth: 0,
    suppressRates: 0,
    noCostDepth: 0,
    suppressNoCost: 0,
    suppressInvincible: 0,
    noCostBaselines: Object.create(null),
    rateStats: Object.create(null),
    battleStats: Object.create(null),
    offlineHuntStats: Object.create(null),
    hookTargets: [],
    hooksPatched: false,
    lastError: null
  };
  window.__codexLocalTrainerBridge = bridge;

  function tryRequire(name) {
    try {
      if (typeof require === "function") return require(name);
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
    }
    return null;
  }

  const fs = tryRequire("fs");
  const path = tryRequire("path");
  if (!fs || !path || typeof process === "undefined") {
    bridge.lastError = "Node require/process is unavailable in page context";
    return;
  }

  const gameRoot = process.env.ZS2_GAME_ROOT || process.cwd();
  const projectRoot = process.env.ZS2_MODKIT_ROOT || path.join(gameRoot, "zs2_modkit");
  const bridgeDir = path.join(projectRoot, "runtime", "bridge-state");
  const saveDir = path.join(gameRoot, "www", "save");
  const dataDir = path.join(projectRoot, "output", "extract", "data");
  const useDataDir = path.join(projectRoot, "output", "extract", "useData");
  const costumeDataPath = path.join(gameRoot, "www", "data", "huanzhuang.json");
  const commandPath = path.join(bridgeDir, "commands.jsonl");
  const eventPath = path.join(bridgeDir, "events.jsonl");
  const statePath = path.join(bridgeDir, "state.json");
  const logPath = path.join(bridgeDir, "bridge.log");
  const dataCache = Object.create(null);
  const localCatalogCache = Object.create(null);

  function ensureDir() {
    try {
      fs.mkdirSync(bridgeDir, { recursive: true });
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
    }
  }

  function append(file, value) {
    ensureDir();
    fs.appendFileSync(file, JSON.stringify(value) + "\n", "utf8");
  }

  function log(message, extra) {
    ensureDir();
    const line = `[${new Date().toISOString()}] ${message}${extra ? " " + JSON.stringify(extra) : ""}\n`;
    fs.appendFileSync(logPath, line, "utf8");
  }

  function readDataJson(fileName) {
    try {
      if (dataCache[fileName]) return dataCache[fileName];
      const file = path.join(dataDir, fileName);
      if (!fs.existsSync(file)) return null;
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      dataCache[fileName] = value;
      return value;
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      return null;
    }
  }

  function event(command, ok, payload) {
    append(eventPath, {
      ts: Date.now(),
      commandId: command && command.__codexQueueId || commandQueueId(command),
      type: command && command.type,
      ok,
      payload
    });
  }

  function callAlias(name) {
    try {
      const tk = window.TK && window.TK.$;
      const fn = tk && tk[name];
      if (typeof fn === "function") return fn();
      return null;
    } catch (_) {
      return null;
    }
  }

  function tkValue(name) {
    try {
      const tk = window.TK && window.TK.$;
      return tk && tk[name] || null;
    } catch (_) {
      return null;
    }
  }

  function uniqueTargets(targets) {
    const seen = [];
    return targets.filter((target) => {
      if (!target || !target.object || seen.includes(target.object)) return false;
      seen.push(target.object);
      return true;
    });
  }

  function resolveBattleManagers() {
    return uniqueTargets([
      { label: "TK.$.BattleMrg", object: tkValue("BattleMrg") },
      { label: "TK.$.BattleManager", object: tkValue("BattleManager") },
      { label: "window.BattleManager", object: window.BattleManager }
    ]);
  }

  function resolveSceneManager() {
    return tkValue("SceneMrg") || tkValue("SceneManager") || window.SceneManager || null;
  }

  function resolveConfigManager() {
    return tkValue("ConfigMrg") || tkValue("ConfigManager") || window.ConfigManager || null;
  }

  function resolvePrototypeTargets(globalName, aliases) {
    const candidates = [{ label: `window.${globalName}`, object: window[globalName] }];
    aliases.forEach((name) => candidates.push({ label: `TK.$.${name}`, object: tkValue(name) }));
    return uniqueTargets(candidates
      .map((candidate) => {
        const ctor = candidate.object;
        return ctor && ctor.prototype ? { label: `${candidate.label}.prototype`, object: ctor.prototype } : null;
      }));
  }

  function runtimePrototypeTarget(label, object) {
    try {
      const prototype = object && Object.getPrototypeOf(object);
      return prototype ? { label, object: prototype } : null;
    } catch (_) {
      return null;
    }
  }

  function runtimePrototypeChainTargets(label, object, maxDepth) {
    const targets = [];
    try {
      let prototype = object && Object.getPrototypeOf(object);
      let depth = 1;
      while (prototype && prototype !== Object.prototype && depth <= maxDepth) {
        targets.push({ label: `${label}.prototype${depth}`, object: prototype });
        prototype = Object.getPrototypeOf(prototype);
        depth += 1;
      }
    } catch (_) {}
    return targets;
  }

  function partyMemberPrototypeTargets(label) {
    const party = resolveParty();
    const members = getPartyMembers(party);
    return members.flatMap((actor, index) => {
      const actorId = actorIdOf(actor) || index + 1;
      return runtimePrototypeChainTargets(`${label}.actor${actorId}`, actor, 5);
    });
  }

  function troopEnemyPrototypeTargets(label) {
    return troopEnemies(false).flatMap((enemy, index) => {
      let enemyId = index + 1;
      try {
        enemyId = typeof enemy.enemyId === "function" ? enemy.enemyId() : enemy._enemyId || enemyId;
      } catch (_) {}
      return runtimePrototypeChainTargets(`${label}.enemy${enemyId}`, enemy, 5);
    });
  }

  function resolveParty() {
    return callAlias("gameParty") || window.$gameParty || null;
  }

  function resolveSystem() {
    return callAlias("gameSystem") || window.$gameSystem || null;
  }

  function resolveVariables() {
    return callAlias("gameVariables") || window.$gameVariables || null;
  }

  function resolveSwitches() {
    return callAlias("gameSwitches") || window.$gameSwitches || null;
  }

  function resolveActors() {
    return callAlias("gameActors") || window.$gameActors || null;
  }

  function resolveTroop() {
    return callAlias("gameTroop") || window.$gameTroop || null;
  }

  function resolveTemp() {
    return callAlias("gameTemp") || window.$gameTemp || null;
  }

  function resolveMap() {
    return callAlias("gameMap") || window.$gameMap || null;
  }

  function resolvePlayer() {
    return callAlias("gamePlayer") || window.$gamePlayer || null;
  }

  function resolveData(kind) {
    const names = {
      item: "dataItems",
      weapon: "dataWeapons",
      armor: "dataArmors",
      skill: "dataSkills",
      actor: "dataActors",
      enemy: "dataEnemies",
      troop: "dataTroops",
      mapInfo: "dataMapInfos"
    };
    const globals = {
      item: "$dataItems",
      weapon: "$dataWeapons",
      armor: "$dataArmors",
      skill: "$dataSkills",
      actor: "$dataActors",
      enemy: "$dataEnemies",
      troop: "$dataTroops",
      mapInfo: "$dataMapInfos"
    };
    return callAlias(names[kind]) || window[globals[kind]] || null;
  }

  function dataTable(kind) {
    const runtime = resolveData(kind);
    if (Array.isArray(runtime)) return runtime;
    const files = {
      item: "Items.json",
      weapon: "Weapons.json",
      armor: "Armors.json",
      skill: "Skills.json",
      actor: "Actors.json",
      enemy: "Enemies.json",
      troop: "Troops.json",
      mapInfo: "MapInfos.json"
    };
    const file = files[kind];
    const data = file ? readDataJson(file) : null;
    return Array.isArray(data) ? data : [];
  }

  function runtimeDataTable(kind) {
    const runtime = resolveData(kind);
    return Array.isArray(runtime) ? runtime : [];
  }

  function requireDataEntry(kind, id, label) {
    const number = Math.floor(requireNumber(id, label || `${kind} id`));
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label || kind} must be a positive id`);
    const table = dataTable(kind);
    const entry = table && table[number];
    if (!entry) throw new Error(`${kind} ${number} not found`);
    return { id: number, entry };
  }

  function mapDataFileName(mapId) {
    const id = Math.max(0, Math.floor(Number(mapId) || 0));
    return `Map${String(id).padStart(3, "0")}.json`;
  }

  function localMapData(mapId) {
    const id = Math.floor(Number(mapId) || 0);
    if (id <= 0) return null;
    return readDataJson(mapDataFileName(mapId));
  }

  function resolveCommonEvents() {
    return callAlias("dataCommonEvents") || window.$dataCommonEvents || null;
  }

  function commonEventTable() {
    const runtime = resolveCommonEvents();
    if (Array.isArray(runtime)) return runtime;
    const data = readDataJson("CommonEvents.json");
    return Array.isArray(data) ? data : [];
  }

  function resolveDataManager() {
    const tk = window.TK && window.TK.$;
    return tk && tk.DataMrg || window.DataManager || null;
  }

  function saveFilePath(savefileId) {
    const rawId = String(savefileId).trim().toLowerCase();
    const id = Number(savefileId);
    const fileName = rawId === "config" || id === -1
      ? "config.rpgsave"
      : rawId === "global" || id === 0
        ? "global.rpgsave"
        : `file${Math.floor(id)}.rpgsave`;
    return path.join(saveDir, fileName);
  }

  function patchStorageObject(storage, label) {
    if (!storage || storage.__codexSavePathPatched) return false;
    try {
      const original = {
        localFileDirectoryPath: storage.localFileDirectoryPath,
        localFilePath: storage.localFilePath,
        localFileExists: storage.localFileExists,
        localFileBackupExists: storage.localFileBackupExists,
        isLocalMode: storage.isLocalMode
      };
      Object.defineProperty(storage, "__codexOriginalStorage", {
        value: original,
        configurable: true
      });
      storage.localFileDirectoryPath = function () {
        return saveDir + path.sep;
      };
      storage.localFilePath = function (savefileId) {
        return saveFilePath(savefileId);
      };
      storage.localFileExists = function (savefileId) {
        return fs.existsSync(saveFilePath(savefileId));
      };
      storage.localFileBackupExists = function (savefileId) {
        return fs.existsSync(saveFilePath(savefileId) + ".bak");
      };
      storage.isLocalMode = function () {
        return true;
      };
      Object.defineProperty(storage, "__codexSavePathPatched", {
        value: true,
        configurable: true
      });
      log("patched storage save path", { label, saveDir });
      return true;
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      log("storage patch failed", { label, error: bridge.lastError });
      return false;
    }
  }

  function patchSavePaths() {
    let patched = false;
    try {
      patched = patchStorageObject(window.StorageManager, "StorageManager") || patched;
      const tkStorage = window.TK && window.TK.$ && window.TK.$.StorageMrg;
      patched = patchStorageObject(tkStorage, "TK.$.StorageMrg") || patched;
      if (patched) writeState();
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
    }
    return patched;
  }

  function refreshTitleContinueCommand() {
    try {
      const dataManager = resolveDataManager();
      if (dataManager && typeof dataManager.loadGlobalInfo === "function") {
        dataManager._globalInfo = dataManager.loadGlobalInfo();
      }
      const sceneManager = resolveSceneManager();
      const scene = sceneManager && sceneManager._scene;
      const commandWindow = scene && scene._commandWindow;
      if (commandWindow && typeof commandWindow.refresh === "function") {
        commandWindow.refresh();
        if (typeof commandWindow.activate === "function") commandWindow.activate();
      }
      return true;
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      return false;
    }
  }

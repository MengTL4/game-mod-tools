import fs from "fs";
import path from "path";
import childProcess from "child_process";
import { createPaths, type GuiPaths } from "./paths";
import { createBridgeClient, type Client as BridgeClient } from "./bridge-client";
import { loadCatalogs, catalogName, catalogEntry, type CatalogMap } from "./catalogs";
import { createIconRenderer, type Renderer as IconRenderer } from "./icon-renderer";
import { formatNumber, looseNumber, parseValue } from "./format";

export const EXPECTED_BRIDGE_VERSION = "0.2.40";
export const itemKindLabels: Record<string, string> = { item: "物品", weapon: "武器", armor: "防具" };

export interface AppCore {
  paths: GuiPaths;
  bridgeClient: BridgeClient;
  catalogs: CatalogMap;
  iconRenderer: IconRenderer;

  launchGame(): void;
  refresh(): { state: any | null; events: any[] };
  openFolder(folder: string): void;
  backupSaves(showToast: (msg: string, kind?: string) => void): void;
  clearEvents(): void;

  sendCommand(command: any): any;
  sendOptions(options: any): void;

  setGold(value: number, mode: "set" | "add"): void;
  setVariable(id: number, value: any): void;
  setSwitch(id: number, value: boolean): void;
  addItem(kind: string, id: number, amount: number): void;

  actorCommands: {
    unlock(id: number): void;
    remove(id: number): void;
    recover(id: number): void;
    setLevel(id: number, level: number): void;
    addExp(id: number, amount: number): void;
    setVitals(id: number, hp?: number, mp?: number, tp?: number): void;
    addParam(id: number, paramId: number, value: number): void;
  };

  learnSkill(actorId: number, skillId: number): void;
  forgetSkill(actorId: number, skillId: number): void;

  babyCommandBase(skillId: number, mode: string, id?: number, slot?: number): any;
  babySlotsCommand(type: string, valueOrAmount: number, id?: number): any;
  babyRows(baby: any): any[];
  babyDisplayName(id: number, baby: any): string;
  babyLearnSlotsOf(row: any): number;

  talentCommandBase(type: string, value: number, mode: string, cspId?: number, party?: boolean, actorId?: number): any;
  unlockTitle(id: number): void;
  unlockCostume(id: number): void;
  unlockEnemyBook(): void;

  setRates(expRate: number, goldRate: number, dropRate: number): void;
  setBattleOption(key: "noSkillCost" | "oneHitKill" | "invincible", value: boolean): void;
  killEnemies(): void;
  escapeBattle(): void;
  recoverParty(): void;
  startBattle(troopId?: number): void;

  saveGame(slot: number): void;
  refreshTitle(): void;

  transferMap(mapId: number, x: number, y: number, direction: number, fade: number): void;
  setThrough(value: boolean): void;

  offlineHuntCommandBase(options: {
    type: "offlineHunt.preview" | "offlineHunt.run";
    mode: "map" | "troop";
    mapId?: number;
    troopId?: number;
    times: number;
    regionId?: number;
    enemyBook: boolean;
    recover: boolean;
    save: boolean;
    saveSlot: number;
    autoSellQualities: number[];
    blockDropQualities: number[];
  }): any;

  runCommonEvent(id: number): void;

  parseItemSelection(raw: string, chooserKind: string, selectedItemKind: string): { kind: string; id: number; raw: string };
  itemSelectionKey(selection: { kind: string; id: number }): string;

  formatNumber(value: any): string;
  looseNumber(value: any): number;
  catalogName(kind: string, id: any): string;
  catalogEntry(kind: string, id: any): any;
}

export function createAppCore(showToast: (message: string, kind?: string) => void): AppCore {
  const paths = createPaths(process.cwd());
  const bridgeClient = createBridgeClient(paths);
  const catalogs = loadCatalogs({
    dataDir: paths.dataDir,
    useDataDir: paths.useDataDir,
    costumeDataPath: paths.costumeDataPath,
    itemKindLabels
  });
  let gameProcess: any = null;

  process.env.ZS2_MODKIT_ROOT = paths.projectRoot;
  process.env.ZS2_GAME_ROOT = paths.rootDir;

  const iconRenderer = createIconRenderer({
    iconSetPath: paths.iconSetPath,
    iconDir: paths.iconDir,
    showToast,
    onReady: () => {}
  });

  function sendCommand(command: any) {
    const payload = bridgeClient.appendCommand(command);
    showToast(`已发送：${payload.type}`, "success");
    return payload;
  }

  function sendOptions(options: any) {
    sendCommand({ type: "trainer.options.set", options });
  }

  function launchGame() {
    if (!fs.existsSync(paths.trainerGameExe)) {
      showToast("找不到 Game.exe", "error");
      return;
    }
    if (!fs.existsSync(path.join(paths.bridgeExtensionDir, "manifest.json"))) {
      showToast("找不到 bridge extension", "error");
      return;
    }
    try {
      gameProcess = childProcess.spawn(paths.trainerGameExe, [`--load-extension=${paths.bridgeExtensionDir}`], {
        cwd: paths.rootDir,
        env: {
          ...process.env,
          ZS2_MODKIT_ROOT: paths.projectRoot,
          ZS2_GAME_ROOT: paths.rootDir
        },
        detached: true,
        stdio: "ignore"
      });
      gameProcess.unref();
      showToast(`游戏已启动 PID ${gameProcess.pid}`, "success");
    } catch (error: any) {
      showToast(`启动失败：${error.message}`, "error");
    }
  }

  function openFolder(folder: string) {
    try {
      fs.mkdirSync(folder, { recursive: true });
      (window as any).nw.Shell.openItem(folder);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  }

  function copyDirectory(source: string, target: string) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const src = path.join(source, entry.name);
      const dst = path.join(target, entry.name);
      if (entry.isDirectory()) copyDirectory(src, dst);
      else fs.copyFileSync(src, dst);
    }
  }

  function backupSaves() {
    if (!fs.existsSync(paths.saveDir)) {
      showToast("没有找到存档目录", "error");
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(paths.projectRoot, "output", "backup", "save", stamp);
    copyDirectory(paths.saveDir, target);
    showToast("存档已备份", "success");
    openFolder(target);
  }

  function clearEvents() {
    bridgeClient.clearEvents();
    showToast("事件已清空", "warning");
  }

  function refresh() {
    const state = bridgeClient.readState();
    const events = bridgeClient.readEvents();
    return { state, events };
  }

  function setGold(value: number, mode: "set" | "add") {
    if (mode === "set") sendCommand({ type: "gold.set", value });
    else sendCommand({ type: "gold.add", amount: value });
  }

  function setVariable(id: number, value: any) {
    sendCommand({ type: "variable.set", id, value });
  }

  function setSwitch(id: number, value: boolean) {
    sendCommand({ type: "switch.set", id, value });
  }

  function addItem(kind: string, id: number, amount: number) {
    sendCommand({ type: "item.add", kind, id, amount });
  }

  const actorCommands = {
    unlock(id: number) { sendCommand({ type: "actor.unlock", id }); },
    remove(id: number) { sendCommand({ type: "actor.remove", id }); },
    recover(id: number) { sendCommand({ type: "actor.recover", id }); },
    setLevel(id: number, level: number) { sendCommand({ type: "actor.level.set", id, level }); },
    addExp(id: number, amount: number) { sendCommand({ type: "actor.exp.add", id, amount }); },
    setVitals(id: number, hp?: number, mp?: number, tp?: number) { sendCommand({ type: "actor.vitals.set", id, hp, mp, tp }); },
    addParam(id: number, paramId: number, value: number) { sendCommand({ type: "actor.param.add", id, paramId, value }); }
  };

  function learnSkill(actorId: number, skillId: number) {
    sendCommand({ type: "actor.skill.learn", id: actorId, skillId });
  }

  function forgetSkill(actorId: number, skillId: number) {
    sendCommand({ type: "actor.skill.forget", id: actorId, skillId });
  }

  function babyRows(baby: any) {
    return Array.isArray(baby && baby.babies) ? baby.babies : [];
  }

  function babyDisplayName(id: number, baby: any) {
    const rows = babyRows(baby);
    const row = rows.find((item: any) => Number(item.id) === Number(id));
    return row ? row.name || "" : "";
  }

  function babyLearnSlotsOf(row: any) {
    if (!row) return 0;
    if (row.learnSlots && row.learnSlots.slots != null) return Number(row.learnSlots.slots || 0);
    const raw = Number(row.BBLeranCount || 0);
    return raw > 0 ? Math.max(0, Math.round(raw / 1.0012)) : 0;
  }

  function babyCommandBase(skillId: number, mode: string, id?: number, slot?: number) {
    const command: any = { type: "baby.skill.learn", skillId, mode };
    if (id !== undefined && Number.isFinite(id)) command.id = id;
    if (slot !== undefined && Number.isFinite(slot)) command.slot = slot;
    return command;
  }

  function babySlotsCommand(type: string, valueOrAmount: number, id?: number) {
    const command: any = { type };
    if (id !== undefined && Number.isFinite(id)) command.id = id;
    if (type.endsWith(".add")) command.amount = valueOrAmount;
    else command.value = valueOrAmount;
    return command;
  }

  function talentCommandBase(type: string, value: number, mode: string, cspId?: number, party = false, actorId = 1) {
    const command: any = { type, mode };
    if (cspId !== undefined && Number.isFinite(cspId)) command.cspId = cspId;
    if (party) command.party = true;
    else command.id = actorId;
    if (type.endsWith(".add")) command.amount = value;
    else if (type.endsWith(".set")) command.value = value;
    return command;
  }

  function unlockTitle(id: number) { sendCommand({ type: "title.unlock", id }); }
  function unlockCostume(id: number) { sendCommand({ type: "costume.unlock", id }); }
  function unlockEnemyBook() { sendCommand({ type: "progress.enemyBook.unlock" }); }

  function setRates(expRate: number, goldRate: number, dropRate: number) {
    sendOptions({ expRate, goldRate, dropRate });
  }

  function setBattleOption(key: "noSkillCost" | "oneHitKill" | "invincible", value: boolean) {
    sendOptions({ [key]: value });
  }

  function killEnemies() { sendCommand({ type: "battle.killEnemies" }); }
  function escapeBattle() { sendCommand({ type: "battle.escape" }); }
  function recoverParty() { sendCommand({ type: "party.recover" }); }

  function startBattle(troopId?: number) {
    const command: any = { type: "battle.start", canEscape: true, canLose: true };
    if (troopId !== undefined && troopId > 0) command.troopId = troopId;
    else command.variableId = 399;
    sendCommand(command);
  }

  function saveGame(slot: number) { sendCommand({ type: "save", id: slot }); }
  function refreshTitle() { sendCommand({ type: "title.refresh" }); }

  function transferMap(mapId: number, x: number, y: number, direction: number, fade: number) {
    sendCommand({ type: "map.transfer", mapId, x, y, direction, fade });
  }

  function setThrough(value: boolean) { sendCommand({ type: "map.through.set", value }); }

  function offlineHuntCommandBase(options: {
    type: "offlineHunt.preview" | "offlineHunt.run";
    mode: "map" | "troop";
    mapId?: number;
    troopId?: number;
    times: number;
    regionId?: number;
    enemyBook: boolean;
    recover: boolean;
    save: boolean;
    saveSlot: number;
    autoSellQualities: number[];
    blockDropQualities: number[];
  }) {
    if (options.mode === "troop" && !Number.isFinite(Number(options.troopId))) {
      showToast("先选择敌群", "warning");
      return null;
    }
    if (options.mode === "map" && options.type === "offlineHunt.run") {
      const map = catalogEntry(catalogs, "huntMap", options.mapId || 31);
      if (map && !map.hasEncounters) {
        showToast("这张地图没有随机遇敌，不能按地图挂机；请切到敌群挂机", "warning");
        return null;
      }
    }
    const command: any = {
      type: options.type,
      mode: options.mode,
      times: options.times,
      enemyBook: options.enemyBook,
      recover: options.recover,
      save: options.save,
      saveSlot: options.saveSlot,
      autoSellQualities: options.autoSellQualities,
      blockDropQualities: options.blockDropQualities
    };
    if (options.mode === "troop") command.troopId = options.troopId;
    else {
      command.mapId = options.mapId || 31;
      if (options.regionId !== undefined) command.regionId = options.regionId;
    }
    return command;
  }

  function runCommonEvent(id: number) {
    sendCommand({ type: "commonEvent.run", id });
  }

  function parseItemSelection(raw: string, chooserKind: string, selectedItemKind: string) {
    const trimmed = String(raw || "").trim();
    const match = trimmed.match(/^(item|weapon|armor)\s*:\s*(\d+)$/i);
    if (match) {
      return { kind: match[1].toLowerCase(), id: Number(match[2]), raw: `${match[1].toLowerCase()}:${match[2]}` };
    }
    const kind = chooserKind === "all" ? selectedItemKind : chooserKind;
    return { kind, id: looseNumber(raw), raw: trimmed };
  }

  function itemSelectionKey(selection: { kind: string; id: number }) {
    return `${selection.kind}:${selection.id}`;
  }

  return {
    paths,
    bridgeClient,
    catalogs,
    iconRenderer,
    launchGame,
    refresh,
    openFolder,
    backupSaves,
    clearEvents,
    sendCommand,
    sendOptions,
    setGold,
    setVariable,
    setSwitch,
    addItem,
    actorCommands,
    learnSkill,
    forgetSkill,
    babyCommandBase,
    babySlotsCommand,
    babyRows,
    babyDisplayName,
    babyLearnSlotsOf,
    talentCommandBase,
    unlockTitle,
    unlockCostume,
    unlockEnemyBook,
    setRates,
    setBattleOption,
    killEnemies,
    escapeBattle,
    recoverParty,
    startBattle,
    saveGame,
    refreshTitle,
    transferMap,
    setThrough,
    offlineHuntCommandBase,
    runCommonEvent,
    parseItemSelection,
    itemSelectionKey,
    formatNumber,
    looseNumber,
    catalogName: (kind: string, id: any) => catalogName(catalogs, kind, id),
    catalogEntry: (kind: string, id: any) => catalogEntry(catalogs, kind, id)
  };
}

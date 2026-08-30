import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAppCore, EXPECTED_BRIDGE_VERSION, itemKindLabels } from "../lib/core";
import { debounce, looseNumber, parseValue } from "../lib/format";

const tabs = [
  { key: "core", label: "常用", hint: "金币 / 战斗 / 存档" },
  { key: "catalog", label: "物品角色", hint: "物品 / 角色 / 技能" },
  { key: "baby", label: "宝宝", hint: "技能 / 列表" },
  { key: "progress", label: "成长解锁", hint: "称号 / 换装" },
  { key: "offline", label: "脱机挂机", hint: "地图 / 敌群" },
  { key: "world", label: "地图事件", hint: "传送 / 公共事件" },
  { key: "misc", label: "杂项", hint: "变量 / 开关 / 图鉴" },
  { key: "debug", label: "调试", hint: "JSON 命令" }
];

const defaultSections: Record<string, string> = {
  core: "gold",
  catalog: "item",
  baby: "skill",
  progress: "title",
  offline: "map",
  world: "map",
  misc: "variable",
  debug: "command"
};

export type ToastKind = "info" | "success" | "warning" | "error";

export interface AppState {
  core: ReturnType<typeof createAppCore> | null;
  toast: { message: string; kind: ToastKind; show: boolean };
  status: { kind: "idle" | "online" | "error"; text: string };
  latestState: any;
  events: any[];
  activeTab: string;
  activeSection: string;
  offlineMode: "map" | "troop";

  // form states
  goldValue: string;
  variableId: string;
  variableValue: string;
  switchId: string;
  switchValue: boolean;
  itemKind: string;
  itemSearch: string;
  itemId: string;
  itemAmount: string;
  actorSearch: string;
  actorId: string;
  actorLevel: string;
  actorExp: string;
  actorHp: string;
  actorMp: string;
  actorTp: string;
  paramId: string;
  paramValue: string;
  skillActorId: string;
  skillSearch: string;
  skillId: string;
  babyActorId: string;
  babySkillSearch: string;
  babySkillId: string;
  babySkillMode: string;
  babyLearnSlots: string;
  babyActionSlot: string;
  talentActorId: string;
  talentPointValue: string;
  talentPointMode: string;
  talentCspId: string;
  titleSearch: string;
  titleId: string;
  costumeSearch: string;
  costumeId: string;
  mapSearch: string;
  mapId: string;
  mapX: string;
  mapY: string;
  mapDirection: string;
  mapFade: string;
  recordedPosition: any;
  offlineHuntMapId: string;
  offlineHuntMapTimes: string;
  offlineHuntRegionId: string;
  offlineHuntTroopId: string;
  offlineHuntTroopTimes: string;
  offlineHuntEnemyBook: boolean;
  offlineHuntRecover: boolean;
  offlineHuntSave: boolean;
  offlineHuntSaveSlot: string;
  offlineAutoSellGray: boolean;
  offlineAutoSellWhite: boolean;
  offlineAutoSellGreen: boolean;
  offlineAutoSellBlue: boolean;
  offlineAutoSellPurple: boolean;
  offlineBlockWhite: boolean;
  offlineBlockGreen: boolean;
  offlineBlockBlue: boolean;
  battleTroopId: string;
  saveSlot: string;
  expRate: string;
  goldRate: string;
  dropRate: string;
  customCommand: string;
  commonEventSearch: string;
  commonEventId: string;
}

export function useAppState() {
  const [core, setCore] = useState<ReturnType<typeof createAppCore> | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; show: boolean }>({ message: "", kind: "info", show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "online" | "error"; text: string }>({ kind: "idle", text: "未连接" });
  const [latestState, setLatestState] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("core");
  const [activeSection, setActiveSection] = useState(defaultSections.core);
  const [offlineMode, setOfflineMode] = useState<"map" | "troop">("map");

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    setToast({ message, kind, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  const [state, setState] = useState<AppState>(() => ({
    core: null,
    toast: { message: "", kind: "info", show: false },
    status: { kind: "idle", text: "未连接" },
    latestState: null,
    events: [],
    activeTab: "core",
    activeSection: defaultSections.core,
    offlineMode: "map",
    goldValue: "10000",
    variableId: "1",
    variableValue: "999",
    switchId: "1",
    switchValue: true,
    itemKind: "item",
    itemSearch: "",
    itemId: "1",
    itemAmount: "1",
    actorSearch: "",
    actorId: "1",
    actorLevel: "10",
    actorExp: "1000",
    actorHp: "",
    actorMp: "",
    actorTp: "",
    paramId: "0",
    paramValue: "10",
    skillActorId: "1",
    skillSearch: "",
    skillId: "1",
    babyActorId: "",
    babySkillSearch: "",
    babySkillId: "1890",
    babySkillMode: "auto",
    babyLearnSlots: "",
    babyActionSlot: "",
    talentActorId: "1",
    talentPointValue: "10",
    talentPointMode: "sp",
    talentCspId: "",
    titleSearch: "",
    titleId: "1",
    costumeSearch: "",
    costumeId: "1001",
    mapSearch: "",
    mapId: "5",
    mapX: "10",
    mapY: "10",
    mapDirection: "2",
    mapFade: "0",
    recordedPosition: null,
    offlineHuntMapId: "31",
    offlineHuntMapTimes: "10",
    offlineHuntRegionId: "",
    offlineHuntTroopId: "",
    offlineHuntTroopTimes: "10",
    offlineHuntEnemyBook: true,
    offlineHuntRecover: true,
    offlineHuntSave: false,
    offlineHuntSaveSlot: "1",
    offlineAutoSellGray: false,
    offlineAutoSellWhite: false,
    offlineAutoSellGreen: false,
    offlineAutoSellBlue: false,
    offlineAutoSellPurple: false,
    offlineBlockWhite: false,
    offlineBlockGreen: false,
    offlineBlockBlue: false,
    battleTroopId: "",
    saveSlot: "1",
    expRate: "1",
    goldRate: "1",
    dropRate: "1",
    customCommand: '{ "type": "ping" }',
    commonEventSearch: "",
    commonEventId: "1"
  }));

  useEffect(() => {
    try {
      const c = createAppCore(showToast);
      setCore(c);
      c.iconRenderer.setupIconSet();
    } catch (e: any) {
      showToast(`初始化失败：${e.message}`, "error");
    }
  }, [showToast]);

  const refresh = useCallback(() => {
    if (!core) return;
    const { state: s, events: ev } = core.refresh();
    setLatestState(s);
    setEvents(ev.slice(-40).reverse());

    if (!s) {
      setStatus({ kind: "idle", text: "未连接" });
      return;
    }
    const age = Date.now() - Number(s.ts || 0);
    const fresh = age >= 0 && age < 5000;
    const version = s.bridgeVersion || "?";
    const versionOk = version === EXPECTED_BRIDGE_VERSION;
    if (!fresh) setStatus({ kind: "idle", text: "离线" });
    else if (!versionOk) setStatus({ kind: "error", text: "桥接版本不一致" });
    else if (s.lastError) setStatus({ kind: "error", text: "有错误" });
    else if (s.hasParty) setStatus({ kind: "online", text: "已连接" });
    else setStatus({ kind: "idle", text: "加载中" });

    // sync option inputs when not focused (simple: just update from state)
    const options = fresh ? s.trainerOptions || {} : {};
    if (options.expRate != null) setState((prev) => ({ ...prev, expRate: String(options.expRate) }));
    if (options.goldRate != null) setState((prev) => ({ ...prev, goldRate: String(options.goldRate) }));
    if (options.dropRate != null) setState((prev) => ({ ...prev, dropRate: String(options.dropRate) }));
  }, [core]);

  useEffect(() => {
    if (!core) return;
    refresh();
    const id = setInterval(refresh, 700);
    return () => clearInterval(id);
  }, [core, refresh]);

  const setActiveTabAndSection = useCallback((tab: string) => {
    setActiveTab(tab);
    const section = defaultSections[tab] || "";
    setActiveSection(section);
    if (tab === "offline") setOfflineMode(section === "troop" ? "troop" : "map");
  }, []);

  const setActiveSectionAndMode = useCallback((section: string) => {
    setActiveSection(section);
    if (activeTab === "offline") {
      if (section === "troop") setOfflineMode("troop");
      else setOfflineMode("map");
    }
  }, [activeTab]);

  const setField = useCallback(<K extends keyof AppState>(key: K, value: AppState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const numberValue = useCallback((value: string, fallback = 0) => {
    const n = looseNumber(value);
    return Number.isFinite(n) ? n : fallback;
  }, []);

  const optionalNumber = useCallback((value: string) => {
    const text = String(value).trim();
    if (text === "") return undefined;
    const n = looseNumber(text);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  const activeActorId = useCallback(() => numberValue(state.actorId, 0), [state.actorId, numberValue]);
  const activeSkillActorId = useCallback(() => {
    const n = looseNumber(state.skillActorId);
    return Number.isFinite(n) ? n : activeActorId();
  }, [state.skillActorId, activeActorId]);

  const selectedItem = useMemo(() => {
    return core?.parseItemSelection(state.itemId, state.itemKind, "item") || { kind: "item", id: NaN, raw: "" };
  }, [state.itemId, state.itemKind, core]);

  const babyData = useMemo(() => {
    return core ? core.babyRows(latestState && latestState.baby) : [];
  }, [core, latestState]);

  const offlineHuntDisabled = useMemo(() => {
    if (!latestState) return true;
    const age = Date.now() - Number(latestState.ts || 0);
    const fresh = age >= 0 && age < 5000;
    return !fresh;
  }, [latestState]);

  const sendJsonCommand = useCallback(() => {
    try {
      const command = JSON.parse(state.customCommand);
      core?.sendCommand(command);
    } catch (error: any) {
      showToast(`JSON 错误：${error.message}`, "error");
    }
  }, [state.customCommand, core, showToast]);

  const launchGame = useCallback(() => core?.launchGame(), [core]);
  const openBridgeLog = useCallback(() => core?.openFolder(core.paths.bridgeDir), [core]);
  const openSaveDir = useCallback(() => core?.openFolder(core.paths.saveDir), [core]);
  const backupSaves = useCallback(() => {
    if (core) core.backupSaves(showToast);
  }, [core, showToast]);
  const clearEvents = useCallback(() => {
    core?.clearEvents();
    setEvents([]);
  }, [core]);

  const recordCurrentPosition = useCallback(() => {
    const map = latestState && latestState.currentMap;
    if (!map || !map.mapId) {
      showToast("还没有读取到当前位置", "warning");
      return;
    }
    const pos = {
      mapId: Number(map.mapId),
      x: Number(map.x || 0),
      y: Number(map.y || 0),
      direction: Number(map.direction || 2),
      fade: 0
    };
    setState((prev) => ({ ...prev, recordedPosition: pos, mapId: String(pos.mapId), mapX: String(pos.x), mapY: String(pos.y), mapDirection: String(pos.direction), mapFade: String(pos.fade) }));
    showToast("已记录当前位置", "success");
  }, [latestState, showToast]);

  const returnRecordedPosition = useCallback(() => {
    if (!state.recordedPosition) {
      showToast("还没有记录位置", "warning");
      return;
    }
    core?.transferMap(state.recordedPosition.mapId, state.recordedPosition.x, state.recordedPosition.y, state.recordedPosition.direction, state.recordedPosition.fade);
  }, [state.recordedPosition, core, showToast]);

  const selectedOfflineQualities = useCallback((rows: [keyof AppState, number][]) => {
    return rows.filter(([key]) => state[key]).map(([, quality]) => quality);
  }, [state]);

  const offlineCommandBase = useCallback((type: "offlineHunt.preview" | "offlineHunt.run") => {
    if (!core) return null;
    const isTroop = offlineMode === "troop";
    const command = core.offlineHuntCommandBase({
      type,
      mode: isTroop ? "troop" : "map",
      mapId: numberValue(state.offlineHuntMapId, 31),
      troopId: optionalNumber(state.offlineHuntTroopId),
      times: numberValue(isTroop ? state.offlineHuntTroopTimes : state.offlineHuntMapTimes, 10),
      regionId: optionalNumber(state.offlineHuntRegionId),
      enemyBook: state.offlineHuntEnemyBook,
      recover: state.offlineHuntRecover,
      save: state.offlineHuntSave,
      saveSlot: numberValue(state.offlineHuntSaveSlot, 1),
      autoSellQualities: selectedOfflineQualities([
        ["offlineAutoSellGray", 0],
        ["offlineAutoSellWhite", 1],
        ["offlineAutoSellGreen", 2],
        ["offlineAutoSellBlue", 3],
        ["offlineAutoSellPurple", 4]
      ]),
      blockDropQualities: selectedOfflineQualities([
        ["offlineBlockWhite", 1],
        ["offlineBlockGreen", 2],
        ["offlineBlockBlue", 3]
      ])
    });
    return command;
  }, [core, offlineMode, state, numberValue, optionalNumber, selectedOfflineQualities]);

  const previewOfflineHunt = useCallback(() => {
    const command = offlineCommandBase("offlineHunt.preview");
    if (command) core?.sendCommand(command);
  }, [offlineCommandBase, core]);

  const runOfflineHunt = useCallback(() => {
    const command = offlineCommandBase("offlineHunt.run");
    if (command) core?.sendCommand(command);
  }, [offlineCommandBase, core]);

  const startBattle = useCallback((troopId?: number) => {
    core?.startBattle(troopId);
  }, [core]);

  const runCommonEvent = useCallback((id: number) => {
    core?.runCommonEvent(id);
  }, [core]);

  const tabsData = tabs;
  const currentMap = latestState && latestState.currentMap;
  const through = !!(currentMap && currentMap.through);

  return {
    core,
    state,
    setState,
    setField,
    showToast,
    toast,
    status,
    latestState,
    events,
    activeTab,
    activeSection,
    offlineMode,
    setActiveTab: setActiveTabAndSection,
    setActiveSection: setActiveSectionAndMode,
    setOfflineMode,
    refresh,
    launchGame,
    openBridgeLog,
    openSaveDir,
    backupSaves,
    clearEvents,
    numberValue,
    optionalNumber,
    activeActorId,
    activeSkillActorId,
    selectedItem,
    babyData,
    offlineHuntDisabled,
    hasParty: !!(latestState && latestState.hasParty),
    currentMap,
    through,
    sendJsonCommand,
    recordCurrentPosition,
    returnRecordedPosition,
    previewOfflineHunt,
    runOfflineHunt,
    startBattle,
    runCommonEvent,
    parseValue,
    itemKindLabels
  };
}

export { tabs, defaultSections, itemKindLabels, EXPECTED_BRIDGE_VERSION };

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");
const childProcess = require("child_process") as typeof import("child_process");

import * as NwrGuiBridgeCommands from "../bridge-commands";
import * as NwrGuiBridgeIO from "../bridge-io";
import * as NwrGuiCatalog from "../catalog-core";
import * as NwrGuiCatalogLoader from "../catalog-loader";
import * as NwrGuiCatalogUi from "../catalog-ui";
import * as NwrGuiCatalogTools from "../catalog-tools";
import * as NwrGuiDiagnostics from "../diagnostics";
import * as NwrGuiPrisonGuards from "../prison-guard-view";
import * as NwrGuiRuntimeEvents from "../runtime-events";
import * as NwrGuiRuntimeRoutes from "../runtime-routes";
import * as NwrGuiRuntimeState from "../runtime-state";
import * as NwrGuiToolNavigation from "../tool-navigation";

import {
  backupSaves,
  gameRootPath,
  launchRuntimeScript,
  openFolder,
  preparedGameDir,
  preparedGameLauncherPath,
  preparedGameReady,
  projectRootPath,
  readJson,
  saveDir,
  dataDir,
} from "../lib/env";
import { actorAvatarHtml, badgeHtml, exportedIconSetReady, hasIconSet, iconHtml, setupIconSet } from "../lib/icons";

const EXPECTED_BRIDGE_VERSION = "0.2.32";

export type Toast = { message: string; key: number };

export type StatusKind = NwrGuiRuntimeState.StatusKind;

export type RuntimeView = NwrGuiRuntimeState.RuntimeStateView;

type RuntimeStateRecord = { readonly currentMap?: { mapId?: unknown; x?: unknown; y?: unknown; direction?: unknown }; readonly [key: string]: unknown };

type BridgeEventRecord = { readonly type?: unknown; readonly ok?: unknown; readonly payload?: unknown; readonly scheduled?: unknown };

const bridgePaths = NwrGuiBridgeIO.createBridgePaths(path, projectRootPath);
const catalogPager = new NwrGuiCatalog.CatalogPager();

export function useAppState() {
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [runtimeState, setRuntimeState] = useState<unknown>(null);
  const [runtimeView, setRuntimeView] = useState<RuntimeView>(NwrGuiRuntimeState.stateView(null, { expectedBridgeVersion: EXPECTED_BRIDGE_VERSION }));
  const [lastEventSize, setLastEventSize] = useState(0);
  const [events, setEvents] = useState<readonly unknown[]>([]);

  const [catalogs, setCatalogs] = useState<NwrGuiCatalog.Catalogs>({
    variable: [],
    switch: [],
    item: [],
    weapon: [],
    armor: [],
    actor: [],
    skill: [],
    map: [],
    commonEvent: [],
    all: []
  });
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [iconRenderVersion, setIconRenderVersion] = useState(0);

  const [activeToolTab, setActiveToolTab] = useState("core");
  const [activeToolSections, setActiveToolSections] = useState<NwrGuiToolNavigation.ActiveToolSections>({
    core: "gold",
    catalog: "item",
    world: "map",
    misc: "variable",
    debug: "diagnostics"
  });

  const [selectedRuntimeRoute, setSelectedRuntimeRouteRaw] = useState(NwrGuiRuntimeRoutes.defaultRouteName());
  const setSelectedRuntimeRoute = useCallback((value: string) => {
    setSelectedRuntimeRouteRaw(NwrGuiRuntimeRoutes.normalizeRouteName(value));
  }, []);
  const [gameProcess, setGameProcess] = useState<import("child_process").ChildProcess | null>(null);

  const [goldValue, setGoldValue] = useState(10000);
  const [expRate, setExpRate] = useState(1);
  const [goldRate, setGoldRate] = useState(1);
  const [dropRate, setDropRate] = useState(1);
  const [noCost, setNoCost] = useState(false);
  const [oneHitKill, setOneHitKill] = useState(false);
  const [invincible, setInvincible] = useState(false);
  const [variableId, setVariableId] = useState("1");
  const [variableValue, setVariableValue] = useState("999");
  const [variableSearch, setVariableSearch] = useState("");
  const [switchId, setSwitchId] = useState("1");
  const [switchValue, setSwitchValue] = useState(true);
  const [switchSearch, setSwitchSearch] = useState("");
  const [itemKind, setItemKind] = useState("all");
  const [itemSearch, setItemSearch] = useState("");
  const [itemAmount, setItemAmount] = useState(1);
  const [itemId, setItemId] = useState("item:1");
  const [actorSearch, setActorSearch] = useState("");
  const [actorId, setActorId] = useState("1");
  const [actorName, setActorName] = useState("");
  const [actorLevel, setActorLevel] = useState(10);
  const [actorExp, setActorExp] = useState(1000);
  const [actorHp, setActorHp] = useState("");
  const [actorMp, setActorMp] = useState("");
  const [actorTp, setActorTp] = useState("");
  const [paramId, setParamId] = useState(0);
  const [paramValue, setParamValue] = useState(10);
  const [actorPointClassId, setActorPointClassId] = useState("");
  const [actorSpValue, setActorSpValue] = useState(10);
  const [actorAllocationPointValue, setActorAllocationPointValue] = useState(1);
  const [skillActorId, setSkillActorId] = useState("1");
  const [skillSearch, setSkillSearch] = useState("");
  const [skillId, setSkillId] = useState("1");
  const [mapSearch, setMapSearch] = useState("");
  const [mapId, setMapId] = useState("5");
  const [mapX, setMapX] = useState(10);
  const [mapY, setMapY] = useState(10);
  const [mapDirection, setMapDirection] = useState(2);
  const [mapFade, setMapFade] = useState(0);
  const [commonEventSearch, setCommonEventSearch] = useState("");
  const [commonEventId, setCommonEventId] = useState("1");
  const [customCommand, setCustomCommand] = useState('{ "type": "ping" }');
  const [saveSlot, setSaveSlot] = useState(1);
  const [recordedPosition, setRecordedPosition] = useState<{ mapId: number; x: number; y: number; direction: number; fade: number } | null>(null);
  const [recordedText, setRecordedText] = useState("未记录");

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const sendCommand = useCallback((command: NwrGuiBridgeCommands.BridgeCommand, _controlId = "", options: { silent?: boolean } = {}) => {
    const payload = NwrGuiBridgeIO.sendCommand(fs, bridgePaths, command);
    if (!options.silent) showToast(`已发送：${payload.type}`);
    return payload;
  }, [showToast]);

  const sendDiagnosticCommand = useCallback((id: string) => {
    const definition = NwrGuiDiagnostics.diagnosticById(id);
    if (!definition) {
      showToast("未知诊断命令");
      return;
    }
    const payload = sendCommand(NwrGuiDiagnostics.commandForDiagnostic(definition.id));
    if (!payload) return;
    showToast(`${definition.label} -> ${payload.commandId}`);
  }, [sendCommand, showToast]);

  const clearEvents = useCallback(() => {
    NwrGuiBridgeIO.clearEvents(fs, bridgePaths);
    setLastEventSize(0);
    setEvents([]);
    showToast("事件已清空");
  }, [showToast]);

  const launchGame = useCallback(() => {
    if (!fs.existsSync(launchRuntimeScript)) {
      showToast("找不到运行时启动脚本");
      return;
    }
    try {
      const route = NwrGuiRuntimeRoutes.diagnosticModel(selectedRuntimeRoute);
      const args = NwrGuiRuntimeRoutes.launchArguments([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        launchRuntimeScript,
        "-GameRoot",
        gameRootPath
      ], selectedRuntimeRoute);
      const proc = childProcess.spawn("powershell.exe", args, {
        cwd: projectRootPath,
        env: {
          ...process.env,
          DQ2_MODKIT_ROOT: projectRootPath,
          DQ2_GAME_ROOT: gameRootPath
        },
        stdio: "ignore"
      });
      setGameProcess(proc);
      showToast(`正在准备：${route.label}`);
      proc.on("error", (error) => {
        setGameProcess(null);
        showToast(`准备失败：${error.message}`);
      });
      proc.on("exit", (code, signal) => {
        setGameProcess(null);
        refresh();
        if (code === 0) {
          showToast("桥接已准备，点击“打开游戏”");
        } else {
          showToast(`准备失败：${signal || `exit ${code == null ? "unknown" : code}`}`);
        }
      });
    } catch (error) {
      showToast(`启动失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [selectedRuntimeRoute, showToast]);

  const openPreparedGame = useCallback(() => {
    if (!preparedGameReady()) {
      showToast("请先点击“准备桥接”");
      return;
    }
    try {
      const proc = childProcess.spawn("cmd.exe", ["/c", preparedGameLauncherPath], {
        cwd: preparedGameDir,
        detached: true,
        stdio: "ignore"
      });
      proc.unref();
      setGameProcess(proc);
      showToast("已打开准备好的游戏");
    } catch (error) {
      showToast(`打开游戏失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [showToast]);

  const openBridgeFolder = useCallback(() => {
    try {
      openFolder(bridgePaths.bridgeDir);
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  }, [showToast]);

  const openSaveFolder = useCallback(() => {
    try {
      openFolder(saveDir);
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  }, [showToast]);

  const handleBackupSaves = useCallback(() => {
    try {
      const target = backupSaves();
      showToast("存档已备份");
      openFolder(target);
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  }, [showToast]);

  const formatNumber = useCallback((value: unknown) => {
    if (value == null || value === "") return "-";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("zh-CN").format(number);
  }, []);

  const parseValue = useCallback((text: string) => {
    const value = String(text).trim();
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (value !== "" && Number.isFinite(Number(value))) return Number(value);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, []);

  const looseNumber = useCallback((value: unknown) => {
    const text = String(value == null ? "" : value).trim();
    if (text === "") return NaN;
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }, []);

  const numberValue = useCallback((text: string, fallback = 0) => {
    const value = looseNumber(text);
    return Number.isFinite(value) ? value : fallback;
  }, [looseNumber]);

  const optionalNumber = useCallback((text: string) => {
    if (text.trim() === "") return undefined;
    const value = looseNumber(text);
    return Number.isFinite(value) ? value : undefined;
  }, [looseNumber]);

  const activeActorId = useCallback(() => numberValue(actorId, 0), [actorId, numberValue]);
  const skillActor = useCallback(() => numberValue(skillActorId, activeActorId()), [skillActorId, activeActorId, numberValue]);
  const actorPointClass = useCallback(() => optionalNumber(actorPointClassId), [actorPointClassId, optionalNumber]);

  const parseItemSelection = useCallback((): { kind: string; id: number; raw: string } => {
    const raw = String(itemId || "").trim();
    const match = raw.match(/^(item|weapon|armor)\s*:\s*(\d+)$/i);
    if (match) {
      return { kind: match[1].toLowerCase(), id: Number(match[2]), raw: `${match[1].toLowerCase()}:${match[2]}` };
    }
    const chooserKind = itemKind;
    const kind = chooserKind === "all" ? "item" : chooserKind;
    return { kind, id: numberValue(itemId, NaN), raw };
  }, [itemId, itemKind, numberValue]);

  const itemSelectionKey = useCallback((selection: { kind: string; id: number }) => `${selection.kind}:${selection.id}`, []);

  const selectItem = useCallback((kind: string, id: number) => {
    setItemKind(kind);
    if (kind === "all") {
      setItemId(`${kind}:${id}`);
    } else {
      setItemId(String(id));
    }
  }, []);

  const selectActor = useCallback((id: number) => {
    setActorId(String(id));
    setSkillActorId(String(id));
    const name = NwrGuiCatalog.catalogName(catalogs, "actor", id);
    if (name) setActorName(name);
  }, [catalogs]);

  const selectSkill = useCallback((id: number) => {
    setSkillId(String(id));
  }, []);

  const selectVariable = useCallback((id: number) => {
    setVariableId(String(id));
  }, []);

  const selectSwitch = useCallback((id: number, value = true) => {
    setSwitchId(String(id));
    setSwitchValue(value);
  }, []);

  const selectMap = useCallback((id: number) => {
    setMapId(String(id));
  }, []);

  const selectCommonEvent = useCallback((id: number) => {
    setCommonEventId(String(id));
  }, []);

  const addItem = useCallback((kind: string, id: number) => {
    selectItem(kind, id);
    sendCommand(NwrGuiBridgeCommands.itemAdd(kind, id, itemAmount));
  }, [itemAmount, selectItem, sendCommand]);

  const unlockActor = useCallback((id: number) => {
    selectActor(id);
    sendCommand(NwrGuiBridgeCommands.actorUnlock(id));
  }, [selectActor, sendCommand]);

  const setActorNameCmd = useCallback((id: number) => {
    const name = actorName.trim();
    if (!name) {
      showToast("请输入角色名称");
      return;
    }
    sendCommand(NwrGuiBridgeCommands.actorNameSet(id, name));
  }, [actorName, sendCommand, showToast]);

  const learnSkill = useCallback((id: number) => {
    selectSkill(id);
    sendCommand(NwrGuiBridgeCommands.actorSkillLearn(skillActor(), id));
  }, [selectSkill, sendCommand, skillActor]);

  const forgetSkill = useCallback((id: number) => {
    selectSkill(id);
    sendCommand(NwrGuiBridgeCommands.actorSkillForget(skillActor(), id));
  }, [selectSkill, sendCommand, skillActor]);

  const setVariable = useCallback((id: number) => {
    selectVariable(id);
    sendCommand(NwrGuiBridgeCommands.variableSet(id, parseValue(variableValue)));
  }, [parseValue, selectVariable, sendCommand, variableValue]);

  const setSwitch = useCallback((id: number, value: boolean) => {
    selectSwitch(id, value);
    sendCommand(NwrGuiBridgeCommands.switchSet(id, value));
  }, [selectSwitch, sendCommand]);

  const transferMap = useCallback((id: number) => {
    selectMap(id);
    sendCommand(NwrGuiBridgeCommands.mapTransfer(
      id,
      mapX,
      mapY,
      mapDirection,
      mapFade
    ));
  }, [mapDirection, mapFade, mapX, mapY, selectMap, sendCommand]);

  const runCommonEvent = useCallback((id: number) => {
    selectCommonEvent(id);
    sendCommand(NwrGuiBridgeCommands.commonEventRun(id));
  }, [selectCommonEvent, sendCommand]);

  const sendOptions = useCallback((options: Record<string, unknown>) => {
    sendCommand(NwrGuiBridgeCommands.trainerOptionsSet(options));
  }, [sendCommand]);

  const handleCatalogAction = useCallback((kind: string, id: number, action: string) => {
    if (action === "item-add") addItem(kind, id);
    else if (action === "skill-learn") learnSkill(id);
    else if (action === "skill-forget") forgetSkill(id);
    else if (action === "actor-unlock") unlockActor(id);
    else if (action === "actor-select") selectActor(id);
    else if (action === "variable-select") selectVariable(id);
    else if (action === "variable-set") setVariable(id);
    else if (action === "switch-on") setSwitch(id, true);
    else if (action === "switch-off") setSwitch(id, false);
    else if (action === "map-transfer") transferMap(id);
    else if (action === "common-event-run") runCommonEvent(id);
  }, [addItem, learnSkill, forgetSkill, unlockActor, selectActor, selectVariable, setVariable, setSwitch, transferMap, runCommonEvent]);

  const handleCatalogSelect = useCallback((kind: string, id: number) => {
    if (kind === "item" || kind === "weapon" || kind === "armor") selectItem(kind, id);
    else if (kind === "skill") selectSkill(id);
    else if (kind === "actor") selectActor(id);
    else if (kind === "variable") selectVariable(id);
    else if (kind === "switch") selectSwitch(id, switchValue);
    else if (kind === "map") selectMap(id);
    else if (kind === "commonEvent") selectCommonEvent(id);
  }, [selectItem, selectSkill, selectActor, selectVariable, selectSwitch, selectMap, selectCommonEvent, switchValue]);

  const recordCurrentPosition = useCallback(() => {
    const record = runtimeState as { currentMap?: { mapId?: unknown; x?: unknown; y?: unknown; direction?: unknown } } | null;
    const map = record?.currentMap;
    if (!map || !map.mapId) {
      showToast("还没有读取到当前位置");
      return;
    }
    const pos = {
      mapId: Number(map.mapId),
      x: Number(map.x || 0),
      y: Number(map.y || 0),
      direction: Number(map.direction || 2),
      fade: 0
    };
    setRecordedPosition(pos);
    setRecordedText(`${pos.mapId} (${pos.x}, ${pos.y})`);
    setMapId(String(pos.mapId));
    setMapX(pos.x);
    setMapY(pos.y);
    setMapDirection(pos.direction);
    setMapFade(pos.fade);
    showToast("已记录当前位置");
  }, [runtimeState, showToast]);

  const returnRecordedPosition = useCallback(() => {
    if (!recordedPosition) {
      showToast("还没有记录位置");
      return;
    }
    setMapId(String(recordedPosition.mapId));
    setMapX(recordedPosition.x);
    setMapY(recordedPosition.y);
    setMapDirection(recordedPosition.direction);
    setMapFade(recordedPosition.fade);
    transferMap(recordedPosition.mapId);
  }, [recordedPosition, transferMap, showToast]);

  const applyRuntimeState = useCallback((state: unknown) => {
    setRuntimeState(state);
    const view = NwrGuiRuntimeState.stateView(state, { expectedBridgeVersion: EXPECTED_BRIDGE_VERSION });
    setRuntimeView(view);
    if (view.fresh) {
      const options = (state as Record<string, unknown> | null)?.trainerOptions as Record<string, unknown> | undefined;
      if (options) {
        if (options.expRate != null) setExpRate(Number(options.expRate));
        if (options.goldRate != null) setGoldRate(Number(options.goldRate));
        if (options.dropRate != null) setDropRate(Number(options.dropRate));
        if (options.noSkillCost != null) setNoCost(Boolean(options.noSkillCost));
        if (options.oneHitKill != null) setOneHitKill(Boolean(options.oneHitKill));
        if (options.invincible != null) setInvincible(Boolean(options.invincible));
      }
    }
  }, []);

  const refresh = useCallback(() => {
    const state = readJson(bridgePaths.statePath);
    applyRuntimeState(state);

    try {
      const size = NwrGuiBridgeIO.eventSize(fs, bridgePaths);
      if (size !== lastEventSize) {
        setLastEventSize(size);
        const evts = NwrGuiBridgeIO.readEvents(fs, bridgePaths);
        setEvents(evts);
        processRuntimeIconEvents(evts);
      }
    } catch {
      setEvents([]);
    }
  }, [applyRuntimeState, lastEventSize]);

  const processRuntimeIconEvents = useCallback((events: readonly unknown[]) => {
    for (const value of events.slice().reverse()) {
      const event = bridgeEventRecord(value);
      if (!event || event.type !== "asset.iconSet.export") continue;
      if (event.ok === false) {
        iconExportRequested = false;
        return;
      }
      const payload = bridgeEventRecord(event.payload);
      if (payload && payload.scheduled === true) {
        iconExportRequested = true;
        return;
      }
      iconExportRequested = false;
      if (!iconExportCompleted) {
        iconExportCompleted = true;
        setupIconSet(() => setIconRenderVersion((v) => v + 1));
      }
      return;
    }
  }, []);

  const maybeRequestRuntimeIconExport = useCallback((state: RuntimeStateRecord | null) => {
    if (iconExportCompleted || iconExportRequested || exportedIconSetReady() || hasIconSet()) return;
    if (!state || state.hasDataManager !== true) return;
    const now = Date.now();
    if (now - iconExportLastAttemptMs < ICON_EXPORT_RETRY_MS) return;
    iconExportRequested = true;
    iconExportLastAttemptMs = now;
    sendCommand({ type: "asset.iconSet.export" }, "runtimeIconExport", { silent: true });
  }, [sendCommand]);

  const activateTab = useCallback((tab: string) => {
    setActiveToolTab(tab);
  }, []);

  const activateSection = useCallback((section: string) => {
    setActiveToolSections((prev) => ({ ...prev, [activeToolTab]: section }));
  }, [activeToolTab]);

  useEffect(() => {
    const interval = setInterval(refresh, 700);
    refresh();
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    maybeRequestRuntimeIconExport(runtimeState as RuntimeStateRecord | null);
  }, [runtimeState, maybeRequestRuntimeIconExport]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = NwrGuiCatalogLoader.loadCatalogs(fs, path, dataDir);
      setCatalogs(loaded);
      setCatalogsLoaded(true);
      setupIconSet(() => setIconRenderVersion((v) => v + 1));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const renderCatalogList = useCallback((kind: keyof NwrGuiCatalog.Catalogs, options: NwrGuiCatalogUi.CatalogListOptions) => {
    const targetId = `${kind}List`;
    const previous = catalogViews.get(targetId);
    const view = NwrGuiCatalogUi.createCatalogView({
      targetId,
      previousView: previous,
      sourceEntries: catalogs[kind] || [],
      options,
      pager: catalogPager
    });
    catalogViews.set(targetId, view);
    return view;
  }, [catalogs]);

  const catalogView = useCallback((kind: keyof NwrGuiCatalog.Catalogs, options: NwrGuiCatalogUi.CatalogListOptions) => {
    return renderCatalogList(kind, options);
  }, [renderCatalogList]);

  const changeCatalogPage = useCallback((kind: string, action: NwrGuiCatalogUi.CatalogPageAction) => {
    const targetId = `${kind}List`;
    const view = catalogViews.get(targetId);
    if (!view) return;
    if (!NwrGuiCatalogUi.changeCatalogPage(catalogPager, view, action)) return;
  }, []);

  const routeModel = useMemo(() => NwrGuiRuntimeRoutes.diagnosticModel(selectedRuntimeRoute), [selectedRuntimeRoute]);

  return {
    toast,
    runtimeView,
    events,
    catalogs,
    catalogsLoaded,
    iconRenderVersion,
    activeToolTab,
    activeToolSections,
    selectedRuntimeRoute,
    setSelectedRuntimeRoute,
    launchGame,
    openPreparedGame,
    refresh,
    openBridgeFolder,
    openSaveFolder,
    handleBackupSaves,
    clearEvents,
    activateTab,
    activateSection,
    gameProcess,
    routeModel,
    // form state
    goldValue, setGoldValue,
    expRate, setExpRate,
    goldRate, setGoldRate,
    dropRate, setDropRate,
    noCost, setNoCost,
    oneHitKill, setOneHitKill,
    invincible, setInvincible,
    variableId, setVariableId,
    variableValue, setVariableValue,
    variableSearch, setVariableSearch,
    switchId, setSwitchId,
    switchValue, setSwitchValue,
    switchSearch, setSwitchSearch,
    itemKind, setItemKind,
    itemSearch, setItemSearch,
    itemAmount, setItemAmount,
    itemId, setItemId,
    actorSearch, setActorSearch,
    actorId, setActorId,
    actorName, setActorName,
    actorLevel, setActorLevel,
    actorExp, setActorExp,
    actorHp, setActorHp,
    actorMp, setActorMp,
    actorTp, setActorTp,
    paramId, setParamId,
    paramValue, setParamValue,
    actorPointClassId, setActorPointClassId,
    actorSpValue, setActorSpValue,
    actorAllocationPointValue, setActorAllocationPointValue,
    skillActorId, setSkillActorId,
    skillSearch, setSkillSearch,
    skillId, setSkillId,
    mapSearch, setMapSearch,
    mapId, setMapId,
    mapX, setMapX,
    mapY, setMapY,
    mapDirection, setMapDirection,
    mapFade, setMapFade,
    commonEventSearch, setCommonEventSearch,
    commonEventId, setCommonEventId,
    customCommand, setCustomCommand,
    saveSlot, setSaveSlot,
    recordedText,
    // commands
    sendCommand,
    sendDiagnosticCommand,
    sendOptions,
    setActorNameCmd,
    addItem,
    unlockActor,
    learnSkill,
    forgetSkill,
    setVariable,
    setSwitch,
    transferMap,
    runCommonEvent,
    recordCurrentPosition,
    returnRecordedPosition,
    // helpers
    numberValue,
    optionalNumber,
    activeActorId,
    skillActor,
    actorPointClass,
    parseItemSelection,
    itemSelectionKey,
    selectItem,
    selectActor,
    selectSkill,
    selectVariable,
    selectSwitch,
    selectMap,
    selectCommonEvent,
    handleCatalogAction,
    handleCatalogSelect,
    catalogView,
    changeCatalogPage,
    formatNumber,
    parseValue,
    showToast
  };
}

let iconExportRequested = false;
let iconExportCompleted = false;
let iconExportLastAttemptMs = 0;
const ICON_EXPORT_RETRY_MS = 5000;
const catalogViews = new Map<string, NwrGuiCatalogUi.MutableCatalogView>();

function bridgeEventRecord(value: unknown): BridgeEventRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as BridgeEventRecord : null;
}

export { NwrGuiCatalog, NwrGuiCatalogUi, NwrGuiCatalogTools, NwrGuiRuntimeEvents, NwrGuiToolNavigation, iconHtml, actorAvatarHtml, badgeHtml };

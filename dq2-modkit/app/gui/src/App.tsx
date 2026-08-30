import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardTitle, cn } from "@rpgmv-modkit/ui";
import { usePolling } from "./hooks/usePolling";
import { AppProvider, useApp } from "./AppContext";
import { launchGame, backupSaves, clearEvents, openFolder, bridgeDir, saveDir, EXPECTED_BRIDGE_VERSION, setupIconSet } from "./lib/bridge";
import { formatNumber } from "./lib/utils";
import { catalogs } from "./lib/catalog";
import { GoldPanel } from "./components/panels/GoldPanel";
import { RatePanel } from "./components/panels/RatePanel";
import { BattlePanel } from "./components/panels/BattlePanel";
import { SavePanel } from "./components/panels/SavePanel";
import { VariablePanel } from "./components/panels/VariablePanel";
import { SwitchPanel } from "./components/panels/SwitchPanel";
import { EnemyBookPanel } from "./components/panels/EnemyBookPanel";
import { ItemPanel } from "./components/panels/ItemPanel";
import { ActorPanel } from "./components/panels/ActorPanel";
import { SkillPanel } from "./components/panels/SkillPanel";
import { FishingPanel } from "./components/panels/FishingPanel";
import { OfflineHuntPanel } from "./components/panels/OfflineHuntPanel";
import { MapPanel } from "./components/panels/MapPanel";
import { CommonEventPanel } from "./components/panels/CommonEventPanel";
import { CustomCommandPanel } from "./components/panels/CustomCommandPanel";
import type { ToolTab, CatalogEntry } from "./types";

const tabs: { key: ToolTab; label: string }[] = [
  { key: "core", label: "常用" },
  { key: "catalog", label: "物品角色" },
  { key: "fishing", label: "钓鱼" },
  { key: "offline", label: "脱机挂机" },
  { key: "world", label: "地图事件" },
  { key: "misc", label: "杂项" },
  { key: "debug", label: "调试" },
];

const sectionMap: Record<ToolTab, { section: string; label: string; Panel: React.FC }[]> = {
  core: [
    { section: "gold", label: "金币", Panel: GoldPanel },
    { section: "rate", label: "倍率", Panel: RatePanel },
    { section: "battle", label: "战斗", Panel: BattlePanel },
    { section: "save", label: "存档", Panel: SavePanel },
  ],
  catalog: [
    { section: "item", label: "物品", Panel: ItemPanel },
    { section: "actor", label: "角色编辑", Panel: ActorPanel },
    { section: "skill", label: "技能", Panel: SkillPanel },
  ],
  fishing: [
    { section: "power", label: "钓力", Panel: FishingPanel },
    { section: "resource", label: "鱼具资源", Panel: FishingPanel },
    { section: "catch", label: "直接钓鱼", Panel: FishingPanel },
  ],
  offline: [
    { section: "map", label: "地图挂机", Panel: OfflineHuntPanel },
    { section: "troop", label: "敌群挂机", Panel: OfflineHuntPanel },
  ],
  world: [
    { section: "map", label: "地图传送", Panel: MapPanel },
    { section: "commonEvent", label: "公共事件", Panel: CommonEventPanel },
  ],
  misc: [
    { section: "variable", label: "变量", Panel: VariablePanel },
    { section: "switch", label: "开关", Panel: SwitchPanel },
    { section: "enemyBook", label: "敌人图鉴", Panel: EnemyBookPanel },
  ],
  debug: [{ section: "command", label: "自定义命令", Panel: CustomCommandPanel }],
};

function StatusPill() {
  const { state, fresh } = useApp();
  const version = state?.bridgeVersion || "?";
  const versionOk = version === EXPECTED_BRIDGE_VERSION;

  let kind = "idle";
  let text = "未连接";
  if (!state) {
    kind = "idle";
    text = "未连接";
  } else if (!fresh) {
    kind = "idle";
    text = "离线";
  } else if (!versionOk) {
    kind = "error";
    text = "需重启";
  } else if (state.lastError) {
    kind = "error";
    text = "有错误";
  } else if (state.hasParty) {
    kind = "online";
    text = "已连接";
  } else {
    kind = "idle";
    text = "加载中";
  }

  const colors = {
    idle: "border-slate-200 bg-slate-50 text-slate-500",
    online: "border-teal-200 bg-teal-50 text-teal-700",
    error: "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <div className={cn("grid place-items-center min-w-[96px] min-h-[34px] px-3 rounded-full border text-sm font-bold", colors[kind as keyof typeof colors])}>
      {text}
    </div>
  );
}

function Sidebar() {
  const { state, showToast } = useApp();
  const version = state?.bridgeVersion || "?";
  const versionOk = version === EXPECTED_BRIDGE_VERSION;
  const age = state?.ts ? Date.now() - state.ts : Number.POSITIVE_INFINITY;
  const fresh = age >= 0 && age < 5000;
  const currentMap = state?.currentMap;

  const files = Array.isArray(state?.saveFiles) ? state.saveFiles : [];
  const members = Array.isArray(state?.partyMembers) ? state.partyMembers : [];

  function handleLaunch() {
    try {
      const proc = launchGame();
      showToast(proc ? `游戏已启动 PID ${proc.pid}` : "启动失败");
    } catch (error: any) {
      showToast(error.message || String(error));
    }
  }

  function handleBackup() {
    try {
      const target = backupSaves();
      showToast("存档已备份");
      openFolder(target);
    } catch (error: any) {
      showToast(error.message || String(error));
    }
  }

  return (
    <div className="grid gap-3 min-h-0">
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="text-xs font-extrabold text-teal-700 tracking-widest">LOCAL RUNTIME BRIDGE</div>
          <h1 className="text-2xl font-bold text-slate-900">大千世界2 修改器</h1>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <CardTitle className="text-sm font-extrabold text-slate-800 mb-3">运行状态</CardTitle>
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <dt className="text-slate-500">Bridge</dt>
              <dd className="truncate">
                {fresh ? `${state?.storagePatched ? "已接入" : "已注入"} v${version}${versionOk ? "" : ` -> v${EXPECTED_BRIDGE_VERSION}`}` : "上次状态"}
              </dd>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-slate-100 pt-2">
              <dt className="text-slate-500">队伍对象</dt>
              <dd className="truncate">{state?.hasParty ? "可用" : "未就绪"}</dd>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-slate-100 pt-2">
              <dt className="text-slate-500">当前金币</dt>
              <dd className="truncate">{formatNumber(state?.gold)}</dd>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-slate-100 pt-2">
              <dt className="text-slate-500">存档目录</dt>
              <dd className="truncate">{state?.saveDirExists ? "已识别" : "缺失"}</dd>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-slate-100 pt-2">
              <dt className="text-slate-500">当前位置</dt>
              <dd className="truncate">
                {currentMap?.mapId ? `${currentMap.mapId} (${currentMap.x ?? "-"}, ${currentMap.y ?? "-"})${currentMap.through ? " / 穿墙" : ""}` : "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <CardTitle className="text-sm font-extrabold text-slate-800 mb-3">队伍</CardTitle>
          <ul className="space-y-2 max-h-48 overflow-auto">
            {members.length ? members.map((actor, i) => {
              const vitals = `Lv.${actor.level || "-"} HP ${actor.hp ?? "-"}/${actor.mhp ?? "-"} MP ${actor.mp ?? "-"}/${actor.mmp ?? "-"}`;
              return (
                <li key={i} className="border border-slate-200 rounded-lg bg-slate-50 p-2 text-sm">
                  <strong className="block">{actor.id} / {actor.name || ""}</strong>
                  <span className="block text-xs text-slate-500 mt-0.5">{vitals}</span>
                </li>
              );
            }) : <li className="text-sm text-slate-500">未检测到</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <CardTitle className="text-sm font-extrabold text-slate-800 mb-3">文件</CardTitle>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => openFolder(bridgeDir)}>打开 Bridge 日志</Button>
            <Button variant="outline" onClick={() => openFolder(saveDir)}>打开存档目录</Button>
            <Button variant="outline" onClick={handleBackup}>备份存档</Button>
            <Button variant="outline" onClick={() => { clearEvents(); showToast("事件已清空"); }}>清空事件</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        <CardContent className="p-3 min-h-0">
          <CardTitle className="text-sm font-extrabold text-slate-800 mb-3">检测到的存档</CardTitle>
          <ul className="space-y-2 max-h-full overflow-auto text-sm">
            {files.length ? files.map((name, i) => <li key={i} className="border border-slate-200 rounded-lg bg-slate-50 p-2">{name}</li>) : <li className="text-slate-500">未检测到</li>}
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleLaunch}>启动游戏</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>刷新</Button>
      </div>
    </div>
  );
}

function ToolSectionNav() {
  const { activeTab, activeSections, setActiveSection } = useApp();
  const sections = sectionMap[activeTab];
  if (!sections || sections.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-slate-200 rounded-lg bg-white/90 p-1.5 shadow-sm">
      {sections.map((item) => (
        <Button
          key={item.section}
          type="button"
          variant={activeSections[activeTab] === item.section ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection(activeTab, item.section)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

function EventList() {
  const { events } = useApp();
  const latest = useMemo(() => events.slice(-40).reverse(), [events]);
  return (
    <Card className="min-h-0 overflow-hidden">
      <CardContent className="p-3 min-h-0">
        <CardTitle className="text-sm font-extrabold text-slate-800 mb-3">事件</CardTitle>
        <div className="space-y-2 max-h-40 overflow-auto text-sm">
          {latest.length ? latest.map((event, i) => {
            const time = new Date(event.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false });
            const ok = event.ok !== false;
            const payload = event.payload ? JSON.stringify(event.payload) : "";
            return (
              <div key={i} className={cn("grid grid-cols-[80px_1fr] gap-2 rounded-lg p-2 border-l-4", ok ? "border-l-teal-600 bg-slate-50" : "border-l-orange-700 bg-orange-50")}>
                <div className="text-slate-500 font-mono text-xs">{time}</div>
                <div className="break-all">{event.type || "event"} {ok ? "OK" : "FAIL"} {payload}</div>
              </div>
            );
          }) : <div className="text-slate-500">暂无事件</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Workspace() {
  const { activeTab, setActiveTab, activeSections, offlineHuntMode } = useApp();
  const activeSection = activeSections[activeTab];
  const Panel = sectionMap[activeTab]?.find((s) => s.section === activeSection)?.Panel;

  return (
    <div className="grid grid-rows-[auto_auto_1fr_auto] gap-3 min-h-0">
      <div className="flex flex-wrap gap-1.5 border border-slate-200 rounded-lg bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={activeTab === tab.key ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <ToolSectionNav />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto min-h-0 content-start pr-0.5">
        {Panel ? <Panel /> : null}
      </div>
      <EventList />
    </div>
  );
}

function AppInner() {
  const { toast } = useApp();

  return (
    <div className="grid grid-rows-[auto_1fr] h-screen min-w-0 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 min-h-[76px] px-5 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div>
          <div className="text-xs font-extrabold text-teal-700 tracking-widest">LOCAL RUNTIME BRIDGE</div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">大千世界2 修改器</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill />
          <Button onClick={() => window.location.reload()} variant="outline">刷新</Button>
        </div>
      </header>

      <section className="grid grid-cols-[clamp(270px,23vw,318px)_1fr] gap-3 min-h-0 p-3">
        <Sidebar />
        <Workspace />
      </section>

      <div className={cn("fixed right-5 bottom-5 z-50 max-w-md rounded-lg border border-blue-200 bg-white p-3 shadow-lg transition-all", toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none")}>
        {toast}
      </div>
    </div>
  );
}

export default function App() {
  const { state, events, fresh } = usePolling(700);
  const [iconReady, setIconReady] = useState(false);

  useEffect(() => {
    setupIconSet(() => setIconReady(true));
  }, []);

  return (
    <AppProvider state={state} events={events} fresh={fresh}>
      <AppInner />
    </AppProvider>
  );
}

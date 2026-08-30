import { Card, CardContent, CardHeader, CardTitle } from "@rpgmv-modkit/ui";
import { useAppState, tabs, defaultSections } from "./hooks/useAppState";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { ToolNav } from "./components/ToolNav";
import { SectionNav } from "./components/SectionNav";
import { GoldPanel, RatesPanel, BattlePanel, SavePanel } from "./components/panels/CorePanels";
import { ItemPanel, ActorPanel, SkillPanel, TalentPanel } from "./components/panels/CatalogPanels";
import { BabySkillPanel, BabyListPanel } from "./components/panels/BabyPanels";
import { TitlePanel, CostumePanel } from "./components/panels/ProgressPanels";
import { OfflineHuntPanel, OfflineHuntMapPanel, OfflineHuntTroopPanel } from "./components/panels/OfflinePanels";
import { MapPanel, CommonEventPanel } from "./components/panels/WorldPanels";
import { VariablePanel, SwitchPanel, EnemyBookPanel } from "./components/panels/MiscPanels";
import { DebugPanel } from "./components/panels/DebugPanel";
import { cn } from "@rpgmv-modkit/ui";

const sectionDefs: Record<string, { key: string; label: string }[]> = {
  core: [
    { key: "gold", label: "金币" },
    { key: "rate", label: "倍率" },
    { key: "battle", label: "战斗" },
    { key: "save", label: "存档" }
  ],
  catalog: [
    { key: "item", label: "物品" },
    { key: "actor", label: "角色编辑" },
    { key: "skill", label: "技能" },
    { key: "talent", label: "天赋点" }
  ],
  baby: [
    { key: "skill", label: "宝宝技能" },
    { key: "list", label: "宝宝列表" }
  ],
  progress: [
    { key: "title", label: "称号" },
    { key: "costume", label: "换装" }
  ],
  offline: [
    { key: "map troop", label: "脱机挂机" },
    { key: "map", label: "挂机地图" },
    { key: "troop", label: "敌群挂机" }
  ],
  world: [
    { key: "map", label: "地图传送" },
    { key: "commonEvent", label: "公共事件" }
  ],
  misc: [
    { key: "variable", label: "变量" },
    { key: "switch", label: "开关" },
    { key: "enemyBook", label: "敌人图鉴" }
  ],
  debug: [
    { key: "command", label: "自定义命令" }
  ]
};

export default function App() {
  const app = useAppState();

  const renderDatalists = () => {
    if (!app.core) return null;
    const { catalogs } = app.core;
    const opts = (entries: any[], key: string) => entries.map((e) => <option key={`${key}-${e.id}`} value={e.value != null ? e.value : e.id} label={e.label || e.name} />);
    return (
      <>
        <datalist id="allOptions">{opts(catalogs.all || [], "all")}</datalist>
        <datalist id="itemOptions">{opts(catalogs.item || [], "item")}</datalist>
        <datalist id="weaponOptions">{opts(catalogs.weapon || [], "weapon")}</datalist>
        <datalist id="armorOptions">{opts(catalogs.armor || [], "armor")}</datalist>
        <datalist id="actorOptions">{opts(catalogs.actor || [], "actor")}</datalist>
        <datalist id="skillOptions">{opts(catalogs.skill || [], "skill")}</datalist>
        <datalist id="babyOptions">{opts((app.babyData || []).map((row: any) => ({ id: row.id, value: row.id, label: `${row.id} / ${row.name || "宝宝"} Lv.${row.level ?? "-"}` })), "baby")}</datalist>
        <datalist id="titleOptions">{opts(catalogs.title || [], "title")}</datalist>
        <datalist id="costumeOptions">{opts(catalogs.costume || [], "costume")}</datalist>
        <datalist id="variableOptions">{opts(catalogs.variable || [], "variable")}</datalist>
        <datalist id="switchOptions">{opts(catalogs.switch || [], "switch")}</datalist>
        <datalist id="mapOptions">{opts(catalogs.map || [], "map")}</datalist>
        <datalist id="offlineHuntMapOptions">{opts(catalogs.huntMap || [], "huntMap")}</datalist>
        <datalist id="offlineHuntTroopOptions">{opts(catalogs.troop || [], "troop")}</datalist>
        <datalist id="commonEventOptions">{opts(catalogs.commonEvent || [], "commonEvent")}</datalist>
      </>
    );
  };

  const renderPanels = () => {
    const common = {
      state: app.state,
      setField: app.setField,
      core: app.core,
      numberValue: app.numberValue,
      optionalNumber: app.optionalNumber,
      latestState: app.latestState
    };

    const panels: Record<string, React.ReactNode> = {
      core: (
        <>
          {app.activeSection === "gold" && <GoldPanel {...common} latestState={app.latestState} through={app.through} />}
          {app.activeSection === "rate" && <RatesPanel {...common} latestState={app.latestState} through={app.through} />}
          {app.activeSection === "battle" && <BattlePanel {...common} latestState={app.latestState} through={app.through} />}
          {app.activeSection === "save" && <SavePanel {...common} latestState={app.latestState} through={app.through} />}
        </>
      ),
      catalog: (
        <>
          {app.activeSection === "item" && <ItemPanel {...common} selectedItem={app.selectedItem} iconRenderer={app.core?.iconRenderer} />}
          {app.activeSection === "actor" && <ActorPanel {...common} selectedItem={app.selectedItem} iconRenderer={app.core?.iconRenderer} />}
          {app.activeSection === "skill" && <SkillPanel {...common} selectedItem={app.selectedItem} iconRenderer={app.core?.iconRenderer} />}
          {app.activeSection === "talent" && <TalentPanel {...common} latestState={app.latestState} iconRenderer={app.core?.iconRenderer} />}
        </>
      ),
      baby: (
        <>
          {app.activeSection === "skill" && <BabySkillPanel {...common} babyData={app.babyData} iconRenderer={app.core?.iconRenderer} />}
          {app.activeSection === "list" && <BabyListPanel {...common} babyData={app.babyData} iconRenderer={app.core?.iconRenderer} />}
        </>
      ),
      progress: (
        <>
          {app.activeSection === "title" && <TitlePanel {...common} />}
          {app.activeSection === "costume" && <CostumePanel {...common} />}
        </>
      ),
      offline: (
        <>
          {(app.activeSection === "map troop" || app.activeSection === "map" || app.activeSection === "troop") && (
            <OfflineHuntPanel
              {...common}
              offlineMode={app.offlineMode}
              setOfflineMode={app.setOfflineMode}
              disabled={app.offlineHuntDisabled}
            />
          )}
          {app.activeSection === "map" && <OfflineHuntMapPanel {...common} offlineMode={app.offlineMode} setOfflineMode={app.setOfflineMode} disabled={app.offlineHuntDisabled} />}
          {app.activeSection === "troop" && <OfflineHuntTroopPanel {...common} offlineMode={app.offlineMode} setOfflineMode={app.setOfflineMode} disabled={app.offlineHuntDisabled} />}
        </>
      ),
      world: (
        <>
          {app.activeSection === "map" && <MapPanel {...common} through={app.through} onRecordPosition={app.recordCurrentPosition} onReturnPosition={app.returnRecordedPosition} />}
          {app.activeSection === "commonEvent" && <CommonEventPanel state={app.state} setField={app.setField} core={app.core} numberValue={app.numberValue} />}
        </>
      ),
      misc: (
        <>
          {app.activeSection === "variable" && <VariablePanel state={app.state} setField={app.setField} core={app.core} numberValue={app.numberValue} />}
          {app.activeSection === "switch" && <SwitchPanel state={app.state} setField={app.setField} core={app.core} numberValue={app.numberValue} />}
          {app.activeSection === "enemyBook" && <EnemyBookPanel core={app.core} />}
        </>
      ),
      debug: (
        <>
          {app.activeSection === "command" && <DebugPanel state={app.state} setField={app.setField} onSend={app.sendJsonCommand} />}
        </>
      )
    };
    return panels[app.activeTab] || null;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar status={app.status} onLaunch={app.launchGame} onRefresh={app.refresh} />
      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-3 p-3 overflow-hidden">
        <Sidebar
          state={app.latestState}
          onOpenBridge={app.openBridgeLog}
          onOpenSave={app.openSaveDir}
          onBackup={app.backupSaves}
          onClearEvents={app.clearEvents}
        />
        <div className="flex flex-col min-h-0 gap-3">
          <ToolNav tabs={tabs} activeTab={app.activeTab} onTabChange={app.setActiveTab} />
          <SectionNav sections={sectionDefs[app.activeTab]} activeSection={app.activeSection} onSectionChange={app.setActiveSection} />
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-3">
              {renderPanels()}
            </div>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">事件</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-auto">
                {app.events.length ? app.events.map((event, i) => {
                  const time = new Date(event.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false });
                  const ok = event.ok !== false;
                  const payload = event.payload ? JSON.stringify(event.payload) : "";
                  return (
                    <div key={i} className={cn("text-xs border-l-4 rounded-md p-2", ok ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")}>
                      <span className="text-muted-foreground font-mono mr-2">{time}</span>
                      {event.type || "event"} {ok ? "OK" : "FAIL"} {payload}
                    </div>
                  );
                }) : <div className="text-sm text-muted-foreground">暂无事件</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {renderDatalists()}

      <div className={cn(
        "fixed right-4 bottom-4 z-50 max-w-md border-l-4 rounded-lg px-4 py-3 shadow-lg transition-all",
        app.toast.show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        app.toast.kind === "success" && "border-green-600 bg-green-50",
        app.toast.kind === "warning" && "border-amber-600 bg-amber-50",
        app.toast.kind === "error" && "border-red-600 bg-red-50",
        app.toast.kind === "info" && "border-primary bg-background"
      )}>
        {app.toast.message}
      </div>
    </div>
  );
}

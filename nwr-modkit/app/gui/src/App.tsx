import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Separator, Switch, Textarea, cn } from "@rpgmv-modkit/ui";
import { useAppState, iconHtml, actorAvatarHtml, badgeHtml, NwrGuiCatalog, NwrGuiCatalogUi, NwrGuiCatalogTools, NwrGuiRuntimeEvents } from "./hooks/useAppState";
import * as NwrGuiPrisonGuards from "./prison-guard-view";
import * as NwrGuiToolNavigation from "./tool-navigation";
import * as NwrGuiRuntimeRoutes from "./runtime-routes";
import * as NwrGuiBridgeCommands from "./bridge-commands";
import { preparedGameReady } from "./lib/env";

const tabs = [
  { id: "core", label: "常用" },
  { id: "catalog", label: "物品角色" },
  { id: "world", label: "地图事件" },
  { id: "misc", label: "杂项" },
  { id: "debug", label: "调试" }
];

export default function App() {
  const state = useAppState();
  const { runtimeView, events, activeToolTab, activeToolSections, activateTab, activateSection, routeModel, toast } = state;

  const panelSnapshots = [
    { tab: "core", sectionText: "gold", label: "积分", navEnabled: true, modePanel: "" },
    { tab: "core", sectionText: "prison", label: "小黑屋", navEnabled: true, modePanel: "" },
    { tab: "core", sectionText: "rate", label: "倍率", navEnabled: true, modePanel: "" },
    { tab: "core", sectionText: "battle", label: "战斗", navEnabled: true, modePanel: "" },
    { tab: "core", sectionText: "save", label: "存档", navEnabled: true, modePanel: "" },
    { tab: "catalog", sectionText: "item", label: "物品", navEnabled: true, modePanel: "" },
    { tab: "catalog", sectionText: "actor", label: "角色编辑", navEnabled: true, modePanel: "" },
    { tab: "catalog", sectionText: "skill", label: "技能", navEnabled: true, modePanel: "" },
    { tab: "world", sectionText: "map", label: "地图传送", navEnabled: true, modePanel: "" },
    { tab: "world", sectionText: "commonEvent", label: "公共事件", navEnabled: true, modePanel: "" },
    { tab: "misc", sectionText: "variable", label: "变量", navEnabled: true, modePanel: "" },
    { tab: "misc", sectionText: "switch", label: "开关", navEnabled: true, modePanel: "" },
    { tab: "debug", sectionText: "diagnostics", label: "诊断", navEnabled: true, modePanel: "" },
    { tab: "debug", sectionText: "command", label: "自定义命令", navEnabled: true, modePanel: "" }
  ];

  const sections = NwrGuiToolNavigation.sectionsForTab(panelSnapshots, activeToolTab);
  const activeSection = activeToolSections[activeToolTab] || sections[0]?.section || "";

  const visiblePanel = (tab: string, section: string) => {
    return tab === activeToolTab && section === activeSection;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-accent-foreground">LOCAL RUNTIME BRIDGE</div>
            <h1 className="text-2xl font-bold">梦魇：无归 修改器</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("rounded-full border px-3 py-1 text-sm font-semibold", runtimeView.status.className)}>
              {runtimeView.status.text}
            </div>
            <div className="flex min-w-[16rem] flex-col gap-1">
              <Select id="runtimeRoute" value={routeModel.routeName} onChange={(e) => state.setSelectedRuntimeRoute(e.currentTarget.value)} className="font-semibold">
                {NwrGuiRuntimeRoutes.routeOptions().map((route) => (
                  <option key={route.name} value={route.name}>{route.label}</option>
                ))}
              </Select>
              <span className="text-xs text-muted-foreground">{routeModel.riskNote}</span>
            </div>
            <Button id="launchBtn" onClick={state.launchGame} disabled={!!state.gameProcess}>准备桥接</Button>
            <Button id="openPreparedGameBtn" onClick={state.openPreparedGame} disabled={!preparedGameReady()}>打开游戏</Button>
            <Button id="refreshBtn" variant="outline" onClick={state.refresh}>刷新</Button>
          </div>
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[320px_1fr]">
        <Sidebar state={state} />

        <section className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-2">
              <div className="grid grid-cols-5 gap-1">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    data-tool-tab={tab.id}
                    variant={activeToolTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {sections.length > 1 && (
            <Card id="toolSectionNav">
              <CardContent className="flex flex-wrap gap-1 p-2">
                {sections.map((section) => (
                  <Button
                    key={section.section}
                    variant={activeSection === section.section ? "default" : "ghost"}
                    size="sm"
                    onClick={() => activateSection(section.section)}
                  >
                    {section.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visiblePanel("core", "gold") && <GoldPanel state={state} />}
            {visiblePanel("core", "prison") && <PrisonPanel state={state} />}
            {visiblePanel("core", "rate") && <RatePanel state={state} />}
            {visiblePanel("core", "battle") && <BattlePanel state={state} />}
            {visiblePanel("core", "save") && <SavePanel state={state} />}
            {visiblePanel("catalog", "item") && <ItemPanel state={state} />}
            {visiblePanel("catalog", "actor") && <ActorPanel state={state} />}
            {visiblePanel("catalog", "skill") && <SkillPanel state={state} />}
            {visiblePanel("world", "map") && <MapPanel state={state} />}
            {visiblePanel("world", "commonEvent") && <CommonEventPanel state={state} />}
            {visiblePanel("misc", "variable") && <VariablePanel state={state} />}
            {visiblePanel("misc", "switch") && <SwitchPanel state={state} />}
            {visiblePanel("debug", "diagnostics") && <DiagnosticsPanel state={state} />}
            {visiblePanel("debug", "command") && <CustomCommandPanel state={state} />}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">事件</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="max-h-60 overflow-auto rounded-md border bg-muted/30 p-2 text-xs"
                dangerouslySetInnerHTML={{ __html: NwrGuiRuntimeEvents.eventListHtml(events) }}
              />
            </CardContent>
          </Card>
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-card px-4 py-2 text-card-foreground shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Sidebar({ state }: { state: ReturnType<typeof useAppState> }) {
  const { runtimeView } = state;
  return (
    <aside className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">运行状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <StateRow label="Bridge" value={runtimeView.bridgeText} />
          <StateRow label="启动路线" value={state.routeModel.switchText} />
          <StateRow label="准备游戏" value={preparedGameReady() ? "已准备" : "未准备"} />
          <StateRow label="队伍对象" value={runtimeView.partyState} />
          <StateRow label="当前积分" value={state.formatNumber(runtimeView.goldMetric)} />
          <StateRow label="存档目录" value={runtimeView.saveState} />
          <StateRow label="当前位置" value={runtimeView.mapState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">队伍</CardTitle>
        </CardHeader>
        <CardContent>
          {runtimeView.partyMembers.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {runtimeView.partyMembers.map((m) => (
                <li key={m.id} className="rounded-md border p-2">
                  <strong>{m.id} / {m.name}</strong>
                  <div className="text-xs text-muted-foreground">{m.vitals}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">未检测到</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">文件</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={state.openBridgeFolder}>打开 Bridge 日志</Button>
          <Button variant="outline" onClick={state.openSaveFolder}>打开存档目录</Button>
          <Button variant="outline" onClick={() => state.activateTab("debug")}>Bridge 诊断</Button>
          <Button variant="outline" onClick={state.handleBackupSaves}>备份存档</Button>
          <Button variant="outline" onClick={state.clearEvents}>清空事件</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">检测到的存档</CardTitle>
        </CardHeader>
        <CardContent>
          {runtimeView.saveFiles.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {runtimeView.saveFiles.map((name) => (
                <li key={name} className="rounded-md border p-2 text-xs">{name}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">未检测到</div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

function StateRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b pb-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate max-w-[180px]" title={String(value)}>{value}</span>
    </div>
  );
}

function GoldPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  return (
    <PanelCard title="积分" tab="core" section="gold">
      <div className="text-3xl font-bold text-primary">{state.formatNumber(state.runtimeView.goldMetric)}</div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <LabeledInput label="" type="number" min={0} step={1} value={state.goldValue} onChange={(v) => state.setGoldValue(Number(v))} />
        <Button id="goldSetBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldSet(state.goldValue))}>设定</Button>
        <Button id="goldAddBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldAdd(state.goldValue))}>增加</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-gold-add="1000" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldAdd(1000))}>+1K</Button>
        <Button data-gold-add="10000" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldAdd(10000))}>+10K</Button>
        <Button data-gold-add="100000" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldAdd(100000))}>+100K</Button>
        <Button data-gold-set="9999999" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.goldSet(9999999))}>MAX</Button>
      </div>
    </PanelCard>
  );
}

function PrisonPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const report = NwrGuiPrisonGuards.reportFromState(state.runtimeView);
  const live = state.runtimeView.fresh && state.runtimeView.versionOk && state.runtimeView.hasParty;
  const level = report ? (report.hits.length > 0 ? "danger" : report.warnings.length > 0 ? "warning" : "ok") : "idle";
  const summaryText = report
    ? live
      ? report.hits.length > 0
        ? `${report.hits.length} 项硬风险`
        : report.warnings.length > 0
          ? `${report.warnings.length} 项提示`
          : "检查通过"
      : "状态过期，等待刷新"
    : "等待运行时检测";

  return (
    <PanelCard title="小黑屋护栏" tab="core" section="prison" className="xl:col-span-2">
      <div className={cn("rounded-md border p-3 font-bold", {
        "border-l-4 border-l-destructive bg-destructive/10": level === "danger",
        "border-l-4 border-l-warning bg-warning/10": level === "warning",
        "border-l-4 border-l-green-600 bg-green-50": level === "ok",
        "bg-muted": level === "idle"
      })}>
        {summaryText}
      </div>
      <details className="rounded-md border p-2">
        <summary className="cursor-pointer text-sm font-bold text-accent-foreground">查看小黑屋触发条件</summary>
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>解密 CommonEvents 中共 17 个事件会设置 Switch520，其中 10 个会显示终身监禁提示并传送 Map695。</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>直接传送</strong> CE334/337/338/339/340/341/342/343/344/405：至尊魔戒 &gt;= 3；传说灵魂结晶 &gt;= 200；红色萃取精华 &gt;= 200；橙色萃取精华 &gt;= 80；金币/积分 &gt;= 9,000,000；功勋变量(29) &gt;= 5000；浮世绘卷 &gt;= 2；actor(2).param(9) &gt;= 19996；角色 #16 在队伍中且缺赤炎魔杖 #59。</li>
            <li><strong>只开惩处</strong> CE335/336/403/406/407/571/572：针剂进化次数(变量210) &gt;= 99；全面进化针剂 &gt;= 99；角色 #16 缺物品 #49；立花野子 #57 缺东乙青木橛 #819 或物品 #101；圣女-贞德 #48 缺圆润的珠子 #73；角色 #31 缺物品 #860。</li>
            <li><strong>提示副作用</strong> CE405 会先显示梦魇传送处提示并打开 Switch785，再显示终身监禁提示；CE406/571 打开 Switch781，CE407 打开 Switch784，CE572 打开 Switch1067；CE403 打开 Switch166。副作用开关汇总：Switch781/784/785/1067。</li>
            <li><strong>运行时参数</strong> actor(2).param(9) 来自运行时公式、装备和插件判定；GUI 可以检测并提示，但不会自动修复这个来源。</li>
          </ul>
        </div>
      </details>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <Metric label="硬风险" value={report ? report.hits.length : 0} />
        <Metric label="提示" value={report ? report.warnings.length : 0} />
        <Metric label="Switch520" value={live && report ? (report.punishmentSwitch ? "ON" : "OFF") : "-"} />
        <Metric label="位置" value={live && report && report.mapId != null ? `${report.mapId} (${report.playerX ?? "-"}, ${report.playerY ?? "-"})` : "-"} />
      </div>

      <div className="space-y-2">
        {report ? (
          [...report.hits, ...report.warnings].map((check) => (
            <div key={check.id} className={cn("rounded-md border-l-4 border p-2", check.severity === "danger" ? "border-l-destructive" : "border-l-warning")}>
              <div className="font-bold">{check.label}</div>
              <div className="text-xs text-muted-foreground">{check.group} / 当前 {check.value} / 安全 {check.limit}</div>
              <div className="text-xs text-muted-foreground">{check.effect}</div>
              {check.note && <small className="block text-xs text-muted-foreground">{check.note}</small>}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">bridge 连接后自动检测。</div>
        )}
      </div>

      <Button
        id="prisonRepairBtn"
        variant="destructive"
        disabled={!(live && report && report.hits.some((c) => c.fixable))}
        onClick={() => state.sendCommand(NwrGuiBridgeCommands.prisonRepair())}
      >
        修复可修复项
      </Button>
    </PanelCard>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function RatePanel({ state }: { state: ReturnType<typeof useAppState> }) {
  return (
    <PanelCard title="倍率" tab="core" section="rate">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
        <LabeledInput label="经验" type="number" min={0} step={0.1} value={state.expRate} onChange={(v) => state.setExpRate(Number(v))} />
        <LabeledInput label="积分" type="number" min={0} step={0.1} value={state.goldRate} onChange={(v) => state.setGoldRate(Number(v))} />
        <LabeledInput label="掉率" type="number" min={0} step={0.1} value={state.dropRate} onChange={(v) => state.setDropRate(Number(v))} />
        <Button id="ratesApplyBtn" onClick={() => state.sendOptions({ expRate: state.expRate, goldRate: state.goldRate, dropRate: state.dropRate })}>应用</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[5, 10, 20, 50, 100, 1].map((rate) => (
          <Button key={rate} variant="outline" onClick={() => {
            state.setExpRate(rate);
            state.setGoldRate(rate);
            state.setDropRate(rate);
            state.sendOptions({ expRate: rate, goldRate: rate, dropRate: rate });
          }}>
            {rate === 1 ? "重置" : `${rate}x`}
          </Button>
        ))}
      </div>
    </PanelCard>
  );
}

function BattlePanel({ state }: { state: ReturnType<typeof useAppState> }) {
  return (
    <PanelCard title="战斗" tab="core" section="battle">
      <div className="flex flex-wrap gap-2">
        <ToggleButton id="noCostBtn" active={state.noCost} onClick={() => state.sendOptions({ noSkillCost: !state.noCost })}>技能无耗</ToggleButton>
        <ToggleButton id="oneHitKillBtn" active={state.oneHitKill} onClick={() => state.sendOptions({ oneHitKill: !state.oneHitKill })}>一击秒杀</ToggleButton>
        <ToggleButton id="invincibleBtn" active={state.invincible} onClick={() => state.sendOptions({ invincible: !state.invincible })}>无敌</ToggleButton>
        <Button id="battleKillBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.battleKillEnemies())}>秒杀敌人</Button>
        <Button id="battleEscapeBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.battleEscape())}>逃跑</Button>
        <Button id="partyRecoverBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.partyRecover())}>队伍恢复</Button>
      </div>
      <div className="text-xs text-muted-foreground">{state.runtimeView.fresh ? "已连接" : "等待命中"}</div>
    </PanelCard>
  );
}

function ToggleButton({ id, active, onClick, children }: { id?: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button id={id} variant={active ? "default" : "outline"} onClick={onClick}>{children}</Button>
  );
}

function SavePanel({ state }: { state: ReturnType<typeof useAppState> }) {
  return (
    <PanelCard title="存档" tab="core" section="save">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-end">
        <LabeledInput label="槽位" type="number" min={1} step={1} value={state.saveSlot} onChange={(v) => state.setSaveSlot(Number(v))} />
        <Button id="saveGameBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.save(state.saveSlot))}>保存</Button>
        <Button id="titleRefreshBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.titleRefresh())}>刷新标题</Button>
      </div>
    </PanelCard>
  );
}

function ItemPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("item", {
    kind: state.itemKind,
    query: state.itemSearch,
    selectedId: state.itemKind === "all" ? state.itemSelectionKey(state.parseItemSelection()) : state.parseItemSelection().id,
    key: (entry) => entry.uid || entry.id,
    rowKind: (entry) => entry.kind || state.itemKind,
    leading: (entry) => iconHtml(entry.iconIndex),
    extra: (entry) => entry.kindLabel || "",
    actions: (entry) => `<button data-catalog-action="item-add" data-kind="${entry.kind || state.itemKind}" data-id="${entry.id}">添加</button>`,
    description: (entry) => entry.description || entry.noteText
  });

  const selection = state.parseItemSelection();
  const hint = NwrGuiCatalog.catalogName(state.catalogs, selection.kind, selection.id)
    ? `${NwrGuiCatalog.ITEM_KIND_LABELS[selection.kind] || selection.kind} ${selection.id} / ${NwrGuiCatalog.catalogName(state.catalogs, selection.kind, selection.id)}`
    : "";

  return (
    <PanelCard title={`物品`} tab="catalog" section="item" className="xl:col-span-2">
      <div className="grid grid-cols-[128px_1fr_120px] gap-2 items-end">
        <Select value={state.itemKind} onChange={(e) => state.setItemKind(e.currentTarget.value)}>
          <option value="all">全部</option>
          <option value="item">物品</option>
          <option value="weapon">武器</option>
          <option value="armor">护甲</option>
        </Select>
        <Input type="search" placeholder="搜索名称、ID或描述" value={state.itemSearch} onChange={(e) => state.setItemSearch(e.currentTarget.value)} />
        <LabeledInput label="数量" type="number" step={1} value={state.itemAmount} onChange={(v) => state.setItemAmount(Number(v))} />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <LabeledInput label="ID" value={state.itemId} onChange={(v) => state.setItemId(v)} />
        <Button id="itemAddBtn" onClick={() => state.addItem(selection.kind, selection.id)}>添加选中</Button>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="item" state={state} />
    </PanelCard>
  );
}

function ActorPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("actor", {
    kind: "actor",
    query: state.actorSearch,
    selectedId: state.numberValue(state.actorId, NaN),
    leading: (entry) => actorAvatarHtml(entry),
    extra: (entry) => entry.faceName || entry.characterName || "",
    actions: (entry) => `<button data-catalog-action="actor-unlock" data-id="${entry.id}">解锁</button><button data-catalog-action="actor-select" data-id="${entry.id}">编辑</button>`,
    description: (entry) => entry.description || entry.noteText
  });

  const hint = NwrGuiCatalog.catalogName(state.catalogs, "actor", state.numberValue(state.actorId, NaN))
    ? `${state.actorId} / ${NwrGuiCatalog.catalogName(state.catalogs, "actor", state.numberValue(state.actorId, NaN))}`
    : "";

  return (
    <PanelCard title="角色编辑" tab="catalog" section="actor" className="xl:col-span-2">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <Input type="search" placeholder="搜索角色名称或ID" value={state.actorSearch} onChange={(e) => state.setActorSearch(e.currentTarget.value)} />
        <Button id="actorUnlockBtn" onClick={() => state.unlockActor(state.activeActorId())}>解锁人物</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <LabeledInput label="角色ID" value={state.actorId} onChange={(v) => state.setActorId(v)} />
        <LabeledInput label="名称" value={state.actorName} onChange={(v) => state.setActorName(v)} placeholder="新名称" />
        <LabeledInput label="等级" type="number" min={1} value={state.actorLevel} onChange={(v) => state.setActorLevel(Number(v))} />
        <LabeledInput label="经验" type="number" value={state.actorExp} onChange={(v) => state.setActorExp(Number(v))} />
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <div className="flex flex-wrap gap-2">
        <Button id="actorAddBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorAdd(state.activeActorId()))}>解锁/入队</Button>
        <Button id="actorRemoveBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorRemove(state.activeActorId()))}>离队</Button>
        <Button id="actorRecoverBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorRecover(state.activeActorId()))}>恢复</Button>
        <Button id="actorNameBtn" variant="outline" onClick={() => state.setActorNameCmd(state.activeActorId())}>改名</Button>
        <Button id="actorLevelBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorLevelSet(state.activeActorId(), state.actorLevel))}>设级</Button>
        <Button id="actorExpBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorExpAdd(state.activeActorId(), state.actorExp))}>加经验</Button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
        <LabeledInput label="HP" type="number" value={state.actorHp} onChange={(v) => state.setActorHp(v)} placeholder="空" />
        <LabeledInput label="MP" type="number" value={state.actorMp} onChange={(v) => state.setActorMp(v)} placeholder="空" />
        <LabeledInput label="TP" type="number" value={state.actorTp} onChange={(v) => state.setActorTp(v)} placeholder="空" />
        <Button id="actorVitalsBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorVitalsSet(state.activeActorId(), state.optionalNumber(state.actorHp), state.optionalNumber(state.actorMp), state.optionalNumber(state.actorTp)))}>写入</Button>
      </div>
      <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-end">
        <Select value={String(state.paramId)} onChange={(e) => state.setParamId(Number(e.currentTarget.value))}>
          <option value="0">最大HP</option>
          <option value="1">最大MP</option>
          <option value="2">攻击</option>
          <option value="3">防御</option>
          <option value="4">魔攻</option>
          <option value="5">魔防</option>
          <option value="6">敏捷</option>
          <option value="7">幸运</option>
        </Select>
        <LabeledInput label="值" type="number" value={state.paramValue} onChange={(v) => state.setParamValue(Number(v))} />
        <Button id="actorParamBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorParamAdd(state.activeActorId(), state.paramId, state.paramValue))}>加值</Button>
      </div>
      <div className="grid grid-cols-[120px_1fr_auto_1fr_auto] gap-2 items-end">
        <LabeledInput label="职业ID" type="number" min={1} value={state.actorPointClassId} onChange={(v) => state.setActorPointClassId(v)} placeholder="当前" />
        <LabeledInput label="SP" type="number" value={state.actorSpValue} onChange={(v) => state.setActorSpValue(Number(v))} />
        <Button id="actorSpBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorJpAdd(state.activeActorId(), state.actorSpValue, state.actorPointClass()))}>加 SP</Button>
        <LabeledInput label="属性点" type="number" value={state.actorAllocationPointValue} onChange={(v) => state.setActorAllocationPointValue(Number(v))} />
        <Button id="actorAllocationPointsBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorAllocationPointsAdd(state.activeActorId(), state.actorAllocationPointValue, state.actorPointClass()))}>加属性点</Button>
      </div>
      <CatalogList view={view} kind="actor" state={state} />
    </PanelCard>
  );
}

function SkillPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("skill", {
    kind: "skill",
    query: state.skillSearch,
    selectedId: state.numberValue(state.skillId, NaN),
    leading: (entry) => iconHtml(entry.iconIndex),
    actions: (entry) => `<button data-catalog-action="skill-learn" data-id="${entry.id}">学会</button><button data-catalog-action="skill-forget" data-id="${entry.id}">遗忘</button>`,
    description: (entry) => entry.description || entry.noteText
  });

  const actorName = NwrGuiCatalog.catalogName(state.catalogs, "actor", state.numberValue(state.skillActorId, NaN));
  const skillName = NwrGuiCatalog.catalogName(state.catalogs, "skill", state.numberValue(state.skillId, NaN));
  const hint = [actorName, skillName].filter(Boolean).join(" / ");

  return (
    <PanelCard title="技能" tab="catalog" section="skill" className="xl:col-span-2">
      <div className="grid grid-cols-[160px_1fr] gap-2 items-end">
        <LabeledInput label="角色ID" value={state.skillActorId} onChange={(v) => state.setSkillActorId(v)} />
        <Input type="search" placeholder="搜索技能名称、ID或描述" value={state.skillSearch} onChange={(e) => state.setSkillSearch(e.currentTarget.value)} />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <LabeledInput label="技能ID" value={state.skillId} onChange={(v) => state.setSkillId(v)} />
        <Button id="skillLearnBtn" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorSkillLearn(state.skillActor(), state.numberValue(state.skillId, 0)))}>学会</Button>
        <Button id="skillForgetBtn" variant="outline" onClick={() => state.sendCommand(NwrGuiBridgeCommands.actorSkillForget(state.skillActor(), state.numberValue(state.skillId, 0)))}>遗忘</Button>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="skill" state={state} />
    </PanelCard>
  );
}

function MapPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("map", {
    kind: "map",
    query: state.mapSearch,
    selectedId: state.numberValue(state.mapId, NaN),
    leading: (entry) => badgeHtml(String(entry.id), "map"),
    actions: (entry) => `<button data-catalog-action="map-transfer" data-id="${entry.id}">传送</button>`,
    description: (entry) => entry.description
  });

  const hint = NwrGuiCatalog.catalogName(state.catalogs, "map", state.numberValue(state.mapId, NaN))
    ? `${state.mapId} / ${NwrGuiCatalog.catalogName(state.catalogs, "map", state.numberValue(state.mapId, NaN))}`
    : "";

  return (
    <PanelCard title="地图传送" tab="world" section="map" className="xl:col-span-2">
      <Input type="search" placeholder="搜索地图名称或ID" value={state.mapSearch} onChange={(e) => state.setMapSearch(e.currentTarget.value)} />
      <div className="grid grid-cols-[150px_repeat(4,1fr)_auto] gap-2 items-end">
        <LabeledInput label="地图ID" value={state.mapId} onChange={(v) => state.setMapId(v)} />
        <LabeledInput label="X" type="number" value={state.mapX} onChange={(v) => state.setMapX(Number(v))} />
        <LabeledInput label="Y" type="number" value={state.mapY} onChange={(v) => state.setMapY(Number(v))} />
        <LabeledInput label="朝向" value={state.mapDirection} onChange={(v) => state.setMapDirection(Number(v))} />
        <LabeledInput label="淡入" value={state.mapFade} onChange={(v) => state.setMapFade(Number(v))} />
        <Button id="mapTransferBtn" onClick={() => state.transferMap(state.numberValue(state.mapId, 0))}>传送</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={state.recordCurrentPosition}>记录当前位置</Button>
        <Button id="returnPositionBtn" variant="outline" onClick={state.returnRecordedPosition}>返回记录点</Button>
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">{state.recordedText}</span>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="map" state={state} />
    </PanelCard>
  );
}

function CommonEventPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("commonEvent", {
    kind: "commonEvent",
    query: state.commonEventSearch,
    selectedId: state.numberValue(state.commonEventId, NaN),
    leading: (entry) => badgeHtml(String(entry.id), "event"),
    actions: (entry) => `<button data-catalog-action="common-event-run" data-id="${entry.id}">运行</button>`,
    description: (entry) => entry.description
  });

  const hint = NwrGuiCatalog.catalogName(state.catalogs, "commonEvent", state.numberValue(state.commonEventId, NaN))
    ? `${state.commonEventId} / ${NwrGuiCatalog.catalogName(state.catalogs, "commonEvent", state.numberValue(state.commonEventId, NaN))}`
    : "";

  return (
    <PanelCard title="公共事件" tab="world" section="commonEvent" className="xl:col-span-2">
      <Input type="search" placeholder="搜索公共事件名称或ID" value={state.commonEventSearch} onChange={(e) => state.setCommonEventSearch(e.currentTarget.value)} />
      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <LabeledInput label="事件ID" value={state.commonEventId} onChange={(v) => state.setCommonEventId(v)} />
        <Button id="commonEventRunBtn" onClick={() => state.runCommonEvent(state.numberValue(state.commonEventId, 0))}>运行事件</Button>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="commonEvent" state={state} />
    </PanelCard>
  );
}

function VariablePanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("variable", {
    kind: "variable",
    query: state.variableSearch,
    selectedId: state.numberValue(state.variableId, NaN),
    leading: (entry) => badgeHtml(String(entry.id), "var"),
    actions: (entry) => `<button data-catalog-action="variable-select" data-id="${entry.id}">填入</button><button data-catalog-action="variable-set" data-id="${entry.id}">写入</button>`,
    description: (entry) => entry.description
  });

  const hint = NwrGuiCatalog.catalogName(state.catalogs, "variable", state.numberValue(state.variableId, NaN))
    ? `${state.variableId} / ${NwrGuiCatalog.catalogName(state.catalogs, "variable", state.numberValue(state.variableId, NaN))}`
    : "";

  return (
    <PanelCard title="变量" tab="misc" section="variable" className="xl:col-span-2">
      <Input type="search" placeholder="搜索变量名称或ID" value={state.variableSearch} onChange={(e) => state.setVariableSearch(e.currentTarget.value)} />
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <LabeledInput label="ID" value={state.variableId} onChange={(v) => state.setVariableId(v)} />
        <LabeledInput label="值" value={state.variableValue} onChange={(v) => state.setVariableValue(v)} />
        <Button id="variableSetBtn" onClick={() => state.setVariable(state.numberValue(state.variableId, 0))}>写入</Button>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="variable" state={state} />
    </PanelCard>
  );
}

function SwitchPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const view = state.catalogView("switch", {
    kind: "switch",
    query: state.switchSearch,
    selectedId: state.numberValue(state.switchId, NaN),
    leading: (entry) => badgeHtml(String(entry.id), "switch"),
    actions: (entry) => `<button data-catalog-action="switch-on" data-id="${entry.id}">ON</button><button data-catalog-action="switch-off" data-id="${entry.id}">OFF</button>`,
    description: (entry) => entry.description
  });

  const hint = NwrGuiCatalog.catalogName(state.catalogs, "switch", state.numberValue(state.switchId, NaN))
    ? `${state.switchId} / ${NwrGuiCatalog.catalogName(state.catalogs, "switch", state.numberValue(state.switchId, NaN))}`
    : "";

  return (
    <PanelCard title="开关" tab="misc" section="switch" className="xl:col-span-2">
      <Input type="search" placeholder="搜索开关名称或ID" value={state.switchSearch} onChange={(e) => state.setSwitchSearch(e.currentTarget.value)} />
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
        <LabeledInput label="ID" value={state.switchId} onChange={(v) => state.setSwitchId(v)} />
        <Button variant={state.switchValue ? "default" : "outline"} onClick={() => state.setSwitchValue(true)}>ON</Button>
        <Button variant={!state.switchValue ? "default" : "outline"} onClick={() => state.setSwitchValue(false)}>OFF</Button>
        <Button id="switchSetBtn" onClick={() => state.setSwitch(state.numberValue(state.switchId, 0), state.switchValue)}>写入</Button>
      </div>
      <div className="text-xs text-muted-foreground min-h-[1.25rem]">{hint}</div>
      <CatalogList view={view} kind="switch" state={state} />
    </PanelCard>
  );
}

function DiagnosticsPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  const diagnostics = [
    { id: "ping", label: "Ping" },
    { id: "runtime.inspect", label: "Inspect" },
    { id: "runtime.search", label: "Search" },
    { id: "trainer.options.get", label: "Trainer" },
    { id: "trainer.hooks.info", label: "Hooks" },
    { id: "data.dump", label: "Data Dump" },
    { id: "map.current", label: "Map" }
  ];
  return (
    <PanelCard title="Bridge 诊断" tab="debug" section="diagnostics" className="xl:col-span-2">
      <div className="flex flex-wrap gap-2">
        {diagnostics.map((d) => (
          <Button key={d.id} variant="outline" onClick={() => state.sendDiagnosticCommand(d.id)}>{d.label}</Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">等待诊断</div>
    </PanelCard>
  );
}

function CustomCommandPanel({ state }: { state: ReturnType<typeof useAppState> }) {
  return (
    <PanelCard title="自定义命令" tab="debug" section="command" className="xl:col-span-2">
      <Textarea value={state.customCommand} onChange={(e) => state.setCustomCommand(e.currentTarget.value)} spellCheck={false} />
      <Button id="customSendBtn" onClick={() => {
        try {
          const command = JSON.parse(state.customCommand);
          state.sendCommand(command);
        } catch (error) {
          state.showToast(`JSON 错误：${error instanceof Error ? error.message : String(error)}`);
        }
      }}>发送 JSON</Button>
    </PanelCard>
  );
}

function PanelCard({ title, tab, section, className, children }: { title: string; tab: string; section: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("self-start", className)} data-tool-panel={tab} data-tool-section={section} data-tool-label={title}>
      <CardHeader>
        <CardTitle className="text-sm font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function LabeledInput({ label, onChange, value, type, ...props }: { label: string; onChange: (value: string) => void; value: string | number } & Omit<React.ComponentProps<typeof Input>, "onChange" | "value">) {
  return (
    <div className="flex flex-col gap-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        {...props}
      />
    </div>
  );
}

function CatalogList({ view, kind, state }: { view: NwrGuiCatalogUi.MutableCatalogView | null; kind: string; state: ReturnType<typeof useAppState> }) {
  if (!view) return null;
  const toolState = NwrGuiCatalogTools.catalogToolState(view, false, false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => state.changeCatalogPage(kind, "first")} disabled={toolState.firstDisabled}>首页</Button>
        <Button size="sm" variant="outline" onClick={() => state.changeCatalogPage(kind, "prev")} disabled={toolState.prevDisabled}>上一页</Button>
        <span className="inline-flex items-center rounded-md border px-2 text-xs text-muted-foreground">{toolState.pageStatusText}</span>
        <Button size="sm" variant="outline" onClick={() => state.changeCatalogPage(kind, "next")} disabled={toolState.nextDisabled}>下一页</Button>
        <Button size="sm" variant="outline" onClick={() => state.changeCatalogPage(kind, "last")} disabled={toolState.lastDisabled}>末页</Button>
      </div>
      <div
        className="relative h-64 overflow-auto rounded-md border bg-muted/20 p-2"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const row = target.closest<HTMLElement>("[data-id]");
          const actionBtn = target.closest<HTMLElement>("[data-catalog-action]");
          if (!row) return;
          const id = Number(row.dataset.id);
          const rowKind = row.dataset.kind || kind;
          if (actionBtn && actionBtn.dataset.catalogAction) {
            state.handleCatalogAction(rowKind, id, actionBtn.dataset.catalogAction);
          } else {
            state.handleCatalogSelect(rowKind, id);
          }
        }}
        dangerouslySetInnerHTML={{
          __html: view.entries.length
            ? `<div style="position:relative;height:${view.entries.length * view.rowHeight}px">${view.entries.map((entry, index) => catalogRowHtml(entry, view, index * view.rowHeight)).join("")}</div>`
            : '<div class="text-sm text-muted-foreground p-2">没有匹配项</div>'
        }}
      />
    </div>
  );
}

function catalogRowHtml(entry: NwrGuiCatalog.CatalogEntry, view: NwrGuiCatalogUi.MutableCatalogView, top: number): string {
  const opts = view.options;
  const rowKey = opts.key ? opts.key(entry) : entry.id;
  const rowKind = opts.rowKind ? opts.rowKind(entry) : opts.kind || "";
  const active = String(rowKey) === String(opts.selectedId) ? " active" : "";
  const extra = opts.extra ? opts.extra(entry) : "";
  const description = opts.description ? opts.description(entry) : "";
  const leading = opts.leading(entry);
  const actions = opts.actions(entry);
  return `<div class="catalog-row${active}" style="position:absolute;top:${top}px;left:8px;right:8px;display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;min-height:80px;border:1px solid;border-radius:8px;padding:10px;cursor:pointer;" data-kind="${escapeHtml(rowKind)}" data-id="${escapeHtml(entry.id)}">
    ${leading}
    <div style="min-width:0;">
      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800;">${escapeHtml(entry.name)}</div>
      <div style="font-size:12px;color:var(--muted-foreground);">ID ${entry.id}${extra ? " / " + escapeHtml(extra) : ""}</div>
      ${description ? `<div style="font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(description)}</div>` : ""}
    </div>
    <div style="display:flex;gap:8px;">${actions}</div>
  </div>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

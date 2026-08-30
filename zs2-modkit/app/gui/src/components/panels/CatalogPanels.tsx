import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@rpgmv-modkit/ui";
import { CatalogList, Badge, Icon } from "../CatalogList";

interface CatalogPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  optionalNumber?: (v: string) => number | undefined;
  selectedItem?: any;
  iconRenderer: any;
  latestState?: any;
}

function itemActions(entry: any) {
  return [{ label: "添加", action: "item-add" }];
}

export function skillActions(entry: any) {
  return [{ label: "学会", action: "skill-learn" }, { label: "遗忘", action: "skill-forget" }];
}

function actorActions(entry: any) {
  return [{ label: "解锁", action: "actor-unlock" }, { label: "编辑", action: "actor-select" }];
}

export function ItemPanel({ state, setField, core, selectedItem, iconRenderer }: CatalogPanelsProps) {
  const entries = state.itemKind === "all" ? core?.catalogs?.all || [] : (core?.catalogs?.[state.itemKind] || []);
  const selectedId = state.itemKind === "all" ? selectedItem.raw : selectedItem.id;
  const itemKindLabel = { item: "物品", weapon: "武器", armor: "防具", all: "全部" }[state.itemKind] || state.itemKind;
  const hintName = core?.catalogName(selectedItem.kind, selectedItem.id);
  const hint = hintName ? `${itemKindLabel} ${selectedItem.id} / ${hintName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">物品</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[128px_1fr_120px] gap-2 items-end">
          <Select value={state.itemKind} onChange={(e: any) => { setField("itemKind", e.target.value); }}>
            <option value="all">全部</option>
            <option value="item">物品</option>
            <option value="weapon">武器</option>
            <option value="armor">护甲</option>
          </Select>
          <Input type="search" placeholder="搜索名称、ID或描述" value={state.itemSearch} onChange={(e) => setField("itemSearch", e.target.value)} />
          <div className="space-y-1"><Label className="text-xs">数量</Label><Input type="number" min={1} value={state.itemAmount} onChange={(e) => setField("itemAmount", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">ID</Label><Input value={state.itemId} onChange={(e) => setField("itemId", e.target.value)} list={state.itemKind === "all" ? "allOptions" : `${state.itemKind}Options`} /></div>
          <Button onClick={() => { if (Number.isFinite(selectedItem.id)) core?.addItem(selectedItem.kind, selectedItem.id, parseInt(state.itemAmount, 10) || 1); }}>添加选中</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="物品"
          entries={entries}
          search={state.itemSearch}
          onSearchChange={(v) => setField("itemSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => { setField("itemId", state.itemKind === "all" ? entry.uid : String(entry.id)); }}
          onAction={(entry, action) => core?.addItem(entry.kind || state.itemKind, entry.id, parseInt(state.itemAmount, 10) || 1)}
          options={{
            key: (entry) => entry.uid || entry.id,
            rowKind: (entry) => entry.kind || state.itemKind,
            leading: (entry) => <Icon url={iconRenderer?.iconUrl(entry.iconIndex)} />,
            extra: (entry) => entry.kindLabel || "",
            actions: itemActions,
            description: (entry) => entry.description || entry.noteText
          }}
        />
      </CardContent>
    </Card>
  );
}

export function ActorPanel({ state, setField, core, numberValue, optionalNumber, iconRenderer }: CatalogPanelsProps) {
  const entries = core?.catalogs?.actor || [];
  const selectedId = numberValue(state.actorId, NaN);
  const actorName = core?.catalogName("actor", selectedId);
  const hint = actorName ? `${selectedId} / ${actorName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">角色编辑</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input type="search" placeholder="搜索角色名称或ID" value={state.actorSearch} onChange={(e) => setField("actorSearch", e.target.value)} />
          <Button onClick={() => core?.actorCommands.unlock(numberValue(state.actorId, 0))}>解锁人物</Button>
        </div>
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">角色ID</Label><Input value={state.actorId} onChange={(e) => setField("actorId", e.target.value)} list="actorOptions" /></div>
          <div className="space-y-1"><Label className="text-xs">等级</Label><Input type="number" min={1} value={state.actorLevel} onChange={(e) => setField("actorLevel", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">经验</Label><Input type="number" value={state.actorExp} onChange={(e) => setField("actorExp", e.target.value)} /></div>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => core?.actorCommands.unlock(numberValue(state.actorId, 0))}>解锁/入队</Button>
          <Button variant="outline" onClick={() => core?.actorCommands.remove(numberValue(state.actorId, 0))}>离队</Button>
          <Button variant="outline" onClick={() => core?.actorCommands.recover(numberValue(state.actorId, 0))}>恢复</Button>
          <Button variant="outline" onClick={() => core?.actorCommands.setLevel(numberValue(state.actorId, 0), numberValue(state.actorLevel, 1))}>设级</Button>
          <Button variant="outline" onClick={() => core?.actorCommands.addExp(numberValue(state.actorId, 0), numberValue(state.actorExp, 0))}>加经验</Button>
        </div>
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">HP</Label><Input type="number" value={state.actorHp} onChange={(e) => setField("actorHp", e.target.value)} placeholder="空" /></div>
          <div className="space-y-1"><Label className="text-xs">MP</Label><Input type="number" value={state.actorMp} onChange={(e) => setField("actorMp", e.target.value)} placeholder="空" /></div>
          <div className="space-y-1"><Label className="text-xs">TP</Label><Input type="number" value={state.actorTp} onChange={(e) => setField("actorTp", e.target.value)} placeholder="空" /></div>
          <Button onClick={() => core?.actorCommands.setVitals(numberValue(state.actorId, 0), optionalNumber(state.actorHp), optionalNumber(state.actorMp), optionalNumber(state.actorTp))}>写入</Button>
        </div>
        <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-end">
          <Select value={state.paramId} onChange={(e: any) => setField("paramId", e.target.value)}>
            <option value="0">最大HP</option>
            <option value="1">最大MP</option>
            <option value="2">攻击</option>
            <option value="3">防御</option>
            <option value="4">魔攻</option>
            <option value="5">魔防</option>
            <option value="6">敏捷</option>
            <option value="7">幸运</option>
          </Select>
          <div className="space-y-1"><Label className="text-xs">加值</Label><Input type="number" value={state.paramValue} onChange={(e) => setField("paramValue", e.target.value)} /></div>
          <Button onClick={() => core?.actorCommands.addParam(numberValue(state.actorId, 0), numberValue(state.paramId, 0), numberValue(state.paramValue, 0))}>加值</Button>
        </div>
        <CatalogList
          title="角色"
          entries={entries}
          search={state.actorSearch}
          onSearchChange={(v) => setField("actorSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => { setField("actorId", String(entry.id)); setField("skillActorId", String(entry.id)); }}
          onAction={(entry, action) => {
            if (action === "actor-unlock") core?.actorCommands.unlock(entry.id);
            else { setField("actorId", String(entry.id)); setField("skillActorId", String(entry.id)); }
          }}
          options={{
            leading: () => <Badge label="Actor" tone="primary" />,
            extra: (entry) => entry.faceName || entry.characterName || "",
            actions: actorActions,
            description: (entry) => entry.description || entry.noteText
          }}
        />
      </CardContent>
    </Card>
  );
}

export function SkillPanel({ state, setField, core, numberValue, iconRenderer }: CatalogPanelsProps) {
  const entries = core?.catalogs?.skill || [];
  const skillActorId = numberValue(state.skillActorId, numberValue(state.actorId, 0));
  const selectedId = numberValue(state.skillId, NaN);
  const actorName = core?.catalogName("actor", skillActorId);
  const skillName = core?.catalogName("skill", selectedId);
  const hint = [actorName, skillName].filter(Boolean).join(" / ");

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">技能</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[160px_1fr] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">角色ID</Label><Input value={state.skillActorId} onChange={(e) => setField("skillActorId", e.target.value)} list="actorOptions" /></div>
          <Input type="search" placeholder="搜索技能名称、ID或描述" value={state.skillSearch} onChange={(e) => setField("skillSearch", e.target.value)} />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">技能ID</Label><Input value={state.skillId} onChange={(e) => setField("skillId", e.target.value)} list="skillOptions" /></div>
          <Button onClick={() => core?.learnSkill(skillActorId, numberValue(state.skillId, 0))}>学会</Button>
          <Button variant="outline" onClick={() => core?.forgetSkill(skillActorId, numberValue(state.skillId, 0))}>遗忘</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="技能"
          entries={entries}
          search={state.skillSearch}
          onSearchChange={(v) => setField("skillSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("skillId", String(entry.id))}
          onAction={(entry, action) => {
            if (action === "skill-learn") core?.learnSkill(skillActorId, entry.id);
            else core?.forgetSkill(skillActorId, entry.id);
          }}
          options={{
            leading: (entry) => <Icon url={iconRenderer?.iconUrl(entry.iconIndex)} />,
            actions: skillActions,
            description: (entry) => entry.description || entry.noteText
          }}
        />
      </CardContent>
    </Card>
  );
}

export function TalentPanel({ state, setField, core, numberValue, optionalNumber, latestState }: CatalogPanelsProps) {
  const progress = latestState?.progress;
  const talents = Array.isArray(progress?.partyTalent) ? progress.partyTalent : [];
  const actorId = numberValue(state.talentActorId, NaN);
  const selected = talents.find((a: any) => a.id === actorId) || talents[0];
  const actorName = core?.catalogName("actor", actorId);
  const hint = actorName ? `${state.talentActorId} / ${actorName}` : "";

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">天赋点</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-mono font-bold text-primary bg-primary/5 rounded-md px-3 py-2 min-h-[58px] flex items-center">
          {core?.formatNumber(selected?.sp || 0)}
        </div>
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">角色ID</Label><Input value={state.talentActorId} onChange={(e) => setField("talentActorId", e.target.value)} list="actorOptions" /></div>
          <div className="space-y-1"><Label className="text-xs">点数</Label><Input type="number" min={0} value={state.talentPointValue} onChange={(e) => setField("talentPointValue", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">类型</Label><Select value={state.talentPointMode} onChange={(e: any) => setField("talentPointMode", e.target.value)}>
            <option value="sp">通用天赋</option>
            <option value="csp">职业天赋</option>
          </Select></div>
          <div className="space-y-1"><Label className="text-xs">职业槽</Label><Input type="number" min={0} value={state.talentCspId} onChange={(e) => setField("talentCspId", e.target.value)} placeholder="自动" /></div>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => core?.talentCommandBase("talent.points.set", numberValue(state.talentPointValue, 0), state.talentPointMode, optionalNumber(state.talentCspId), false, numberValue(state.talentActorId, 1))}>设定</Button>
          <Button variant="outline" onClick={() => core?.sendCommand(core?.talentCommandBase("talent.points.add", numberValue(state.talentPointValue, 0), state.talentPointMode, optionalNumber(state.talentCspId), false, numberValue(state.talentActorId, 1)))}>增加</Button>
          <Button variant="outline" onClick={() => core?.sendCommand(core?.talentCommandBase("talent.points.add", numberValue(state.talentPointValue, 0), state.talentPointMode, optionalNumber(state.talentCspId), true, 1))}>全队增加</Button>
          <Button variant="outline" onClick={() => core?.sendCommand({ type: "talent.points.info", party: true })}>刷新</Button>
        </div>
        <div className="text-xs text-muted-foreground">{talents.length ? talents.slice(0, 8).map((a: any) => `${a.id}/${a.name || ""} SP ${a.sp}`).join(" / ") : "等待运行时状态"}</div>
      </CardContent>
    </Card>
  );
}

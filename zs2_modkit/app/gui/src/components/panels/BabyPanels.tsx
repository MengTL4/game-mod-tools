import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@game-mod-tools/ui";
import { CatalogList, Badge, Icon } from "../CatalogList";
import { skillActions } from "./CatalogPanels";

interface BabyPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  optionalNumber?: (v: string) => number | undefined;
  babyData: any[];
  iconRenderer: any;
}

export function BabySkillPanel({ state, setField, core, numberValue, optionalNumber, babyData, iconRenderer }: BabyPanelsProps) {
  const entries = core?.catalogs?.skill || [];
  const selectedId = numberValue(state.babySkillId, NaN);
  const babyName = core?.babyDisplayName(numberValue(state.babyActorId, NaN), { babies: babyData });
  const skillName = core?.catalogName("skill", selectedId);
  const hint = [babyName ? `${state.babyActorId} / ${babyName}` : "", skillName ? `${state.babySkillId} / ${skillName}` : ""].filter(Boolean).join(" / ");

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">宝宝技能</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[160px_1fr] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">宝宝ID</Label><Input value={state.babyActorId} onChange={(e) => setField("babyActorId", e.target.value)} list="babyOptions" placeholder="自动" /></div>
          <Input type="search" placeholder="搜索技能名称、ID或描述" value={state.babySkillSearch} onChange={(e) => setField("babySkillSearch", e.target.value)} />
        </div>
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">技能ID</Label><Input value={state.babySkillId} onChange={(e) => setField("babySkillId", e.target.value)} list="skillOptions" /></div>
          <div className="space-y-1"><Label className="text-xs">类型</Label><Select value={state.babySkillMode} onChange={(e: any) => setField("babySkillMode", e.target.value)}>
            <option value="auto">自动</option>
            <option value="passive">被动</option>
            <option value="action">主动/核心</option>
          </Select></div>
          <div className="space-y-1"><Label className="text-xs">学习点数</Label><Input type="number" min={0} value={state.babyLearnSlots} onChange={(e) => setField("babyLearnSlots", e.target.value)} placeholder="读取" /></div>
          <div className="space-y-1"><Label className="text-xs">槽位</Label><Input type="number" min={1} value={state.babyActionSlot} onChange={(e) => setField("babyActionSlot", e.target.value)} placeholder="追加" /></div>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => core?.sendCommand(core?.babyCommandBase(numberValue(state.babySkillId, 0), state.babySkillMode, optionalNumber(state.babyActorId), optionalNumber(state.babyActionSlot)))}>添加技能</Button>
          <Button variant="outline" onClick={() => core?.sendCommand(core?.babyCommandBase(numberValue(state.babySkillId, 0), state.babySkillMode, optionalNumber(state.babyActorId), optionalNumber(state.babyActionSlot)))}>移除技能</Button>
          <Button variant="outline" onClick={() => core?.sendCommand(core?.babySlotsCommand("baby.slots.set", numberValue(state.babyLearnSlots, 0), optionalNumber(state.babyActorId)))}>设定点数</Button>
          <Button variant="outline" onClick={() => core?.sendCommand(core?.babySlotsCommand("baby.slots.add", 1, optionalNumber(state.babyActorId)))}>+1点数</Button>
          <Button variant="outline" onClick={() => core?.sendCommand({ type: "baby.skill.clear", mode: "passive", id: optionalNumber(state.babyActorId) })}>清空被动</Button>
          <Button variant="outline" onClick={() => core?.sendCommand({ type: "baby.info" })}>刷新宝宝</Button>
        </div>
        <CatalogList
          title="宝宝技能"
          entries={entries}
          search={state.babySkillSearch}
          onSearchChange={(v) => setField("babySkillSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("babySkillId", String(entry.id))}
          onAction={(entry, action) => {
            setField("babySkillId", String(entry.id));
            const id = optionalNumber(state.babyActorId);
            const slot = optionalNumber(state.babyActionSlot);
            if (action === "skill-learn") core?.sendCommand(core?.babyCommandBase(entry.id, state.babySkillMode, id, slot));
            else core?.sendCommand(core?.babyCommandBase(entry.id, state.babySkillMode, id, slot));
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

export function BabyListPanel({ state, setField, core, babyData, numberValue }: BabyPanelsProps) {
  const selectedId = numberValue(state.babyActorId, NaN);
  const selected = babyData.find((row: any) => Number(row.id) === Number(selectedId)) || babyData[0];
  const learnSlots = selected ? core?.babyLearnSlotsOf(selected) : 0;

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">宝宝列表 <span className="text-xs text-muted-foreground font-mono">{babyData.length} 个</span></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {selected && (
          <div className="text-xs text-muted-foreground">
            {selected.id} / {selected.name || "宝宝"} / Lv.{selected.level ?? "-"} / 学习点数 {learnSlots} / 主动 {selected.actionCount || 0} / 被动 {selected.passiveCount || 0}
          </div>
        )}
        {babyData.length === 0 ? (
          <div className="text-sm text-muted-foreground">未检测到已生成宝宝；进存档后点“刷新宝宝”。</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto border rounded-md p-2">
            {babyData.map((row: any) => {
              const active = Number(row.id) === Number(selectedId);
              return (
                <div
                  key={row.id}
                  onClick={() => setField("babyActorId", String(row.id))}
                  className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 p-3 rounded-md border cursor-pointer ${active ? "bg-accent border-primary" : "hover:bg-accent"}`}
                >
                  <Badge label="BB" tone="switch" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{row.id} / {row.name || "宝宝"}</div>
                    <div className="text-xs text-muted-foreground font-mono">Lv.{row.level ?? "-"} / {row.nickname || ""} / 学习点数 {core?.babyLearnSlotsOf(row)} / 原值 {row.BBLeranCount ?? "-"}</div>
                    <div className="text-xs text-muted-foreground mt-1"><b>主动</b> {(row.actionSkills || []).map((s: any) => `${s.id} ${s.name || ""}`).join(", ") || "无"}</div>
                    <div className="text-xs text-muted-foreground"><b>被动</b> {(row.passiveSkills || []).map((s: any) => `${s.id} ${s.name || ""}`).join(", ") || "无"}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setField("babyActorId", String(row.id)); }}>选择</Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

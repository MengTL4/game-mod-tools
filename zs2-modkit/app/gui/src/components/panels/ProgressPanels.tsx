import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@rpgmv-modkit/ui";
import { CatalogList, Badge } from "../CatalogList";

interface ProgressPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  latestState: any;
}

export function TitlePanel({ state, setField, core, numberValue, latestState }: ProgressPanelsProps) {
  const entries = core?.catalogs?.title || [];
  const selectedId = numberValue(state.titleId, NaN);
  const titleName = core?.catalogName("title", selectedId);
  const progress = latestState?.progress;
  const hint = progress
    ? `已解锁 ${core?.formatNumber(progress.titleCount)} / ${core?.formatNumber(progress.titleTotal || entries.length)}`
    : titleName ? `${state.titleId} / ${titleName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">称号</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input type="search" placeholder="搜索称号名称或ID" value={state.titleSearch} onChange={(e) => setField("titleSearch", e.target.value)} />
          <Button onClick={() => core?.sendCommand({ type: "title.unlockAll" })}>全部解锁</Button>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div><Input value={state.titleId} onChange={(e) => setField("titleId", e.target.value)} list="titleOptions" /></div>
          <Button onClick={() => core?.unlockTitle(numberValue(state.titleId, 0))}>解锁选中</Button>
          <Button variant="outline" onClick={() => core?.sendCommand({ type: "title.info" })}>刷新</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="称号"
          entries={entries}
          search={state.titleSearch}
          onSearchChange={(v) => setField("titleSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("titleId", String(entry.id))}
          onAction={(entry) => core?.unlockTitle(entry.id)}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="title" />,
            extra: (entry) => entry.sourceId ? `成就 ${entry.sourceId}` : "",
            actions: () => [{ label: "解锁", action: "title-unlock" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

export function CostumePanel({ state, setField, core, numberValue, latestState }: ProgressPanelsProps) {
  const entries = core?.catalogs?.costume || [];
  const selectedId = numberValue(state.costumeId, NaN);
  const costumeName = core?.catalogName("costume", selectedId);
  const progress = latestState?.progress;
  const hint = progress
    ? `已解锁 ${core?.formatNumber(progress.costumeCount)} / ${core?.formatNumber(progress.costumeTotal || entries.length)}`
    : costumeName ? `${state.costumeId} / ${costumeName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">换装</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input type="search" placeholder="搜索换装名称、ID或来源" value={state.costumeSearch} onChange={(e) => setField("costumeSearch", e.target.value)} />
          <Button onClick={() => core?.sendCommand({ type: "costume.unlockAll" })}>全部解锁</Button>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div><Input value={state.costumeId} onChange={(e) => setField("costumeId", e.target.value)} list="costumeOptions" /></div>
          <Button onClick={() => core?.unlockCostume(numberValue(state.costumeId, 0))}>解锁选中</Button>
          <Button variant="outline" onClick={() => core?.sendCommand({ type: "costume.info" })}>刷新</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="换装"
          entries={entries}
          search={state.costumeSearch}
          onSearchChange={(v) => setField("costumeSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("costumeId", String(entry.id))}
          onAction={(entry) => core?.unlockCostume(entry.id)}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="cloth" />,
            extra: (entry) => [entry.equipId ? `装备 ${entry.equipId}` : "", entry.characterName].filter(Boolean).join(" / "),
            actions: () => [{ label: "解锁", action: "costume-unlock" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

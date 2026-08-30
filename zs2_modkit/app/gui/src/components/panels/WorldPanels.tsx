import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@game-mod-tools/ui";
import { CatalogList, Badge } from "../CatalogList";

interface WorldPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  through: boolean;
  onRecordPosition: () => void;
  onReturnPosition: () => void;
}

export function MapPanel({ state, setField, core, numberValue, through, onRecordPosition, onReturnPosition }: WorldPanelsProps) {
  const entries = core?.catalogs?.map || [];
  const selectedId = numberValue(state.mapId, NaN);
  const mapName = core?.catalogName("map", selectedId);
  const hint = mapName ? `${state.mapId} / ${mapName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">地图传送</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input type="search" placeholder="搜索地图名称或ID" value={state.mapSearch} onChange={(e) => setField("mapSearch", e.target.value)} />
        <div className="grid grid-cols-[150px_repeat(4,minmax(0,1fr))_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">地图ID</Label><Input value={state.mapId} onChange={(e) => setField("mapId", e.target.value)} list="mapOptions" /></div>
          <div className="space-y-1"><Label className="text-xs">X</Label><Input type="number" value={state.mapX} onChange={(e) => setField("mapX", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Y</Label><Input type="number" value={state.mapY} onChange={(e) => setField("mapY", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">朝向</Label><Select value={state.mapDirection} onChange={(e: any) => setField("mapDirection", e.target.value)}>
            <option value="2">下</option>
            <option value="4">左</option>
            <option value="6">右</option>
            <option value="8">上</option>
          </Select></div>
          <div className="space-y-1"><Label className="text-xs">淡入</Label><Select value={state.mapFade} onChange={(e: any) => setField("mapFade", e.target.value)}>
            <option value="0">黑</option>
            <option value="1">白</option>
            <option value="2">无</option>
          </Select></div>
          <Button onClick={() => core?.transferMap(numberValue(state.mapId, 0), numberValue(state.mapX, 10), numberValue(state.mapY, 10), numberValue(state.mapDirection, 2), numberValue(state.mapFade, 0))}>传送</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" onClick={onRecordPosition}>记录当前位置</Button>
          <Button variant="outline" onClick={onReturnPosition}>返回记录点</Button>
          <Button variant={through ? "default" : "outline"} onClick={() => core?.setThrough(!through)}>{through ? "穿墙ON" : "穿墙OFF"}</Button>
          <span className="text-xs text-muted-foreground border rounded-full px-3 py-1">{state.recordedPosition ? `${state.recordedPosition.mapId} (${state.recordedPosition.x}, ${state.recordedPosition.y})` : "未记录"}</span>
        </div>
        <CatalogList
          title="地图"
          entries={entries}
          search={state.mapSearch}
          onSearchChange={(v) => setField("mapSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("mapId", String(entry.id))}
          onAction={(entry) => core?.transferMap(entry.id, numberValue(state.mapX, 10), numberValue(state.mapY, 10), numberValue(state.mapDirection, 2), numberValue(state.mapFade, 0))}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="map" />,
            actions: () => [{ label: "传送", action: "map-transfer" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

interface CommonEventPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
}

export function CommonEventPanel({ state, setField, core, numberValue }: CommonEventPanelsProps) {
  const entries = core?.catalogs?.commonEvent || [];
  const selectedId = numberValue(state.commonEventId, NaN);
  const eventName = core?.catalogName("commonEvent", selectedId);
  const hint = eventName ? `${state.commonEventId} / ${eventName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">公共事件</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input type="search" placeholder="搜索公共事件名称或ID" value={state.commonEventSearch} onChange={(e) => setField("commonEventSearch", e.target.value)} />
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">事件ID</Label><Input value={state.commonEventId} onChange={(e) => setField("commonEventId", e.target.value)} list="commonEventOptions" /></div>
          <Button onClick={() => core?.runCommonEvent(numberValue(state.commonEventId, 0))}>运行事件</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="公共事件"
          entries={entries}
          search={state.commonEventSearch}
          onSearchChange={(v) => setField("commonEventSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("commonEventId", String(entry.id))}
          onAction={(entry) => core?.runCommonEvent(entry.id)}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="event" />,
            actions: () => [{ label: "运行", action: "common-event-run" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label, Select } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

const directions = [
  { value: "2", label: "下" },
  { value: "4", label: "左" },
  { value: "6", label: "右" },
  { value: "8", label: "上" },
];

const fades = [
  { value: "0", label: "黑" },
  { value: "1", label: "白" },
  { value: "2", label: "无" },
];

export function MapPanel() {
  const { state, postCommand, recordedPosition, setRecordedPosition } = useApp();
  const [id, setId] = useState("5");
  const [x, setX] = useState("10");
  const [y, setY] = useState("10");
  const [direction, setDirection] = useState("2");
  const [fade, setFade] = useState("0");

  const currentMap = state?.currentMap;
  const through = !!currentMap?.through;
  const hint = catalogName("map", numberValue(id, NaN));

  const transfer = (mapId?: number) => {
    postCommand({
      type: "map.transfer",
      mapId: mapId ?? numberValue(id, 0),
      x: numberValue(x, 10),
      y: numberValue(y, 10),
      direction: numberValue(direction, 2),
      fade: numberValue(fade, 0),
    });
  };

  const record = () => {
    if (!currentMap || !currentMap.mapId) {
      alert("还没有读取到当前位置");
      return;
    }
    setRecordedPosition({
      mapId: Number(currentMap.mapId),
      x: Number(currentMap.x || 0),
      y: Number(currentMap.y || 0),
      direction: Number(currentMap.direction || 2),
      fade: 0,
    });
  };

  const returnPos = () => {
    if (!recordedPosition) {
      alert("还没有记录位置");
      return;
    }
    setId(String(recordedPosition.mapId));
    setX(String(recordedPosition.x));
    setY(String(recordedPosition.y));
    setDirection(String(recordedPosition.direction));
    setFade(String(recordedPosition.fade));
    transfer(recordedPosition.mapId);
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">地图传送</CardTitle>
        <div className="grid grid-cols-[150px_repeat(4,minmax(0,1fr))_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">地图ID</Label><Input list="mapOptions" value={id} onChange={(e) => setId(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">X</Label><Input type="number" step={1} value={x} onChange={(e) => setX(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">Y</Label><Input type="number" step={1} value={y} onChange={(e) => setY(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">朝向</Label><Select value={direction} onChange={(e) => setDirection(e.target.value)}>{directions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</Select></div>
          <div><Label className="text-xs text-slate-500">淡入</Label><Select value={fade} onChange={(e) => setFade(e.target.value)}>{fades.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</Select></div>
          <Button onClick={() => transfer()}>传送</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" onClick={record}>记录当前位置</Button>
          <Button variant="outline" onClick={returnPos}>返回记录点</Button>
          <Button variant={through ? "default" : "outline"} onClick={() => postCommand({ type: "map.through.set", value: !through })}>{through ? "穿墙ON" : "穿墙OFF"}</Button>
          <span className="inline-flex items-center min-h-8 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
            {recordedPosition ? `${recordedPosition.mapId} (${recordedPosition.x}, ${recordedPosition.y})` : "未记录"}
          </span>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${id} / ${hint}` : ""}</div>
        <datalist id="mapOptions">
          {catalogs.map.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.map}
          selectedId={numberValue(id, NaN)}
          renderLeading={(entry) => <Avatar tone="map">{entry.id}</Avatar>}
          renderDescription={(entry) => entry.description || ""}
          actions={[{ action: "map-transfer", label: "传送" }]}
          onSelect={(entry) => setId(String(entry.id))}
          onAction={(action, entry) => {
            setId(String(entry.id));
            transfer(entry.id);
          }}
        />
      </CardContent>
    </Card>
  );
}

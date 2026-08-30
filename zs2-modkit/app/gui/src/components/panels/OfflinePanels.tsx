import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch } from "@rpgmv-modkit/ui";
import { CatalogList, Badge } from "../CatalogList";
import { formatNumber } from "../../lib/format";

interface OfflinePanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  optionalNumber: (v: string) => number | undefined;
  offlineMode: "map" | "troop";
  setOfflineMode: (mode: "map" | "troop") => void;
  disabled: boolean;
  latestState: any;
}

function chanceText(chance: any) {
  const value = Number(chance);
  if (!Number.isFinite(value)) return "";
  const percent = Math.max(0, value * 100);
  return `${percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10}%`;
}

function dropChipName(row: any) {
  const quality = row && row.qualityLabel ? `[${row.qualityLabel}] ` : "";
  return `${quality}${row && (row.name || `${row.kind}:${row.id}`) || ""}`;
}

export function OfflineHuntPanel({ state, setField, core, numberValue, optionalNumber, offlineMode, setOfflineMode, disabled, latestState }: OfflinePanelsProps) {
  const offlineHunt = latestState?.offlineHunt;
  const last = offlineHunt?.last;
  const preview = offlineHunt?.preview;
  const showPreview = preview && (!last || Number(preview.ts || 0) >= Number(last.ts || 0));

  let metric = "0";
  let stateText = "等待运行时状态";
  let result: React.ReactNode = null;

  if (offlineHunt && offlineHunt.dataAvailable === false) {
    stateText = "缺少 output/extract/data，先执行数据解包/解密";
  } else if (showPreview || !last) {
    if (preview) {
      metric = `${formatNumber(preview.average?.exp || 0)} EXP/次`;
      stateText = [
        preview.mode === "troop" ? `敌群 ${preview.troopId}` : `地图 ${preview.mapId}`,
        `预览 ${preview.name || preview.mapId}`,
        `${formatNumber(preview.encounterCount || 0)} 组遇敌`,
        `金币 ${formatNumber(preview.average?.gold || 0)}/次`,
        preview.encounterStep ? `步数 ${preview.encounterStep}` : ""
      ].filter(Boolean).join(" / ");
      result = <div className="space-y-1 text-xs"><div><b>预览</b> {(preview.troops || []).slice(0, 12).map((row: any) => <span key={row.troopId} className="inline-flex items-center border rounded-full px-2 py-0.5 mx-1 bg-background">{row.troopId} {row.preview?.name || ""} / {formatNumber(row.preview?.exp || 0)} EXP</span>).join("")}</div></div>;
    } else {
      metric = "0";
      stateText = offlineMode === "troop"
        ? `可用敌群 ${core?.catalogs?.troop?.length || 0} 个，先选择敌群并预览或执行一次`
        : `可挂机地图 ${core?.catalogs?.huntMap?.filter((e: any) => e.hasEncounters).length || 0} / 全部地图 ${core?.catalogs?.huntMap?.length || 0}，先预览或执行一次`;
    }
  } else if (last) {
    metric = `${formatNumber(last.exp || 0)} EXP`;
    const lastMode = last.mode === "troop" || Number(last.fixedTroopId || 0) > 0 ? "troop" : "map";
    stateText = [
      new Date(last.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false }),
      lastMode === "troop" ? `敌群 ${last.fixedTroopId || last.troopId || ""}` : `地图 ${last.mapId}`,
      `${formatNumber(last.times)} 次`,
      `金币 ${formatNumber(last.gold || 0)}`,
      last.enemyBook?.count ? `图鉴 ${last.enemyBook.count}` : "",
      last.saved ? `已保存 ${last.saved.id}` : ""
    ].filter(Boolean).join(" / ");
  }

  const run = (mode: "map" | "troop") => {
    const isTroop = mode === "troop";
    const command = core?.offlineHuntCommandBase({
      type: "offlineHunt.run",
      mode,
      mapId: numberValue(state.offlineHuntMapId, 31),
      troopId: isTroop ? optionalNumber(state.offlineHuntTroopId) : undefined,
      times: numberValue(isTroop ? state.offlineHuntTroopTimes : state.offlineHuntMapTimes, 10),
      regionId: isTroop ? undefined : optionalNumber(state.offlineHuntRegionId),
      enemyBook: state.offlineHuntEnemyBook,
      recover: state.offlineHuntRecover,
      save: state.offlineHuntSave,
      saveSlot: numberValue(state.offlineHuntSaveSlot, 1),
      autoSellQualities: [
        state.offlineAutoSellGray ? 0 : null,
        state.offlineAutoSellWhite ? 1 : null,
        state.offlineAutoSellGreen ? 2 : null,
        state.offlineAutoSellBlue ? 3 : null,
        state.offlineAutoSellPurple ? 4 : null
      ].filter((v): v is number => v !== null),
      blockDropQualities: [
        state.offlineBlockWhite ? 1 : null,
        state.offlineBlockGreen ? 2 : null,
        state.offlineBlockBlue ? 3 : null
      ].filter((v): v is number => v !== null)
    });
    if (command) core?.sendCommand(command);
  };

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">脱机挂机</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-mono font-bold text-primary bg-primary/5 rounded-md px-3 py-2 min-h-[58px] flex items-center">{metric}</div>

        {offlineMode === "map" ? (
          <div className="grid grid-cols-[1fr_120px_110px_auto_auto] gap-2 items-end">
            <div className="space-y-1"><Label className="text-xs">地图</Label><Input value={state.offlineHuntMapId} onChange={(e) => setField("offlineHuntMapId", e.target.value)} list="offlineHuntMapOptions" /></div>
            <div className="space-y-1"><Label className="text-xs">次数</Label><Input type="number" min={1} max={5000} value={state.offlineHuntMapTimes} onChange={(e) => setField("offlineHuntMapTimes", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">区域</Label><Input type="number" min={0} value={state.offlineHuntRegionId} onChange={(e) => setField("offlineHuntRegionId", e.target.value)} placeholder="空" /></div>
            <Button variant="outline" onClick={() => run("map")} disabled={disabled}>预览</Button>
            <Button onClick={() => run("map")} disabled={disabled}>执行</Button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-end">
            <div className="space-y-1"><Label className="text-xs">敌群</Label><Input value={state.offlineHuntTroopId} onChange={(e) => setField("offlineHuntTroopId", e.target.value)} list="offlineHuntTroopOptions" placeholder="选择敌群" /></div>
            <div className="space-y-1"><Label className="text-xs">次数</Label><Input type="number" min={1} max={5000} value={state.offlineHuntTroopTimes} onChange={(e) => setField("offlineHuntTroopTimes", e.target.value)} /></div>
            <Button variant="outline" onClick={() => run("troop")} disabled={disabled}>预览</Button>
            <Button onClick={() => run("troop")} disabled={disabled}>执行</Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {[10, 50, 100, 500, 1000].map((t) => (
            <Button key={t} variant="outline" size="sm" onClick={() => setField(offlineMode === "troop" ? "offlineHuntTroopTimes" : "offlineHuntMapTimes", String(t))}>{t}次</Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => { setOfflineMode("map"); setField("offlineHuntTroopId", ""); }}>按地图随机</Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-2"><Switch checked={state.offlineHuntEnemyBook} onChange={(e: any) => setField("offlineHuntEnemyBook", e.target.checked)} /><Label className="text-xs">解锁图鉴</Label></div>
          <div className="flex items-center gap-2"><Switch checked={state.offlineHuntRecover} onChange={(e: any) => setField("offlineHuntRecover", e.target.checked)} /><Label className="text-xs">结束恢复</Label></div>
          <div className="flex items-center gap-2"><Switch checked={state.offlineHuntSave} onChange={(e: any) => setField("offlineHuntSave", e.target.checked)} /><Label className="text-xs">保存</Label></div>
          <div className="space-y-1 w-24"><Label className="text-xs">槽位</Label><Input type="number" min={1} value={state.offlineHuntSaveSlot} onChange={(e) => setField("offlineHuntSaveSlot", e.target.value)} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground font-semibold mb-2">自动卖出装备</div>
            <div className="flex flex-wrap gap-3">
              {[
                ["offlineAutoSellGray", "灰"],
                ["offlineAutoSellWhite", "白"],
                ["offlineAutoSellGreen", "绿"],
                ["offlineAutoSellBlue", "蓝"],
                ["offlineAutoSellPurple", "紫"]
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 border rounded-md px-2 py-1"><Switch checked={state[key]} onChange={(e: any) => setField(key, e.target.checked)} /><Label className="text-xs">{label}</Label></div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-semibold mb-2">屏蔽掉落装备</div>
            <div className="flex flex-wrap gap-3">
              {[
                ["offlineBlockWhite", "白"],
                ["offlineBlockGreen", "绿"],
                ["offlineBlockBlue", "蓝"]
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 border rounded-md px-2 py-1"><Switch checked={state[key]} onChange={(e: any) => setField(key, e.target.checked)} /><Label className="text-xs">{label}</Label></div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground min-h-[20px]">{stateText}</div>
        {result}
      </CardContent>
    </Card>
  );
}

export function OfflineHuntMapPanel({ state, setField, core, numberValue, setOfflineMode }: OfflinePanelsProps) {
  const entries = core?.catalogs?.huntMap || [];
  const selectedId = numberValue(state.offlineHuntMapId, NaN);
  const huntMap = core?.catalogEntry("huntMap", selectedId);
  const hint = huntMap
    ? `${state.offlineHuntMapId} / ${huntMap.name}${huntMap.hasEncounters ? "" : " / 无随机遇敌，建议切到敌群挂机"}`
    : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">挂机地图</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="挂机地图"
          entries={entries}
          search={state.offlineHuntMapSearch}
          onSearchChange={(v) => setField("offlineHuntMapSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => { setOfflineMode("map"); setField("offlineHuntMapId", String(entry.id)); setField("offlineHuntTroopId", ""); }}
          onAction={(entry) => { setOfflineMode("map"); setField("offlineHuntMapId", String(entry.id)); setField("offlineHuntTroopId", ""); }}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="map" />,
            extra: (entry) => entry.hasEncounters ? "" : "无遇敌",
            actions: (entry) => entry.hasEncounters ? [{ label: "选择", action: "select" }] : [{ label: "无遇敌", action: "disabled" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

export function OfflineHuntTroopPanel({ state, setField, core, numberValue, setOfflineMode }: OfflinePanelsProps) {
  const entries = core?.catalogs?.troop || [];
  const selectedId = numberValue(state.offlineHuntTroopId, NaN);
  const troopName = core?.catalogName("troop", selectedId);
  const hint = troopName ? `固定敌群 ${state.offlineHuntTroopId} / ${troopName}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">敌群挂机</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="敌群挂机"
          entries={entries}
          search={state.offlineHuntTroopSearch}
          onSearchChange={(v) => setField("offlineHuntTroopSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => { setOfflineMode("troop"); setField("offlineHuntTroopId", String(entry.id)); }}
          onAction={(entry, action) => {
            setOfflineMode("troop");
            setField("offlineHuntTroopId", String(entry.id));
          }}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="troop" />,
            extra: (entry) => entry.tags && entry.tags.length ? entry.tags.join("/") : "",
            actions: () => [
              { label: "选择", action: "select" },
              { label: "执行", action: "run" },
              { label: "战斗", action: "battle" }
            ],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

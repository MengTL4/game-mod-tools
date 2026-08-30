import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { numberValue, optionalNumber, formatNumber } from "../../lib/utils";
import { catalogs, catalogEntry, catalogName, itemKindLabels } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

const qualities = [
  ["offlineAutoSellRough", 0, "粗糙"],
  ["offlineAutoSellNormal", 1, "普通"],
  ["offlineAutoSellExcellent", 2, "优秀"],
  ["offlineAutoSellFine", 3, "精良"],
  ["offlineAutoSellEpic", 4, "史诗"],
  ["offlineAutoSellLegendary", 5, "传说"],
  ["offlineAutoSellArtifact", 6, "神器"],
  ["offlineAutoSellHeritage", 7, "传承"],
  ["offlineAutoSellImmortal", 8, "不朽"],
] as const;

const blockQualities = [
  ["offlineBlockNormal", 1, "普通"],
  ["offlineBlockExcellent", 2, "优秀"],
  ["offlineBlockFine", 3, "精良"],
] as const;

function chanceText(chance: any) {
  const value = Number(chance);
  if (!Number.isFinite(value)) return "";
  const percent = Math.max(0, value * 100);
  return `${percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10}%`;
}

function previewDropRows(preview: any) {
  const groups: Record<string, any> = {};
  (preview && preview.troops || []).forEach((row: any) => {
    (row.preview && row.preview.possibleDrops || []).forEach((drop: any) => {
      if (!drop || !drop.kind || !drop.id) return;
      const key = `${drop.kind}:${drop.id}`;
      if (!groups[key]) {
        groups[key] = {
          kind: drop.kind,
          id: drop.id,
          name: drop.name || "",
          chance: Number(drop.chance || 0),
          quality: drop.quality,
          qualityLabel: drop.qualityLabel || "",
          specialLabels: Array.isArray(drop.specialLabels) ? drop.specialLabels : [],
          troops: new Set(),
        };
      }
      groups[key].chance = Math.max(Number(groups[key].chance || 0), Number(drop.chance || 0));
      groups[key].troops.add(row.troopId);
    });
  });
  const order = { item: 1, weapon: 2, armor: 3 };
  return Object.values(groups)
    .map((entry: any) => ({ ...entry, troopCount: entry.troops.size }))
    .sort((a: any, b: any) => (order[a.kind as keyof typeof order] || 9) - (order[b.kind as keyof typeof order] || 9) || b.chance - a.chance || a.id - b.id);
}

function dropKindSummary(rows: any[]) {
  const counts = rows.reduce((total: any, row) => {
    total[row.kind] = Number(total[row.kind] || 0) + 1;
    return total;
  }, {});
  return [`物品 ${formatNumber(counts.item || 0)} 种`, `武器 ${formatNumber(counts.weapon || 0)} 种`, `防具 ${formatNumber(counts.armor || 0)} 种`].join(" / ");
}

function dropChipName(row: any) {
  const quality = row && row.qualityLabel ? `[${row.qualityLabel}] ` : "";
  const special = row && Array.isArray(row.specialLabels) && row.specialLabels.length ? ` · ${row.specialLabels.join("/")}` : "";
  return `${quality}${row && (row.name || `${row.kind}:${row.id}`) || ""}${special}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center min-h-7 rounded-full border border-slate-200 bg-white px-2.5 text-xs">{children}</span>;
}

function MapSection() {
  const { state, postCommand, setOfflineHuntMode } = useApp();
  const [mapId, setMapId] = useState("31");
  const [times, setTimes] = useState("10");
  const [regionId, setRegionId] = useState("");
  const [enemyBook, setEnemyBook] = useState(true);
  const [recover, setRecover] = useState(true);
  const [nativeDrops, setNativeDrops] = useState(false);
  const [save, setSave] = useState(false);
  const [saveSlot, setSaveSlot] = useState("1");
  const [autoSell, setAutoSell] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState<Record<string, boolean>>({});

  const huntMap = catalogEntry("huntMap", numberValue(mapId, NaN));
  const hint = huntMap ? `${mapId} / ${huntMap.name}${huntMap.hasEncounters ? "" : " / 无随机遇敌，建议切到敌群挂机"}` : "";

  const disabled = !state || state && !(Date.now() - (state.ts || 0) < 5000);

  const buildCommand = (type: string) => {
    const id = numberValue(mapId, 31);
    const map = catalogEntry("huntMap", id);
    if (type === "offlineHunt.run" && map && !map.hasEncounters) {
      alert("这张地图没有随机遇敌，不能按地图挂机；请切到敌群挂机");
      return;
    }
    postCommand({
      type,
      mode: "map",
      mapId: id,
      times: numberValue(times, 10),
      regionId: optionalNumber(regionId),
      enemyBook,
      recover,
      save,
      saveSlot: numberValue(saveSlot, 1),
      nativeDrops,
      autoSellQualities: qualities.filter((q) => autoSell[q[0]]).map((q) => q[1]),
      blockDropQualities: blockQualities.filter((q) => block[q[0]]).map((q) => q[1]),
    });
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">脱机挂机</CardTitle>
        <div className="flex items-center min-h-[58px] px-4 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-white text-blue-900 font-mono text-2xl font-extrabold">
          0
        </div>
        <div className="grid grid-cols-[1fr_120px_110px_auto_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">地图</Label><Input list="offlineHuntMapOptions" value={mapId} onChange={(e) => setMapId(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">次数</Label><Input type="number" min={1} max={5000} step={1} value={times} onChange={(e) => setTimes(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">区域</Label><Input type="number" min={0} step={1} placeholder="空" value={regionId} onChange={(e) => setRegionId(e.target.value)} /></div>
          <Button variant="outline" onClick={() => buildCommand("offlineHunt.preview")} disabled={disabled}>预览</Button>
          <Button onClick={() => buildCommand("offlineHunt.run")} disabled={disabled}>执行</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint}</div>
        <div className="flex flex-wrap gap-2">
          {[10, 50, 100, 500, 1000].map((t) => <Button key={t} variant="outline" onClick={() => setTimes(String(t))}>{t}次</Button>)}
          <Button variant="outline" onClick={() => setOfflineHuntMode("troop")}>按地图随机</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={enemyBook} onChange={(e) => setEnemyBook(e.target.checked)} /> 解锁图鉴</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={recover} onChange={(e) => setRecover(e.target.checked)} /> 结束恢复</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={nativeDrops} onChange={(e) => setNativeDrops(e.target.checked)} /> 原生掉落</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> 保存</label>
          <div className="inline-flex items-center gap-2"><Label className="text-xs text-slate-500">槽位</Label><Input type="number" min={1} step={1} value={saveSlot} onChange={(e) => setSaveSlot(e.target.value)} className="w-24" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">自动卖出装备</div>
            <div className="flex flex-wrap gap-2">
              {qualities.map(([key, _, label]) => (
                <label key={key} className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <input type="checkbox" checked={!!autoSell[key]} onChange={(e) => setAutoSell((s) => ({ ...s, [key]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">屏蔽掉落装备</div>
            <div className="flex flex-wrap gap-2">
              {blockQualities.map(([key, _, label]) => (
                <label key={key} className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <input type="checkbox" checked={!!block[key]} onChange={(e) => setBlock((s) => ({ ...s, [key]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <datalist id="offlineHuntMapOptions">
          {catalogs.huntMap.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.huntMap}
          selectedId={numberValue(mapId, NaN)}
          renderLeading={(entry) => <Avatar tone="map">{entry.id}</Avatar>}
          renderExtra={(entry) => entry.hasEncounters ? "" : "无遇敌"}
          renderDescription={(entry) => entry.description || ""}
          actions={[{ action: "offline-hunt-select", label: "选择", disabled: (entry) => !entry.hasEncounters }]}
          onSelect={(entry) => { setMapId(String(entry.id)); }}
          onAction={(action, entry) => { setMapId(String(entry.id)); }}
        />
      </CardContent>
    </Card>
  );
}

function TroopSection() {
  const { state, postCommand, setOfflineHuntMode } = useApp();
  const [troopId, setTroopId] = useState("");
  const [times, setTimes] = useState("10");
  const [enemyBook, setEnemyBook] = useState(true);
  const [recover, setRecover] = useState(true);
  const [nativeDrops, setNativeDrops] = useState(false);
  const [save, setSave] = useState(false);
  const [saveSlot, setSaveSlot] = useState("1");
  const [autoSell, setAutoSell] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState<Record<string, boolean>>({});

  const disabled = !state || state && !(Date.now() - (state.ts || 0) < 5000);
  const hint = catalogName("troop", numberValue(troopId, NaN));

  const buildCommand = (type: string) => {
    const id = optionalNumber(troopId);
    if (!Number.isFinite(Number(id))) {
      alert("先选择敌群");
      return;
    }
    postCommand({
      type,
      mode: "troop",
      times: numberValue(times, 10),
      troopId: id,
      enemyBook,
      recover,
      save,
      saveSlot: numberValue(saveSlot, 1),
      nativeDrops,
      autoSellQualities: qualities.filter((q) => autoSell[q[0]]).map((q) => q[1]),
      blockDropQualities: blockQualities.filter((q) => block[q[0]]).map((q) => q[1]),
    });
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">敌群挂机</CardTitle>
        <div className="flex items-center min-h-[58px] px-4 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-white text-blue-900 font-mono text-2xl font-extrabold">
          0
        </div>
        <div className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">敌群</Label><Input list="offlineHuntTroopOptions" value={troopId} onChange={(e) => setTroopId(e.target.value)} placeholder="选择敌群" /></div>
          <div><Label className="text-xs text-slate-500">次数</Label><Input type="number" min={1} max={5000} step={1} value={times} onChange={(e) => setTimes(e.target.value)} /></div>
          <Button variant="outline" onClick={() => buildCommand("offlineHunt.preview")} disabled={disabled}>预览</Button>
          <Button onClick={() => buildCommand("offlineHunt.run")} disabled={disabled}>执行</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `固定敌群 ${troopId} / ${hint}` : ""}</div>
        <div className="flex flex-wrap gap-2">
          {[10, 50, 100, 500, 1000].map((t) => <Button key={t} variant="outline" onClick={() => setTimes(String(t))}>{t}次</Button>)}
          <Button variant="outline" onClick={() => { setOfflineHuntMode("map"); setTroopId(""); }}>按地图随机</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={enemyBook} onChange={(e) => setEnemyBook(e.target.checked)} /> 解锁图鉴</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={recover} onChange={(e) => setRecover(e.target.checked)} /> 结束恢复</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={nativeDrops} onChange={(e) => setNativeDrops(e.target.checked)} /> 原生掉落</label>
          <label className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> 保存</label>
          <div className="inline-flex items-center gap-2"><Label className="text-xs text-slate-500">槽位</Label><Input type="number" min={1} step={1} value={saveSlot} onChange={(e) => setSaveSlot(e.target.value)} className="w-24" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">自动卖出装备</div>
            <div className="flex flex-wrap gap-2">
              {qualities.map(([key, _, label]) => (
                <label key={key} className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <input type="checkbox" checked={!!autoSell[key]} onChange={(e) => setAutoSell((s) => ({ ...s, [key]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-2">屏蔽掉落装备</div>
            <div className="flex flex-wrap gap-2">
              {blockQualities.map(([key, _, label]) => (
                <label key={key} className="inline-flex items-center gap-2 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <input type="checkbox" checked={!!block[key]} onChange={(e) => setBlock((s) => ({ ...s, [key]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <datalist id="offlineHuntTroopOptions">
          {catalogs.troop.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.troop}
          selectedId={numberValue(troopId, NaN)}
          renderLeading={(entry) => <Avatar tone="troop">{entry.id}</Avatar>}
          renderExtra={(entry) => entry.tags && entry.tags.length ? entry.tags.join("/") : ""}
          renderDescription={(entry) => entry.description || ""}
          actions={[
            { action: "offline-troop-select", label: "选择" },
            { action: "offline-troop-run", label: "执行" },
            { action: "battle-start", label: "战斗" },
          ]}
          onSelect={(entry) => setTroopId(String(entry.id))}
          onAction={(action, entry) => {
            setTroopId(String(entry.id));
            if (action === "offline-troop-run") {
              postCommand({ type: "offlineHunt.run", mode: "troop", times: numberValue(times, 10), troopId: entry.id, enemyBook, recover, save, saveSlot: numberValue(saveSlot, 1), nativeDrops, autoSellQualities: qualities.filter((q) => autoSell[q[0]]).map((q) => q[1]), blockDropQualities: blockQualities.filter((q) => block[q[0]]).map((q) => q[1]) });
            } else if (action === "battle-start") {
              postCommand({ type: "battle.start", canEscape: true, canLose: true, troopId: entry.id });
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function compactListHtml(rows: any[], emptyText: string, itemText: (row: any) => React.ReactNode, limit = 8) {
  if (!Array.isArray(rows) || !rows.length) return <span className="text-slate-500">{emptyText}</span>;
  return <>{rows.slice(0, limit).map((row, i) => <span key={i}>{itemText(row)} </span>)}</>;
}

function ResultDisplay() {
  const { state } = useApp();
  const offlineHunt = state?.offlineHunt;
  if (!offlineHunt) {
    return <div className="text-xs text-slate-500">等待运行时状态</div>;
  }
  if (!offlineHunt.dataAvailable) {
    return <div className="text-xs text-slate-500">缺少 output/extract/data，先执行数据解包/解密</div>;
  }
  const last = offlineHunt.last;
  const preview = offlineHunt.preview;
  const showPreview = preview && (!last || Number(preview.ts || 0) >= Number(last.ts || 0));
  if (showPreview || !last) {
    if (preview) {
      const average = preview.average || {};
      const troops = compactListHtml(preview.troops, "无遇敌", (row: any) => <Chip>{row.troopId} {row.preview && row.preview.name || ""} / {formatNumber(row.preview && row.preview.exp || 0)} EXP</Chip>, 12);
      const dropRows = previewDropRows(preview);
      const drops = compactListHtml(dropRows, "无掉落表", (row: any) => <Chip>{itemKindLabels[row.kind] || row.kind}:{dropChipName(row)} {chanceText(row.chance)}</Chip>, 24);
      return (
        <div className="space-y-2 text-xs">
          <div><strong className="text-slate-500 mr-1">预览</strong>{troops}</div>
          <div><strong className="text-slate-500 mr-1">掉落分类</strong><span>{dropKindSummary(dropRows)}</span></div>
          <div><strong className="text-slate-500 mr-1">可能掉落</strong>{drops}</div>
        </div>
      );
    }
    return <div className="text-xs text-slate-500">可挂机地图 {catalogs.huntMap.filter((entry) => entry.hasEncounters).length} / 全部地图 {catalogs.huntMap.length}，先预览或执行一次</div>;
  }
  const time = new Date(last.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false });
  const lastMode = last.mode === "troop" || Number(last.fixedTroopId || 0) > 0 ? "troop" : "map";
  const troops = compactListHtml(last.troopSummary, "无队列", (row: any) => <Chip>{row.id} {row.name || ""} x{formatNumber(row.count)}</Chip>, 12);
  const drops = compactListHtml(last.dropSummary, "无掉落", (row: any) => <Chip>{itemKindLabels[row.kind] || row.kind || ""}:{dropChipName(row)} x{formatNumber(row.count)}</Chip>, 24);
  const sold = compactListHtml(last.autoSell && last.autoSell.summary, "无自动卖出", (row: any) => <Chip>{itemKindLabels[row.kind] || row.kind || ""}:{dropChipName(row)} x{formatNumber(row.count)}</Chip>, 16);
  const blocked = compactListHtml(last.blockedDrops && last.blockedDrops.summary, "无屏蔽", (row: any) => <Chip>{itemKindLabels[row.kind] || row.kind || ""}:{dropChipName(row)} x{formatNumber(row.count)}</Chip>, 16);
  const kindCounts = last.dropKindCounts || {};
  return (
    <div className="space-y-2 text-xs">
      <div><strong className="text-slate-500 mr-1">遇敌</strong>{troops}</div>
      <div><strong className="text-slate-500 mr-1">分类</strong><span>{`物品 ${formatNumber(kindCounts.item || 0)} 种 / 武器 ${formatNumber(kindCounts.weapon || 0)} 种 / 防具 ${formatNumber(kindCounts.armor || 0)} 种`}</span></div>
      <div><strong className="text-slate-500 mr-1">掉落</strong>{drops}</div>
      <div><strong className="text-slate-500 mr-1">自动卖出</strong><span className="mr-1">{formatNumber(last.autoSell && last.autoSell.gold || 0)} 金币</span>{sold}</div>
      <div><strong className="text-slate-500 mr-1">已屏蔽</strong>{blocked}</div>
    </div>
  );
}

export function OfflineHuntPanel() {
  const { activeSections } = useApp();
  const section = activeSections.offline;
  if (section === "troop") {
    return (
      <>
        <TroopSection />
        <ResultDisplay />
      </>
    );
  }
  return (
    <>
      <MapSection />
      <ResultDisplay />
    </>
  );
}

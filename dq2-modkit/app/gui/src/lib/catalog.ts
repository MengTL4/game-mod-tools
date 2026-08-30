import fs from "fs";
import path from "path";
import { readJson, cleanText, cleanNote, makeSearchText } from "./utils";
import { dataDir, loadGuiCache } from "./bridge";
import type { CatalogEntry } from "../types";

export const itemKindLabels: Record<string, string> = {
  item: "物品",
  weapon: "武器",
  armor: "防具",
};

export const CATALOG_PAGE_SIZE = 20;

const systemData = readJson(path.join(dataDir, "System.json")) || {};
const guiCache = loadGuiCache();

export const catalogs: Record<string, CatalogEntry[]> = {
  variable: loadNamedArrayCatalog(systemData.variables || []),
  switch: loadNamedArrayCatalog(systemData.switches || []),
  item: loadCatalog("Items.json"),
  weapon: loadCatalog("Weapons.json"),
  armor: loadCatalog("Armors.json"),
  actor: loadCatalog("Actors.json"),
  skill: loadCatalog("Skills.json"),
  map: loadMapCatalog(),
  huntMap: loadHuntMapCatalog(),
  troop: loadTroopCatalog(),
  commonEvent: loadCommonEventCatalog(),
};

catalogs.all = buildAllItemCatalog();

export function loadCatalog(fileName: string): CatalogEntry[] {
  try {
    const file = path.join(dataDir, fileName);
    if (!fs.existsSync(file)) return [];
    const data = readJson(file);
    if (!Array.isArray(data)) return [];
    return data
      .filter((entry: any) => entry && Number.isFinite(Number(entry.id)) && entry.name)
      .map((entry: any) => {
        const description = cleanText(entry.description || "");
        const noteText = cleanNote(entry.note || "");
        return {
          id: Number(entry.id),
          name: String(entry.name),
          iconIndex: Number.isFinite(Number(entry.iconIndex)) ? Number(entry.iconIndex) : 0,
          description,
          noteText,
          searchText: `${entry.id} ${entry.name || ""} ${description} ${noteText}`.toLowerCase(),
          faceName: entry.faceName ? String(entry.faceName) : "",
          characterName: entry.characterName ? String(entry.characterName) : "",
        };
      });
  } catch {
    return [];
  }
}

export function loadNamedArrayCatalog(names: string[]): CatalogEntry[] {
  return names
    .map((name, index) => {
      const text = cleanText(name || "");
      return text ? {
        id: index,
        name: text,
        description: "",
        noteText: "",
        searchText: makeSearchText([index, text, name]),
      } : null;
    })
    .filter(Boolean) as CatalogEntry[];
}

export function loadMapCatalog(): CatalogEntry[] {
  const data = readJson(path.join(dataDir, "MapInfos.json")) || [];
  if (!Array.isArray(data)) return [];
  return data
    .filter((entry: any) => entry && Number.isFinite(Number(entry.id)) && entry.name)
    .map((entry: any) => {
      const parent = entry.parentId == null ? "" : `父级 ${entry.parentId}`;
      const order = entry.order == null ? "" : `序 ${entry.order}`;
      return {
        id: Number(entry.id),
        name: cleanText(entry.name),
        description: [parent, order].filter(Boolean).join(" / "),
        noteText: "",
        parentId: entry.parentId,
        order: entry.order,
        searchText: makeSearchText([entry.id, entry.name, parent, order]),
      };
    });
}

export function dropKindFromIndex(kind: any): string {
  if (kind === 1 || kind === "1" || String(kind).toLowerCase() === "item") return "item";
  if (kind === 2 || kind === "2" || String(kind).toLowerCase() === "weapon") return "weapon";
  if (kind === 3 || kind === "3" || String(kind).toLowerCase() === "armor") return "armor";
  return "";
}

export function localDropTables() {
  return {
    item: readJson(path.join(dataDir, "Items.json")) || [],
    weapon: readJson(path.join(dataDir, "Weapons.json")) || [],
    armor: readJson(path.join(dataDir, "Armors.json")) || [],
  };
}

export function localDropNamesOfEnemy(enemy: any, tables = localDropTables()): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (kind: any, id: any) => {
    const normalized = dropKindFromIndex(kind);
    const table = tables[normalized];
    const entry = table && table[Number(id)];
    if (!normalized || !entry || !entry.name) return;
    const key = `${normalized}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    names.push(`${itemKindLabels[normalized] || normalized}:${cleanText(entry.name)}`);
  };
  const note = String(enemy && enemy.note || "");
  const match = note.match(/<\s*Enemy Drops\s*>([\s\S]*?)<\s*\/\s*Enemy Drops\s*>/i);
  if (match) {
    match[1].split(/\r?\n/).forEach((line: string) => {
      const parsed = line.trim().match(/^(item|weapon|armor)\s+(\d+)\s*:/i);
      if (parsed) add(parsed[1], parsed[2]);
    });
  }
  (enemy && enemy.dropItems || []).forEach((drop: any) => {
    if (drop && drop.kind && drop.dataId) add(drop.kind, drop.dataId);
  });
  return names;
}

export function localTroopDetails(troop: any, enemies: any[], tables = localDropTables()) {
  const visibleMembers = (troop && troop.members || [])
    .filter((member: any) => member && !member.hidden && Number(member.enemyId) > 0);
  const enemyRows = visibleMembers
    .map((member: any) => enemies[Number(member.enemyId)])
    .filter(Boolean);
  const enemyCounts: Record<string, any> = {};
  let exp = 0;
  let gold = 0;
  const maps = new Set<string>();
  const dropNames = new Set<string>();
  enemyRows.forEach((enemy: any) => {
    const enemyId = Number(enemy.id || 0);
    const enemyName = cleanText(enemy.name || "");
    const key = `${enemyId}:${enemyName}`;
    if (!enemyCounts[key]) enemyCounts[key] = { id: enemyId, name: enemyName, count: 0 };
    enemyCounts[key].count += 1;
    exp += Number(enemy.exp || 0);
    gold += Number(enemy.gold || 0);
    const mapMatch = String(enemy.note || "").match(/<\s*enemyMap\s*:\s*([^>]+)>/i);
    if (mapMatch && cleanText(mapMatch[1])) maps.add(cleanText(mapMatch[1]));
    localDropNamesOfEnemy(enemy, tables).forEach((name) => dropNames.add(name));
  });
  const enemyList = Array.from(Object.values(enemyCounts));
  const enemyText = enemyList.map((enemy: any) => `${enemy.name}${enemy.count > 1 ? `x${enemy.count}` : ""}`).join("、");
  return {
    enemyList,
    enemyText,
    enemyNames: enemyList.map((enemy: any) => enemy.name),
    exp,
    gold,
    maps: Array.from(maps),
    dropNames: Array.from(dropNames),
  };
}

export function loadHuntMapCatalog(): CatalogEntry[] {
  if (guiCache && Array.isArray(guiCache.huntMap)) return guiCache.huntMap;
  const mapInfos = readJson(path.join(dataDir, "MapInfos.json")) || [];
  const troops = readJson(path.join(dataDir, "Troops.json")) || [];
  const enemies = readJson(path.join(dataDir, "Enemies.json")) || [];
  const tables = localDropTables();
  if (!fs.existsSync(dataDir)) return [];
  try {
    const ids = new Set<number>();
    if (Array.isArray(mapInfos)) {
      mapInfos.forEach((entry: any) => {
        if (entry && Number(entry.id) > 0 && entry.name) ids.add(Number(entry.id));
      });
    }
    fs.readdirSync(dataDir).forEach((name: string) => {
      const match = name.match(/^Map(\d{3})\.json$/i);
      if (match) ids.add(Number(match[1]));
    });
    return Array.from(ids)
      .sort((a, b) => a - b)
      .map((id) => {
        const map = readJson(path.join(dataDir, `Map${String(id).padStart(3, "0")}.json`));
        const info = mapInfos[id] || {};
        if (!map && !info.name) return null;
        const encounters = map && Array.isArray(map.encounterList)
          ? map.encounterList
            .filter((entry: any) => entry && Number(entry.troopId) > 0)
            .map((entry: any) => ({
              troopId: Number(entry.troopId),
              weight: Number(entry.weight || 0),
              regionSet: Array.isArray(entry.regionSet) ? entry.regionSet.map(Number).filter(Number.isFinite) : [],
            }))
          : [];
        const hasEncounters = encounters.length > 0;
        const nameText = cleanText(map && map.displayName || info.name || `Map${id}`);
        const troopIds = Array.from(new Set<number>(encounters.map((entry: any) => Number(entry.troopId)))).sort((a, b) => a - b);
        const troopNames = troopIds
          .map((troopId) => troops[troopId] && cleanText(troops[troopId].name || ""))
          .filter(Boolean) as string[];
        const troopDetails = troopIds.map((troopId) => localTroopDetails(troops[troopId], enemies, tables));
        const enemyNames = Array.from(new Set(troopDetails.flatMap((detail) => detail.enemyNames).filter(Boolean)));
        const dropNames = Array.from(new Set(troopDetails.flatMap((detail) => detail.dropNames).filter(Boolean)));
        const regions = Array.from(new Set<number>(encounters.flatMap((entry: any) => entry.regionSet.map(Number)))).sort((a, b) => a - b);
        const description = [
          hasEncounters ? `${encounters.length} 组遇敌` : "无随机遇敌",
          hasEncounters ? `步数 ${Number(map && map.encounterStep || 0) || "-"}` : "可改用敌群挂机",
          enemyNames.length ? `怪物 ${enemyNames.length} 种` : troopNames.slice(0, 4).join("、"),
          dropNames.length ? `掉落 ${dropNames.length} 种` : "",
          regions.length ? `区域 ${regions.slice(0, 8).join(",")}` : "",
        ].filter(Boolean).join(" / ");
        return {
          id,
          name: nameText,
          description,
          noteText: "",
          encounterCount: encounters.length,
          encounterStep: Number(map && map.encounterStep || 0),
          hasEncounters,
          troopIds,
          value: id,
          label: `${id} / ${nameText}`,
          searchText: makeSearchText([
            id,
            nameText,
            info.name,
            troopIds.join(" "),
            troopNames.join(" "),
            enemyNames.join(" "),
            dropNames.join(" "),
            regions.join(" "),
            "挂机",
            "遇敌",
            "脱机",
            hasEncounters ? "可挂机" : "无遇敌 无随机遇敌",
          ]),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Number(!a.hasEncounters) - Number(!b.hasEncounters) || a.id - b.id) as CatalogEntry[];
  } catch {
    return [];
  }
}

export function loadTroopCatalog(): CatalogEntry[] {
  if (guiCache && Array.isArray(guiCache.troop)) return guiCache.troop;
  const troops = readJson(path.join(dataDir, "Troops.json")) || [];
  const enemies = readJson(path.join(dataDir, "Enemies.json")) || [];
  const tables = localDropTables();
  if (!Array.isArray(troops)) return [];
  return troops
    .filter((entry: any) => entry && Number.isFinite(Number(entry.id)) && (entry.name || Array.isArray(entry.members)))
    .map((entry: any) => {
      const id = Number(entry.id);
      const details = localTroopDetails(entry, enemies, tables);
      const name = cleanText(entry.name || details.enemyNames.join(", ") || `敌群 ${id}`);
      const tags = Array.from(name.matchAll(/【([^】]+)】/g)).map((match: any) => match[1]);
      const description = [
        tags.length ? tags.join(" / ") : "",
        details.enemyText,
        `EXP ${details.exp}`,
        `金币 ${details.gold}`,
        details.dropNames.length ? `掉落 ${details.dropNames.length} 种` : "无掉落表",
      ].filter(Boolean).join(" / ");
      return {
        id,
        name,
        description,
        noteText: "",
        enemyText: details.enemyText,
        tags,
        exp: details.exp,
        gold: details.gold,
        maps: details.maps,
        dropNames: details.dropNames,
        value: id,
        label: `${id} / ${name}`,
        searchText: makeSearchText([
          id,
          name,
          details.enemyText,
          tags.join(" "),
          details.maps.join(" "),
          details.dropNames.join(" "),
          "敌群",
          "精英",
          "首领",
          "领主",
          "头目",
          "稀有",
          "罕见",
        ]),
      };
    })
    .filter((entry: any) => entry.name)
    .sort((a: any, b: any) => a.id - b.id);
}

export function loadCommonEventCatalog(): CatalogEntry[] {
  const data = readJson(path.join(dataDir, "CommonEvents.json")) || [];
  if (!Array.isArray(data)) return [];
  return data
    .filter((entry: any) => entry && Number.isFinite(Number(entry.id)) && entry.name)
    .map((entry: any) => {
      const trigger = entry.trigger === 1 ? "自动" : entry.trigger === 2 ? "并行" : "调用";
      const sw = entry.switchId ? `开关 ${entry.switchId}` : "";
      return {
        id: Number(entry.id),
        name: cleanText(entry.name),
        description: [trigger, sw].filter(Boolean).join(" / "),
        noteText: "",
        trigger: entry.trigger,
        switchId: entry.switchId,
        searchText: makeSearchText([entry.id, entry.name, trigger, sw]),
      };
    });
}

export function buildAllItemCatalog(): CatalogEntry[] {
  return ["item", "weapon", "armor"].flatMap((kind) => {
    const kindLabel = itemKindLabels[kind] || kind;
    return (catalogs[kind] || []).map((entry) => ({
      ...entry,
      kind,
      kindLabel,
      uid: `${kind}:${entry.id}`,
      value: `${kind}:${entry.id}`,
      label: `${kindLabel} / ${entry.name}`,
      searchText: makeSearchText([
        entry.searchText,
        `${kind}:${entry.id}`,
        entry.id,
        entry.name,
        entry.description,
        entry.noteText,
        kind,
        kindLabel,
      ]),
    }));
  });
}

export function catalogName(kind: string, id: any): string {
  const list = catalogs[kind] || [];
  const item = list.find((entry) => {
    if (kind === "all") return entry.uid === String(id) || entry.id === Number(id);
    return entry.id === Number(id);
  });
  return item ? item.name : "";
}

export function catalogEntry(kind: string, id: any): CatalogEntry | null {
  const list = catalogs[kind] || [];
  return list.find((entry) => {
    if (kind === "all") return entry.uid === String(id) || entry.id === Number(id);
    return entry.id === Number(id);
  }) || null;
}

export function entryMatchesSearch(entry: CatalogEntry, needle: string): boolean {
  if (!needle) return true;
  if (entry.searchText && entry.searchText.includes(needle)) return true;
  return [
    entry.id,
    entry.uid,
    entry.value,
    entry.label,
    entry.name,
    entry.description,
    entry.noteText,
  ].some((part) => String(part == null ? "" : part).toLowerCase().includes(needle));
}

export function filterEntries(entries: CatalogEntry[], query: string): { entries: CatalogEntry[]; total: number } {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) {
    return { entries: entries.slice(), total: entries.length };
  }
  const result: CatalogEntry[] = [];
  for (const entry of entries) {
    if (!entryMatchesSearch(entry, needle)) continue;
    result.push(entry);
  }
  return { entries: result, total: result.length };
}

export function parseItemSelection(raw: string, chooserKind: string, selectedItemKind: string): { kind: string; id: number; raw: string } {
  const value = String(raw).trim();
  const match = value.match(/^(item|weapon|armor)\s*:\s*(\d+)$/i);
  if (match) {
    return { kind: match[1].toLowerCase(), id: Number(match[2]), raw: `${match[1].toLowerCase()}:${match[2]}` };
  }
  const kind = chooserKind === "all" ? selectedItemKind : chooserKind;
  return { kind, id: numberValue(value, NaN), raw: value };
}

function numberValue(text: string, fallback = 0): number {
  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
}

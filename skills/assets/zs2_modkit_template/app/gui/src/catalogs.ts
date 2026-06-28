namespace Zs2Gui.Catalogs {
  const fs = require("fs");
  const path = require("path");

  export interface CatalogContext {
    dataDir: string;
    useDataDir: string;
    costumeDataPath: string;
    itemKindLabels: Record<string, string>;
    readJson(file: string): any;
    looseNumber(value: any): number;
  }

  export function loadCatalogs(context: CatalogContext): Record<string, any[]> {
    const systemData = context.readJson(path.join(context.dataDir, "System.json")) || {};
    const catalogs: Record<string, any[]> = {
      variable: loadNamedArrayCatalog(systemData.variables || []),
      switch: loadNamedArrayCatalog(systemData.switches || []),
      item: loadCatalog(context, "Items.json"),
      weapon: loadCatalog(context, "Weapons.json"),
      armor: loadCatalog(context, "Armors.json"),
      actor: loadCatalog(context, "Actors.json"),
      skill: loadCatalog(context, "Skills.json"),
      title: loadTitleCatalog(context),
      costume: loadCostumeCatalog(context),
      map: loadMapCatalog(context),
      huntMap: loadHuntMapCatalog(context),
      troop: loadTroopCatalog(context),
      commonEvent: loadCommonEventCatalog(context)
    };
    catalogs.all = buildAllItemCatalog(catalogs, context.itemKindLabels);
    return catalogs;
  }

  export function catalogName(catalogs: Record<string, any[]>, kind: string, id: any): string {
    const item = catalogEntry(catalogs, kind, id);
    return item ? item.name : "";
  }

  export function catalogEntry(catalogs: Record<string, any[]>, kind: string, id: any): any {
    const list = catalogs[kind] || [];
    return list.find((entry) => {
      if (kind === "all") return entry.uid === String(id) || entry.id === Number(id);
      return entry.id === Number(id);
    }) || null;
  }

  function loadCatalog(context: CatalogContext, fileName: string): any[] {
    try {
      const file = path.join(context.dataDir, fileName);
      if (!fs.existsSync(file)) return [];
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Array.isArray(data)) return [];
      return data
        .filter((entry) => entry && Number.isFinite(Number(entry.id)) && entry.name)
        .map((entry) => {
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
            characterName: entry.characterName ? String(entry.characterName) : ""
          };
        });
    } catch {
      return [];
    }
  }

  function loadTitleCatalog(context: CatalogContext): any[] {
    const rows: any[] = [];
    const seen = new Set<number>();
    const push = (entry, key) => {
      const id = Math.floor(context.looseNumber(entry && entry.tile));
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
      seen.add(id);
      const name = cleanText(entry.name || entry.title || `称号 ${id}`);
      const description = cleanText(entry.descEx || entry.description || entry.desc || "");
      rows.push({
        id,
        sourceId: Math.floor(context.looseNumber(key)),
        name,
        description,
        noteText: "",
        value: id,
        label: `${id} / ${name}`,
        searchText: makeSearchText([id, key, name, description])
      });
    };
    try {
      if (!fs.existsSync(context.useDataDir)) return [];
      fs.readdirSync(context.useDataDir)
        .filter((name) => /\.json$/i.test(name))
        .forEach((name) => {
          const data = context.readJson(path.join(context.useDataDir, name));
          if (!data || typeof data !== "object") return;
          if (Array.isArray(data)) data.forEach((entry, index) => push(entry, index));
          else Object.keys(data).forEach((key) => push(data[key], key));
        });
    } catch {
      return rows.sort((a, b) => a.id - b.id);
    }
    return rows.sort((a, b) => a.id - b.id || a.sourceId - b.sourceId);
  }

  function loadCostumeCatalog(context: CatalogContext): any[] {
    const data = context.readJson(context.costumeDataPath);
    const rows: any[] = [];
    const seen = new Set<number>();
    const push = (entry, key) => {
      const id = Math.floor(context.looseNumber(entry && entry.id));
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
      seen.add(id);
      const name = cleanText(entry.name || `换装 ${id}`);
      const description = cleanText(entry.desc || entry.description || "");
      const equipId = Math.floor(context.looseNumber(entry.equipId));
      rows.push({
        id,
        sourceId: Math.floor(context.looseNumber(key)),
        name,
        description,
        noteText: "",
        equipId: Number.isFinite(equipId) ? equipId : undefined,
        characterName: cleanText(entry.characterName || ""),
        characterIndex: Number(entry.characterIndex || 0),
        value: id,
        label: `${id} / ${name}`,
        searchText: makeSearchText([id, key, name, description, entry.equipId, entry.characterName])
      });
    };
    if (Array.isArray(data)) data.forEach((entry, index) => push(entry, index));
    else if (data && typeof data === "object") Object.keys(data).forEach((key) => push(data[key], key));
    return rows.sort((a, b) => a.id - b.id || a.sourceId - b.sourceId);
  }

  function makeSearchText(parts: any[]): string {
    return parts
      .filter((part) => part != null && part !== "")
      .map((part) => String(part))
      .join(" ")
      .toLowerCase();
  }

  function buildAllItemCatalog(catalogs: Record<string, any[]>, itemKindLabels: Record<string, string>): any[] {
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
          kindLabel
        ])
      }));
    });
  }

  function loadNamedArrayCatalog(names: any[]): any[] {
    return names
      .map((name, index) => {
        const text = cleanText(name || "");
        return text ? {
          id: index,
          name: text,
          description: "",
          noteText: "",
          searchText: makeSearchText([index, text, name])
        } : null;
      })
      .filter(Boolean);
  }

  function loadMapCatalog(context: CatalogContext): any[] {
    const data = context.readJson(path.join(context.dataDir, "MapInfos.json")) || [];
    if (!Array.isArray(data)) return [];
    return data
      .filter((entry) => entry && Number.isFinite(Number(entry.id)) && entry.name)
      .map((entry) => {
        const parent = entry.parentId == null ? "" : `父级 ${entry.parentId}`;
        const order = entry.order == null ? "" : `序 ${entry.order}`;
        return {
          id: Number(entry.id),
          name: cleanText(entry.name),
          description: [parent, order].filter(Boolean).join(" / "),
          noteText: "",
          parentId: entry.parentId,
          order: entry.order,
          searchText: makeSearchText([entry.id, entry.name, parent, order])
        };
      });
  }

  function dropKindFromIndex(kind: any): string {
    if (kind === 1 || kind === "1" || String(kind).toLowerCase() === "item") return "item";
    if (kind === 2 || kind === "2" || String(kind).toLowerCase() === "weapon") return "weapon";
    if (kind === 3 || kind === "3" || String(kind).toLowerCase() === "armor") return "armor";
    return "";
  }

  function localDropTables(context: CatalogContext): Record<string, any[]> {
    return {
      item: context.readJson(path.join(context.dataDir, "Items.json")) || [],
      weapon: context.readJson(path.join(context.dataDir, "Weapons.json")) || [],
      armor: context.readJson(path.join(context.dataDir, "Armors.json")) || []
    };
  }

  function localDropNamesOfEnemy(context: CatalogContext, enemy, tables = localDropTables(context)): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    const add = (kind, id) => {
      const normalized = dropKindFromIndex(kind);
      const table = tables[normalized];
      const entry = table && table[Number(id)];
      if (!normalized || !entry || !entry.name) return;
      const key = `${normalized}:${id}`;
      if (seen.has(key)) return;
      seen.add(key);
      names.push(`${context.itemKindLabels[normalized] || normalized}:${cleanText(entry.name)}`);
    };
    const note = String(enemy && enemy.note || "");
    const match = note.match(/<\s*Enemy Drops\s*>([\s\S]*?)<\s*\/\s*Enemy Drops\s*>/i);
    if (match) {
      match[1].split(/\r?\n/).forEach((line) => {
        const parsed = line.trim().match(/^(item|weapon|armor)\s+(\d+)\s*:/i);
        if (parsed) add(parsed[1], parsed[2]);
      });
    }
    (enemy && enemy.dropItems || []).forEach((drop) => {
      if (drop && drop.kind && drop.dataId) add(drop.kind, drop.dataId);
    });
    return names;
  }

  function localTroopDetails(context: CatalogContext, troop, enemies, tables = localDropTables(context)): any {
    const visibleMembers = (troop && troop.members || []).filter((member) => member && !member.hidden && Number(member.enemyId) > 0);
    const enemyRows = visibleMembers.map((member) => enemies[Number(member.enemyId)]).filter(Boolean);
    const enemyCounts: Record<string, any> = {};
    let exp = 0;
    let gold = 0;
    const maps = new Set<string>();
    const dropNames = new Set<string>();
    enemyRows.forEach((enemy) => {
      const enemyId = Number(enemy.id || 0);
      const enemyName = cleanText(enemy.name || "");
      const key = `${enemyId}:${enemyName}`;
      if (!enemyCounts[key]) enemyCounts[key] = { id: enemyId, name: enemyName, count: 0 };
      enemyCounts[key].count += 1;
      exp += Number(enemy.exp || 0);
      gold += Number(enemy.gold || 0);
      const mapMatch = String(enemy.note || "").match(/<\s*enemyMap\s*:\s*([^>]+)>/i);
      if (mapMatch && cleanText(mapMatch[1])) maps.add(cleanText(mapMatch[1]));
      localDropNamesOfEnemy(context, enemy, tables).forEach((name) => dropNames.add(name));
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
      dropNames: Array.from(dropNames)
    };
  }

  function loadHuntMapCatalog(context: CatalogContext): any[] {
    const mapInfos = context.readJson(path.join(context.dataDir, "MapInfos.json")) || [];
    const troops = context.readJson(path.join(context.dataDir, "Troops.json")) || [];
    const enemies = context.readJson(path.join(context.dataDir, "Enemies.json")) || [];
    const tables = localDropTables(context);
    if (!fs.existsSync(context.dataDir)) return [];
    try {
      const ids = new Set<number>();
      if (Array.isArray(mapInfos)) {
        mapInfos.forEach((entry) => {
          if (entry && Number(entry.id) > 0 && entry.name) ids.add(Number(entry.id));
        });
      }
      fs.readdirSync(context.dataDir).forEach((name) => {
        const match = name.match(/^Map(\d{3})\.json$/i);
        if (match) ids.add(Number(match[1]));
      });
      return Array.from(ids)
        .sort((a, b) => a - b)
        .map((id) => {
          const map = context.readJson(path.join(context.dataDir, `Map${String(id).padStart(3, "0")}.json`));
          const info = mapInfos[id] || {};
          if (!map && !info.name) return null;
          const encounters = map && Array.isArray(map.encounterList)
            ? map.encounterList.filter((entry) => entry && Number(entry.troopId) > 0)
            .map((entry) => ({
              troopId: Number(entry.troopId),
              weight: Number(entry.weight || 0),
              regionSet: Array.isArray(entry.regionSet) ? entry.regionSet.map(Number).filter(Number.isFinite) : []
            }))
            : [];
          const hasEncounters = encounters.length > 0;
          const nameText = cleanText(map && map.displayName || info.name || `Map${id}`);
          const troopIds = Array.from(new Set<number>(encounters.map((entry) => Number(entry.troopId)))).sort((a, b) => a - b);
          const troopNames = troopIds
            .map((troopId) => troops[troopId] && cleanText(troops[troopId].name || ""))
            .filter(Boolean);
          const troopDetails = troopIds.map((troopId) => localTroopDetails(context, troops[troopId], enemies, tables));
          const enemyNames = Array.from(new Set(troopDetails.flatMap((detail) => detail.enemyNames).filter(Boolean)));
          const dropNames = Array.from(new Set(troopDetails.flatMap((detail) => detail.dropNames).filter(Boolean)));
          const regions = Array.from(new Set<number>(encounters.flatMap((entry) => entry.regionSet.map(Number)))).sort((a, b) => a - b);
          const description = [
            hasEncounters ? `${encounters.length} 组遇敌` : "无随机遇敌",
            hasEncounters ? `步数 ${Number(map && map.encounterStep || 0) || "-"}` : "可改用敌群挂机",
            enemyNames.length ? `怪物 ${enemyNames.length} 种` : troopNames.slice(0, 4).join("、"),
            dropNames.length ? `掉落 ${dropNames.length} 种` : "",
            regions.length ? `区域 ${regions.slice(0, 8).join(",")}` : ""
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
              hasEncounters ? "可挂机" : "无遇敌 无随机遇敌"
            ])
          };
        })
        .filter(Boolean)
        .sort((a, b) => Number(!a.hasEncounters) - Number(!b.hasEncounters) || a.id - b.id);
    } catch {
      return [];
    }
  }

  function loadTroopCatalog(context: CatalogContext): any[] {
    const troops = context.readJson(path.join(context.dataDir, "Troops.json")) || [];
    const enemies = context.readJson(path.join(context.dataDir, "Enemies.json")) || [];
    const tables = localDropTables(context);
    if (!Array.isArray(troops)) return [];
    return troops
      .filter((entry) => entry && Number.isFinite(Number(entry.id)) && (entry.name || Array.isArray(entry.members)))
      .map((entry) => {
        const id = Number(entry.id);
        const details = localTroopDetails(context, entry, enemies, tables);
        const name = cleanText(entry.name || details.enemyNames.join(", ") || `敌群 ${id}`);
        const tags = Array.from(name.matchAll(/【([^】]+)】/g)).map((match) => match[1]);
        const description = [
          tags.length ? tags.join(" / ") : "",
          details.enemyText,
          `EXP ${details.exp}`,
          `金币 ${details.gold}`,
          details.dropNames.length ? `掉落 ${details.dropNames.length} 种` : "无掉落表"
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
            "罕见"
          ])
        };
      })
      .filter((entry) => entry.name)
      .sort((a, b) => a.id - b.id);
  }

  function loadCommonEventCatalog(context: CatalogContext): any[] {
    const data = context.readJson(path.join(context.dataDir, "CommonEvents.json")) || [];
    if (!Array.isArray(data)) return [];
    return data
      .filter((entry) => entry && Number.isFinite(Number(entry.id)) && entry.name)
      .map((entry) => {
        const trigger = entry.trigger === 1 ? "自动" : entry.trigger === 2 ? "并行" : "调用";
        const sw = entry.switchId ? `开关 ${entry.switchId}` : "";
        return {
          id: Number(entry.id),
          name: cleanText(entry.name),
          description: [trigger, sw].filter(Boolean).join(" / "),
          noteText: "",
          trigger: entry.trigger,
          switchId: entry.switchId,
          searchText: makeSearchText([entry.id, entry.name, trigger, sw])
        };
      });
  }

  function cleanText(value: any): string {
    return String(value == null ? "" : value)
      .replace(/\\[A-Z]+\[[^\]]*\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanNote(value: any): string {
    return cleanText(value)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

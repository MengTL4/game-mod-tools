  function callHangupMethod(methodName, statName) {
    const party = resolveParty();
    if (!party || typeof party[methodName] !== "function") throw new Error(`${methodName} is unavailable`);
    const result = party[methodName].call(party);
    refreshMapAndWindows();
    bumpBattleStat(statName, {});
    return {
      result: compactRuntimeValue(result, 2),
      hangup: hangupSummary()
    };
  }

  function offlineHuntSummary() {
    return {
      dataDir,
      dataAvailable: fs.existsSync(dataDir),
      preview: bridge.offlineHuntStats.preview || null,
      last: bridge.offlineHuntStats.last || null,
      totals: { ...bridge.offlineHuntStats }
    };
  }

  function normalizeDropKind(kind) {
    const value = String(kind || "").toLowerCase();
    if (value === "1" || value === "item") return "item";
    if (value === "2" || value === "weapon") return "weapon";
    if (value === "3" || value === "armor" || value === "armour") return "armor";
    return "";
  }

  function dropKindIndex(kind) {
    if (kind === "item") return 1;
    if (kind === "weapon") return 2;
    if (kind === "armor") return 3;
    return 0;
  }

  function dropTable(kind) {
    if (kind === "item") return dataTable("item");
    if (kind === "weapon") return dataTable("weapon");
    if (kind === "armor") return dataTable("armor");
    return [];
  }

  function runtimeDropTable(kind) {
    if (kind === "item") return runtimeDataTable("item");
    if (kind === "weapon") return runtimeDataTable("weapon");
    if (kind === "armor") return runtimeDataTable("armor");
    return [];
  }

  function itemKindOfObject(item) {
    if (!item) return "";
    const id = Number(item.id);
    for (const kind of ["item", "weapon", "armor"]) {
      const table = dataTable(kind);
      if (table && table[id] === item) return kind;
    }
    for (const kind of ["item", "weapon", "armor"]) {
      const table = dataTable(kind);
      if (table && table[id] && table[id].name === item.name) return kind;
    }
    return "item";
  }

  function itemSummary(item) {
    if (!item) return null;
    const kind = itemKindOfObject(item);
    const quality = itemQuality(item, kind);
    return {
      kind,
      id: Number(item.id || 0),
      name: String(item.name || ""),
      iconIndex: Number(item.iconIndex || 0),
      quality,
      qualityLabel: qualityLabel(quality)
    };
  }

  function itemKey(summary) {
    return `${summary.kind}:${summary.id}:${summary.name}`;
  }

  function addDropGroup(groups, item, count) {
    const summary = itemSummary(item);
    if (!summary || !summary.id) return;
    const key = itemKey(summary);
    if (!groups[key]) groups[key] = { ...summary, count: 0 };
    groups[key].count += count || 1;
  }

  function addDropSummaryGroup(groups, summary, count) {
    if (!summary || !summary.id) return;
    const key = itemKey(summary);
    if (!groups[key]) groups[key] = { ...summary, count: 0 };
    groups[key].count += count || 1;
  }

  function itemQuality(item, kind) {
    if (!item || typeof item !== "object") return null;
    const values = [
      item.quality,
      item.meta && item.meta.quality,
      item.meta && item.meta.Quality
    ];
    for (const value of values) {
      const number = looseNumber(value);
      if (Number.isFinite(number)) return Math.floor(number);
    }
    const match = String(item.note || "").match(/<\s*quality\s*:\s*([+-]?\d+(?:\.\d+)?)\s*>/i);
    if (match) return Math.floor(Number(match[1]));
    const tableKind = kind || itemKindOfObject(item);
    if (tableKind === "weapon" || tableKind === "armor") {
      const table = dropTable(tableKind);
      const baseId = Math.floor(looseNumber(item.baseItemId || item.baseId || item.id));
      const base = baseId > 0 && table && table[baseId];
      if (base && base !== item) return itemQuality(base, tableKind);
    }
    return null;
  }

  function qualityLabel(quality) {
    const labels = {
      0: "灰",
      1: "白",
      2: "绿",
      3: "蓝",
      4: "紫",
      5: "橙",
      6: "红",
      7: "金"
    };
    return Object.prototype.hasOwnProperty.call(labels, quality) ? labels[quality] : "";
  }

  function normalizeQualitySet(value) {
    const rows = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.keys(value).filter(key => toBool(value[key]))
        : String(value == null ? "" : value).split(/[,\s|]+/);
    const set = new Set();
    rows.forEach((row) => {
      const number = Math.floor(looseNumber(row));
      if (Number.isFinite(number)) set.add(number);
    });
    return set;
  }

  function offlineLootConfig(command) {
    return {
      autoSellQualities: normalizeQualitySet(command.autoSellQualities),
      blockDropQualities: normalizeQualitySet(command.blockDropQualities)
    };
  }

  function offlineSellPrice(item) {
    const price = Math.max(0, Number(item && item.price || 0));
    return Math.floor(price / 2);
  }

  function classifyOfflineDrop(item, config) {
    const summary = itemSummary(item);
    if (!summary || (summary.kind !== "weapon" && summary.kind !== "armor")) {
      return { action: "keep", summary, price: 0 };
    }
    const quality = summary.quality;
    if (Number.isFinite(Number(quality)) && config.blockDropQualities.has(quality)) {
      return { action: "block", summary, price: 0 };
    }
    if (Number.isFinite(Number(quality)) && config.autoSellQualities.has(quality)) {
      return { action: "sell", summary, price: offlineSellPrice(item) };
    }
    return { action: "keep", summary, price: 0 };
  }

  function noteEnemyDrops(enemy, rate) {
    const note = String(enemy && enemy.note || "");
    const match = note.match(/<\s*Enemy Drops\s*>([\s\S]*?)<\s*\/\s*Enemy Drops\s*>/i);
    if (!match) return [];
    const drops = [];
    match[1].split(/\r?\n/).forEach((line) => {
      const parsed = line.trim().match(/^(item|weapon|armor)\s+(\d+)\s*:\s*([\d.]+)\s*%/i);
      if (!parsed) return;
      const kind = normalizeDropKind(parsed[1]);
      const id = Math.floor(Number(parsed[2]));
      const percent = Number(parsed[3]);
      const table = dropTable(kind);
      const item = table && table[id];
      if (!item || !Number.isFinite(percent)) return;
      const rateValue = rate == null ? 1 : Number(rate);
      const chance = Math.max(0, Math.min(1, (percent / 100) * Math.max(0, rateValue)));
      drops.push({ kind, id, chance, item });
    });
    return drops;
  }

  function possibleEnemyDrops(enemy) {
    const drops = [];
    const seen = new Set();
    const pushDrop = (drop) => {
      const key = `${drop.kind}:${drop.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      drops.push(drop);
    };
    noteEnemyDrops(enemy, 1).forEach((drop) => {
      pushDrop({
        kind: drop.kind,
        id: drop.id,
        name: drop.item && drop.item.name || "",
        chance: drop.chance,
        quality: itemQuality(drop.item, drop.kind),
        qualityLabel: qualityLabel(itemQuality(drop.item, drop.kind))
      });
    });
    (enemy && enemy.dropItems || []).forEach((drop) => {
      if (!drop || !drop.kind || !drop.dataId) return;
      const kind = normalizeDropKind(drop.kind);
      const item = kind ? dropTable(kind)[drop.dataId] : null;
      if (!item) return;
      pushDrop({
        kind,
        id: Number(drop.dataId),
        name: item.name || "",
        chance: 1 / Math.max(1, Number(drop.denominator || 1)),
        quality: itemQuality(item, kind),
        qualityLabel: qualityLabel(itemQuality(item, kind))
      });
    });
    return drops;
  }

  function troopDataPreview(troopId) {
    const troops = dataTable("troop");
    const enemies = dataTable("enemy");
    const troop = troops && troops[troopId];
    if (!troop) return null;
    let exp = 0;
    let gold = 0;
    const enemyRows = [];
    const possibleDrops = [];
    const possibleDropKeys = new Set();
    (troop.members || []).forEach((member) => {
      if (!member || member.hidden) return;
      const enemy = enemies && enemies[member.enemyId];
      if (!enemy) return;
      exp += Number(enemy.exp || 0);
      gold += Number(enemy.gold || 0);
      enemyRows.push({ id: Number(member.enemyId), name: enemy.name || "", exp: Number(enemy.exp || 0), gold: Number(enemy.gold || 0) });
      possibleEnemyDrops(enemy).forEach((drop) => {
        const key = `${drop.kind}:${drop.id}`;
        if (possibleDropKeys.has(key)) return;
        possibleDropKeys.add(key);
        possibleDrops.push({ ...drop, enemyId: Number(member.enemyId), enemyName: enemy.name || "" });
      });
    });
    return {
      id: troopId,
      name: troop.name || "",
      exp,
      gold,
      enemies: enemyRows,
      possibleDrops: possibleDrops.slice(0, 80)
    };
  }

  function dataTroopReward(troopId) {
    const preview = troopDataPreview(troopId);
    if (!preview) return null;
    const enemies = dataTable("enemy");
    const items = [];
    preview.enemies.forEach((enemyRow) => {
      const enemy = enemies && enemies[enemyRow.id];
      const noteDropKeys = new Set();
      noteEnemyDrops(enemy, bridge.options.dropRate).forEach((drop) => {
        noteDropKeys.add(`${drop.kind}:${drop.id}`);
        if (Math.random() < drop.chance) items.push(drop.item);
      });
      (enemy && enemy.dropItems || []).forEach((drop) => {
        if (!drop || !drop.kind || !drop.dataId) return;
        const kind = normalizeDropKind(drop.kind);
        if (!kind || noteDropKeys.has(`${kind}:${drop.dataId}`)) return;
        const item = dropTable(kind)[drop.dataId];
        const rateValue = bridge.options.dropRate == null ? 1 : Number(bridge.options.dropRate);
        const chance = Math.min(1, Math.max(0, rateValue) / Math.max(1, Number(drop.denominator || 1)));
        if (item && Math.random() < chance) items.push(item);
      });
    });
    return { exp: preview.exp, gold: preview.gold, items, enemyIds: preview.enemies.map(enemy => enemy.id), source: "data" };
  }

  function offlineTroopReward(troopId) {
    // Keep offline hunts data-only. Instantiating a temporary Game_Troop can run
    // enemy/drop/battle plugin code outside a real battle and poison later saves.
    return dataTroopReward(troopId);
  }

  function offlineEncounterList(mapId, regionId) {
    const data = localMapData(mapId);
    if (!data || !Array.isArray(data.encounterList)) return [];
    let list = data.encounterList
      .filter(encounter => encounter && Number(encounter.troopId) > 0)
      .map(encounter => ({
        troopId: Math.floor(Number(encounter.troopId)),
        weight: Math.max(0, Number(encounter.weight || 0)),
        regionSet: Array.isArray(encounter.regionSet) ? encounter.regionSet.map(Number).filter(Number.isFinite) : []
      }));
    const region = Math.floor(Number(regionId || 0));
    if (region > 0) {
      const filtered = list.filter(encounter => !encounter.regionSet.length || encounter.regionSet.includes(region));
      if (filtered.length) list = filtered;
    }
    return list;
  }

  function chooseWeightedEncounter(encounters) {
    if (!encounters.length) return null;
    const total = encounters.reduce((sum, encounter) => sum + Math.max(0, Number(encounter.weight || 0)), 0);
    if (total <= 0) return encounters[Math.floor(Math.random() * encounters.length)];
    let roll = Math.random() * total;
    for (const encounter of encounters) {
      roll -= Math.max(0, Number(encounter.weight || 0));
      if (roll <= 0) return encounter;
    }
    return encounters[encounters.length - 1];
  }

  function offlineHuntMapPreview(command) {
    const mapId = Math.floor(requireNumber(command.mapId, "mapId"));
    const regionId = command.regionId == null || command.regionId === "" ? 0 : Math.floor(requireNumber(command.regionId, "regionId"));
    const map = localMapData(mapId);
    if (!map) throw new Error(`map ${mapId} data is unavailable`);
    const mapInfos = dataTable("mapInfo");
    const info = mapInfos && mapInfos[mapId] || {};
    const encounters = offlineEncounterList(mapId, regionId);
    const troops = encounters.map((encounter) => ({
      ...encounter,
      preview: troopDataPreview(encounter.troopId)
    })).filter(row => row.preview);
    const totalWeight = encounters.reduce((sum, encounter) => sum + Math.max(0, Number(encounter.weight || 0)), 0);
    const weighted = troops.reduce((sum, row) => {
      const weight = totalWeight > 0 ? row.weight : 1;
      return {
        exp: sum.exp + row.preview.exp * weight,
        gold: sum.gold + row.preview.gold * weight,
        weight: sum.weight + weight
      };
    }, { exp: 0, gold: 0, weight: 0 });
    const rateExp = Number(bridge.options.expRate || 1);
    const rateGold = Number(bridge.options.goldRate || 1);
    return {
      mapId,
      name: map.displayName || info.name || `Map${mapId}`,
      encounterStep: map.encounterStep || 0,
      encounterCount: encounters.length,
      regionId,
      average: weighted.weight > 0 ? {
        exp: Math.floor((weighted.exp / weighted.weight) * rateExp),
        gold: Math.floor((weighted.gold / weighted.weight) * rateGold)
      } : { exp: 0, gold: 0 },
      troops: troops.slice(0, 80)
    };
  }

  function offlineHuntTroopPreview(command) {
    const troopId = Math.floor(requireNumber(command.troopId, "troopId"));
    const preview = troopDataPreview(troopId);
    if (!preview) throw new Error(`troop ${troopId} data is unavailable`);
    const rateExp = Number(bridge.options.expRate || 1);
    const rateGold = Number(bridge.options.goldRate || 1);
    return {
      mode: "troop",
      mapId: command.mapId == null || command.mapId === "" ? 0 : Math.floor(Number(command.mapId) || 0),
      troopId,
      name: preview.name || `Troop${troopId}`,
      encounterStep: 0,
      encounterCount: 1,
      regionId: 0,
      average: {
        exp: Math.floor(preview.exp * rateExp),
        gold: Math.floor(preview.gold * rateGold)
      },
      troops: [{ troopId, weight: 1, regionSet: [], preview }]
    };
  }

  function offlineHuntPreview(command) {
    if (command && command.troopId != null && command.troopId !== "") return offlineHuntTroopPreview(command);
    return offlineHuntMapPreview(command);
  }

  function revealEnemyBookIds(enemyIds) {
    const ids = uniqueNumericIds(enemyIds);
    if (!ids.length) return { count: 0, saved: false };
    const config = requireConfigManager();
    if (!Array.isArray(config.enemyBook)) config.enemyBook = [];
    ids.forEach((id) => {
      config.enemyBook[id] = 1;
    });
    const weaknessRepair = sanitizeEnemyWeaknessStore();
    return { count: ids.length, saved: saveConfig(), weaknessRepair };
  }

  function saveGameToSlot(savefileId) {
    const dataManager = resolveDataManager();
    if (!dataManager || typeof dataManager.saveGame !== "function") throw new Error("saveGame is unavailable");
    const id = Math.floor(requireNumber(savefileId || 1, "id"));
    if (id <= 0) throw new Error("save slot id must be positive");
    sanitizeEnemyWeaknessStore();
    const result = dataManager.saveGame(id);
    return { id, result: String(result) };
  }

  function recoverPartyMembers() {
    const party = resolveParty();
    const members = getPartyMembers(party);
    members.forEach(actor => {
      if (actor && typeof actor.recoverAll === "function") actor.recoverAll();
      else {
        if (actor && typeof actor.setHp === "function" && actor.mhp != null) actor.setHp(actor.mhp);
        if (actor && typeof actor.setMp === "function" && actor.mmp != null) actor.setMp(actor.mmp);
        if (actor && typeof actor.setTp === "function") actor.setTp(100);
      }
      refreshActor(actor);
    });
    refreshMapAndWindows();
    return { count: members.length };
  }

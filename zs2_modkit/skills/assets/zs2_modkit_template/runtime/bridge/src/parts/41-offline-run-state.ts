  function runOfflineHunt(command) {
    const party = resolveParty();
    if (!party) throw new Error("game party is unavailable");
    const fixedTroopId = command.troopId == null || command.troopId === "" ? 0 : Math.floor(requireNumber(command.troopId, "troopId"));
    const mapId = fixedTroopId > 0 && (command.mapId == null || command.mapId === "")
      ? 0
      : Math.floor(requireNumber(command.mapId, "mapId"));
    const times = Math.max(1, Math.min(5000, Math.floor(requireNumber(command.times || 1, "times"))));
    const regionId = command.regionId == null || command.regionId === "" ? 0 : Math.floor(requireNumber(command.regionId, "regionId"));
    const encounters = fixedTroopId > 0
      ? [{ troopId: fixedTroopId, weight: 1, regionSet: [] }]
      : offlineEncounterList(mapId, regionId);
    if (!encounters.length) throw new Error(`map ${mapId} has no encounter list`);

    const expRate = Number(bridge.options.expRate || 1);
    const goldRate = Number(bridge.options.goldRate || 1);
    const troopGroups = Object.create(null);
    const enemyGroups = Object.create(null);
    const dropGroups = Object.create(null);
    const autoSellGroups = Object.create(null);
    const blockedDropGroups = Object.create(null);
    const skippedDropGroups = Object.create(null);
    const enemyIds = [];
    const lootConfig = offlineLootConfig(command);
    let baseExp = 0;
    let baseGold = 0;
    let autoSellGold = 0;
    let autoSellCount = 0;
    let blockedDropCount = 0;
    let skippedDropCount = 0;
    let runtimeCount = 0;
    let dataCount = 0;

    for (let index = 0; index < times; index += 1) {
      const encounter = chooseWeightedEncounter(encounters);
      const troopId = encounter && encounter.troopId;
      const reward = offlineTroopReward(troopId);
      const preview = troopDataPreview(troopId);
      if (!reward) continue;
      if (String(reward.source || "").startsWith("runtime")) runtimeCount += 1;
      else dataCount += 1;
      baseExp += Number(reward.exp || 0);
      baseGold += Number(reward.gold || 0);
      const troopKey = String(troopId);
      if (!troopGroups[troopKey]) troopGroups[troopKey] = { id: troopId, name: preview && preview.name || "", count: 0 };
      troopGroups[troopKey].count += 1;
      (preview && preview.enemies || []).forEach((enemy) => {
        if (!enemyGroups[enemy.id]) enemyGroups[enemy.id] = { id: enemy.id, name: enemy.name || "", count: 0 };
        enemyGroups[enemy.id].count += 1;
      });
      (reward.enemyIds || []).forEach(id => enemyIds.push(id));
      (reward.items || []).forEach((item) => {
        const decision = classifyOfflineDrop(item, lootConfig);
        if (decision.action === "block") {
          blockedDropCount += 1;
          addDropGroup(blockedDropGroups, item, 1);
        } else if (decision.action === "sell") {
          autoSellCount += 1;
          autoSellGold += decision.price;
          addDropGroup(autoSellGroups, item, 1);
        } else {
          addDropGroup(dropGroups, item, 1);
        }
      });
    }

    const exp = scaledPositiveAmount(baseExp, expRate);
    const battleGold = scaledPositiveAmount(baseGold, goldRate);
    const gold = battleGold + autoSellGold;
    const members = getPartyMembers(party);
    withRatesSuppressed(() => {
      members.forEach((actor) => {
        if (actor && typeof actor.gainExp === "function") actor.gainExp(exp);
      });
      if (typeof party.gainGold === "function") party.gainGold(gold);
      else party._gold = Math.max(0, Number(party._gold || 0) + gold);
      Object.values(dropGroups).forEach((drop) => {
        const item = runtimeDropTable(drop.kind)[drop.id];
        if (item && typeof party.gainItem === "function") {
          party.gainItem(item, drop.count);
        } else {
          skippedDropCount += Number(drop.count || 0);
          addDropSummaryGroup(skippedDropGroups, drop, drop.count);
        }
      });
    });

    let enemyBook = null;
    if (toBool(command.enemyBook)) {
      try {
        enemyBook = revealEnemyBookIds(enemyIds);
      } catch (error) {
        enemyBook = { error: String(error && error.message || error) };
      }
    }
    let recovered = null;
    if (toBool(command.recover)) recovered = recoverPartyMembers();
    let saved = null;
    if (toBool(command.save)) saved = saveGameToSlot(command.saveSlot || 1);

    const result = {
      mode: fixedTroopId > 0 ? "troop" : "map",
      mapId,
      times,
      regionId,
      fixedTroopId,
      baseExp,
      baseGold,
      battleGold,
      autoSellGold,
      exp,
      gold,
      expRate,
      goldRate,
      dropRate: Number(bridge.options.dropRate == null ? 1 : bridge.options.dropRate),
      runtimeCount,
      dataCount,
      troopSummary: Object.values(troopGroups).sort((a, b) => b.count - a.count),
      enemySummary: Object.values(enemyGroups).sort((a, b) => b.count - a.count).slice(0, 120),
      dropSummary: Object.values(dropGroups).sort((a, b) => b.count - a.count).slice(0, 120),
      autoSell: {
        count: autoSellCount,
        gold: autoSellGold,
        summary: Object.values(autoSellGroups).sort((a, b) => b.count - a.count).slice(0, 80)
      },
      blockedDrops: {
        count: blockedDropCount,
        summary: Object.values(blockedDropGroups).sort((a, b) => b.count - a.count).slice(0, 80)
      },
      skippedDrops: {
        count: skippedDropCount,
        reason: skippedDropCount > 0 ? "runtime item data unavailable" : "",
        summary: Object.values(skippedDropGroups).sort((a, b) => b.count - a.count).slice(0, 80)
      },
      lootOptions: {
        autoSellQualities: Array.from(lootConfig.autoSellQualities),
        blockDropQualities: Array.from(lootConfig.blockDropQualities)
      },
      dropKindCounts: Object.values(dropGroups).reduce((counts, drop) => {
        const kind = drop && drop.kind || "item";
        counts[kind] = Number(counts[kind] || 0) + 1;
        return counts;
      }, {}),
      enemyBook,
      recovered,
      saved,
      goldNow: safeGold(party)
    };
    bridge.offlineHuntStats.runs = Number(bridge.offlineHuntStats.runs || 0) + 1;
    bridge.offlineHuntStats.last = { ts: Date.now(), ...result };
    bumpBattleStat("offlineHunt", { mapId, times, exp, gold, drops: result.dropSummary.length });
    refreshMapAndWindows();
    return result;
  }

  function collectState() {
    const party = resolveParty();
    const variables = resolveVariables();
    const switches = resolveSwitches();
    const dataManager = resolveDataManager();
    const enemyWeaknessRepair = sanitizeEnemyWeaknessStore();
    patchTrainerHooks();
    preserveNoCostResources("state");
    const mapInfo = currentMapInfo();
    return {
      ts: Date.now(),
      href: location.href,
      title: document.title,
      bridgeVersion: bridge.version,
      hasNode: true,
      cwd: process.cwd(),
      saveDir,
      saveTargets: {
        config: saveFilePath(-1),
        global: saveFilePath(0),
        slot1: saveFilePath(1),
        legacyConfig: path.join(saveDir, "file-1.rpgsave"),
        configUsesLegacyPath: path.basename(saveFilePath(-1)).toLowerCase() === "file-1.rpgsave"
      },
      saveDirExists: fs.existsSync(saveDir),
      saveFiles: (() => {
        try {
          return fs.existsSync(saveDir) ? fs.readdirSync(saveDir).filter(name => /\.rpgsave$/i.test(name)).sort() : [];
        } catch (_) {
          return [];
        }
      })(),
      storagePatched: !!(
        window.StorageManager && window.StorageManager.__codexSavePathPatched ||
        window.TK && window.TK.$ && window.TK.$.StorageMrg && window.TK.$.StorageMrg.__codexSavePathPatched
      ),
      hasTK: !!window.TK,
      hasParty: !!party,
      gold: safeGold(party),
      hasVariables: !!variables,
      hasSwitches: !!switches,
      hasDataManager: !!dataManager,
      currentMap: mapInfo,
      partyMembers: getPartyMembers(party).map(actorInfo).filter(Boolean),
      trainerOptions: { ...bridge.options },
      baby: babySummary(),
      progress: progressSummary(),
      hangup: hangupSummary(),
      offlineHunt: offlineHuntSummary(),
      enemyWeaknessRepair,
      rateStats: { ...bridge.rateStats },
      battleStats: { ...bridge.battleStats },
      hookTargets: bridge.hookTargets.slice(),
      hooksPatched: bridge.hooksPatched,
      lastError: bridge.lastError
    };
  }

  function writeState() {
    ensureDir();
    fs.writeFileSync(statePath, JSON.stringify(collectState(), null, 2), "utf8");
  }

  function looseNumber(value) {
    if (typeof value === "number") return value;
    const text = String(value == null ? "" : value).trim();
    if (text === "") return NaN;
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function requireNumber(value, name) {
    const number = looseNumber(value);
    if (!Number.isFinite(number)) throw new Error(`${name} must be a number, got ${JSON.stringify(value)}`);
    return number;
  }

  function uniqueNumericIds(values) {
    const seen = Object.create(null);
    const result = [];
    values.forEach((value) => {
      const id = Math.floor(looseNumber(value));
      if (!Number.isFinite(id) || id <= 0 || seen[id]) return;
      seen[id] = true;
      result.push(id);
    });
    return result;
  }

  function commandIds(command) {
    if (!command) return [];
    if (Array.isArray(command)) {
      return uniqueNumericIds(command.flatMap((value) => String(value).split(/[,\s]+/)));
    }
    if (typeof command !== "object") {
      return uniqueNumericIds(String(command).split(/[,\s]+/));
    }
    if (Array.isArray(command.ids)) {
      return uniqueNumericIds(command.ids.flatMap((value) => String(value).split(/[,\s]+/)));
    }
    if (command.ids != null && command.ids !== "") {
      return uniqueNumericIds(String(command.ids).split(/[,\s]+/));
    }
    if (command.id != null && command.id !== "") return uniqueNumericIds([command.id]);
    return [];
  }

  function requireConfigManager() {
    const config = resolveConfigManager();
    if (!config) throw new Error("ConfigManager is unavailable");
    return config;
  }

  function saveConfig() {
    const config = requireConfigManager();
    if (typeof config.save === "function") {
      config.save();
      return true;
    }
    return false;
  }

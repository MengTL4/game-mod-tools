  function sanitizeEnemyWeaknessStore() {
    const system = resolveSystem();
    if (!system) return { available: false, repaired: 0, initialized: false };
    let store = system._revealedEnemyWeaknesses;
    let initialized = false;
    if (!store || typeof store !== "object") {
      if (typeof system.initializeRevealedEnemyWeaknesses === "function") {
        try {
          system.initializeRevealedEnemyWeaknesses();
          initialized = true;
        } catch (error) {
          bridge.lastError = String(error && error.stack || error);
        }
      }
      store = system._revealedEnemyWeaknesses;
      if (!store || typeof store !== "object") {
        store = {};
        system._revealedEnemyWeaknesses = store;
        initialized = true;
      }
    }

    let repaired = 0;
    Object.keys(store).forEach((key) => {
      if (key === "@c" || key === "@a") return;
      const id = Math.floor(looseNumber(key));
      if (!Number.isFinite(id) || id <= 0) return;
      const value = store[key];
      if (Array.isArray(value)) return;
      if (value && typeof value === "object" && Array.isArray(value["@a"])) {
        store[key] = uniqueNumericIds(value["@a"]);
      } else {
        store[key] = [];
      }
      repaired += 1;
    });
    if (repaired > 0) bridge.enemyWeaknessRepair = { ts: Date.now(), repaired };
    return { available: true, repaired, initialized };
  }

  function readJsonFile(file) {
    try {
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      return null;
    }
  }

  function cleanText(value) {
    return String(value == null ? "" : value)
      .replace(/\\[A-Z]+\[[^\]]*\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function countTruthyEntries(value) {
    if (!value || typeof value !== "object") return 0;
    return Object.keys(value).reduce((count, key) => value[key] ? count + 1 : count, 0);
  }

  function localTitleEntries() {
    if (localCatalogCache.titles) return localCatalogCache.titles;
    const rows = [];
    const seen = Object.create(null);
    const push = (entry, key) => {
      const id = Math.floor(looseNumber(entry && entry.tile));
      if (!Number.isFinite(id) || id <= 0 || seen[id]) return;
      seen[id] = true;
      const name = cleanText(entry.name || entry.title || `称号 ${id}`);
      const description = cleanText(entry.descEx || entry.description || entry.desc || "");
      rows.push({
        id,
        sourceId: Math.floor(looseNumber(key)),
        name,
        description,
        searchText: `${id} ${key || ""} ${name} ${description}`.toLowerCase()
      });
    };
    try {
      if (fs.existsSync(useDataDir)) {
        fs.readdirSync(useDataDir)
          .filter(name => /\.json$/i.test(name))
          .forEach((name) => {
            const data = readJsonFile(path.join(useDataDir, name));
            if (!data || typeof data !== "object") return;
            if (Array.isArray(data)) {
              data.forEach((entry, index) => push(entry, index));
            } else {
              Object.keys(data).forEach(key => push(data[key], key));
            }
          });
      }
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
    }
    localCatalogCache.titles = rows.sort((a, b) => a.id - b.id || a.sourceId - b.sourceId);
    return localCatalogCache.titles;
  }

  function localTitleIds(includeFallback) {
    const ids = localTitleEntries().map(entry => entry.id);
    if (includeFallback) {
      const config = resolveConfigManager();
      const count = Math.max(0, Math.floor(Number(config && config._titlesCount || 0)));
      for (let id = 1; id <= Math.max(count, 24); id += 1) ids.push(id);
    }
    return uniqueNumericIds(ids);
  }

  function localCostumeEntries() {
    if (localCatalogCache.costumes) return localCatalogCache.costumes;
    const data = readJsonFile(costumeDataPath);
    const rows = [];
    const seen = Object.create(null);
    const push = (entry, key) => {
      const id = Math.floor(looseNumber(entry && entry.id));
      if (!Number.isFinite(id) || id <= 0 || seen[id]) return;
      seen[id] = true;
      const name = cleanText(entry.name || `换装 ${id}`);
      const description = cleanText(entry.desc || entry.description || "");
      rows.push({
        id,
        sourceId: Math.floor(looseNumber(key)),
        name,
        description,
        equipId: Math.floor(looseNumber(entry.equipId)),
        characterName: cleanText(entry.characterName || ""),
        characterIndex: Number(entry.characterIndex || 0),
        searchText: `${id} ${key || ""} ${name} ${description} ${entry.equipId || ""} ${entry.characterName || ""}`.toLowerCase()
      });
    };
    if (Array.isArray(data)) {
      data.forEach((entry, index) => push(entry, index));
    } else if (data && typeof data === "object") {
      Object.keys(data).forEach(key => push(data[key], key));
    }
    localCatalogCache.costumes = rows.sort((a, b) => a.id - b.id || a.sourceId - b.sourceId);
    return localCatalogCache.costumes;
  }

  function progressSummary() {
    const config = resolveConfigManager();
    const party = resolveParty();
    const titles = config && config._titles || null;
    const clothes = config && (config._clothes || config._clothe || config.clothes) || null;
    return {
      configAvailable: !!config,
      titleCount: countTruthyEntries(titles),
      titleTotal: Number(config && config._titlesCount || localTitleIds(false).length || 0),
      costumeCount: countTruthyEntries(clothes),
      costumeTotal: localCostumeEntries().length,
      titles: titles ? compactNumberMap(titles, 200) : {},
      costumes: clothes ? compactNumberMap(clothes, 2200) : {},
      partyTalent: getPartyMembers(party).map(actorTalentInfo).filter(Boolean)
    };
  }

  function talentMode(command) {
    const mode = String(command.mode || command.field || "sp").toLowerCase();
    return mode === "csp" || mode === "class" || mode === "classsp" ? "csp" : "sp";
  }

  function talentSlotId(actor, command) {
    const raw = command.cspId != null ? command.cspId : command.classId != null ? command.classId : command.slot;
    const fallback = actor && actor._classId != null ? actor._classId : 0;
    const id = raw == null || raw === "" ? fallback : raw;
    const number = Math.floor(requireNumber(id, "cspId"));
    return Math.max(0, number);
  }

  function talentTargets(command) {
    if (toBool(command.party) || String(command.scope || "").toLowerCase() === "party" || String(command.id || "").toLowerCase() === "party") {
      const party = resolveParty();
      const members = getPartyMembers(party);
      if (!members.length) throw new Error("party members are unavailable");
      return members;
    }
    return [requireActor(command.id || command.actorId || 1)];
  }

  function talentPointsInfo(command) {
    const query = command && (command.id != null || command.actorId != null || command.party != null || command.scope != null)
      ? command
      : { ...(command || {}), party: true };
    if (toBool(query.party) || String(query.scope || "").toLowerCase() === "party") {
      const party = resolveParty();
      return {
        mode: talentMode(query),
        party: getPartyMembers(party).map(actorTalentInfo).filter(Boolean)
      };
    }
    return {
      mode: talentMode(query),
      party: talentTargets(query).map(actorTalentInfo).filter(Boolean)
    };
  }

  function adjustTalentPoints(command, op) {
    const mode = talentMode(command);
    const amountKey = op === "add" ? "amount" : "value";
    const number = Math.floor(requireNumber(command[amountKey], amountKey));
    const actors = talentTargets(command);
    const changed = actors.map((actor) => {
      if (mode === "csp") {
        if (!Array.isArray(actor._stsCsp)) actor._stsCsp = [];
        const slot = talentSlotId(actor, command);
        const current = Number(actor._stsCsp[slot] || 0);
        actor._stsCsp[slot] = op === "add" ? Math.max(0, current + number) : Math.max(0, number);
      } else {
        const current = Number(actor._stsSp || 0);
        actor._stsSp = op === "add" ? Math.max(0, current + number) : Math.max(0, number);
      }
      refreshActor(actor);
      return actorTalentInfo(actor);
    });
    refreshMapAndWindows();
    return { mode, op, count: changed.length, actors: changed };
  }

  function unlockTitleIds(ids) {
    const targetIds = ids.length ? ids : localTitleIds(true);
    if (!targetIds.length) throw new Error("title ids are unavailable");
    const config = requireConfigManager();
    if (!config._titles || typeof config._titles !== "object") config._titles = {};
    const tk = window.TK || {};
    const called = [];
    const maxId = targetIds.reduce((max, id) => Math.max(max, id), 0);
    targetIds.forEach((id) => {
      if (typeof tk.getChengHao === "function") {
        try {
          tk.getChengHao(id);
          called.push(id);
        } catch (error) {
          bridge.lastError = String(error && error.stack || error);
        }
      }
      config._titles[id] = true;
    });
    if (config._titlesCount == null || Number(config._titlesCount) < maxId) config._titlesCount = maxId;
    const saved = saveConfig();
    refreshTitleContinueCommand();
    refreshMapAndWindows();
    return { count: targetIds.length, ids: targetIds, called, saved, progress: progressSummary() };
  }

  function unlockCostumeIds(ids, options) {
    const all = options && options.all;
    const targetIds = ids.length ? ids : localCostumeEntries().map(entry => entry.id);
    if (!targetIds.length) throw new Error("costume ids are unavailable");
    const tk = window.TK || {};
    const called = [];
    if (all && typeof tk.getClotheAll === "function") {
      try {
        tk.getClotheAll();
        called.push("all");
      } catch (error) {
        bridge.lastError = String(error && error.stack || error);
      }
    }
    targetIds.forEach((id) => {
      if (typeof tk.getClothe === "function") {
        try {
          tk.getClothe(id);
          called.push(id);
        } catch (error) {
          bridge.lastError = String(error && error.stack || error);
        }
      }
    });
    const config = resolveConfigManager();
    let saved = false;
    if (config) {
      if (!Array.isArray(config._clothes)) {
        const existing = config._clothes && typeof config._clothes === "object"
          ? Object.keys(config._clothes).filter(key => config._clothes[key]).map(Number).filter(Number.isFinite)
          : [];
        config._clothes = existing;
      }
      const existing = new Set(config._clothes.map(value => Number(value)).filter(Number.isFinite));
      targetIds.forEach((id) => {
        if (!existing.has(id)) {
          config._clothes.push(id);
          existing.add(id);
        }
      });
      if (typeof config.save === "function") {
        config.save();
        saved = true;
      }
    }
    refreshMapAndWindows();
    return { count: targetIds.length, ids: targetIds, called, saved, progress: progressSummary() };
  }

  function enemyIdsFromData() {
    const enemies = resolveData("enemy") || [];
    if (!Array.isArray(enemies)) return [];
    return uniqueNumericIds(enemies
      .map((enemy, index) => enemy && (enemy.id != null ? enemy.id : index))
      .filter(Boolean));
  }

  function unlockEnemyBook(ids) {
    const config = requireConfigManager();
    const targetIds = ids.length ? ids : enemyIdsFromData();
    if (!targetIds.length) throw new Error("enemy ids are unavailable");
    if (!Array.isArray(config.enemyBook)) config.enemyBook = [];
    targetIds.forEach((id) => {
      config.enemyBook[id] = 1;
    });

    const weaknessRepair = sanitizeEnemyWeaknessStore();
    const saved = saveConfig();
    refreshMapAndWindows();
    return { count: targetIds.length, saved, weaknessRepair };
  }

  const commandHandlers = Object.freeze({
    "ping": () => collectState(),
    "runtime.inspect": (command) => runtimeInspect(command),
    "runtime.search": (command) => runtimeSearch(command),
    "talent.points.info": (command) => talentPointsInfo(command),
    "talent.points.set": (command) => adjustTalentPoints(command, "set"),
    "talent.points.add": (command) => adjustTalentPoints(command, "add"),
    "title.info": () => ({ entries: localTitleEntries(), progress: progressSummary() }),
    "title.unlock": (command) => unlockTitleIds(commandIds(command)),
    "title.unlockAll": () => unlockTitleIds(localTitleIds(true)),
    "costume.info": () => ({ entries: localCostumeEntries(), progress: progressSummary() }),
    "costume.unlock": (command) => unlockCostumeIds(commandIds(command)),
    "costume.unlockAll": () => unlockCostumeIds(localCostumeEntries().map(entry => entry.id), { all: true }),
    "baby.info": () => babySummary(),
    "baby.skill.learn": (command) => learnBabySkill(command),
    "baby.skill.forget": (command) => forgetBabySkill(command),
    "baby.skill.clear": (command) => clearBabySkills(command),
    "baby.slots.set": (command) => setBabyLearnSlots(command, "set"),
    "baby.slots.add": (command) => setBabyLearnSlots(command, "add"),
    "trainer.options.get": () => ({ options: { ...bridge.options }, hooks: patchTrainerHooks() }),
    "trainer.hooks.info": () => ({
      options: { ...bridge.options },
      hooks: patchTrainerHooks(),
      hookTargets: bridge.hookTargets.slice(),
      rateStats: { ...bridge.rateStats },
      battleStats: { ...bridge.battleStats }
    }),
    "trainer.options.set": (command) => ({ options: setTrainerOptions(command.options || command) }),
    "map.current": () => currentMapInfo(),
    "map.transfer": (command) => {
      const player = resolvePlayer();
      if (!player) throw new Error("game player is unavailable");
      const mapId = Math.floor(requireNumber(command.mapId, "mapId"));
      if (mapId <= 0) throw new Error("mapId must be positive");
      const mapInfo = dataTable("mapInfo");
      const mapData = localMapData(mapId);
      if ((Array.isArray(mapInfo) && mapInfo.length && !mapInfo[mapId]) && !mapData) throw new Error(`map ${mapId} not found`);
      const x = Math.floor(requireNumber(command.x, "x"));
      const y = Math.floor(requireNumber(command.y, "y"));
      if (mapData && Number(mapData.width) > 0 && (x < 0 || x >= Number(mapData.width))) throw new Error(`x ${x} is outside map ${mapId}`);
      if (mapData && Number(mapData.height) > 0 && (y < 0 || y >= Number(mapData.height))) throw new Error(`y ${y} is outside map ${mapId}`);
      const direction = command.direction === undefined || command.direction === ""
        ? 2
        : Math.floor(requireNumber(command.direction, "direction"));
      const fade = command.fade === undefined || command.fade === ""
        ? 0
        : Math.floor(requireNumber(command.fade, "fade"));
      if (typeof player.reserveTransfer === "function") {
        player.reserveTransfer(mapId, x, y, direction, fade);
      } else if (typeof player.locate === "function") {
        player.locate(x, y);
      } else {
        throw new Error("player transfer is unavailable");
      }
      refreshMapAndWindows();
      return { mapId, x, y, direction, fade };
    },
    "map.through.set": (command) => setPlayerThrough(command, false),
    "map.through.toggle": (command) => setPlayerThrough(command, true),
    "commonEvent.run": (command) => {
      const id = Math.floor(requireNumber(command.id, "id"));
      const events = commonEventTable();
      const eventData = events && events[id];
      if (!eventData) throw new Error(`common event ${id} not found`);
      const temp = resolveTemp();
      if (!temp || typeof temp.reserveCommonEvent !== "function") throw new Error("reserveCommonEvent is unavailable");
      temp.reserveCommonEvent(id);
      const map = resolveMap();
      if (map && typeof map.requestRefresh === "function") map.requestRefresh();
      return { id, name: eventData && eventData.name || "" };
    },
    "gold.add": (command) => {
      const party = resolveParty();
      if (!party) throw new Error("game party is unavailable");
      const amount = requireNumber(command.amount, "amount");
      if (typeof party.gainGold === "function") withRatesSuppressed(() => party.gainGold(amount));
      else party._gold = Math.max(0, Number(party._gold || 0) + amount);
      return { gold: safeGold(party) };
    },
    "gold.set": (command) => {
      const party = resolveParty();
      if (!party) throw new Error("game party is unavailable");
      const value = Math.max(0, Math.floor(requireNumber(command.value, "value")));
      const current = safeGold(party) || 0;
      if (typeof party.gainGold === "function") withRatesSuppressed(() => party.gainGold(value - current));
      else party._gold = value;
      return { gold: safeGold(party) };
    },
    "variable.set": (command) => {
      const variables = resolveVariables();
      if (!variables || typeof variables.setValue !== "function") throw new Error("game variables are unavailable");
      const id = Math.floor(requireNumber(command.id, "id"));
      if (id <= 0) throw new Error("variable id must be positive");
      const maxVariableId = systemListLimit("variables");
      if (maxVariableId > 0 && id > maxVariableId) throw new Error(`variable id ${id} exceeds system limit ${maxVariableId}`);
      variables.setValue(id, command.value);
      return { id: command.id, value: command.value };
    },
    "switch.set": (command) => {
      const switches = resolveSwitches();
      if (!switches || typeof switches.setValue !== "function") throw new Error("game switches are unavailable");
      const id = Math.floor(requireNumber(command.id, "id"));
      if (id <= 0) throw new Error("switch id must be positive");
      const maxSwitchId = systemListLimit("switches");
      if (maxSwitchId > 0 && id > maxSwitchId) throw new Error(`switch id ${id} exceeds system limit ${maxSwitchId}`);
      switches.setValue(id, !!command.value);
      return { id: command.id, value: !!command.value };
    },
    "item.add": (command) => {
      const party = resolveParty();
      if (!party || typeof party.gainItem !== "function") throw new Error("party gainItem is unavailable");
      const kind = normalizeDropKind(command.kind || "item");
      if (!kind) throw new Error(`unsupported item kind: ${command.kind}`);
      const data = resolveData(kind);
      if (!data) throw new Error(`${kind} data is unavailable`);
      const item = data[Math.floor(requireNumber(command.id, "id"))];
      if (!item) throw new Error(`${kind} ${command.id} not found`);
      const amount = Math.floor(requireNumber(command.amount, "amount"));
      if (!Number.isFinite(amount) || amount === 0) throw new Error("amount must be a non-zero number");
      party.gainItem(item, amount);
      return { kind, id: command.id, amount: command.amount };
    },
    "battle.killEnemies": (command) => killBattleEnemies(command),
    "battle.escape": () => escapeBattle(),
    "battle.start": (command) => startSpecifiedBattle(command),
    "hangup.info": () => hangupSummary(),
    "hangup.start": () => callHangupMethod("startHangUp", "hangupStart"),
    "hangup.stop": () => callHangupMethod("stopHangUp", "hangupStop"),
    "hangup.refresh": () => callHangupMethod("refrishHangUp", "hangupRefresh"),
    "offlineHunt.info": (command) => {
      let preview = null;
      if (command.mapId != null && command.mapId !== "") {
        preview = offlineHuntPreview(command);
        bridge.offlineHuntStats.preview = { ts: Date.now(), ...preview };
      } else if (command.troopId != null && command.troopId !== "") {
        preview = offlineHuntPreview(command);
        bridge.offlineHuntStats.preview = { ts: Date.now(), ...preview };
      }
      return {
        stats: offlineHuntSummary(),
        preview
      };
    },
    "offlineHunt.preview": (command) => {
      const preview = offlineHuntPreview(command);
      bridge.offlineHuntStats.preview = { ts: Date.now(), ...preview };
      return preview;
    },
    "offlineHunt.run": (command) => runOfflineHunt(command),
    "party.recover": () => recoverPartyMembers(),
    "actor.add": (command) => {
      const party = resolveParty();
      if (!party || typeof party.addActor !== "function") throw new Error("party addActor is unavailable");
      const { id } = requireDataEntry("actor", command.id, "actor id");
      party.addActor(id);
      refreshMapAndWindows();
      return { unlocked: true, actor: actorInfo(resolveActor(id)) };
    },
    "actor.unlock": (command) => {
      const party = resolveParty();
      if (!party || typeof party.addActor !== "function") throw new Error("party addActor is unavailable");
      const { id } = requireDataEntry("actor", command.id, "actor id");
      party.addActor(id);
      refreshMapAndWindows();
      return { unlocked: true, actor: actorInfo(resolveActor(id)) };
    },
    "actor.remove": (command) => {
      const party = resolveParty();
      if (!party || typeof party.removeActor !== "function") throw new Error("party removeActor is unavailable");
      const id = Math.floor(requireNumber(command.id, "id"));
      party.removeActor(id);
      refreshMapAndWindows();
      return { id };
    },
    "actor.recover": (command) => {
      const actor = requireActor(command.id);
      if (typeof actor.recoverAll === "function") actor.recoverAll();
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor) };
    },
    "actor.level.set": (command) => {
      const actor = requireActor(command.id);
      let maxLevel = 999;
      try {
        if (typeof actor.maxLevel === "function") maxLevel = Math.max(1, Math.floor(Number(actor.maxLevel() || maxLevel)));
      } catch (_) {}
      const level = Math.min(maxLevel, Math.max(1, Math.floor(requireNumber(command.level, "level"))));
      if (typeof actor.changeLevel === "function") actor.changeLevel(level, false);
      else actor._level = level;
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor) };
    },
    "actor.exp.add": (command) => {
      const actor = requireActor(command.id);
      const amount = Math.floor(requireNumber(command.amount, "amount"));
      if (typeof actor.gainExp === "function") withRatesSuppressed(() => actor.gainExp(amount));
      else if (typeof actor.changeExp === "function" && typeof actor.currentExp === "function") actor.changeExp(actor.currentExp() + amount, false);
      else {
        actor._exp = actor._exp || {};
        const classId = actor._classId || 0;
        actor._exp[classId] = Number(actor._exp[classId] || 0) + amount;
      }
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor), amount };
    },
    "actor.vitals.set": (command) => {
      const actor = requireActor(command.id);
      if (command.hp !== undefined && command.hp !== "") {
        const hp = clampCurrentValue(command.hp, actor.mhp, 999999999);
        if (typeof actor.setHp === "function") actor.setHp(hp);
        else actor._hp = hp;
      }
      if (command.mp !== undefined && command.mp !== "") {
        const mp = clampCurrentValue(command.mp, actor.mmp, 999999999);
        if (typeof actor.setMp === "function") withNoCostSuppressed(() => actor.setMp(mp));
        else actor._mp = mp;
        resetNoCostBaselines();
      }
      if (command.tp !== undefined && command.tp !== "") {
        const tp = clampCurrentValue(command.tp, 100, 100);
        if (typeof actor.setTp === "function") withNoCostSuppressed(() => actor.setTp(tp));
        else actor._tp = tp;
        resetNoCostBaselines();
      }
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor) };
    },
    "actor.param.add": (command) => {
      const actor = requireActor(command.id);
      const paramId = Math.floor(requireNumber(command.paramId, "paramId"));
      if (paramId < 0 || paramId > 7) throw new Error("paramId must be between 0 and 7");
      const value = Math.floor(requireNumber(command.value, "value"));
      if (typeof actor.addParam === "function") actor.addParam(paramId, value);
      else {
        actor._paramPlus = actor._paramPlus || [0, 0, 0, 0, 0, 0, 0, 0];
        actor._paramPlus[paramId] = Number(actor._paramPlus[paramId] || 0) + value;
      }
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor), paramId, value };
    },
    "actor.name.set": (command) => {
      const actor = requireActor(command.id);
      const name = String(command.name || "");
      if (typeof actor.setName === "function") actor.setName(name);
      else actor._name = name;
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor) };
    },
    "actor.skill.learn": (command) => {
      const actor = requireActor(command.id);
      const { id: skillId } = requireDataEntry("skill", command.skillId, "skillId");
      if (typeof actor.learnSkill !== "function") throw new Error("actor learnSkill is unavailable");
      actor.learnSkill(skillId);
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor), skillId };
    },
    "actor.skill.forget": (command) => {
      const actor = requireActor(command.id);
      const { id: skillId } = requireDataEntry("skill", command.skillId, "skillId");
      if (typeof actor.forgetSkill !== "function") throw new Error("actor forgetSkill is unavailable");
      actor.forgetSkill(skillId);
      refreshActor(actor);
      refreshMapAndWindows();
      return { actor: actorInfo(actor), skillId };
    },
    "progress.enemyBook.unlock": (command) => unlockEnemyBook(commandIds(command)),
    "save": (command) => saveGameToSlot(command.id || 1),
    "title.refresh": () => ({ refreshed: refreshTitleContinueCommand() })
  });

  function execute(command) {
    if (!command || typeof command !== "object") throw new Error("invalid command");
    const type = String(command.type || "");
    const handler = commandHandlers[type];
    if (!handler) throw new Error(`unknown command type: ${type}`);
    return handler(command);
  }

  function pollCommands() {
    try {
      ensureDir();
      if (!fs.existsSync(commandPath)) return;
      const lines = fs.readFileSync(commandPath, "utf8").split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        let command;
        try {
          command = JSON.parse(line);
        } catch (error) {
          log("bad command json", { line, error: String(error && error.stack || error) });
          continue;
        }
        const id = commandQueueId(command, line);
        command.__codexQueueId = id;
        if (!id || bridge.processed[id]) continue;
        if (Number(command.ts || 0) < bridge.startedAtMs) {
          bridge.processed[id] = true;
          continue;
        }
        bridge.processed[id] = true;
        try {
          const payload = execute(command);
          event(command, true, payload);
          writeState();
        } catch (error) {
          bridge.lastError = String(error && error.stack || error);
          event(command, false, { error: bridge.lastError });
          writeState();
        }
      }

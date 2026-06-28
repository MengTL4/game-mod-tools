  function normalizeBabyRealSkills(actor, passiveIds) {
    if (!actor || typeof actor !== "object") return [];
    if (!Array.isArray(actor._realSkills)) actor._realSkills = [];
    const seen = Object.create(null);
    const normalized = [];
    const add = (value) => {
      const id = skillIdFromValue(value);
      if (!Number.isFinite(id) || id <= 0 || seen[id]) return;
      const skill = value && typeof value === "object" ? ensureSkillCooldownMetadata(value) : skillObjectForId(id);
      if (!skill) return;
      seen[id] = true;
      normalized.push(skill);
    };
    actor._realSkills.forEach(add);
    uniqueNumericIds(passiveIds || []).forEach((id) => {
      if (!seen[id]) add(skillObjectForId(id));
    });
    actor._realSkills = normalized;
    return normalized;
  }

  function syncBabyPassiveSkills(actor) {
    if (!isBabyActor(actor)) return [];
    const ids = uniqueNumericIds([...actorLearnedSkillIds(actor), ...babyPassiveStore(actor)]);
    actor[BABY_PASSIVE_STORE_KEY] = ids.slice();
    if (!Array.isArray(actor._skills)) actor._skills = [];
    if (!Array.isArray(actor._realSkills)) actor._realSkills = [];
    ids.forEach((id) => {
      pushUniqueNumericId(actor._skills, id);
      ensureSkillCooldownMetadata(skillObjectForId(id));
    });
    normalizeBabyRealSkills(actor, ids);
    return ids;
  }

  function actionSkillId(action) {
    if (!action) return null;
    try {
      const item = typeof action.item === "function" ? action.item() : null;
      if (item && item.id != null) return item.id;
    } catch (_) {}
    const gameItem = action._item;
    if (gameItem && gameItem._dataClass === "skill" && gameItem._itemId != null) return gameItem._itemId;
    if (gameItem && typeof gameItem.itemId === "function") {
      try {
        return gameItem.itemId();
      } catch (_) {}
    }
    return null;
  }

  function makeGameActionForSkill(actor, skillId) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    const ctor = window.Game_Action || (Array.isArray(actor && actor._actlist) && actor._actlist[0] && actor._actlist[0].constructor);
    if (typeof ctor === "function") {
      try {
        const action = new ctor(actor);
        if (typeof action.setSkill === "function") action.setSkill(id);
        else if (action._item && typeof action._item.setObject === "function") action._item.setObject((resolveData("skill") || [])[id]);
        else action._item = makeGameItemForSkill(id);
        action._subjectActorId = actorIdOf(actor) || action._subjectActorId;
        action._subjectEnemyIndex = -1;
        action._forcing = false;
        action._targetIndex = -1;
        return action;
      } catch (error) {
        bridge.lastError = String(error && error.stack || error);
      }
    }
    return {
      _subjectActorId: actorIdOf(actor) || 0,
      _subjectEnemyIndex: -1,
      _forcing: false,
      _item: makeGameItemForSkill(id),
      _targetIndex: -1
    };
  }

  function makeGameItemForSkill(skillId) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    if (typeof window.Game_Item === "function") {
      try {
        const item = new window.Game_Item();
        if (typeof item.setObject === "function") item.setObject((resolveData("skill") || [])[id]);
        else {
          item._dataClass = "skill";
          item._itemId = id;
        }
        return item;
      } catch (error) {
        bridge.lastError = String(error && error.stack || error);
      }
    }
    return { _dataClass: "skill", _itemId: id };
  }

  function rebuildBabyActionList(actor) {
    const ids = actionSkillIds(actor);
    actor._bbSkill = ids.slice();
    actor._actlist = ids.map(id => makeGameActionForSkill(actor, id));
    return ids;
  }

  function refreshBabyActor(actor, options) {
    const opts = options || {};
    ensureBabyActorData(actor);
    syncBabyPassiveSkills(actor);
    refreshActor(actor);
    try {
      if (opts.rebuildActions && actor && typeof actor.makeSkillItemReplace === "function") actor.makeSkillItemReplace();
    } catch (_) {}
    syncBabyPassiveSkills(actor);
    refreshMapAndWindows();
  }

  function babyLearnCountKey(actor) {
    if (!actor) return "BBLeranCount";
    if (actor.BBLeranCount != null) return "BBLeranCount";
    if (actor.BBLearnCount != null) return "BBLearnCount";
    return "BBLeranCount";
  }

  function encodeBabyLearnSlots(value) {
    const slots = Math.max(0, Math.floor(looseNumber(value)));
    return Math.round(slots * 1.0012 * 10000) / 10000;
  }

  function decodeBabyLearnSlots(value) {
    const raw = Number(value || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.max(0, Math.round(raw / 1.0012));
  }

  function babyLearnSlotInfo(actor) {
    const key = babyLearnCountKey(actor);
    const raw = Number(actor && actor[key] || 0);
    return {
      key,
      raw: Number.isFinite(raw) ? raw : 0,
      slots: decodeBabyLearnSlots(raw)
    };
  }

  function babyInfo(row) {
    const actor = row && row.actor || row;
    if (!actor) return null;
    const actions = skillListInfo(actionSkillIds(actor));
    const passives = skillListInfo(syncBabyPassiveSkills(actor));
    const learnSlots = babyLearnSlotInfo(actor);
    return {
      index: row && row.index != null ? row.index : null,
      id: actorIdOf(actor),
      name: actorNameOf(actor),
      nickname: actor._nickname || "",
      level: actor._level != null ? actor._level : actor.level,
      classId: actor._classId == null ? null : actor._classId,
      isNew: !!actor.isNewBB,
      source: row && row.source || "",
      key: row && row.key,
      BBLeranCount: learnSlots.raw,
      learnSlots,
      actionSkills: actions,
      passiveSkills: passives,
      actionCount: actions.length,
      passiveCount: passives.length
    };
  }

  function babySummary() {
    const babies = babyTargets().map(babyInfo).filter(Boolean);
    return {
      count: babies.length,
      babies
    };
  }

  function resolveBabyTarget(command) {
    const babies = babyTargets();
    if (!babies.length) throw new Error("baby actors are unavailable");
    const rawId = command && (command.actorId != null ? command.actorId : command.id);
    if (rawId != null && rawId !== "" && String(rawId).toLowerCase() !== "auto") {
      const id = Math.floor(requireNumber(rawId, "baby actor id"));
      let row = babies.find(item => actorIdOf(item.actor) === id);
      if (!row && id >= 1 && id <= babies.length) row = babies[id - 1];
      if (!row) throw new Error(`baby actor ${rawId} is unavailable`);
      return row;
    }
    if (command && command.index != null && command.index !== "") {
      const index = Math.floor(requireNumber(command.index, "index"));
      const row = babies[index] || babies[index - 1];
      if (!row) throw new Error(`baby index ${command.index} is unavailable`);
      return row;
    }
    return babies[0];
  }

  function babySkillMode(command, skillId) {
    const mode = String(command && (command.mode || command.skillMode) || "auto").toLowerCase();
    if (/^(passive|learn|learned|被动)$/.test(mode)) return "passive";
    if (/^(action|active|core|bb|bbskill|核心|主动)$/.test(mode)) return "action";
    return skillInfoById(skillId).passive ? "passive" : "action";
  }

  function babyActionSlotIndex(command) {
    if (!command) return null;
    if (command.slotIndex != null && command.slotIndex !== "") return Math.max(0, Math.floor(requireNumber(command.slotIndex, "slotIndex")));
    if (command.slot != null && command.slot !== "") return Math.max(0, Math.floor(requireNumber(command.slot, "slot")) - 1);
    return null;
  }

  function learnPassiveBabySkill(actor, skillId) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    const before = actorLearnedSkillIds(actor);
    if (before.includes(id)) return false;
    if (typeof actor.learnSkill === "function") actor.learnSkill(id);
    if (!Array.isArray(actor._skills)) actor._skills = [];
    if (!Array.isArray(actor._realSkills)) actor._realSkills = [];
    pushUniqueNumericId(actor._skills, id);
    pushUniqueNumericId(actor._realSkills, id);
    pushUniqueNumericId(babyPassiveStore(actor), id);
    return true;
  }

  function forgetPassiveBabySkill(actor, skillId) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    const before = actorLearnedSkillIds(actor);
    if (!before.includes(id)) return false;
    if (typeof actor.forgetSkill === "function") actor.forgetSkill(id);
    removeNumericId(actor._skills, id);
    removeNumericId(actor._realSkills, id);
    removeNumericId(babyPassiveStore(actor), id);
    return true;
  }

  function learnActionBabySkill(actor, skillId, command) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    if (!Array.isArray(actor._bbSkill)) actor._bbSkill = actionSkillIds(actor);
    const slotIndex = babyActionSlotIndex(command);
    if (slotIndex != null) {
      const slotCount = Math.max(1, babyLearnSlotInfo(actor).slots || actor._bbSkill.length || 1);
      if (slotIndex >= slotCount) throw new Error(`slot ${slotIndex + 1} exceeds baby skill slots ${slotCount}`);
      const changed = Math.floor(looseNumber(actor._bbSkill[slotIndex])) !== id;
      actor._bbSkill[slotIndex] = id;
      rebuildBabyActionList(actor);
      return changed;
    }
    if (actor._bbSkill.some(value => Math.floor(looseNumber(value)) === id)) {
      rebuildBabyActionList(actor);
      return false;
    }
    actor._bbSkill.push(id);
    rebuildBabyActionList(actor);
    return true;
  }

  function forgetActionBabySkill(actor, skillId) {
    const id = Math.floor(requireNumber(skillId, "skillId"));
    if (!Array.isArray(actor._bbSkill)) actor._bbSkill = actionSkillIds(actor);
    const changed = removeNumericId(actor._bbSkill, id);
    if (changed) rebuildBabyActionList(actor);
    return changed;
  }

  function learnBabySkill(command) {
    const row = resolveBabyTarget(command || {});
    const actor = row.actor;
    const { id: skillId } = requireDataEntry("skill", command.skillId || command.id2 || command.skill, "skillId");
    const mode = babySkillMode(command, skillId);
    const changed = mode === "passive"
      ? learnPassiveBabySkill(actor, skillId, command)
      : learnActionBabySkill(actor, skillId, command);
    refreshBabyActor(actor, { rebuildActions: mode === "action" });
    return { mode, changed, skill: skillInfoById(skillId), baby: babyInfo(row), summary: babySummary() };
  }

  function forgetBabySkill(command) {
    const row = resolveBabyTarget(command || {});
    const actor = row.actor;
    const { id: skillId } = requireDataEntry("skill", command.skillId || command.id2 || command.skill, "skillId");
    const requestedMode = String(command && (command.mode || command.skillMode) || "auto").toLowerCase();
    const actionHad = actionSkillIds(actor).includes(skillId);
    const mode = requestedMode === "auto" || !requestedMode ? (actionHad ? "action" : babySkillMode(command, skillId)) : babySkillMode(command, skillId);
    const changed = mode === "passive"
      ? forgetPassiveBabySkill(actor, skillId, command)
      : forgetActionBabySkill(actor, skillId);
    refreshBabyActor(actor, { rebuildActions: mode === "action" });
    return { mode, changed, skill: skillInfoById(skillId), baby: babyInfo(row), summary: babySummary() };
  }

  function clearBabySkills(command) {
    const row = resolveBabyTarget(command || {});
    const actor = row.actor;
    const mode = String(command && (command.mode || command.skillMode) || "passive").toLowerCase();
    let passiveCleared = 0;
    let actionCleared = 0;
    if (mode === "passive" || mode === "all") {
      passiveCleared = actorLearnedSkillIds(actor).length;
      actor._skills = [];
      if (Array.isArray(actor._realSkills)) actor._realSkills = [];
      actor[BABY_PASSIVE_STORE_KEY] = [];
    }
    if (mode === "action" || mode === "core" || mode === "all") {
      actionCleared = actionSkillIds(actor).length;
      actor._bbSkill = [];
      actor._actlist = [];
    }
    refreshBabyActor(actor, { rebuildActions: mode === "action" || mode === "core" || mode === "all" });
    return { mode, passiveCleared, actionCleared, baby: babyInfo(row), summary: babySummary() };
  }

  function setBabyLearnSlots(command, op) {
    const row = resolveBabyTarget(command || {});
    const actor = row.actor;
    const amountKey = op === "add" ? "amount" : "value";
    const number = Math.floor(requireNumber(command && command[amountKey], amountKey));
    const current = babyLearnSlotInfo(actor).slots;
    const next = op === "add" ? Math.max(0, current + number) : Math.max(0, number);
    const key = babyLearnCountKey(actor);
    actor[key] = encodeBabyLearnSlots(next);
    refreshBabyActor(actor);
    return {
      op,
      key,
      previous: current,
      slots: next,
      raw: actor[key],
      baby: babyInfo(row),
      summary: babySummary()
    };
  }

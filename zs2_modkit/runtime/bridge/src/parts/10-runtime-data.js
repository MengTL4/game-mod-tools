  function safeGold(party) {
    if (!party) return null;
    try {
      if (typeof party.gold === "function") return party.gold();
      if (typeof party._gold === "number") return party._gold;
    } catch (_) {}
    return null;
  }

  function toBool(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function bumpRateStat(name, payload) {
    bridge.rateStats[name] = Number(bridge.rateStats[name] || 0) + 1;
    if (payload) {
      bridge.rateStats.last = {
        name,
        ts: Date.now(),
        ...payload
      };
    }
  }

  function bumpBattleStat(name, payload) {
    bridge.battleStats[name] = Number(bridge.battleStats[name] || 0) + 1;
    if (payload) {
      bridge.battleStats.last = {
        name,
        ts: Date.now(),
        ...payload
      };
    }
  }

  function withRatesSuppressed(fn) {
    bridge.suppressRates += 1;
    try {
      return fn();
    } finally {
      bridge.suppressRates = Math.max(0, bridge.suppressRates - 1);
    }
  }

  function withRateContext(fn) {
    bridge.rateDepth += 1;
    try {
      return fn();
    } finally {
      bridge.rateDepth = Math.max(0, bridge.rateDepth - 1);
    }
  }

  function isInBattleRewardContext() {
    if (bridge.rateDepth > 0) return true;
    try {
      const party = resolveParty();
      if (party && typeof party.inBattle === "function" && party.inBattle()) return true;
    } catch (_) {}
    try {
      const managers = resolveBattleManagers();
      const battle = managers[0] && managers[0].object;
      if (battle && battle._phase && battle._phase !== "init") return true;
    } catch (_) {}
    return false;
  }

  function scaledPositiveAmount(amount, rate) {
    const number = Number(amount);
    if (!Number.isFinite(number) || number <= 0) return amount;
    return Math.max(0, Math.floor(number * rate));
  }

  function isActorBattler(battler) {
    try {
      if (!battler) return false;
      if (typeof battler.isActor === "function") return !!battler.isActor();
      return actorIdOf(battler) != null;
    } catch (_) {
      return false;
    }
  }

  function isEnemyBattler(battler) {
    try {
      return !!(battler && typeof battler.isEnemy === "function" && battler.isEnemy());
    } catch (_) {
      return false;
    }
  }

  function battlerHp(battler) {
    if (!battler) return 0;
    return Math.max(0, Number(battler.hp == null ? battler._hp : battler.hp) || 0);
  }

  function withInvincibleSuppressed(fn) {
    bridge.suppressInvincible += 1;
    try {
      return fn();
    } finally {
      bridge.suppressInvincible = Math.max(0, bridge.suppressInvincible - 1);
    }
  }

  function setBattlerHp(battler, value) {
    if (!battler) return;
    withInvincibleSuppressed(() => {
      if (typeof battler.setHp === "function") battler.setHp(value);
      else battler._hp = value;
    });
  }

  function shouldBlockHpDecrease(battler, value) {
    if (!bridge.options.invincible || bridge.suppressInvincible > 0) return false;
    if (!isActorBattler(battler) || !isInBattle()) return false;
    const next = Number(value);
    if (!Number.isFinite(next)) return false;
    return next < battlerHp(battler);
  }

  function restoreInvincibleHp(battler, snapshot, source) {
    if (!bridge.options.invincible || !isActorBattler(battler) || !Number.isFinite(snapshot)) return false;
    const current = battlerHp(battler);
    if (current >= snapshot) return false;
    setBattlerHp(battler, snapshot);
    refreshActor(battler);
    bumpBattleStat("invincibleRestore", { source, from: current, to: snapshot });
    return true;
  }

  function actorResourceSnapshot(actor) {
    return {
      mp: Number(actor && (actor.mp == null ? actor._mp : actor.mp) || 0),
      tp: Number(actor && (actor.tp == null ? actor._tp : actor.tp) || 0)
    };
  }

  function actorNoCostKey(actor, index) {
    const id = actorIdOf(actor);
    if (id != null) return `actor:${id}`;
    return `party:${index}`;
  }

  function setActorResource(actor, name, value) {
    const method = name === "mp" ? "setMp" : "setTp";
    const field = name === "mp" ? "_mp" : "_tp";
    withNoCostSuppressed(() => {
      if (actor && typeof actor[method] === "function") actor[method](value);
      else if (actor) actor[field] = value;
    });
  }

  function resetNoCostBaselines() {
    bridge.noCostBaselines = Object.create(null);
  }

  function preserveNoCostResources(reason) {
    resetNoCostBaselines();
    return { active: !!bridge.options.noSkillCost, restored: 0, reason };
  }

  function restoreActorResources(actor, snapshot, source) {
    if (!actor || !snapshot) return;
    const current = actorResourceSnapshot(actor);
    let restored = false;
    if (snapshot.mp > current.mp) {
      setActorResource(actor, "mp", snapshot.mp);
      restored = true;
    }
    if (snapshot.tp > current.tp) {
      setActorResource(actor, "tp", snapshot.tp);
      restored = true;
    }
    if (restored) {
      refreshActor(actor);
      bumpBattleStat("noSkillCostRestore", { source, mp: snapshot.mp, tp: snapshot.tp });
    }
  }

  function withNoCostPreserved(actor, source, fn) {
    return fn();
  }

  function withNoCostSuppressed(fn) {
    bridge.suppressNoCost += 1;
    try {
      return fn();
    } finally {
      bridge.suppressNoCost = Math.max(0, bridge.suppressNoCost - 1);
    }
  }

  function shouldBlockResourceDecrease(actor, value, resourceName) {
    return false;
  }

  function getPartyMembers(party) {
    if (!party) return [];
    try {
      if (typeof party.allMembers === "function") return party.allMembers().filter(Boolean);
      if (typeof party.members === "function") return party.members().filter(Boolean);
    } catch (_) {}
    return [];
  }

  function actorIdOf(actor) {
    if (!actor) return null;
    try {
      if (typeof actor.actorId === "function") return actor.actorId();
      return actor._actorId || null;
    } catch (_) {
      return null;
    }
  }

  function actorNameOf(actor) {
    if (!actor) return "";
    try {
      if (typeof actor.name === "function") return actor.name();
      const data = typeof actor.actor === "function" ? actor.actor() : null;
      return data && data.name || actor._name || "";
    } catch (_) {
      return "";
    }
  }

  function actorInfo(actor) {
    if (!actor) return null;
    let skills = [];
    try {
      if (typeof actor.skills === "function") {
        skills = actor.skills().filter(Boolean).map(skill => ({ id: skill.id, name: skill.name }));
      } else if (Array.isArray(actor._skills)) {
        skills = actor._skills.map(id => ({ id, name: "" }));
      }
    } catch (_) {}
    return {
      id: actorIdOf(actor),
      name: actorNameOf(actor),
      level: actor.level == null ? null : actor.level,
      hp: actor.hp == null ? null : actor.hp,
      mhp: actor.mhp == null ? null : actor.mhp,
      mp: actor.mp == null ? null : actor.mp,
      mmp: actor.mmp == null ? null : actor.mmp,
      tp: actor.tp == null ? null : actor.tp,
      talent: actorTalentInfo(actor),
      skills
    };
  }

  function clampCurrentValue(value, maxValue, fallbackMax) {
    const raw = Math.floor(requireNumber(value, "value"));
    const max = Number.isFinite(Number(maxValue)) && Number(maxValue) > 0
      ? Number(maxValue)
      : fallbackMax;
    return Math.min(max, Math.max(0, raw));
  }

  function compactNumberMap(value, limit) {
    const result = {};
    const max = Math.max(1, Math.min(200, Math.floor(Number(limit || 24))));
    const put = (key, item) => {
      const id = Math.floor(looseNumber(key));
      const number = Number(item);
      if (!Number.isFinite(id) || id < 0 || !Number.isFinite(number) || number === 0) return;
      result[id] = number;
    };
    if (Array.isArray(value)) {
      for (let index = 0; index < Math.min(value.length, max); index += 1) put(index, value[index]);
    } else if (value && typeof value === "object") {
      Object.keys(value).slice(0, max).forEach((key) => put(key, value[key]));
    }
    return result;
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function actorTalentInfo(actor) {
    if (!actor) return null;
    return {
      id: actorIdOf(actor),
      name: actorNameOf(actor),
      level: actor.level == null ? null : actor.level,
      classId: actor._classId == null ? null : actor._classId,
      sp: finiteNumber(actor._stsSp, 0),
      usedSp: finiteNumber(actor._stsUsedSp, 0),
      csp: compactNumberMap(actor._stsCsp, 40),
      usedCsp: compactNumberMap(actor._stsUsedCsp, 40)
    };
  }

  function skillInfoById(skillId) {
    const id = Math.floor(looseNumber(skillId));
    if (!Number.isFinite(id) || id <= 0) return { id: skillId, name: "", stypeId: null, passive: false };
    const skills = dataTable("skill");
    const skill = skills && skills[id] || null;
    const text = `${skill && skill.name || ""} ${skill && skill.description || ""} ${skill && skill.note || ""}`;
    return {
      id,
      name: skill && skill.name || "",
      stypeId: skill && skill.stypeId != null ? Number(skill.stypeId) : null,
      description: skill && skill.description || "",
      passive: !!(skill && (Number(skill.stypeId) === 4 || /被动|<Hide in Battle>/i.test(text)))
    };
  }

  function skillListInfo(ids) {
    return uniqueNumericIds(ids || []).map(skillInfoById);
  }

  function skillIdFromValue(value) {
    if (value && typeof value === "object") {
      for (const key of ["id", "skillId", "_skillId", "_itemId"]) {
        const id = Math.floor(looseNumber(value[key]));
        if (Number.isFinite(id) && id > 0) return id;
      }
      return NaN;
    }
    const id = Math.floor(looseNumber(value));
    return Number.isFinite(id) && id > 0 ? id : NaN;
  }

  function removeNumericId(values, id) {
    const target = Math.floor(looseNumber(id));
    if (!Array.isArray(values)) return false;
    let changed = false;
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (skillIdFromValue(values[index]) === target) {
        values.splice(index, 1);
        changed = true;
      }
    }
    return changed;
  }

  function pushUniqueNumericId(values, id) {
    if (!Array.isArray(values)) return false;
    const target = Math.floor(looseNumber(id));
    if (!Number.isFinite(target) || target <= 0) return false;
    if (values.some(value => Math.floor(looseNumber(value)) === target)) return false;
    values.push(target);
    return true;
  }

  function actorDataEntries() {
    const actors = resolveActors();
    const data = actors && actors._data;
    const rows = [];
    if (Array.isArray(data)) {
      data.forEach((actor, index) => {
        if (actor) rows.push({ actor, key: index });
      });
    } else if (data && typeof data === "object") {
      Object.keys(data).forEach((key) => {
        if (data[key]) rows.push({ actor: data[key], key });
      });
    }
    return rows;
  }

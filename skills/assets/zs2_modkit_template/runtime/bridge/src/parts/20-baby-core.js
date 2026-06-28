  function isBabyActor(actor) {
    if (!actor || typeof actor !== "object") return false;
    return !!(actor.isBB || actor.isNewBB || Array.isArray(actor._bbSkill) || actor.BBLeranCount != null || actor.BBLearnCount != null);
  }

  function babyTargets() {
    const seen = new Set();
    const rows = [];
    const add = (actor, source, key) => {
      if (!isBabyActor(actor) || seen.has(actor)) return;
      seen.add(actor);
      rows.push({ actor, source, key });
    };
    actorDataEntries().forEach(({ actor, key }) => add(actor, "actors", key));
    getPartyMembers(resolveParty()).forEach((actor, index) => add(actor, "party", index));
    return rows
      .sort((a, b) => Number(actorIdOf(a.actor) || 0) - Number(actorIdOf(b.actor) || 0))
      .map((row, index) => ({ ...row, index }));
  }

  function babyActorPrototypeTargets(label) {
    return babyTargets().flatMap((row, index) => {
      const actor = row && row.actor;
      const actorId = actorIdOf(actor) || row && row.key || index + 1;
      return runtimePrototypeChainTargets(`${label}.actor${actorId}`, actor, 5);
    });
  }

  function dataSystem() {
    return callAlias("dataSystem") || window.$dataSystem || null;
  }

  function systemListLimit(name) {
    const system = dataSystem();
    const list = system && system[name];
    return Array.isArray(list) && list.length > 0 ? list.length - 1 : 0;
  }

  function babyTypeId(listName, pattern, fallback) {
    try {
      const system = dataSystem();
      const list = system && system[listName];
      if (Array.isArray(list)) {
        const found = list.findIndex(value => pattern.test(String(value || "")));
        if (found > 0) return found;
      }
    } catch (_) {}
    return fallback;
  }

  function babyArmorTypeId() {
    return babyTypeId("armorTypes", /\u5b9d\u5b9d/, 9);
  }

  function babyWeaponTypeId() {
    return babyTypeId("weaponTypes", /\u5b9d\u5b9d/, 14);
  }

  function clonePlainObject(value) {
    if (!value || typeof value !== "object") return {};
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return { ...value };
    }
  }

  function defaultBabySts() {
    return { data: "", treeTypes: [], initsp: 0, msp: 0 };
  }

  function normalizeBabySts(value) {
    const sts = value && typeof value === "object" ? value : defaultBabySts();
    if (sts.data == null) sts.data = "";
    if (!Array.isArray(sts.treeTypes)) sts.treeTypes = [];
    if (sts.initsp == null) sts.initsp = 0;
    if (sts.msp == null) sts.msp = 0;
    return sts;
  }

  function babyBaseActorIds(actor) {
    const ids = [];
    ["baseid", "baseId", "_baseid", "_baseId", "_baseActorId", "baseActorId", "_actorId", "_classId"].forEach((key) => {
      const id = Math.floor(looseNumber(actor && actor[key]));
      if (Number.isFinite(id) && id > 0 && !ids.includes(id)) ids.push(id);
    });
    [1001, 1].forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
    return ids;
  }

  function babyActorDataName(actor, fallback) {
    try {
      if (actor && typeof actor.name === "function") {
        const name = actor.name();
        if (name) return name;
      }
    } catch (_) {}
    return actor && actor._name || fallback || "";
  }

  function makeBabyActorData(source, actor, id) {
    const data = clonePlainObject(source);
    data.id = id;
    data.name = babyActorDataName(actor, data.name);
    if (actor && actor._classId != null) data.classId = actor._classId;
    if (!Array.isArray(data.traits)) data.traits = [];
    if (!Array.isArray(data.equips)) data.equips = Array.isArray(source && source.equips) ? source.equips.slice() : [];
    if (!data.meta || typeof data.meta !== "object") data.meta = {};
    data.sts = normalizeBabySts(data.sts && typeof data.sts === "object" ? data.sts : clonePlainObject(source && source.sts));
    return data;
  }

  function ensureBabyActorData(actor) {
    if (!isBabyActor(actor)) return null;
    const id = Math.floor(looseNumber(actorIdOf(actor) || actor && actor._actorId));
    if (!Number.isFinite(id) || id <= 0) return null;
    const actors = resolveData("actor");
    if (!actors || typeof actors !== "object") return null;
    const current = actors[id];
    let source = current && typeof current === "object" ? current : null;
    for (const sourceId of babyBaseActorIds(actor)) {
      if (actors[sourceId] && typeof actors[sourceId] === "object") {
        source = actors[sourceId];
        break;
      }
    }
    const data = current && typeof current === "object" ? current : makeBabyActorData(source, actor, id);
    data.id = id;
    data.name = babyActorDataName(actor, data.name);
    if (actor && actor._classId != null) data.classId = actor._classId;
    if (!Array.isArray(data.traits)) data.traits = Array.isArray(source && source.traits) ? clonePlainObject(source.traits) : [];
    if (!Array.isArray(data.equips)) data.equips = Array.isArray(source && source.equips) ? source.equips.slice() : [];
    if (!data.meta || typeof data.meta !== "object") data.meta = clonePlainObject(source && source.meta);
    data.sts = normalizeBabySts(data.sts && typeof data.sts === "object" ? data.sts : clonePlainObject(source && source.sts));
    actors[id] = data;
    return data;
  }

  function babyEquipSlots(actor) {
    try {
      const slots = actor && typeof actor.equipSlots === "function" ? actor.equipSlots() : null;
      if (Array.isArray(slots)) {
        return uniqueNumericIds(slots).filter(id => id > 0);
      }
    } catch (_) {}
    return [];
  }

  function babySlotAllowsEquipment(actor, item) {
    const slots = babyEquipSlots(actor);
    const etypeId = Math.floor(looseNumber(item && item.etypeId));
    return !slots.length || !Number.isFinite(etypeId) || slots.includes(etypeId);
  }

  function babyCanEquipArmor(actor, armor) {
    if (!armor) return true;
    if (equipmentKind(armor) !== "armor") return false;
    const atypeId = Math.floor(looseNumber(armor.atypeId));
    return atypeId === babyArmorTypeId() && babySlotAllowsEquipment(actor, armor);
  }

  function babyCanEquipWeapon(actor, weapon) {
    if (!weapon) return true;
    if (equipmentKind(weapon) !== "weapon") return false;
    const wtypeId = Math.floor(looseNumber(weapon.wtypeId));
    return wtypeId === babyWeaponTypeId() && babySlotAllowsEquipment(actor, weapon);
  }

  function babyCanEquipItem(actor, item) {
    if (!item) return true;
    const kind = equipmentKind(item);
    if (kind === "armor") return babyCanEquipArmor(actor, item);
    if (kind === "weapon") return babyCanEquipWeapon(actor, item);
    return false;
  }

  function babyRuntimeMetadataError(error) {
    const text = String(error && (error.message || error.stack) || error || "");
    return /sts|ArmorType|WeaponType/.test(text);
  }

  function actionSkillIds(actor) {
    if (!actor) return [];
    if (Array.isArray(actor._bbSkill)) return uniqueNumericIds(actor._bbSkill);
    if (Array.isArray(actor._actlist)) {
      return uniqueNumericIds(actor._actlist.map(action => actionSkillId(action)));
    }
    return [];
  }

  function actorLearnedSkillIds(actor) {
    if (!actor) return [];
    if (isBabyActor(actor)) {
      const ids = [];
      if (Array.isArray(actor._skills)) ids.push(...actor._skills);
      if (Array.isArray(actor._realSkills)) ids.push(...actor._realSkills);
      if (Array.isArray(actor[BABY_PASSIVE_STORE_KEY])) ids.push(...actor[BABY_PASSIVE_STORE_KEY]);
      return uniqueNumericIds(ids);
    }
    if (Array.isArray(actor._skills)) return uniqueNumericIds(actor._skills);
    try {
      if (typeof actor.skills === "function") return uniqueNumericIds(actor.skills().map(skill => skill && skill.id));
    } catch (_) {}
    return [];
  }

  function babyPassiveStore(actor) {
    if (!actor || typeof actor !== "object") return [];
    if (!Array.isArray(actor[BABY_PASSIVE_STORE_KEY])) {
      actor[BABY_PASSIVE_STORE_KEY] = actorLearnedSkillIds(actor).slice();
    }
    return actor[BABY_PASSIVE_STORE_KEY];
  }

  function ensureSkillCooldownMetadata(skill) {
    if (!skill || typeof skill !== "object") return skill;
    ["cooldown", "stypeCooldown", "cooldownChange", "stypeCooldownChange", "warmupChange", "stypeWarmupChange"].forEach((key) => {
      if (!skill[key] || typeof skill[key] !== "object") skill[key] = {};
    });
    [
      ["globalCooldown", 0],
      ["afterBattleCooldown", 0],
      ["cooldownSteps", 0],
      ["warmup", 0],
      ["globalCooldownChange", 0],
      ["globalWarmupChange", 0]
    ].forEach(([key, fallback]) => {
      if (!Number.isFinite(Number(skill[key]))) skill[key] = fallback;
    });
    if (typeof skill.bypassCooldown !== "boolean") skill.bypassCooldown = false;
    if (skill.cooldownEval == null) skill.cooldownEval = "";
    if (skill.warmupEval == null) skill.warmupEval = "";
    return skill;
  }

  function skillObjectForId(skillId) {
    const id = Math.floor(looseNumber(skillId));
    if (!Number.isFinite(id) || id <= 0) return null;
    const table = resolveData("skill") || [];
    const skill = table[id];
    if (skill && typeof skill === "object") return ensureSkillCooldownMetadata(skill);
    return ensureSkillCooldownMetadata({ id, name: "", note: "", stypeId: 0 });
  }

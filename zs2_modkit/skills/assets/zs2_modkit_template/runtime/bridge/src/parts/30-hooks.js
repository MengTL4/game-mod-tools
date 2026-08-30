  function setTrainerOptions(options) {
    if (!options || typeof options !== "object") return { ...bridge.options };
    const previousNoCost = bridge.options.noSkillCost;
    if (Object.prototype.hasOwnProperty.call(options, "expRate")) bridge.options.expRate = clampNumber(options.expRate, 0, 999, bridge.options.expRate);
    if (Object.prototype.hasOwnProperty.call(options, "goldRate")) bridge.options.goldRate = clampNumber(options.goldRate, 0, 999, bridge.options.goldRate);
    if (Object.prototype.hasOwnProperty.call(options, "dropRate")) bridge.options.dropRate = clampNumber(options.dropRate, 0, 999, bridge.options.dropRate);
    if (Object.prototype.hasOwnProperty.call(options, "noSkillCost")) bridge.options.noSkillCost = toBool(options.noSkillCost);
    if (Object.prototype.hasOwnProperty.call(options, "oneHitKill")) bridge.options.oneHitKill = toBool(options.oneHitKill);
    if (Object.prototype.hasOwnProperty.call(options, "invincible")) bridge.options.invincible = toBool(options.invincible);
    if (previousNoCost !== bridge.options.noSkillCost) {
      resetNoCostBaselines();
      if (bridge.options.noSkillCost) preserveNoCostResources("enabled");
    }
    patchTrainerHooks();
    return { ...bridge.options };
  }

  function patchMethod(owner, name, key, wrapper) {
    if (!owner || typeof owner[name] !== "function") return false;
    if (owner[name].__codexTrainerPatched) return true;
    if (!bridge.originals[key]) bridge.originals[key] = owner[name];
    const original = bridge.originals[key];
    const patched = function () {
      return wrapper.call(this, original, arguments);
    };
    Object.defineProperty(patched, "__codexTrainerPatched", { value: true, configurable: true });
    owner[name] = patched;
    return true;
  }

  function patchTrainerHooks() {
    let count = 0;
    const hooked = [];

    const enemyProtos = uniqueTargets(resolvePrototypeTargets("Game_Enemy", ["Game_Enemy", "GameEnemy"]).concat(
      troopEnemyPrototypeTargets("runtime.troop")
    ));
    enemyProtos.forEach((target) => {
      if (patchMethod(target.object, "dropItemRate", `${target.label}.dropItemRate`, function (original, args) {
        const base = Number(original.apply(this, args) || 0);
        const value = Math.max(0, base * bridge.options.dropRate);
        bumpRateStat("dropItemRate", { base, value, rate: bridge.options.dropRate });
        return value;
      })) {
        count += 1;
        hooked.push(`${target.label}.dropItemRate`);
      }
      if (patchMethod(target.object, "makeDropItems", `${target.label}.makeDropItems`, function (original, args) {
        const result = original.apply(this, args);
        if (!Array.isArray(result) || bridge.options.dropRate <= 1) return result;
        const enemy = typeof this.enemy === "function" ? this.enemy() : null;
        const drops = enemy && Array.isArray(enemy.dropItems) ? enemy.dropItems : [];
        const tables = [null, resolveData("item"), resolveData("weapon"), resolveData("armor")];
        const existing = new Set(result.filter(Boolean).map((item) => `${item.id}:${item.name}`));
        drops.forEach((drop) => {
          if (!drop || !drop.kind || !drop.dataId) return;
          const table = tables[drop.kind];
          const item = table && table[drop.dataId];
          if (!item) return;
          const key = `${item.id}:${item.name}`;
          const denominator = Math.max(1, Number(drop.denominator || 1));
          const chance = Math.min(1, bridge.options.dropRate / denominator);
          if (!existing.has(key) && Math.random() < chance) {
            result.push(item);
            existing.add(key);
          }
        });
        bumpRateStat("makeDropItems", { count: result.length, rate: bridge.options.dropRate });
        return result;
      })) {
        count += 1;
        hooked.push(`${target.label}.makeDropItems`);
      }
    });

    const applyRewards = function (manager) {
      const rewards = manager && manager._rewards;
      if (!rewards) return false;
      if (!rewards.__codexBaseRewards) {
        const baseRewards = {
          exp: Number(rewards.exp || 0),
          gold: Number(rewards.gold || 0)
        };
        try {
          Object.defineProperty(rewards, "__codexBaseRewards", {
            value: baseRewards,
            configurable: true
          });
        } catch (_) {
          rewards.__codexBaseRewards = baseRewards;
        }
      }
      rewards.exp = Math.max(0, Math.floor(rewards.__codexBaseRewards.exp * bridge.options.expRate));
      rewards.gold = Math.max(0, Math.floor(rewards.__codexBaseRewards.gold * bridge.options.goldRate));
      bumpRateStat("battleRewards", {
        exp: rewards.exp,
        gold: rewards.gold,
        expRate: bridge.options.expRate,
        goldRate: bridge.options.goldRate
      });
      return true;
    };
    resolveBattleManagers().forEach((target) => {
      if (patchMethod(target.object, "makeRewards", `${target.label}.makeRewards`, function (original, args) {
        const result = original.apply(this, args);
        applyRewards(this);
        return result;
      })) {
        count += 1;
        hooked.push(`${target.label}.makeRewards`);
      }
      if (patchMethod(target.object, "gainRewards", `${target.label}.gainRewards`, function (original, args) {
        const scaled = applyRewards(this);
        return scaled
          ? withRatesSuppressed(() => original.apply(this, args))
          : withRateContext(() => original.apply(this, args));
      })) {
        count += 1;
        hooked.push(`${target.label}.gainRewards`);
      }
      if (patchMethod(target.object, "gainExp", `${target.label}.gainExp`, function (original, args) {
        const scaled = applyRewards(this);
        return scaled
          ? withRatesSuppressed(() => original.apply(this, args))
          : withRateContext(() => original.apply(this, args));
      })) {
        count += 1;
        hooked.push(`${target.label}.gainExp`);
      }
      if (patchMethod(target.object, "gainGold", `${target.label}.gainGold`, function (original, args) {
        const scaled = applyRewards(this);
        return scaled
          ? withRatesSuppressed(() => original.apply(this, args))
          : withRateContext(() => original.apply(this, args));
      })) {
        count += 1;
        hooked.push(`${target.label}.gainGold`);
      }
    });

    uniqueTargets(resolvePrototypeTargets("Game_Actor", ["Game_Actor", "GameActor"]).concat(
      partyMemberPrototypeTargets("runtime.party")
    )).forEach((target) => {
      if (patchMethod(target.object, "gainExp", `${target.label}.gainExp`, function (original, args) {
        if (bridge.suppressRates > 0 || bridge.options.expRate === 1 || !isInBattleRewardContext()) {
          return original.apply(this, args);
        }
        const next = Array.prototype.slice.call(args);
        const originalAmount = Number(next[0] || 0);
        next[0] = scaledPositiveAmount(next[0], bridge.options.expRate);
        bumpRateStat("actorGainExp", { base: originalAmount, value: next[0], rate: bridge.options.expRate });
        return original.apply(this, next);
      })) {
        count += 1;
        hooked.push(`${target.label}.gainExp`);
      }
    });

    uniqueTargets(resolvePrototypeTargets("Game_Actor", ["Game_Actor", "GameActor"]).concat(
      partyMemberPrototypeTargets("runtime.party"),
      babyActorPrototypeTargets("runtime.baby")
    )).forEach((target) => {
      if (patchMethod(target.object, "refresh", `${target.label}.babyRefresh`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        try {
          return original.apply(this, args);
        } catch (error) {
          if (!babyRuntimeMetadataError(error)) throw error;
          bridge.lastError = String(error && error.stack || error);
          ensureBabyActorData(this);
          return undefined;
        }
      })) {
        count += 1;
        hooked.push(`${target.label}.babyRefresh`);
      }
      if (patchMethod(target.object, "isEquipAtypeOk", `${target.label}.babyIsEquipAtypeOk`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        const atypeId = Math.floor(looseNumber(args && args[0]));
        return atypeId === babyArmorTypeId();
      })) {
        count += 1;
        hooked.push(`${target.label}.babyIsEquipAtypeOk`);
      }
      if (patchMethod(target.object, "isEquipWtypeOk", `${target.label}.babyIsEquipWtypeOk`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        const wtypeId = Math.floor(looseNumber(args && args[0]));
        return wtypeId === babyWeaponTypeId();
      })) {
        count += 1;
        hooked.push(`${target.label}.babyIsEquipWtypeOk`);
      }
      if (patchMethod(target.object, "canEquipArmor", `${target.label}.babyCanEquipArmor`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        return babyCanEquipArmor(this, args && args[0]);
      })) {
        count += 1;
        hooked.push(`${target.label}.babyCanEquipArmor`);
      }
      if (patchMethod(target.object, "canEquipWeapon", `${target.label}.babyCanEquipWeapon`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        return babyCanEquipWeapon(this, args && args[0]);
      })) {
        count += 1;
        hooked.push(`${target.label}.babyCanEquipWeapon`);
      }
      if (patchMethod(target.object, "canEquip", `${target.label}.babyCanEquip`, function (original, args) {
        if (!isBabyActor(this)) return original.apply(this, args);
        ensureBabyActorData(this);
        return babyCanEquipItem(this, args && args[0]);
      })) {
        count += 1;
        hooked.push(`${target.label}.babyCanEquip`);
      }
    });

    resolvePrototypeTargets("Game_Party", ["Game_Party", "GameParty"]).forEach((target) => {
      if (patchMethod(target.object, "gainGold", `${target.label}.gainGold`, function (original, args) {
        if (bridge.suppressRates > 0 || bridge.options.goldRate === 1 || !isInBattleRewardContext()) {
          return original.apply(this, args);
        }
        const next = Array.prototype.slice.call(args);
        const originalAmount = Number(next[0] || 0);
        next[0] = scaledPositiveAmount(next[0], bridge.options.goldRate);
        bumpRateStat("partyGainGold", { base: originalAmount, value: next[0], rate: bridge.options.goldRate });
        return original.apply(this, next);
      })) {
        count += 1;
        hooked.push(`${target.label}.gainGold`);
      }
    });

    resolvePrototypeTargets("Game_Action", ["Game_Action", "GameAction"]).forEach((target) => {
      if (patchMethod(target.object, "apply", `${target.label}.apply`, function (original, args) {
        const subject = typeof this.subject === "function" ? this.subject() : null;
        const targetBattler = args && args[0];
        const hpSnapshot = bridge.options.invincible && isActorBattler(targetBattler) ? battlerHp(targetBattler) : null;
        const result = withNoCostPreserved(subject, `${target.label}.apply`, () => original.apply(this, args));
        if (hpSnapshot != null) restoreInvincibleHp(targetBattler, hpSnapshot, `${target.label}.apply`);
        if (bridge.options.oneHitKill && isActorBattler(subject) && isEnemyBattler(targetBattler)) {
          defeatEnemy(targetBattler, `${target.label}.apply`);
        }
        return result;
      })) {
        count += 1;
        hooked.push(`${target.label}.apply`);
      }
      if (patchMethod(target.object, "executeHpDamage", `${target.label}.executeHpDamage`, function (original, args) {
        const targetBattler = args && args[0];
        const value = Number(args && args[1] || 0);
        if (bridge.options.invincible && isActorBattler(targetBattler) && value > 0) {
          const next = Array.prototype.slice.call(args);
          next[1] = 0;
          bumpBattleStat("invincibleDamage", { source: target.label, value });
          return original.apply(this, next);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.executeHpDamage`);
      }
    });

    uniqueTargets(resolvePrototypeTargets("Game_Battler", ["Game_Battler", "GameBattler"]).concat(
      partyMemberPrototypeTargets("runtime.party")
    )).forEach((target) => {
      if (patchMethod(target.object, "setHp", `${target.label}.setHp`, function (original, args) {
        if (shouldBlockHpDecrease(this, args[0])) {
          const current = battlerHp(this);
          bumpBattleStat("invincibleBlockHp", { source: target.label, value: args[0], current });
          return original.call(this, current);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setHp`);
      }
      if (patchMethod(target.object, "useItem", `${target.label}.useItem`, function (original, args) {
        return withNoCostPreserved(this, `${target.label}.useItem`, () => original.apply(this, args));
      })) {
        count += 1;
        hooked.push(`${target.label}.useItem`);
      }
      if (patchMethod(target.object, "setMp", `${target.label}.setMp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "mp")) {
          bumpBattleStat("noSkillCostBlockMp", { source: target.label, value: args[0] });
          return original.call(this, this.mp == null ? this._mp : this.mp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setMp`);
      }
      if (patchMethod(target.object, "setTp", `${target.label}.setTp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "tp")) {
          bumpBattleStat("noSkillCostBlockTp", { source: target.label, value: args[0] });
          return original.call(this, this.tp == null ? this._tp : this.tp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setTp`);
      }
    });

    uniqueTargets(resolvePrototypeTargets("Game_BattlerBase", ["Game_BattlerBase", "GameBattlerBase"]).concat(
      partyMemberPrototypeTargets("runtime.party")
    )).forEach((target) => {
      if (patchMethod(target.object, "setHp", `${target.label}.setHp`, function (original, args) {
        if (shouldBlockHpDecrease(this, args[0])) {
          const current = battlerHp(this);
          bumpBattleStat("invincibleBaseBlockHp", { source: target.label, value: args[0], current });
          return original.call(this, current);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setHp`);
      }
      if (patchMethod(target.object, "canPaySkillCost", `${target.label}.canPaySkillCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostCanPay", { source: target.label });
          return true;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.canPaySkillCost`);
      }
      if (patchMethod(target.object, "paySkillCost", `${target.label}.paySkillCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostPay", { source: target.label });
          return;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.paySkillCost`);
      }
      if (patchMethod(target.object, "skillMpCost", `${target.label}.skillMpCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostMp", { source: target.label });
          return 0;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.skillMpCost`);
      }
      if (patchMethod(target.object, "skillTpCost", `${target.label}.skillTpCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostTp", { source: target.label });
          return 0;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.skillTpCost`);
      }
      if (patchMethod(target.object, "setMp", `${target.label}.setMp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "mp")) {
          bumpBattleStat("noSkillCostBaseBlockMp", { source: target.label, value: args[0] });
          return original.call(this, this.mp == null ? this._mp : this.mp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setMp`);
      }
      if (patchMethod(target.object, "setTp", `${target.label}.setTp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "tp")) {
          bumpBattleStat("noSkillCostBaseBlockTp", { source: target.label, value: args[0] });
          return original.call(this, this.tp == null ? this._tp : this.tp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setTp`);
      }
    });

    uniqueTargets(resolvePrototypeTargets("Game_Actor", ["Game_Actor", "GameActor"]).concat(
      partyMemberPrototypeTargets("runtime.party")
    )).forEach((target) => {
      if (patchMethod(target.object, "setHp", `${target.label}.setHp`, function (original, args) {
        if (shouldBlockHpDecrease(this, args[0])) {
          const current = battlerHp(this);
          bumpBattleStat("invincibleActorBlockHp", { source: target.label, value: args[0], current });
          return original.call(this, current);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setHp`);
      }
      if (patchMethod(target.object, "skillMpCost", `${target.label}.skillMpCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostActorMp", { source: target.label });
          return 0;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.skillMpCost`);
      }
      if (patchMethod(target.object, "skillTpCost", `${target.label}.skillTpCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostActorTp", { source: target.label });
          return 0;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.skillTpCost`);
      }
      if (patchMethod(target.object, "paySkillCost", `${target.label}.paySkillCost`, function (original, args) {
        if (bridge.options.noSkillCost && isActorBattler(this)) {
          bumpBattleStat("noSkillCostActorPay", { source: target.label });
          return;
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.paySkillCost`);
      }
      if (patchMethod(target.object, "setMp", `${target.label}.setMp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "mp")) {
          bumpBattleStat("noSkillCostActorBlockMp", { source: target.label, value: args[0] });
          return original.call(this, this.mp == null ? this._mp : this.mp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setMp`);
      }
      if (patchMethod(target.object, "setTp", `${target.label}.setTp`, function (original, args) {
        if (shouldBlockResourceDecrease(this, args[0], "tp")) {
          bumpBattleStat("noSkillCostActorBlockTp", { source: target.label, value: args[0] });
          return original.call(this, this.tp == null ? this._tp : this.tp);
        }
        return original.apply(this, args);
      })) {
        count += 1;
        hooked.push(`${target.label}.setTp`);
      }
    });

    bridge.hooksPatched = count > 0;
    bridge.hookTargets = Array.from(new Set(hooked));
    return { patched: bridge.hooksPatched, count };
  }

  function variableValue(id) {
    try {
      const variables = resolveVariables();
      return variables && typeof variables.value === "function" ? variables.value(id) : null;
    } catch (_) {
      return null;
    }
  }

  function switchValue(id) {
    try {
      const switches = resolveSwitches();
      return switches && typeof switches.value === "function" ? switches.value(id) : null;
    } catch (_) {
      return null;
    }
  }

  function setVariableValue(id, value) {
    const variables = resolveVariables();
    if (!variables || typeof variables.setValue !== "function") throw new Error("game variables are unavailable");
    variables.setValue(id, value);
    return value;
  }

  function setSwitchValue(id, value) {
    const switches = resolveSwitches();
    if (!switches || typeof switches.setValue !== "function") throw new Error("game switches are unavailable");
    switches.setValue(id, !!value);
    return !!value;
  }

  function compactRuntimeValue(value, depth) {
    if (value === null || value === undefined) return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "function") return runtimePreview(value, 180);
    if (depth <= 0) return runtimePreview(value, 180);
    if (Array.isArray(value)) {
      return {
        type: "array",
        length: value.length,
        items: value.slice(0, 20).map(item => compactRuntimeValue(item, depth - 1))
      };
    }
    if (typeof value === "object") {
      const output = {};
      safeOwnPropertyNames(value).slice(0, 24).forEach((key) => {
        try {
          output[key] = compactRuntimeValue(value[key], depth - 1);
        } catch (error) {
          output[key] = { error: String(error && error.message || error) };
        }
      });
      return output;
    }
    return runtimePreview(value, 180);
  }

  function hangupSummary() {
    const party = resolveParty();
    const fieldNames = [
      "_hangUpData",
      "_hangUpSiwitch",
      "_hangUpSwitch",
      "_hangUpCount",
      "_hangUpSaveSec",
      "_hangUpAdPendingStop",
      "_hangUpAdRemainFrames",
      "_XdRsData_hangUp_ActSkill",
      "_XdRsData_hangUp_ActSkills",
      "_XdRsData_hangUp_RecoveryHMP",
      "_XdRsData_hangUp_SellWeapon"
    ];
    const methodNames = [
      "startHangUp",
      "stopHangUp",
      "isHangUp",
      "hangUpSwitch",
      "hangUpData",
      "setHangUpData",
      "refrishHangUp",
      "hangUpTime",
      "hangUpTimeText"
    ];
    const fields = {};
    const calls = {};
    const methods = [];
    if (!party) {
      return { partyAvailable: false, available: false, active: false, fields, calls, methods };
    }
    fieldNames.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(party, key)) {
        fields[key] = compactRuntimeValue(party[key], 2);
      }
    });
    methodNames.forEach((key) => {
      if (typeof party[key] === "function") methods.push(key);
    });
    ["isHangUp", "hangUpSwitch", "hangUpData", "hangUpTime", "hangUpTimeText"].forEach((key) => {
      if (typeof party[key] !== "function") return;
      try {
        calls[key] = compactRuntimeValue(party[key].call(party), 2);
      } catch (error) {
        calls[key] = { error: String(error && error.message || error) };
      }
    });
    const active = typeof calls.isHangUp === "boolean"
      ? calls.isHangUp
      : !!(fields._hangUpSiwitch || fields._hangUpSwitch);
    return {
      partyAvailable: true,
      available: methods.some(name => ["startHangUp", "stopHangUp", "refrishHangUp"].includes(name)),
      active,
      fields,
      calls,
      methods: methods.sort()
    };
  }

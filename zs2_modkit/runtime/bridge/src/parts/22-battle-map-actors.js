  function currentMapInfo() {
    const map = resolveMap();
    const player = resolvePlayer();
    let mapId = null;
    let x = null;
    let y = null;
    let direction = null;
    let through = null;
    try {
      if (map && typeof map.mapId === "function") mapId = map.mapId();
      else if (map && map._mapId != null) mapId = map._mapId;
    } catch (_) {}
    try {
      if (player) {
        x = readGameValue(player, "x", "_x");
        y = readGameValue(player, "y", "_y");
        direction = readGameValue(player, "direction", "_direction");
        through = playerThroughState(player);
      }
    } catch (_) {}
    return {
      mapId,
      x,
      y,
      direction,
      through
    };
  }

  function battleManagerObject() {
    const managers = resolveBattleManagers();
    return managers.map(target => target.object).find(Boolean) || null;
  }

  function isInBattle() {
    try {
      const party = resolveParty();
      if (party && typeof party.inBattle === "function" && party.inBattle()) return true;
    } catch (_) {}
    try {
      const manager = battleManagerObject();
      if (manager && manager._phase && manager._phase !== "init") return true;
    } catch (_) {}
    return false;
  }

  function troopEnemies(aliveOnly) {
    const troop = resolveTroop();
    if (!troop) return [];
    try {
      if (aliveOnly && typeof troop.aliveMembers === "function") return troop.aliveMembers().filter(isEnemyBattler);
      if (typeof troop.members === "function") return troop.members().filter(isEnemyBattler);
    } catch (_) {}
    if (Array.isArray(troop._enemies)) return troop._enemies.filter(enemy => isEnemyBattler(enemy) && (!aliveOnly || battlerHp(enemy) > 0));
    return [];
  }

  function defeatEnemy(enemy, source) {
    if (!enemy || !isEnemyBattler(enemy) || battlerHp(enemy) <= 0) return false;
    try {
      if (typeof enemy.setHp === "function") enemy.setHp(0);
      else enemy._hp = 0;
      if (typeof enemy.die === "function") enemy.die();
      if (typeof enemy.performCollapse === "function") enemy.performCollapse();
      if (enemy.result && typeof enemy.result === "function") {
        const result = enemy.result();
        if (result) result.hpDamage = Math.max(Number(result.hpDamage || 0), 999999);
      }
      if (typeof enemy.refresh === "function") enemy.refresh();
      bumpBattleStat("oneHitKill", { source, enemyId: typeof enemy.enemyId === "function" ? enemy.enemyId() : enemy._enemyId });
      return true;
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      return false;
    }
  }

  function killBattleEnemies(command) {
    const enemies = troopEnemies(true);
    let count = 0;
    enemies.forEach(enemy => {
      if (defeatEnemy(enemy, "command")) count += 1;
    });
    const finish = command && Object.prototype.hasOwnProperty.call(command, "finish") ? toBool(command.finish) : true;
    if (count > 0 && finish) {
      try {
        const manager = battleManagerObject();
        if (manager && typeof manager.processVictory === "function") manager.processVictory();
      } catch (_) {}
    }
    refreshMapAndWindows();
    bumpBattleStat("killEnemies", { count, finish });
    return { count, finish, inBattle: isInBattle() };
  }

  function escapeBattle() {
    const manager = battleManagerObject();
    if (!manager || !isInBattle()) return { attempted: false, escaped: false, reason: "not in battle" };
    let escaped = false;
    try {
      if (typeof manager.processEscape === "function") {
        const previousRatio = manager._escapeRatio;
        manager._escapeRatio = 1;
        const result = manager.processEscape();
        escaped = result !== false;
        if (previousRatio != null) manager._escapeRatio = previousRatio;
      }
      if (!escaped && typeof manager.processAbort === "function") {
        manager.processAbort();
        escaped = true;
      }
      if (!escaped && typeof manager.endBattle === "function") {
        manager.endBattle(1);
        escaped = true;
      }
      bumpBattleStat("escape", { escaped });
      refreshMapAndWindows();
      return { attempted: true, escaped };
    } catch (error) {
      bridge.lastError = String(error && error.stack || error);
      throw error;
    }
  }

  function playerThroughState(player) {
    try {
      if (player && typeof player.isThrough === "function") return !!player.isThrough();
      if (player && player._through != null) return !!player._through;
    } catch (_) {}
    return false;
  }

  function setPlayerThrough(command, toggle) {
    const player = resolvePlayer();
    if (!player) throw new Error("game player is unavailable");
    const previous = playerThroughState(player);
    const next = toggle ? !previous : (
      Object.prototype.hasOwnProperty.call(command || {}, "value") ? toBool(command.value) : true
    );
    if (typeof player.setThrough === "function") player.setThrough(next);
    else player._through = next;
    refreshMapAndWindows();
    bumpBattleStat("mapThrough", { through: next });
    return { previous, through: next, currentMap: currentMapInfo() };
  }

  function commandBattleTroopId(command) {
    const direct = Math.floor(looseNumber(command && (command.troopId != null ? command.troopId : command.id)));
    if (Number.isFinite(direct) && direct > 0) return { troopId: direct, source: "command" };
    const variableId = command && command.variableId !== undefined && command.variableId !== ""
      ? Math.floor(requireNumber(command.variableId, "variableId"))
      : 399;
    const variables = resolveVariables();
    let value = null;
    try {
      value = variables && typeof variables.value === "function" ? variables.value(variableId) : null;
    } catch (_) {}
    const troopId = Math.floor(looseNumber(value));
    if (Number.isFinite(troopId) && troopId > 0) {
      return { troopId, source: "variable", variableId, variableValue: value };
    }
    throw new Error(`troopId is unavailable; provide troopId or set variable ${variableId}`);
  }

  function runBattleInterpreterCommand(troopId, canEscape, canLose) {
    const map = resolveMap();
    const interpreter = map && map._interpreter;
    if (!interpreter || typeof interpreter.command301 !== "function") return null;
    const previousParams = interpreter._params;
    const previousIndent = interpreter._indent;
    try {
      if (!interpreter._branch || typeof interpreter._branch !== "object") interpreter._branch = {};
      interpreter._params = [0, troopId, canEscape, canLose];
      interpreter._indent = 0;
      return { method: "interpreter.command301", result: interpreter.command301() };
    } finally {
      interpreter._params = previousParams;
      interpreter._indent = previousIndent;
    }
  }

  function runDirectBattleStart(troopId, canEscape, canLose) {
    const manager = battleManagerObject();
    if (!manager || typeof manager.setup !== "function") throw new Error("BattleManager.setup is unavailable");
    const sceneManager = resolveSceneManager();
    const sceneBattle = window.Scene_Battle;
    if (!sceneManager || typeof sceneManager.push !== "function" || typeof sceneBattle !== "function") {
      throw new Error("Scene_Battle is unavailable");
    }
    manager.setup(troopId, canEscape, canLose);
    if (typeof manager.setEventCallback === "function") manager.setEventCallback(function () {});
    try {
      const player = resolvePlayer();
      if (player && typeof player.makeEncounterCount === "function") player.makeEncounterCount();
    } catch (_) {}
    sceneManager.push(sceneBattle);
    return { method: "BattleManager.setup" };
  }

  function startSpecifiedBattle(command) {
    if (isInBattle()) return { started: false, reason: "already in battle", inBattle: true };
    const { troopId, source, variableId, variableValue } = commandBattleTroopId(command || {});
    const troops = resolveData("troop");
    const troop = troops && troops[troopId];
    if (!troop) throw new Error(`troop ${troopId} not found`);
    const canEscape = command && Object.prototype.hasOwnProperty.call(command, "canEscape") ? toBool(command.canEscape) : true;
    const canLose = command && Object.prototype.hasOwnProperty.call(command, "canLose") ? toBool(command.canLose) : true;
    let startResult = null;
    let interpreterError = null;
    try {
      startResult = runBattleInterpreterCommand(troopId, canEscape, canLose);
    } catch (error) {
      interpreterError = error;
    }
    if (!startResult) {
      try {
        startResult = runDirectBattleStart(troopId, canEscape, canLose);
      } catch (error) {
        if (interpreterError) {
          throw new Error(`battle start failed: ${String(interpreterError && interpreterError.message || interpreterError)}; ${String(error && error.message || error)}`);
        }
        throw error;
      }
    }
    refreshMapAndWindows();
    bumpBattleStat("battleStart", { troopId, source });
    return {
      started: true,
      troopId,
      name: troop.name || "",
      method: startResult && startResult.method || "",
      source,
      variableId,
      variableValue,
      canEscape,
      canLose
    };
  }

  function readGameValue(object, name, fallbackName) {
    const value = object && object[name];
    if (typeof value === "function") return value.call(object);
    if (value != null) return value;
    return object && object[fallbackName];
  }

  function resolveActor(actorId) {
    const id = Math.floor(requireNumber(actorId, "actorId"));
    const actors = resolveActors();
    if (actors && typeof actors.actor === "function") {
      const actor = actors.actor(id);
      if (actor) return actor;
    }
    const party = resolveParty();
    const members = getPartyMembers(party);
    return members.find(actor => actorIdOf(actor) === id) || null;
  }

  function requireActor(actorId) {
    const actor = resolveActor(actorId);
    if (!actor) throw new Error(`actor ${actorId} is unavailable`);
    return actor;
  }

  function refreshActor(actor) {
    try {
      if (actor && typeof actor.refresh === "function") actor.refresh();
    } catch (_) {}
  }

  function equipmentKind(item) {
    if (!item || typeof item !== "object") return "";
    if (item.wtypeId != null) return "weapon";
    if (item.atypeId != null) return "armor";
    const id = Number(item.id || 0);
    for (const kind of ["weapon", "armor"]) {
      const table = resolveData(kind);
      if (Array.isArray(table) && table[id] === item) return kind;
    }
    return "";
  }

  function equipmentTable(kind) {
    const table = resolveData(kind);
    return Array.isArray(table) ? table : [];
  }

  function refreshMapAndWindows() {
    try {
      const player = resolvePlayer();
      if (player && typeof player.refresh === "function") player.refresh();
      const sceneManager = resolveSceneManager();
      const scene = sceneManager && sceneManager._scene;
      if (scene && scene._statusWindow && typeof scene._statusWindow.refresh === "function") scene._statusWindow.refresh();
      if (scene && scene._itemWindow && typeof scene._itemWindow.refresh === "function") scene._itemWindow.refresh();
      if (scene && scene._skillWindow && typeof scene._skillWindow.refresh === "function") scene._skillWindow.refresh();
    } catch (_) {}
  }

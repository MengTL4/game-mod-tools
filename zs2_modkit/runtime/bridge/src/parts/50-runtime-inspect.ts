  function runtimeType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  function runtimePreview(value, maxLength) {
    const limit = maxLength || 180;
    try {
      if (typeof value === "function") {
        return String(value).replace(/\s+/g, " ").slice(0, limit);
      }
      if (typeof value === "string") return value.slice(0, limit);
      if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
      if (Array.isArray(value)) return `[array length=${value.length}]`;
      const ctor = value && value.constructor && value.constructor.name;
      return `[object ${ctor || "Object"}]`;
    } catch (error) {
      return `[preview failed: ${String(error && error.message || error)}]`;
    }
  }

  function safeOwnPropertyNames(object) {
    try {
      if (!object || (typeof object !== "object" && typeof object !== "function")) return [];
      return Object.getOwnPropertyNames(object);
    } catch (_) {
      return [];
    }
  }

  function applyRuntimePathSuffix(value, suffix) {
    const normalized = String(suffix || "")
      .replace(/\[(\d+)\]/g, ".$1")
      .replace(/^\./, "");
    if (!normalized) return value;
    const parts = normalized.split(".").filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      if (value == null) return undefined;
      value = value[parts[index]];
    }
    return value;
  }

  function readRuntimePath(pathText) {
    const raw = String(pathText || "window").trim();
    if (!raw || raw === "window") return { path: "window", value: window };
    const aliasPath = raw.match(/^alias:([A-Za-z_$][\w$]*)(.*)$/);
    if (aliasPath) {
      return { path: raw, value: applyRuntimePathSuffix(callAlias(aliasPath[1]), aliasPath[2]) };
    }
    const aliasCall = raw.match(/^(?:window\.)?TK\.\$\.([A-Za-z_$][\w$]*)\(\)(.*)$/);
    if (aliasCall) return { path: raw, value: applyRuntimePathSuffix(callAlias(aliasCall[1]), aliasCall[2]) };
    const parts = raw.split(".").filter(Boolean);
    let value = window;
    let start = 0;
    if (parts[0] === "window") start = 1;
    for (let index = start; index < parts.length; index += 1) {
      if (value == null) return { path: raw, value: undefined };
      value = value[parts[index]];
    }
    return { path: raw, value };
  }

  function runtimeInspect(command) {
    const maxKeys = Math.max(1, Math.min(1000, Math.floor(Number(command.maxKeys || 240))));
    const maxPreview = Math.max(40, Math.min(1000, Math.floor(Number(command.maxPreview || 220))));
    const { path: pathText, value } = readRuntimePath(command.path || "window");
    const rows = [];
    const pushKey = (owner, key, source) => {
      if (rows.length >= maxKeys) return;
      let item;
      try {
        item = owner[key];
      } catch (error) {
        rows.push({ key, source, error: String(error && error.message || error) });
        return;
      }
      rows.push({
        key,
        source,
        type: runtimeType(item),
        arity: typeof item === "function" ? item.length : undefined,
        preview: runtimePreview(item, maxPreview)
      });
    };

    safeOwnPropertyNames(value).sort().forEach(key => pushKey(value, key, "own"));
    if (command.prototype !== false && value && (typeof value === "object" || typeof value === "function")) {
      let proto = Object.getPrototypeOf(value);
      let depth = 0;
      while (proto && proto !== Object.prototype && rows.length < maxKeys && depth < 3) {
        safeOwnPropertyNames(proto).sort().forEach(key => {
          if (key !== "constructor") pushKey(proto, key, `proto${depth + 1}`);
        });
        proto = Object.getPrototypeOf(proto);
        depth += 1;
      }
    }

    return {
      path: pathText,
      type: runtimeType(value),
      preview: runtimePreview(value, maxPreview),
      keyCount: rows.length,
      keys: rows
    };
  }

  function runtimeSearch(command) {
    const defaultKeywords = ["talent", "title", "clothe", "costume", "chenghao", "stsSp", "ConfigMrg"];
    const keywords = (Array.isArray(command.keywords) && command.keywords.length ? command.keywords : defaultKeywords)
      .map(value => String(value || "").toLowerCase())
      .filter(Boolean);
    const maxResults = Math.max(1, Math.min(1000, Math.floor(Number(command.maxResults || 300))));
    const maxPreview = Math.max(40, Math.min(1000, Math.floor(Number(command.maxPreview || 220))));
    const maxDepth = Math.max(0, Math.min(5, Math.floor(Number(command.maxDepth || 2))));
    const roots = [
      ["window", window],
      ["window.TK", window.TK],
      ["window.TK.$", window.TK && window.TK.$],
      ["TK.$.gameSystem()", callAlias("gameSystem")],
      ["TK.$.gameParty()", callAlias("gameParty")],
      ["TK.$.gameVariables()", callAlias("gameVariables")],
      ["TK.$.gameSwitches()", callAlias("gameSwitches")],
      ["TK.$.gameMap()", callAlias("gameMap")],
      ["TK.$.gamePlayer()", callAlias("gamePlayer")],
      ["TK.$.gameTemp()", callAlias("gameTemp")],
      ["TK.$.dataSystem()", callAlias("dataSystem")],
      ["TK.$.dataItems()", callAlias("dataItems")],
      ["TK.$.dataSkills()", callAlias("dataSkills")],
      ["TK.$.dataCommonEvents()", callAlias("dataCommonEvents")],
      ["window.$gameSystem", window.$gameSystem],
      ["window.$gameParty", window.$gameParty],
      ["window.$gameVariables", window.$gameVariables],
      ["window.$gameSwitches", window.$gameSwitches],
      ["window.$gameMap", window.$gameMap],
      ["window.$gamePlayer", window.$gamePlayer],
      ["window.$gameTemp", window.$gameTemp],
      ["window.SceneManager", window.SceneManager],
      ["window.DataManager", window.DataManager],
      ["window.Game_Interpreter.prototype", window.Game_Interpreter && window.Game_Interpreter.prototype],
      ["window.Game_System.prototype", window.Game_System && window.Game_System.prototype],
      ["window.Game_Party.prototype", window.Game_Party && window.Game_Party.prototype],
      ["window.Game_Actor.prototype", window.Game_Actor && window.Game_Actor.prototype],
      ["window.Game_Battler.prototype", window.Game_Battler && window.Game_Battler.prototype],
      ["window.Game_Action.prototype", window.Game_Action && window.Game_Action.prototype],
      ["window.Window_Base.prototype", window.Window_Base && window.Window_Base.prototype]
    ].filter(item => item[1]);
    const visited = [];
    const results = [];

    const matches = (text) => {
      const haystack = String(text == null ? "" : text).toLowerCase();
      return keywords.some(keyword => haystack.includes(keyword));
    };
    const shouldDescend = (pathText, key, value, depth) => {
      if (depth >= maxDepth) return false;
      if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
      if (visited.includes(value)) return false;
      if (/^(document|localStorage|sessionStorage|indexedDB|chrome|nw|process|require|module|exports|global|console|performance)$/i.test(String(key))) return false;
      if (matches(pathText) || matches(key)) return true;
      return depth === 0 && /^(window\.TK|window\.TK\.\$|window\.\$game|window\.Game_|window\.SceneManager|window\.DataManager)/.test(pathText);
    };

    const addResult = (pathText, key, value, source) => {
      if (results.length >= maxResults) return;
      let preview = runtimePreview(value, maxPreview);
      if (!matches(pathText) && !matches(key) && !matches(preview)) return;
      results.push({
        path: pathText,
        key,
        source,
        type: runtimeType(value),
        arity: typeof value === "function" ? value.length : undefined,
        preview
      });
    };

    const visit = (pathText, object, depth) => {
      if (!object || (typeof object !== "object" && typeof object !== "function")) return;
      if (visited.includes(object) || results.length >= maxResults) return;
      visited.push(object);
      for (const key of safeOwnPropertyNames(object).sort()) {
        if (results.length >= maxResults) break;
        let value;
        try {
          value = object[key];
        } catch (_) {
          continue;
        }
        const childPath = `${pathText}.${key}`;
        addResult(childPath, key, value, "own");
        if (shouldDescend(childPath, key, value, depth)) visit(childPath, value, depth + 1);
      }

      const proto = Object.getPrototypeOf(object);
      if (proto && proto !== Object.prototype && depth < maxDepth && !visited.includes(proto)) {
        for (const key of safeOwnPropertyNames(proto).sort()) {
          if (results.length >= maxResults) break;
          if (key === "constructor") continue;
          let value;
          try {
            value = proto[key];
          } catch (_) {
            continue;
          }
          addResult(`${pathText}::${key}`, key, value, "prototype");
        }
      }
    };

    roots.forEach(([pathText, object]) => visit(pathText, object, 0));
    return {
      keywords,
      rootCount: roots.length,
      visitedCount: visited.length,
      resultCount: results.length,
      truncated: results.length >= maxResults,
      results
    };
  }

namespace Zs2Gui.Paths {
  const fs = require("fs");
  const path = require("path");

  export interface GuiPaths {
    projectRoot: string;
    rootDir: string;
    trainerGameExe: string;
    bridgeExtensionDir: string;
    bridgeDir: string;
    commandPath: string;
    eventPath: string;
    statePath: string;
    saveDir: string;
    dataDir: string;
    useDataDir: string;
    costumeDataPath: string;
    iconDir: string;
    iconSetPath: string;
  }

  export function create(cwd: string): GuiPaths {
    const projectRoot = path.resolve(cwd, "..", "..");
    const rootDir = resolveGameRoot(projectRoot);
    const bridgeDir = path.join(projectRoot, "runtime", "bridge-state");
    return {
      projectRoot,
      rootDir,
      trainerGameExe: path.join(rootDir, "Game.exe"),
      bridgeExtensionDir: path.join(projectRoot, "runtime", "bridge"),
      bridgeDir,
      commandPath: path.join(bridgeDir, "commands.jsonl"),
      eventPath: path.join(bridgeDir, "events.jsonl"),
      statePath: path.join(bridgeDir, "state.json"),
      saveDir: path.join(rootDir, "www", "save"),
      dataDir: path.join(projectRoot, "output", "extract", "data"),
      useDataDir: path.join(projectRoot, "output", "extract", "useData"),
      costumeDataPath: path.join(rootDir, "www", "data", "huanzhuang.json"),
      iconDir: path.join(cwd, "icons"),
      iconSetPath: path.join(rootDir, "www", "img", "system", "IconSet.png")
    };
  }

  function resolveGameRoot(projectRoot: string): string {
    const candidates: string[] = [];
    if (process.env.ZS2_GAME_ROOT) candidates.push(process.env.ZS2_GAME_ROOT);
    try {
      const configPath = path.join(projectRoot, "config.local.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (config && config.gameRoot) candidates.push(String(config.gameRoot));
      }
    } catch (error) {
      throw new Error("Invalid config.local.json: " + (error && error.message || error));
    }
    candidates.push(path.resolve(projectRoot, ".."));

    for (const candidate of candidates) {
      const fullPath = path.resolve(projectRoot, expandEnv(candidate));
      if (fs.existsSync(path.join(fullPath, "www", "index.html"))) {
        return fs.realpathSync(fullPath);
      }
    }
    throw new Error("Game root not found. Set ZS2_GAME_ROOT or create config.local.json.");
  }

  function expandEnv(value: string): string {
    return String(value).replace(/%([^%]+)%|\$\{([^}]+)\}/g, (match, winName, posixName) => {
      const name = winName || posixName;
      return process.env[name] || match;
    });
  }
}

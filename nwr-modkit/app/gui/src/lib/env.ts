const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");

declare const nw: { readonly Shell: { readonly openItem: (folder: string) => void } };

const projectRoot = path.resolve(process.cwd(), "..", "..");
const rootDir = resolveGameRoot(projectRoot);

export const projectRootPath = projectRoot;
export const gameRootPath = rootDir;
export const launchRuntimeScript = path.join(projectRoot, "tools", "launch-runtime.ps1");
export const preparedGameDir = path.join(projectRoot, "runtime", "game-app");
export const preparedGameLauncherPath = path.join(preparedGameDir, "start-manual-bg-bridge.cmd");
export const saveDir = path.join(rootDir, "www", "save");
export const dataDir = path.join(projectRoot, "output", "extract", "data");
export const iconDir = path.join(process.cwd(), "icons");
export const exportedIconSetPath = path.join(iconDir, "IconSet.png");
export const fallbackIconSetPath = path.join(rootDir, "www", "img", "system", "IconSet.png");

process.env.DQ2_MODKIT_ROOT = projectRoot;
process.env.DQ2_GAME_ROOT = rootDir;

export function resolveGameRoot(projectRoot: string): string {
  const candidates = [];
  if (process.env.DQ2_GAME_ROOT) candidates.push(process.env.DQ2_GAME_ROOT);
  try {
    const configPath = path.join(projectRoot, "config.local.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config && config.gameRoot) candidates.push(String(config.gameRoot));
    }
  } catch (error) {
    throw new Error("Invalid config.local.json: " + (error && (error as Error).message || error));
  }
  candidates.push(path.resolve(projectRoot, ".."));

  for (const candidate of candidates) {
    const fullPath = path.resolve(projectRoot, expandEnv(candidate));
    if (fs.existsSync(path.join(fullPath, "www", "index.html"))) {
      return fs.realpathSync(fullPath);
    }
  }
  throw new Error("Game root not found. Set DQ2_GAME_ROOT or create config.local.json.");
}

export function expandEnv(value: string): string {
  return String(value).replace(/%([^%]+)%|\$\{([^}]+)\}/g, (match, winName, posixName) => {
    const name = winName || posixName;
    return process.env[name] || match;
  });
}

export function readJson(file: string): unknown {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function openFolder(folder: string): void {
  try {
    fs.mkdirSync(folder, { recursive: true });
    nw.Shell.openItem(folder);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
}

export function copyDirectory(source: string, target: string): void {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

export function backupSaves(): string {
  if (!fs.existsSync(saveDir)) {
    throw new Error("没有找到存档目录");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(projectRoot, "output", "backup", "save", stamp);
  copyDirectory(saveDir, target);
  return target;
}

export function preparedGameReady(): boolean {
  return fs.existsSync(preparedGameLauncherPath);
}

import fs from "fs";
import path from "path";
import childProcess from "child_process";
import { readJson } from "./utils";
import type { GameEvent, GameState } from "../types";

declare const nw: any;

const projectRoot = path.resolve(process.cwd(), "..", "..");

export function resolveGameRoot(projectRootArg: string): string {
  const candidates: { value: string; base: string }[] = [];
  try {
    const configPath = path.join(projectRootArg, "config.local.json");
    if (fs.existsSync(configPath)) {
      const config = readJson(configPath);
      if (config && config.gameRoot) candidates.push({ value: String(config.gameRoot), base: projectRootArg });
    }
  } catch (error: any) {
    throw new Error("Invalid config.local.json: " + (error && error.message || error));
  }
  candidates.push({ value: path.resolve(projectRootArg, ".."), base: projectRootArg });
  if (process.env.DQ2_GAME_ROOT) candidates.push({ value: process.env.DQ2_GAME_ROOT, base: projectRootArg });

  for (const candidate of candidates) {
    const expanded = expandEnv(candidate.value);
    const fullPath = path.isAbsolute(expanded)
      ? path.resolve(expanded)
      : path.resolve(candidate.base, expanded);
    if (fs.existsSync(path.join(fullPath, "www", "index.html"))) {
      return fs.realpathSync(fullPath);
    }
  }
  throw new Error("Game root not found. Set DQ2_GAME_ROOT or create config.local.json.");
}

function expandEnv(value: any): string {
  return String(value).replace(/%([^%]+)%|\$\{([^}]+)\}/g, (match, winName, posixName) => {
    const name = winName || posixName;
    return process.env[name] || match;
  });
}

export const rootDir = resolveGameRoot(projectRoot);
export const trainerRuntimeDir = path.join(projectRoot, "runtime", "trainer");
export const trainerGameExe = path.join(trainerRuntimeDir, "Game.exe");
export const bridgeDir = path.join(projectRoot, "runtime", "bridge-state");
export const commandPath = path.join(bridgeDir, "commands.jsonl");
export const eventPath = path.join(bridgeDir, "events.jsonl");
export const statePath = path.join(bridgeDir, "state.json");
export const saveDir = path.join(rootDir, "www", "save");
export const dataDir = path.join(projectRoot, "output", "extract", "data");
export const guiCachePath = path.join(dataDir, "_gui-cache.json");
export const iconDir = path.join(process.cwd(), "icons");
export const iconSetPath = path.join(rootDir, "www", "img", "system", "IconSet.png");
export const EXPECTED_BRIDGE_VERSION = "0.2.29";
export const GUI_CACHE_VERSION = 1;

process.env.DQ2_MODKIT_ROOT = projectRoot;
process.env.DQ2_GAME_ROOT = rootDir;

export function ensureBridgeDir() {
  fs.mkdirSync(bridgeDir, { recursive: true });
}

export function loadGuiCache(): any {
  const cache = readJson(guiCachePath);
  if (!cache || cache.version !== GUI_CACHE_VERSION) return null;
  return cache;
}

export function sendCommand(command: any): any {
  ensureBridgeDir();
  const payload = {
    ...command,
    commandId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
  };
  fs.appendFileSync(commandPath, JSON.stringify(payload) + "\n", "utf8");
  return payload;
}

export function readEvents(): GameEvent[] {
  try {
    if (!fs.existsSync(eventPath)) return [];
    const text = fs.readFileSync(eventPath, "utf8").trim();
    if (!text) return [];
    return text.split(/\r?\n/).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean) as GameEvent[];
  } catch {
    return [];
  }
}

export function readState(): GameState | null {
  return readJson(statePath);
}

export function launchGame(): childProcess.ChildProcess | null {
  if (!fs.existsSync(trainerGameExe)) {
    throw new Error("找不到启动器运行时");
  }
  const gameProcess = childProcess.spawn(trainerGameExe, {
    cwd: trainerRuntimeDir,
    env: {
      ...process.env,
      DQ2_MODKIT_ROOT: projectRoot,
      DQ2_GAME_ROOT: rootDir,
    },
    detached: true,
    stdio: "ignore",
  });
  gameProcess.unref();
  return gameProcess;
}

export function openFolder(folder: string) {
  fs.mkdirSync(folder, { recursive: true });
  nw.Shell.openItem(folder);
}

function copyDirectory(source: string, target: string) {
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

export function clearEvents() {
  ensureBridgeDir();
  fs.writeFileSync(eventPath, "", "utf8");
}

export function decryptProtectedImage(input: Buffer): Buffer {
  const data = Buffer.from(input);
  if (data.length <= 100) return data;
  const head = data.subarray(0, 100);
  const body = unshuffleBytes(data.subarray(100));
  for (let i = 0; i < body.length; i += 1) {
    body[i] ^= (i % 256) ^ 90;
  }
  return Buffer.concat([head, body]);
}

function unshuffleBytes(input: Buffer): Buffer {
  const bytes = Array.from(input);
  const swaps: number[] = [];
  let remaining = bytes.length;
  const random = (max: number) => {
    const value = 10000 * Math.sin(12345 + remaining);
    return Math.floor((value - Math.floor(value)) * max);
  };
  while (remaining !== 0) {
    swaps.push(random(remaining));
    remaining -= 1;
  }
  const positions = Array.from({ length: bytes.length }, (_, index) => index);
  for (let i = 0; i < swaps.length; i += 1) {
    const from = swaps[i];
    const to = positions.length - 1 - i;
    if (from < to) {
      const old = positions[from];
      positions[from] = positions[to];
      positions[to] = old;
    }
  }
  const output = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) output[positions[i]] = bytes[i];
  return Buffer.from(output);
}

let iconSetImage: HTMLImageElement | null = null;
let iconRenderVersion = 0;
const iconCache = new Map<number, string>();

export function getIconRenderVersion(): number {
  return iconRenderVersion;
}

export function setupIconSet(onLoad: () => void) {
  try {
    const bytes = decryptProtectedImage(fs.readFileSync(iconSetPath));
    const image = new Image();
    image.onload = () => {
      iconSetImage = image;
      iconRenderVersion += 1;
      onLoad();
    };
    image.onerror = () => {
      throw new Error("图标集图片解码失败");
    };
    image.src = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (error: any) {
    throw new Error(`图标集加载失败：${error.message}`);
  }
}

export function iconDataUrl(iconIndex: number): string {
  const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
  if (iconCache.has(index)) return iconCache.get(index)!;
  if (!iconSetImage) return "";
  const x = (index % 16) * 32;
  const y = Math.floor(index / 16) * 32;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  context.drawImage(iconSetImage, x, y, 32, 32, 0, 0, 32, 32);
  const dataUrl = canvas.toDataURL("image/png");
  iconCache.set(index, dataUrl);
  return dataUrl;
}

export function iconUrl(iconIndex: number): string {
  const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
  const fileName = `icon_${index}.png`;
  if (fs.existsSync(path.join(iconDir, fileName))) {
    return `icons/${fileName}`;
  }
  return iconDataUrl(index);
}

const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");
import { exportedIconSetPath, fallbackIconSetPath, iconDir } from "./env";

const ICON_EXPORT_RETRY_MS = 5000;

let iconSetImage: HTMLImageElement | null = null;
let iconRenderVersion = 0;
let iconExportRequested = false;
let iconExportCompleted = false;
let iconExportLastAttemptMs = 0;
const iconCache = new Map<number, string>();

export function getIconRenderVersion(): number {
  return iconRenderVersion;
}

export function hasIconSet(): boolean {
  return !!iconSetImage;
}

export function exportedIconSetReady(): boolean {
  return validIconSheet(exportedIconSetPath);
}

export function existingIconSetPath(): string {
  if (validIconSheet(exportedIconSetPath)) return exportedIconSetPath;
  if (validIconSheet(fallbackIconSetPath)) return fallbackIconSetPath;
  return "";
}

export function setupIconSet(onUpdate: () => void): void {
  const iconSetPath = existingIconSetPath();
  if (!iconSetPath) return;
  try {
    const bytes = iconSetBytes(iconSetPath);
    const image = new Image();
    image.onload = () => {
      iconSetImage = image;
      iconRenderVersion += 1;
      onUpdate();
    };
    image.onerror = () => {
      throw new Error("图标集图片解码失败");
    };
    image.src = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`图标集加载失败：${message}`);
  }
}

export function iconHtml(iconIndex: unknown): string {
  const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
  const fileName = `icon_${index}.png`;
  if (fs.existsSync(path.join(iconDir, fileName))) {
    return `<img class="rpg-icon" src="icons/${fileName}" alt="icon ${index}">`;
  }
  const dataUrl = iconDataUrl(index);
  if (!dataUrl) return '<span class="rpg-icon icon-pending"></span>';
  return `<img class="rpg-icon" src="${dataUrl}" alt="icon ${index}">`;
}

export function actorAvatarHtml(actor: { readonly id: unknown }): string {
  return `<span class="actor-avatar">${escapeHtml(actor.id)}</span>`;
}

export function badgeHtml(label: string, tone = ""): string {
  return `<span class="catalog-badge ${tone}">${escapeHtml(label)}</span>`;
}

function iconDataUrl(index: number): string {
  const cached = iconCache.get(index);
  if (cached) return cached;
  if (!iconSetImage) return "";
  const x = (index % 16) * 32;
  const y = Math.floor(index / 16) * 32;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.imageSmoothingEnabled = false;
  context.drawImage(iconSetImage, x, y, 32, 32, 0, 0, 32, 32);
  const dataUrl = canvas.toDataURL("image/png");
  iconCache.set(index, dataUrl);
  return dataUrl;
}

function validIconSheet(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const bytes = fs.readFileSync(filePath);
    if (!hasPngHeader(bytes) || bytes.length < 24) return false;
    return bytes.readUInt32BE(16) >= 32 && bytes.readUInt32BE(20) >= 32;
  } catch {
    return false;
  }
}

function iconSetBytes(filePath: string): Buffer {
  const bytes = fs.readFileSync(filePath);
  return hasPngHeader(bytes) ? bytes : decryptProtectedImage(bytes);
}

function hasPngHeader(bytes: Buffer): boolean {
  return bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}

function decryptProtectedImage(input: Buffer): Buffer {
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
  const random = (max: number): number => {
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
  const output = new Array<number>(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) output[positions[i]] = bytes[i];
  return Buffer.from(output);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

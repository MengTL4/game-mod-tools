import fs from "fs";
import path from "path";

export interface Renderer {
  setupIconSet(): void;
  iconUrl(iconIndex: any): string | undefined;
  actorAvatar(actor: any): string;
  badgeText(label: any, tone?: string): string;
  version(): number;
  ready(): boolean;
}

export function createIconRenderer(options: {
  iconSetPath: string;
  iconDir: string;
  showToast(message: string): void;
  onReady(): void;
}): Renderer {
  let iconSetImage: HTMLImageElement | null = null;
  let iconRenderVersion = 0;
  const iconCache = new Map<number, string>();
  let isReady = false;

  function setupIconSet(): void {
    try {
      const bytes = decryptProtectedImage(fs.readFileSync(options.iconSetPath));
      const image = new Image();
      image.onload = () => {
        iconSetImage = image;
        iconRenderVersion += 1;
        isReady = true;
        options.onReady();
      };
      image.onerror = () => options.showToast("图标集图片解码失败");
      image.src = `data:image/png;base64,${bytes.toString("base64")}`;
    } catch (error: any) {
      options.showToast(`图标集加载失败：${error.message}`);
    }
  }

  function iconDataUrl(iconIndex: any): string | undefined {
    const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
    if (iconCache.has(index)) return iconCache.get(index);
    if (!iconSetImage) return undefined;
    const x = (index % 16) * 32;
    const y = Math.floor(index / 16) * 32;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(iconSetImage, x, y, 32, 32, 0, 0, 32, 32);
    const dataUrl = canvas.toDataURL("image/png");
    iconCache.set(index, dataUrl);
    return dataUrl;
  }

  return {
    setupIconSet,
    iconUrl(iconIndex: any): string | undefined {
      const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
      const fileName = `icon_${index}.png`;
      if (fs.existsSync(path.join(options.iconDir, fileName))) {
        return `icons/${fileName}`;
      }
      return iconDataUrl(iconIndex);
    },
    actorAvatar(actor: any): string {
      return String(actor && actor.id || "");
    },
    badgeText(label: any): string {
      return String(label);
    },
    version(): number {
      return iconRenderVersion;
    },
    ready(): boolean {
      return isReady;
    }
  };
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

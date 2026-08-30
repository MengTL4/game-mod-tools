namespace Zs2Gui.IconRenderer {
  const fs = require("fs");
  const path = require("path");

  export interface Renderer {
    setupIconSet(): void;
    iconHtml(iconIndex: any): string;
    actorAvatarHtml(actor: any): string;
    badgeHtml(label: any, tone?: string): string;
    version(): number;
  }

  export function create(options: {
    iconSetPath: string;
    iconDir: string;
    documentRef: Document;
    imageCtor: any;
    escapeHtml(value: any): string;
    showToast(message: string): void;
    onReady(): void;
  }): Renderer {
    let iconSetImage: any = null;
    let iconRenderVersion = 0;
    const iconCache = new Map<number, string>();

    function setupIconSet(): void {
      try {
        const bytes = decryptProtectedImage(fs.readFileSync(options.iconSetPath));
        const image = new options.imageCtor();
        image.onload = () => {
          iconSetImage = image;
          iconRenderVersion += 1;
          options.onReady();
        };
        image.onerror = () => options.showToast("图标集图片解码失败");
        image.src = `data:image/png;base64,${bytes.toString("base64")}`;
      } catch (error) {
        options.showToast(`图标集加载失败：${error.message}`);
      }
    }

    function iconDataUrl(iconIndex: any): string {
      const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
      if (iconCache.has(index)) return iconCache.get(index);
      if (!iconSetImage) return "";
      const x = (index % 16) * 32;
      const y = Math.floor(index / 16) * 32;
      const canvas = options.documentRef.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.drawImage(iconSetImage, x, y, 32, 32, 0, 0, 32, 32);
      const dataUrl = canvas.toDataURL("image/png");
      iconCache.set(index, dataUrl);
      return dataUrl;
    }

    return {
      setupIconSet,
      iconHtml(iconIndex: any): string {
        const index = Math.max(0, Math.floor(Number(iconIndex) || 0));
        const fileName = `icon_${index}.png`;
        if (fs.existsSync(path.join(options.iconDir, fileName))) {
          return `<img class="rpg-icon" src="icons/${fileName}" alt="">`;
        }
        const dataUrl = iconDataUrl(iconIndex);
        if (!dataUrl) return '<span class="rpg-icon icon-pending"></span>';
        return `<img class="rpg-icon" src="${dataUrl}" alt="">`;
      },
      actorAvatarHtml(actor: any): string {
        return `<span class="actor-avatar">${options.escapeHtml(actor.id)}</span>`;
      },
      badgeHtml(label: any, tone = ""): string {
        return `<span class="catalog-badge ${tone}">${options.escapeHtml(label)}</span>`;
      },
      version(): number {
        return iconRenderVersion;
      }
    };
  }

  function decryptProtectedImage(input): Buffer {
    const data = Buffer.from(input);
    if (data.length <= 100) return data;
    const head = data.subarray(0, 100);
    const body = unshuffleBytes(data.subarray(100));
    for (let i = 0; i < body.length; i += 1) {
      body[i] ^= (i % 256) ^ 90;
    }
    return Buffer.concat([head, body]);
  }

  function unshuffleBytes(input): Buffer {
    const bytes = Array.from(input);
    const swaps: number[] = [];
    let remaining = bytes.length;
    const random = (max) => {
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
}

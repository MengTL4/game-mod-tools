export function readJson(file: string): any {
  const fs = require("fs");
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function cleanText(value: any): string {
  return String(value == null ? "" : value)
    .replace(/\\[A-Z]+\[[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanNote(value: any): string {
  return cleanText(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeSearchText(parts: any[]): string {
  return parts
    .filter((part) => part != null && part !== "")
    .map((part) => String(part))
    .join(" ")
    .toLowerCase();
}

export function escapeHtml(value: any): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatNumber(value: any): string {
  if (value == null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("zh-CN").format(number);
}

export function parseValue(text: any): any {
  const value = String(text).trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value !== "" && Number.isFinite(Number(value))) return Number(value);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function looseNumber(value: any): number {
  const text = String(value == null ? "" : value).trim();
  if (text === "") return NaN;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

export function numberValue(text: string, fallback = 0): number {
  const value = looseNumber(text);
  return Number.isFinite(value) ? value : fallback;
}

export function optionalNumber(text: string): number | undefined {
  const trimmed = String(text).trim();
  if (trimmed === "") return undefined;
  const value = looseNumber(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 120): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

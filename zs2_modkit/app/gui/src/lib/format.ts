export function formatNumber(value: any): string {
  if (value == null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("zh-CN").format(number);
}

export function escapeHtml(value: any): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function looseNumber(value: any): number {
  const text = String(value == null ? "" : value).trim();
  if (text === "") return NaN;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
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

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 120): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

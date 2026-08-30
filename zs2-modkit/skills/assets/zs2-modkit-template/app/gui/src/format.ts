namespace Zs2Gui.Format {
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
}

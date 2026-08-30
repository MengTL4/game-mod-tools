import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardTitle, cn, Input } from "@rpgmv-modkit/ui";
import { escapeHtml } from "../lib/format";

export interface CatalogRowOptions {
  key?: (entry: any) => any;
  rowKind?: (entry: any) => string;
  leading: (entry: any) => React.ReactNode;
  extra?: (entry: any) => string;
  description?: (entry: any) => string;
  actions: (entry: any, selected: boolean) => { label: string; action: string }[];
}

interface CatalogListProps {
  title: string;
  entries: any[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: number | string;
  onSelect: (entry: any) => void;
  onAction: (entry: any, action: string) => void;
  options: CatalogRowOptions;
  emptyText?: string;
  pageSize?: number;
  compact?: boolean;
}

function entryMatchesSearch(entry: any, needle: string): boolean {
  if (!needle) return true;
  const lower = needle.toLowerCase();
  if (entry.searchText && entry.searchText.includes(lower)) return true;
  return [entry.id, entry.uid, entry.value, entry.label, entry.name, entry.description, entry.noteText]
    .some((part) => String(part == null ? "" : part).toLowerCase().includes(lower));
}

export function CatalogList({
  title,
  entries,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onAction,
  options,
  emptyText = "没有匹配项",
  pageSize = 20,
  compact = false
}: CatalogListProps) {
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries.slice();
    return entries.filter((entry) => entryMatchesSearch(entry, needle));
  }, [entries, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const heightClass = expanded ? (compact ? "h-96" : "h-[520px]") : compact ? "h-52" : "h-80";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="搜索..."
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); setPage(1); }}
          className="flex-1"
        />
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          共 {filtered.length} 条
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCollapsed((v) => !v)}>{collapsed ? "显示" : "收起"}</Button>
        <Button variant="outline" size="sm" onClick={() => { setExpanded((v) => !v); setCollapsed(false); }}>{expanded ? "标准" : "展开"}</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={safePage <= 1 || filtered.length === 0}>首页</Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1 || filtered.length === 0}>上一页</Button>
        <span className="text-xs text-muted-foreground px-2">{filtered.length ? `第 ${safePage} / ${pageCount} 页` : "无结果"}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount || filtered.length === 0}>下一页</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={safePage >= pageCount || filtered.length === 0}>末页</Button>
      </div>
      {!collapsed && (
        <div className={cn("border rounded-md overflow-auto bg-muted/30 p-2", heightClass)}>
          {visible.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="space-y-2">
              {visible.map((entry) => {
                const key = options.key ? options.key(entry) : entry.id;
                const isSelected = String(key) === String(selectedId);
                const kind = options.rowKind ? options.rowKind(entry) : "item";
                const actions = options.actions(entry, isSelected);
                return (
                  <div
                    key={key}
                    onClick={() => onSelect(entry)}
                    className={cn(
                      "grid gap-3 items-center p-3 rounded-md border cursor-pointer transition-colors",
                      "grid-cols-[44px_minmax(0,1fr)_auto] hover:bg-accent",
                      isSelected && "bg-accent border-primary"
                    )}
                  >
                    <div className="flex justify-center">{options.leading(entry)}</div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{entry.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">ID {entry.id}{options.extra ? ` / ${options.extra(entry)}` : ""}</div>
                      {options.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{options.description(entry)}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {actions.map((action) => (
                        <Button
                          key={action.action}
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); onAction(entry, action.action); }}
                          disabled={action.action.startsWith("disabled")}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Badge({ label, tone = "primary" }: { label: React.ReactNode; tone?: string }) {
  const toneClass = {
    primary: "bg-blue-100 text-blue-700",
    switch: "bg-green-100 text-green-700",
    map: "bg-sky-100 text-sky-700",
    troop: "bg-amber-100 text-amber-700",
    event: "bg-orange-100 text-orange-700",
    title: "bg-purple-100 text-purple-700",
    cloth: "bg-pink-100 text-pink-700",
    var: "bg-indigo-100 text-indigo-700",
    default: "bg-gray-100 text-gray-700"
  }[tone] || "bg-gray-100 text-gray-700";

  return (
    <div className={cn("w-9 h-9 rounded-md grid place-items-center text-xs font-bold", toneClass)}>
      {label}
    </div>
  );
}

export function Icon({ url, alt = "" }: { url?: string; alt?: string }) {
  if (!url) return <div className="w-9 h-9 rounded-md bg-muted border border-dashed" />;
  return <img src={url} alt={alt} className="w-9 h-9 rounded-md border bg-muted" />;
}

import { useState, useMemo } from "react";
import { Button, Input, cn } from "@game-mod-tools/ui";
import { filterEntries } from "../lib/catalog";
import { iconUrl } from "../lib/bridge";
import type { CatalogEntry, CatalogAction } from "../types";

interface CatalogListProps {
  entries: CatalogEntry[];
  selectedId?: string | number;
  selectedKey?: (entry: CatalogEntry) => string | number;
  kind?: string;
  renderLeading?: (entry: CatalogEntry) => React.ReactNode;
  renderExtra?: (entry: CatalogEntry) => string;
  renderDescription?: (entry: CatalogEntry) => string;
  actions?: { action: CatalogAction; label: string; disabled?: (entry: CatalogEntry) => boolean }[];
  onSelect?: (entry: CatalogEntry) => void;
  onAction?: (action: CatalogAction, entry: CatalogEntry) => void;
}

const PAGE_SIZE = 20;

export function CatalogList({
  entries,
  selectedId,
  selectedKey = (entry) => entry.id,
  kind = "",
  renderLeading,
  renderExtra,
  renderDescription,
  actions,
  onSelect,
  onAction,
}: CatalogListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterEntries(entries, query).entries, [entries, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div className="space-y-2 min-h-0 flex flex-col">
      <Input
        type="search"
        placeholder="搜索名称或ID"
        value={query}
        onChange={(e) => handleQuery(e.target.value)}
      />
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>共 {filtered.length} 条 / {page}/{pageCount} 页</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>首页</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>下一页</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page >= pageCount}>末页</Button>
      </div>
      <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-auto min-h-[220px]">
        {visible.length === 0 ? (
          <div className="grid place-items-center h-full text-slate-500 text-sm">没有匹配项</div>
        ) : (
          <div className="space-y-2 p-2">
            {visible.map((entry) => {
              const key = selectedKey(entry);
              const active = String(key) === String(selectedId);
              return (
                <div
                  key={`${kind}-${entry.id}`}
                  className={cn(
                    "grid grid-cols-[44px_1fr_auto] gap-3 items-center border rounded-lg p-2 cursor-pointer transition",
                    active ? "border-blue-400 bg-blue-50 shadow" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                  )}
                  onClick={() => onSelect?.(entry)}
                >
                  {renderLeading ? (
                    <div className="flex items-center justify-center">{renderLeading(entry)}</div>
                  ) : entry.iconIndex != null ? (
                    <img src={iconUrl(entry.iconIndex)} alt="" className="w-9 h-9 rounded border border-orange-200 bg-orange-50" />
                  ) : (
                    <div className="w-9 h-9 rounded border border-slate-200 bg-slate-100" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-bold text-sm">{entry.name}</div>
                    <div className="text-xs text-slate-500">
                      ID {entry.id}{renderExtra ? ` / ${renderExtra(entry)}` : ""}
                    </div>
                    {renderDescription && renderDescription(entry) ? (
                      <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{renderDescription(entry)}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    {actions?.map((action) => (
                      <Button
                        key={action.action}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={action.disabled?.(entry)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction?.(action.action, entry);
                        }}
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
    </div>
  );
}

export function Avatar({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "accent" | "warning" | "map" | "troop" | "event" }) {
  const toneClass = {
    primary: "bg-blue-50 text-blue-700",
    accent: "bg-teal-50 text-teal-700",
    warning: "bg-orange-50 text-orange-700",
    map: "bg-sky-50 text-sky-700",
    troop: "bg-amber-50 text-amber-700",
    event: "bg-orange-50 text-orange-700",
  }[tone];
  return (
    <div className={cn("w-9 h-9 rounded-md grid place-items-center text-xs font-black", toneClass)}>
      {children}
    </div>
  );
}

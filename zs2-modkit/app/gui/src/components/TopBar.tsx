import { Button, cn } from "@rpgmv-modkit/ui";

interface TopBarProps {
  status: { kind: "idle" | "online" | "error"; text: string };
  onLaunch: () => void;
  onRefresh: () => void;
}

export function TopBar({ status, onLaunch, onRefresh }: TopBarProps) {
  const statusClass = {
    idle: "text-muted-foreground border-border bg-muted",
    online: "text-green-700 border-green-300 bg-green-50",
    error: "text-red-700 border-red-300 bg-red-50"
  }[status.kind];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-5 py-3 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl grid place-items-center font-mono font-bold text-sm border border-white/20 bg-gradient-to-br from-amber-700 to-teal-700 text-amber-50">
          ZS
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-widest text-amber-200/80">LOCAL RUNTIME BRIDGE</div>
          <h1 className="text-xl font-semibold leading-tight">再刷一把2 修改器</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border", statusClass)}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {status.text}
        </div>
        <Button variant="default" onClick={onLaunch}>启动游戏</Button>
        <Button variant="secondary" onClick={onRefresh}>刷新</Button>
      </div>
    </header>
  );
}

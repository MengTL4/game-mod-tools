import { Button, Card, CardContent, CardHeader, CardTitle, cn, Separator } from "@game-mod-tools/ui";

interface SidebarProps {
  state: any;
  onOpenBridge: () => void;
  onOpenSave: () => void;
  onBackup: () => void;
  onClearEvents: () => void;
}

export function Sidebar({ state, onOpenBridge, onOpenSave, onBackup, onClearEvents }: SidebarProps) {
  const bridge = state?.bridgeVersion ? `v${state.bridgeVersion}` : "等待中";
  const party = state?.hasParty ? "可用" : "未就绪";
  const gold = state?.gold != null ? state.gold.toLocaleString("zh-CN") : "-";
  const saveDir = state?.saveDirExists ? "已识别" : "缺失";
  const currentMap = state?.currentMap || {};
  const mapText = currentMap.mapId ? `${currentMap.mapId} (${currentMap.x ?? "-"}, ${currentMap.y ?? "-"})` : "-";
  const files = Array.isArray(state?.saveFiles) ? state.saveFiles : [];
  const members = Array.isArray(state?.partyMembers) ? state.partyMembers : [];

  return (
    <aside className="space-y-3 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">运行状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-[80px_1fr] gap-2 border-b pb-2"><span className="text-muted-foreground">Bridge</span><span className="truncate">{bridge}</span></div>
          <div className="grid grid-cols-[80px_1fr] gap-2 border-b pb-2"><span className="text-muted-foreground">队伍对象</span><span>{party}</span></div>
          <div className="grid grid-cols-[80px_1fr] gap-2 border-b pb-2"><span className="text-muted-foreground">当前金币</span><span>{gold}</span></div>
          <div className="grid grid-cols-[80px_1fr] gap-2 border-b pb-2"><span className="text-muted-foreground">存档目录</span><span>{saveDir}</span></div>
          <div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-muted-foreground">当前位置</span><span className="truncate">{mapText}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">队伍</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-auto">
            {members.length ? members.map((actor: any, i: number) => (
              <div key={i} className="text-sm border rounded-md p-2 bg-muted/30">
                <div className="font-semibold">{actor.id} / {actor.name || ""}</div>
                <div className="text-xs text-muted-foreground">Lv.{actor.level || "-"} HP {actor.hp ?? "-"}/{actor.mhp ?? "-"} MP {actor.mp ?? "-"}/{actor.mmp ?? "-"}</div>
              </div>
            )) : <div className="text-sm text-muted-foreground">未检测到</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">文件</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onOpenBridge}>打开 Bridge 日志</Button>
          <Button variant="outline" onClick={onOpenSave}>打开存档目录</Button>
          <Button variant="outline" onClick={onBackup}>备份存档</Button>
          <Button variant="destructive" onClick={onClearEvents}>清空事件</Button>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-sm">检测到的存档</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-auto">
            {files.length ? files.map((name: string, i: number) => (
              <div key={i} className="text-sm border rounded-md p-2 bg-muted/30">{name}</div>
            )) : <div className="text-sm text-muted-foreground">未检测到</div>}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

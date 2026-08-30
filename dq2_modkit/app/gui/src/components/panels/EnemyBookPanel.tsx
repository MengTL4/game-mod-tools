import { Button, Card, CardContent, CardTitle } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";

export function EnemyBookPanel() {
  const { postCommand } = useApp();
  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">敌人图鉴</CardTitle>
        <Button onClick={() => postCommand({ type: "progress.enemyBook.unlock" })}>解锁敌人图鉴</Button>
        <div className="text-xs text-slate-500">写入配置数据后会调用游戏的配置保存；需要回到图鉴菜单重新打开查看。</div>
      </CardContent>
    </Card>
  );
}

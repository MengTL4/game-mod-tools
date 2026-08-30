import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { optionalNumber } from "../../lib/utils";
import { catalogs } from "../../lib/catalog";

export function BattlePanel() {
  const { state, postCommand } = useApp();
  const options = state?.trainerOptions || {};
  const [troopId, setTroopId] = useState("");

  const noCost = !!options.noSkillCost;
  const oneHit = !!options.oneHitKill;
  const invincible = !!options.invincible;

  const battleStats = state?.battleStats;
  const rateStats = state?.rateStats;
  const battleText = `${noCost ? "无耗ON" : "无耗OFF"} / ${oneHit ? "秒杀ON" : "秒杀OFF"} / ${invincible ? "无敌ON" : "无敌OFF"} / hooks ${state?.hooksPatched ? "OK" : "--"} / ${rateStats?.last ? `倍率命中 ${rateStats.last.name}` : "倍率未命中"} / ${battleStats?.last ? `战斗命中 ${battleStats.last.name}` : "战斗未命中"}`;

  const startBattle = () => {
    const command: any = { type: "battle.start", canEscape: true, canLose: true };
    const id = optionalNumber(troopId);
    if (id != null) command.troopId = id;
    postCommand(command);
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">战斗</CardTitle>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={noCost ? "default" : "outline"} onClick={() => postCommand({ type: "trainer.options.set", options: { noSkillCost: !noCost } })}>技能无耗</Button>
          <Button variant={oneHit ? "default" : "outline"} onClick={() => postCommand({ type: "trainer.options.set", options: { oneHitKill: !oneHit } })}>一击秒杀</Button>
          <Button variant={invincible ? "default" : "outline"} onClick={() => postCommand({ type: "trainer.options.set", options: { invincible: !invincible } })}>无敌</Button>
          <Button onClick={() => postCommand({ type: "battle.killEnemies" })}>秒杀敌人</Button>
          <Button onClick={() => postCommand({ type: "battle.escape" })}>逃跑</Button>
          <Button onClick={() => postCommand({ type: "party.recover" })}>队伍恢复</Button>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">敌群ID（空=变量399）</Label>
            <Input list="offlineHuntTroopOptions" value={troopId} onChange={(e) => setTroopId(e.target.value)} placeholder="空=变量399" />
          </div>
          <Button onClick={startBattle}>指定战斗</Button>
        </div>
        <datalist id="offlineHuntTroopOptions">
          {catalogs.troop.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <div className="text-xs text-slate-500 min-h-[20px]">{battleText}</div>
      </CardContent>
    </Card>
  );
}

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Switch, cn } from "@game-mod-tools/ui";

interface CorePanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
  latestState: any;
  through: boolean;
}

export function GoldPanel({ state, setField, core }: CorePanelsProps) {
  const value = state.goldValue || "0";
  const n = parseFloat(value) || 0;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">金币</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-mono font-bold text-primary bg-primary/5 rounded-md px-3 py-2 min-h-[58px] flex items-center">
          {core?.formatNumber(core?.latestState?.gold || 0)}
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">数值</Label>
            <Input type="number" min={0} value={value} onChange={(e) => setField("goldValue", e.target.value)} />
          </div>
          <Button onClick={() => core?.setGold(n, "set")}>设定</Button>
          <Button onClick={() => core?.setGold(n, "add")}>增加</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1000, 10000, 100000].map((amount) => (
            <Button key={amount} variant="outline" size="sm" onClick={() => core?.setGold(amount, "add")}>+{amount >= 10000 ? `${amount / 10000}万` : amount}</Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => core?.setGold(9999999, "set")}>MAX</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RatesPanel({ state, setField, core }: CorePanelsProps) {
  const rates = [5, 10, 20, 50, 100, 1];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">倍率</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">经验</Label><Input type="number" min={0} step={0.1} value={state.expRate} onChange={(e) => setField("expRate", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">金币</Label><Input type="number" min={0} step={0.1} value={state.goldRate} onChange={(e) => setField("goldRate", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">掉率</Label><Input type="number" min={0} step={0.1} value={state.dropRate} onChange={(e) => setField("dropRate", e.target.value)} /></div>
          <Button onClick={() => core?.setRates(parseFloat(state.expRate) || 1, parseFloat(state.goldRate) || 1, parseFloat(state.dropRate) || 1)}>应用</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {rates.map((rate) => (
            <Button key={rate} variant="outline" size="sm" onClick={() => { setField("expRate", String(rate)); setField("goldRate", String(rate)); setField("dropRate", String(rate)); core?.setRates(rate, rate, rate); }}>{rate}x</Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BattlePanel({ state, setField, core, latestState, through }: CorePanelsProps) {
  const options = latestState?.trainerOptions || {};
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">战斗</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button variant={options.noSkillCost ? "default" : "outline"} onClick={() => core?.setBattleOption("noSkillCost", !options.noSkillCost)}>{options.noSkillCost ? "无耗ON" : "无耗OFF"}</Button>
          <Button variant={options.oneHitKill ? "default" : "outline"} onClick={() => core?.setBattleOption("oneHitKill", !options.oneHitKill)}>{options.oneHitKill ? "秒杀ON" : "秒杀OFF"}</Button>
          <Button variant={options.invincible ? "default" : "outline"} onClick={() => core?.setBattleOption("invincible", !options.invincible)}>{options.invincible ? "无敌ON" : "无敌OFF"}</Button>
          <Button variant="destructive" onClick={() => core?.killEnemies()}>秒杀敌人</Button>
          <Button variant="secondary" onClick={() => core?.escapeBattle()}>逃跑</Button>
          <Button onClick={() => core?.recoverParty()}>队伍恢复</Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {options.noSkillCost ? "无耗ON" : "无耗OFF"} / {options.oneHitKill ? "秒杀ON" : "秒杀OFF"} / {options.invincible ? "无敌ON" : "无敌OFF"} / hooks {latestState?.hooksPatched ? "OK" : "--"}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">敌群ID（空=变量399）</Label><Input value={state.battleTroopId} onChange={(e) => setField("battleTroopId", e.target.value)} list="troopOptions" /></div>
          <Button variant="secondary" onClick={() => core?.startBattle(core?.optionalNumber(state.battleTroopId))}>指定战斗</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SavePanel({ state, setField, core }: CorePanelsProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">存档</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">槽位</Label><Input type="number" min={1} value={state.saveSlot} onChange={(e) => setField("saveSlot", e.target.value)} /></div>
          <Button onClick={() => core?.saveGame(parseInt(state.saveSlot, 10) || 1)}>保存</Button>
          <Button variant="outline" onClick={() => core?.refreshTitle()}>刷新标题</Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";

export function RatePanel() {
  const { state, postCommand } = useApp();
  const options = state?.trainerOptions || {};
  const [expRate, setExpRate] = useState(String(options.expRate ?? 1));
  const [goldRate, setGoldRate] = useState(String(options.goldRate ?? 1));
  const [dropRate, setDropRate] = useState(String(options.dropRate ?? 1));
  const [skillRate, setSkillRate] = useState(String(options.skillRate ?? 1));

  const apply = () => {
    postCommand({
      type: "trainer.options.set",
      options: {
        expRate: numberValue(expRate, 1),
        goldRate: numberValue(goldRate, 1),
        dropRate: numberValue(dropRate, 1),
        skillRate: numberValue(skillRate, 1),
      },
    });
  };

  const setAll = (rate: number) => {
    setExpRate(String(rate));
    setGoldRate(String(rate));
    setDropRate(String(rate));
    setSkillRate(String(rate));
    postCommand({ type: "trainer.options.set", options: { expRate: rate, goldRate: rate, dropRate: rate, skillRate: rate } });
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">倍率</CardTitle>
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">经验</Label><Input type="number" min={0} step={0.1} value={expRate} onChange={(e) => setExpRate(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">金币</Label><Input type="number" min={0} step={0.1} value={goldRate} onChange={(e) => setGoldRate(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">掉率</Label><Input type="number" min={0} step={0.1} value={dropRate} onChange={(e) => setDropRate(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">熟练</Label><Input type="number" min={0} step={0.1} value={skillRate} onChange={(e) => setSkillRate(e.target.value)} /></div>
          <Button onClick={apply}>应用</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 20, 50, 100, 1].map((rate) => (
            <Button key={rate} variant="outline" className="min-w-[64px]" onClick={() => setAll(rate)}>{rate === 1 ? "重置" : `${rate}x`}</Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

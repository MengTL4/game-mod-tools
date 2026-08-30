import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";

export function GoldPanel() {
  const { state, postCommand } = useApp();
  const [value, setValue] = useState("10000");

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">金币</CardTitle>
        <div className="flex items-center min-h-[58px] px-4 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-white text-blue-900 font-mono text-2xl font-extrabold">
          {state?.gold ?? 0}
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">数量</Label>
            <Input type="number" min={0} step={1} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button onClick={() => postCommand({ type: "gold.set", value: numberValue(value, 0) })}>设定</Button>
          <Button onClick={() => postCommand({ type: "gold.add", amount: numberValue(value, 0) })}>增加</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => postCommand({ type: "gold.add", amount: 1000 })}>+1K</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "gold.add", amount: 10000 })}>+10K</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "gold.add", amount: 100000 })}>+100K</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "gold.set", value: 9999999 })}>MAX</Button>
        </div>
      </CardContent>
    </Card>
  );
}

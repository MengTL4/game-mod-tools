import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";

export function SavePanel() {
  const { postCommand } = useApp();
  const [slot, setSlot] = useState("1");

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">存档</CardTitle>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">槽位</Label>
            <Input type="number" min={1} step={1} value={slot} onChange={(e) => setSlot(e.target.value)} />
          </div>
          <Button onClick={() => postCommand({ type: "save", id: Number(slot || 1) })}>保存</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "title.refresh" })}>刷新标题</Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label, Switch } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

export function SwitchPanel() {
  const { postCommand } = useApp();
  const [id, setId] = useState("1");
  const [value, setValue] = useState(true);

  const hint = catalogName("switch", numberValue(id, NaN));

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">开关</CardTitle>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">ID</Label>
            <Input list="switchOptions" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2">
            <Switch checked={value} onChange={(e) => setValue((e.target as HTMLInputElement).checked)} />
            <span className="text-sm font-bold">{value ? "ON" : "OFF"}</span>
          </div>
          <Button onClick={() => postCommand({ type: "switch.set", id: numberValue(id, 0), value })}>写入</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${id} / ${hint}` : ""}</div>
        <datalist id="switchOptions">
          {catalogs.switch.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.switch}
          selectedId={numberValue(id, NaN)}
          renderLeading={(entry) => <Avatar tone="accent">{entry.id}</Avatar>}
          actions={[
            { action: "switch-on", label: "ON" },
            { action: "switch-off", label: "OFF" },
          ]}
          onSelect={(entry) => setId(String(entry.id))}
          onAction={(action, entry) => {
            setId(String(entry.id));
            postCommand({ type: "switch.set", id: entry.id, value: action === "switch-on" });
          }}
        />
      </CardContent>
    </Card>
  );
}

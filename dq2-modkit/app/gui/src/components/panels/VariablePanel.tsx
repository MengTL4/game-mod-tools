import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { parseValue, numberValue } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

export function VariablePanel() {
  const { postCommand } = useApp();
  const [id, setId] = useState("1");
  const [value, setValue] = useState("999");

  const hint = catalogName("variable", numberValue(id, NaN));

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">变量</CardTitle>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">ID</Label>
            <Input list="variableOptions" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">值</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button onClick={() => postCommand({ type: "variable.set", id: numberValue(id, 0), value: parseValue(value) })}>写入</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${id} / ${hint}` : ""}</div>
        <datalist id="variableOptions">
          {catalogs.variable.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.variable}
          selectedId={numberValue(id, NaN)}
          renderLeading={(entry) => <Avatar tone="primary">{entry.id}</Avatar>}
          actions={[
            { action: "variable-select", label: "填入" },
            { action: "variable-set", label: "写入" },
          ]}
          onSelect={(entry) => setId(String(entry.id))}
          onAction={(action, entry) => {
            setId(String(entry.id));
            if (action === "variable-set") {
              postCommand({ type: "variable.set", id: entry.id, value: parseValue(value) });
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

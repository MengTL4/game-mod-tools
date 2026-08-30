import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

export function CommonEventPanel() {
  const { postCommand } = useApp();
  const [id, setId] = useState("1");
  const hint = catalogName("commonEvent", numberValue(id, NaN));

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">公共事件</CardTitle>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">事件ID</Label>
            <Input list="commonEventOptions" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <Button onClick={() => postCommand({ type: "commonEvent.run", id: numberValue(id, 0) })}>运行事件</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${id} / ${hint}` : ""}</div>
        <datalist id="commonEventOptions">
          {catalogs.commonEvent.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.commonEvent}
          selectedId={numberValue(id, NaN)}
          renderLeading={(entry) => <Avatar tone="warning">{entry.id}</Avatar>}
          renderDescription={(entry) => entry.description || ""}
          actions={[{ action: "common-event-run", label: "运行" }]}
          onSelect={(entry) => setId(String(entry.id))}
          onAction={(action, entry) => {
            setId(String(entry.id));
            postCommand({ type: "commonEvent.run", id: entry.id });
          }}
        />
      </CardContent>
    </Card>
  );
}

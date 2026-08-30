import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@rpgmv-modkit/ui";
import { CatalogList, Badge } from "../CatalogList";
import { parseValue } from "../../lib/format";

interface MiscPanelsProps {
  state: any;
  setField: (key: string, value: any) => void;
  core: any;
  numberValue: (v: string, fallback?: number) => number;
}

export function VariablePanel({ state, setField, core, numberValue }: MiscPanelsProps) {
  const entries = core?.catalogs?.variable || [];
  const selectedId = numberValue(state.variableId, NaN);
  const name = core?.catalogName("variable", selectedId);
  const hint = name ? `${state.variableId} / ${name}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">变量</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input type="search" placeholder="搜索变量名称或ID" value={state.variableSearch} onChange={(e) => setField("variableSearch", e.target.value)} />
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">ID</Label><Input value={state.variableId} onChange={(e) => setField("variableId", e.target.value)} list="variableOptions" /></div>
          <div className="space-y-1"><Label className="text-xs">值</Label><Input value={state.variableValue} onChange={(e) => setField("variableValue", e.target.value)} /></div>
          <Button onClick={() => core?.setVariable(numberValue(state.variableId, 0), parseValue(state.variableValue))}>写入</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="变量"
          entries={entries}
          search={state.variableSearch}
          onSearchChange={(v) => setField("variableSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("variableId", String(entry.id))}
          onAction={(entry, action) => {
            setField("variableId", String(entry.id));
            if (action === "variable-set") core?.setVariable(entry.id, parseValue(state.variableValue));
          }}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="var" />,
            actions: () => [{ label: "填入", action: "variable-select" }, { label: "写入", action: "variable-set" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

export function SwitchPanel({ state, setField, core, numberValue }: MiscPanelsProps) {
  const entries = core?.catalogs?.switch || [];
  const selectedId = numberValue(state.switchId, NaN);
  const name = core?.catalogName("switch", selectedId);
  const hint = name ? `${state.switchId} / ${name}` : "";

  return (
    <Card className="col-span-full">
      <CardHeader><CardTitle className="text-sm">开关</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input type="search" placeholder="搜索开关名称或ID" value={state.switchSearch} onChange={(e) => setField("switchSearch", e.target.value)} />
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">ID</Label><Input value={state.switchId} onChange={(e) => setField("switchId", e.target.value)} list="switchOptions" /></div>
          <div className="grid grid-cols-2 border rounded-md p-1">
            <Button variant={state.switchValue ? "default" : "ghost"} size="sm" onClick={() => setField("switchValue", true)}>ON</Button>
            <Button variant={!state.switchValue ? "default" : "ghost"} size="sm" onClick={() => setField("switchValue", false)}>OFF</Button>
          </div>
          <Button onClick={() => core?.setSwitch(numberValue(state.switchId, 0), state.switchValue)}>写入</Button>
        </div>
        <div className="text-xs text-muted-foreground min-h-[20px]">{hint}</div>
        <CatalogList
          title="开关"
          entries={entries}
          search={state.switchSearch}
          onSearchChange={(v) => setField("switchSearch", v)}
          selectedId={selectedId}
          onSelect={(entry) => setField("switchId", String(entry.id))}
          onAction={(entry, action) => {
            setField("switchId", String(entry.id));
            core?.setSwitch(entry.id, action === "switch-on");
          }}
          options={{
            leading: (entry) => <Badge label={entry.id} tone="switch" />,
            actions: () => [{ label: "ON", action: "switch-on" }, { label: "OFF", action: "switch-off" }],
            description: (entry) => entry.description
          }}
        />
      </CardContent>
    </Card>
  );
}

export function EnemyBookPanel({ core }: { core: any }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">敌人图鉴</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => core?.unlockEnemyBook()}>解锁敌人图鉴</Button>
        <div className="text-xs text-muted-foreground">写入配置数据后会调用游戏的配置保存；需要回到图鉴菜单重新打开查看。</div>
      </CardContent>
    </Card>
  );
}

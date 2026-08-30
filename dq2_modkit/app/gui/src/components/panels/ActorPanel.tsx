import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label, Select } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue, optionalNumber } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { CatalogList, Avatar } from "../CatalogList";

export function ActorPanel() {
  const { postCommand } = useApp();
  const [id, setId] = useState("1");
  const [level, setLevel] = useState("10");
  const [exp, setExp] = useState("1000");
  const [hp, setHp] = useState("");
  const [mp, setMp] = useState("");
  const [tp, setTp] = useState("");
  const [paramId, setParamId] = useState("0");
  const [paramValue, setParamValue] = useState("10");

  const actorId = numberValue(id, 0);
  const hint = catalogName("actor", actorId);

  const params = [
    { value: "0", label: "最大HP" },
    { value: "1", label: "最大MP" },
    { value: "2", label: "攻击" },
    { value: "3", label: "防御" },
    { value: "4", label: "魔攻" },
    { value: "5", label: "魔防" },
    { value: "6", label: "敏捷" },
    { value: "7", label: "幸运" },
  ];

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">角色编辑</CardTitle>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Input list="actorOptions" value={id} onChange={(e) => setId(e.target.value)} placeholder="搜索角色名称或ID" />
          <Button onClick={() => postCommand({ type: "actor.unlock", id: actorId })}>解锁人物</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-xs text-slate-500">角色ID</Label><Input list="actorOptions" value={id} onChange={(e) => setId(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">等级</Label><Input type="number" min={1} step={1} value={level} onChange={(e) => setLevel(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">经验</Label><Input type="number" step={1} value={exp} onChange={(e) => setExp(e.target.value)} /></div>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${actorId} / ${hint}` : ""}</div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => postCommand({ type: "actor.unlock", id: actorId })}>解锁/入队</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "actor.remove", id: actorId })}>离队</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "actor.recover", id: actorId })}>恢复</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "actor.level.set", id: actorId, level: numberValue(level, 1) })}>设级</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "actor.exp.add", id: actorId, amount: numberValue(exp, 0) })}>加经验</Button>
        </div>
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">HP</Label><Input type="number" step={1} placeholder="空" value={hp} onChange={(e) => setHp(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">MP</Label><Input type="number" step={1} placeholder="空" value={mp} onChange={(e) => setMp(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">TP</Label><Input type="number" step={1} placeholder="空" value={tp} onChange={(e) => setTp(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "actor.vitals.set", id: actorId, hp: optionalNumber(hp), mp: optionalNumber(mp), tp: optionalNumber(tp) })}>写入</Button>
        </div>
        <div className="grid grid-cols-[160px_1fr_auto] gap-2 items-end">
          <Select value={paramId} onChange={(e) => setParamId(e.target.value)}>
            {params.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <div><Label className="text-xs text-slate-500">增加值</Label><Input type="number" step={1} value={paramValue} onChange={(e) => setParamValue(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "actor.param.add", id: actorId, paramId: numberValue(paramId, 0), value: numberValue(paramValue, 0) })}>加值</Button>
        </div>
        <datalist id="actorOptions">
          {catalogs.actor.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.actor}
          selectedId={actorId}
          renderLeading={(entry) => <Avatar tone="accent">{entry.id}</Avatar>}
          renderExtra={(entry) => entry.faceName || entry.characterName || ""}
          actions={[
            { action: "actor-unlock", label: "解锁" },
            { action: "actor-select", label: "编辑" },
          ]}
          onSelect={(entry) => setId(String(entry.id))}
          onAction={(action, entry) => {
            setId(String(entry.id));
            if (action === "actor-unlock") postCommand({ type: "actor.unlock", id: entry.id });
          }}
        />
      </CardContent>
    </Card>
  );
}

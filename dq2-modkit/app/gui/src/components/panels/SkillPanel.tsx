import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";
import { catalogs, catalogName } from "../../lib/catalog";
import { iconUrl } from "../../lib/bridge";
import { CatalogList } from "../CatalogList";

export function SkillPanel() {
  const { postCommand } = useApp();
  const [actorId, setActorId] = useState("1");
  const [skillId, setSkillId] = useState("1");

  const actorName = catalogName("actor", numberValue(actorId, NaN));
  const skillName = catalogName("skill", numberValue(skillId, NaN));
  const hint = [actorName, skillName].filter(Boolean).join(" / ");

  const skillActorId = numberValue(actorId, numberValue("1", 0));

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">技能</CardTitle>
        <div className="grid grid-cols-[160px_1fr] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">角色ID</Label>
            <Input list="skillActorOptions" value={actorId} onChange={(e) => setActorId(e.target.value)} />
          </div>
          <Input type="search" placeholder="搜索技能名称、ID或描述" disabled />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">技能ID</Label>
            <Input list="skillOptions" value={skillId} onChange={(e) => setSkillId(e.target.value)} />
          </div>
          <Button onClick={() => postCommand({ type: "actor.skill.learn", id: skillActorId, skillId: numberValue(skillId, 0) })}>学会</Button>
          <Button variant="outline" onClick={() => postCommand({ type: "actor.skill.forget", id: skillActorId, skillId: numberValue(skillId, 0) })}>遗忘</Button>
        </div>
        <div className="text-xs text-slate-500 min-h-[20px]">{hint}</div>
        <datalist id="skillActorOptions">
          {catalogs.actor.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <datalist id="skillOptions">
          {catalogs.skill.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={catalogs.skill}
          selectedId={numberValue(skillId, NaN)}
          renderLeading={(entry) => entry.iconIndex != null ? <img src={iconUrl(entry.iconIndex)} alt="" className="w-9 h-9 rounded border border-orange-200 bg-orange-50" /> : null}
          renderDescription={(entry) => entry.description || entry.noteText || ""}
          actions={[
            { action: "skill-learn", label: "学会" },
            { action: "skill-forget", label: "遗忘" },
          ]}
          onSelect={(entry) => setSkillId(String(entry.id))}
          onAction={(action, entry) => {
            setSkillId(String(entry.id));
            postCommand({
              type: action === "skill-learn" ? "actor.skill.learn" : "actor.skill.forget",
              id: skillActorId,
              skillId: entry.id,
            });
          }}
        />
      </CardContent>
    </Card>
  );
}

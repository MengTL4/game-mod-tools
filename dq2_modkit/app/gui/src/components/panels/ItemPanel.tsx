import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label, Select } from "@game-mod-tools/ui";
import { useApp } from "../../AppContext";
import { numberValue } from "../../lib/utils";
import { catalogs, catalogName, parseItemSelection } from "../../lib/catalog";
import { iconUrl } from "../../lib/bridge";
import { CatalogList } from "../CatalogList";

const kinds = [
  { value: "all", label: "全部" },
  { value: "item", label: "物品" },
  { value: "weapon", label: "武器" },
  { value: "armor", label: "防具" },
];

export function ItemPanel() {
  const { postCommand, itemKind, setItemKind, selectedItemKind, setSelectedItemKind } = useApp();
  const [id, setId] = useState("item:1");
  const [amount, setAmount] = useState("1");

  const selection = parseItemSelection(id, itemKind, selectedItemKind);
  const hint = catalogName(selection.kind, selection.id);
  const entries = catalogs[itemKind] || [];

  const handleSelect = (entry: any) => {
    const kind = entry.kind || itemKind;
    setSelectedItemKind(kind);
    if (itemKind === "all") {
      setId(entry.uid || `${kind}:${entry.id}`);
    } else {
      setId(String(entry.id));
    }
  };

  const handleAdd = () => {
    if (!Number.isFinite(selection.id)) return;
    postCommand({ type: "item.add", kind: selection.kind, id: selection.id, amount: numberValue(amount, 1) });
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">物品</CardTitle>
        <div className="grid grid-cols-[128px_1fr_120px] gap-2 items-end">
          <Select value={itemKind} onChange={(e) => setItemKind(e.target.value)}>
            {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
          <div>
            <Label className="text-xs text-slate-500">ID</Label>
            <Input list={`${itemKind === "all" ? "all" : itemKind}Options`} value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">数量</Label>
            <Input type="number" step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="text-xs text-slate-500 min-h-[20px]">{hint ? `${selection.kind} ${selection.id} / ${hint}` : ""}</div>
          <Button onClick={handleAdd}>添加选中</Button>
        </div>
        <datalist id="allOptions">
          {catalogs.all.map((entry: any) => <option key={entry.uid} value={entry.uid} label={entry.name} />)}
        </datalist>
        <datalist id="itemOptions">
          {catalogs.item.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <datalist id="weaponOptions">
          {catalogs.weapon.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <datalist id="armorOptions">
          {catalogs.armor.map((entry) => <option key={entry.id} value={entry.id} label={entry.name} />)}
        </datalist>
        <CatalogList
          entries={entries}
          selectedId={itemKind === "all" ? `${selection.kind}:${selection.id}` : selection.id}
          selectedKey={(entry) => itemKind === "all" ? entry.uid || entry.id : entry.id}
          kind={itemKind}
          renderLeading={(entry) => entry.iconIndex != null ? <img src={iconUrl(entry.iconIndex)} alt="" className="w-9 h-9 rounded border border-orange-200 bg-orange-50" /> : null}
          renderExtra={(entry) => entry.kindLabel || ""}
          renderDescription={(entry) => entry.description || entry.noteText || ""}
          actions={[{ action: "item-add", label: "添加" }]}
          onSelect={handleSelect}
          onAction={(action, entry) => {
            handleSelect(entry);
            postCommand({ type: "item.add", kind: entry.kind || itemKind, id: entry.id, amount: numberValue(amount, 1) });
          }}
        />
      </CardContent>
    </Card>
  );
}

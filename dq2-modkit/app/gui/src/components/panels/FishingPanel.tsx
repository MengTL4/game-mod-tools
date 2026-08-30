import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Input, Label, Select } from "@rpgmv-modkit/ui";
import { useApp } from "../../AppContext";
import { numberValue, formatNumber } from "../../lib/utils";

const fishingPoints = [
  { value: "1", label: "1 / 基础钓点" },
  { value: "2", label: "2 / 暮色林地" },
  { value: "3", label: "3 / 白砂海岸" },
  { value: "4", label: "4 / 雾隐河谷/雾隐湖" },
  { value: "5", label: "5 / 双溪瀑/寒风前段" },
  { value: "6", label: "6 / 寒风平原" },
  { value: "7", label: "7 / 听涛钓岛" },
  { value: "8", label: "8 / 雪吟钓岛" },
  { value: "9", label: "9 / 熔岩洞" },
  { value: "10", label: "10 / 闪光海滩" },
  { value: "11", label: "11 / 山巅通道" },
  { value: "12", label: "12 / 巨石环岛" },
  { value: "13", label: "13 / 血色钓岛" },
];

function PowerSection() {
  const { state, postCommand } = useApp();
  const fishing = state?.fishing;
  const options = state?.fishingOptions || {};
  const calls = fishing?.calls || {};
  const fields = fishing?.fields || {};
  const effectivePower = calls.fishPower && typeof calls.fishPower === "object" ? null : calls.fishPower;
  const metric = formatNumber(effectivePower == null ? fields._fishPower || 0 : effectivePower);
  const [basePower, setBasePower] = useState(String(fields._fishPower ?? 0));
  const [addPower, setAddPower] = useState("10");
  const [rate, setRate] = useState(String(options.powerRate ?? 1));
  const [bonus, setBonus] = useState(String(options.powerBonus ?? 0));

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">钓力</CardTitle>
        <div className="flex items-center min-h-[58px] px-4 border border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-white text-blue-900 font-mono text-2xl font-extrabold">
          {metric}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">基础钓力</Label><Input type="number" min={0} step={1} value={basePower} onChange={(e) => setBasePower(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.power.set", value: numberValue(basePower, 0) })}>设定</Button>
          <div><Label className="text-xs text-slate-500">增加</Label><Input type="number" step={1} value={addPower} onChange={(e) => setAddPower(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.power.add", amount: numberValue(addPower, 0) })}>增加</Button>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">钓力倍率</Label><Input type="number" min={0} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div><Label className="text-xs text-slate-500">额外钓力</Label><Input type="number" step={1} value={bonus} onChange={(e) => setBonus(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.options.set", options: { powerRate: numberValue(rate, 1), powerBonus: numberValue(bonus, 0) } })}>应用</Button>
          <Button variant={options.autoSuccess ? "default" : "outline"} onClick={() => postCommand({ type: "fishing.options.set", options: { autoSuccess: !options.autoSuccess } })}>自动成功</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 5, 10, 20, 50, 100].map((r) => (
            <Button key={r} variant="outline" onClick={() => { setRate(String(r)); postCommand({ type: "fishing.options.set", options: { powerRate: r, powerBonus: numberValue(bonus, 0) } }); }}>{r}x</Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceSection() {
  const { state, postCommand } = useApp();
  const fishing = state?.fishing;
  const variables = fishing?.variables || {};
  const switches = fishing?.switches || {};
  const [amount, setAmount] = useState("1");
  const [medals, setMedals] = useState(String(variables.medals ?? 0));
  const [medalDelta, setMedalDelta] = useState("100");
  const [count, setCount] = useState(String(variables.count ?? 0));
  const [countDelta, setCountDelta] = useState("10");

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">鱼具和资源</CardTitle>
        <div className="grid grid-cols-[96px_repeat(4,auto)] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">数量</Label><Input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.items.add", roles: ["rod"], amount: numberValue(amount, 1) })}>鱼竿</Button>
          <Button onClick={() => postCommand({ type: "fishing.items.add", roles: ["bait"], amount: numberValue(amount, 1) })}>鱼饵</Button>
          <Button onClick={() => postCommand({ type: "fishing.items.add", roles: ["rod", "bait"], amount: numberValue(amount, 1) })}>鱼具套装</Button>
          <Button onClick={() => postCommand({ type: "fishing.items.add", roles: ["fish"], amount: numberValue(amount, 1) })}>鱼类素材</Button>
        </div>
        <Button variant="outline" onClick={() => postCommand({ type: "fishing.qualifications.unlock" })}>解锁钓鱼资格</Button>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">协会奖章</Label><Input type="number" min={0} step={1} value={medals} onChange={(e) => setMedals(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.medals.set", value: numberValue(medals, 0) })}>设定</Button>
          <div><Label className="text-xs text-slate-500">增加奖章</Label><Input type="number" step={1} value={medalDelta} onChange={(e) => setMedalDelta(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.medals.add", amount: numberValue(medalDelta, 0) })}>增加</Button>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
          <div><Label className="text-xs text-slate-500">钓鱼数量</Label><Input type="number" min={0} step={1} value={count} onChange={(e) => setCount(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.count.set", value: numberValue(count, 0) })}>设定</Button>
          <div><Label className="text-xs text-slate-500">增加数量</Label><Input type="number" step={1} value={countDelta} onChange={(e) => setCountDelta(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.count.add", amount: numberValue(countDelta, 0) })}>增加</Button>
        </div>
        <div className="text-xs text-slate-500">
          奖章 {formatNumber(variables.medals)} / 钓鱼数量 {formatNumber(variables.count)} / 技巧变量 {formatNumber(variables.skill)} / 渔夫 {switches.fisherman ? "ON" : "OFF"} / 钓者 {switches.fisher ? "ON" : "OFF"} / 钓师 {switches.master ? "ON" : "OFF"}
        </div>
      </CardContent>
    </Card>
  );
}

function CatchSection() {
  const { postCommand } = useApp();
  const [pointId, setPointId] = useState("1");
  const [times, setTimes] = useState("1");

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <CardTitle className="text-sm font-extrabold text-slate-800">直接钓鱼</CardTitle>
        <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
          <div>
            <Label className="text-xs text-slate-500">鱼池</Label>
            <Select value={pointId} onChange={(e) => setPointId(e.target.value)}>
              {fishingPoints.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </div>
          <div><Label className="text-xs text-slate-500">次数</Label><Input type="number" min={1} max={100} step={1} value={times} onChange={(e) => setTimes(e.target.value)} /></div>
          <Button onClick={() => postCommand({ type: "fishing.catch", pointId: numberValue(pointId, 1), times: numberValue(times, 1) })}>执行</Button>
        </div>
        <div className="text-xs text-slate-500">直接调用游戏的 getFish(pointId)，适合测试鱼池掉落；需要保存时再使用存档面板保存。</div>
      </CardContent>
    </Card>
  );
}

export function FishingPanel() {
  const { activeSections } = useApp();
  const section = activeSections.fishing;
  if (section === "power") return <PowerSection />;
  if (section === "resource") return <ResourceSection />;
  return <CatchSection />;
}

import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridgePath = path.join(projectRoot, "runtime", "bridge", "page-bridge.js");
const bridgeSource = readFileSync(bridgePath, "utf8");

const skill2667 = {
  id: 2667,
  name: "群体追击",
  stypeId: 4,
  description: "被动\n一种宠物被动，能强化宠物各种属性",
  note: ""
};
const skill3294 = { id: 3294, name: "狂挠", stypeId: 1, note: "" };
const skill3505 = { id: 3505, name: "圣光洗涤", stypeId: 2, note: "" };
const dataSkills = [];
dataSkills[2667] = skill2667;
dataSkills[3294] = skill3294;
dataSkills[3505] = skill3505;

const baby = {
  _actorId: 4801,
  _classId: 101,
  _name: "圣光信使",
  _level: 10,
  isNewBB: true,
  BBLeranCount: 1.0012,
  _bbSkill: [3294, 3505],
  _actlist: [],
  _skills: [2667],
  _realSkills: [skill3294, 2667],
  _cooldownTickRate: {},
  _cooldownTurns: {},
  actorId() {
    return this._actorId;
  },
  name() {
    return this._name;
  },
  skills() {
    return this._skills.map((id) => dataSkills[id]).filter(Boolean);
  },
  refresh() {}
};

const dataActors = [];
dataActors[1001] = { id: 1001, name: "宝宝模板", traits: [], equips: [], meta: {}, sts: {} };

const writes = [];
const fakeFs = {
  mkdirSync() {},
  appendFileSync() {},
  existsSync() {
    return false;
  },
  readdirSync() {
    return [];
  },
  readFileSync() {
    return "";
  },
  writeFileSync(file, value) {
    writes.push({ file, value });
  }
};

const windowObject = {
  location: { href: "file:///www/index.html" },
  document: { title: "再刷一把2" },
  TK: {
    $: {
      gameActors: () => ({ _data: { 4801: baby } }),
      gameParty: () => ({ allMembers: () => [] }),
      dataActors: () => dataActors,
      dataSkills: () => dataSkills
    }
  },
  $dataActors: dataActors,
  $dataSkills: dataSkills,
  $gameActors: { _data: { 4801: baby } },
  $gameParty: { allMembers: () => [] }
};

const intervals = [];
const context = vm.createContext({
  window: windowObject,
  document: windowObject.document,
  location: windowObject.location,
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  RegExp,
  setInterval(callback) {
    intervals.push(callback);
    return intervals.length;
  },
  clearInterval() {},
  process: {
    env: {
      ZS2_GAME_ROOT: "F:\\Game",
      ZS2_MODKIT_ROOT: projectRoot
    },
    cwd: () => "F:\\Game"
  },
  require(name) {
    if (name === "fs") return fakeFs;
    if (name === "path") return path;
    throw new Error(`unexpected require: ${name}`);
  }
});
context.global = context;

vm.runInContext(bridgeSource, context, { filename: "page-bridge.js" });

assert.ok(writes.length > 0, "bridge should write initial state during VM load");
assert.equal(typeof baby._realSkills[1], "object");
assert.equal(baby._realSkills[1].id, 2667);
assert.equal(baby._realSkills[1].afterBattleCooldown, 0);
assert.equal(dataSkills[2667].afterBattleCooldown, 0);
assert.deepEqual(Object.keys(baby._cooldownTickRate), []);
assert.deepEqual(Object.keys(baby._cooldownTurns), []);

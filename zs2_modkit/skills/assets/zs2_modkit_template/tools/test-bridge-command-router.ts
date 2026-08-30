import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(projectRoot, "runtime", "bridge", "page-bridge.js"), "utf8");

assert.match(source, /const\s+commandHandlers\s*=\s*Object\.freeze\(\{/);
assert.match(source, /function\s+execute\(command\)/);
assert.doesNotMatch(source, /if\s*\(\s*type\s*===\s*"ping"\s*\)/);

const expectedCommands = [
  "ping",
  "runtime.inspect",
  "runtime.search",
  "talent.points.info",
  "talent.points.set",
  "talent.points.add",
  "title.info",
  "title.unlock",
  "title.unlockAll",
  "costume.info",
  "costume.unlock",
  "costume.unlockAll",
  "baby.info",
  "baby.skill.learn",
  "baby.skill.forget",
  "baby.skill.clear",
  "baby.slots.set",
  "baby.slots.add",
  "trainer.options.get",
  "trainer.hooks.info",
  "trainer.options.set",
  "map.current",
  "map.transfer",
  "map.through.set",
  "map.through.toggle",
  "commonEvent.run",
  "gold.add",
  "gold.set",
  "variable.set",
  "switch.set",
  "item.add",
  "battle.killEnemies",
  "battle.escape",
  "battle.start",
  "hangup.info",
  "hangup.start",
  "hangup.stop",
  "hangup.refresh",
  "offlineHunt.info",
  "offlineHunt.preview",
  "offlineHunt.run",
  "party.recover",
  "actor.add",
  "actor.unlock",
  "actor.remove",
  "actor.recover",
  "actor.level.set",
  "actor.exp.add",
  "actor.vitals.set",
  "actor.param.add",
  "actor.name.set",
  "actor.skill.learn",
  "actor.skill.forget",
  "progress.enemyBook.unlock",
  "save",
  "title.refresh"
];

for (const command of expectedCommands) {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(source, new RegExp(`"${escaped}"\\s*:`));
}

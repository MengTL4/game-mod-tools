# Formats and Contracts

## Table of Contents

1. Runtime-generated files
2. Game-root config
3. data.pak
4. useData
5. Saves
6. Bridge state files
7. Command contracts
8. Hook and runtime targets
9. GUI layout contracts
10. Validation commands

## 1. Runtime-Generated Files

Generated NW runtime files:

```text
d3dcompiler_47.dll
ffmpeg.dll
Game.exe
icudtl.dat
libEGL.dll
libGLESv2.dll
node.dll
notification_helper.exe
nw_100_percent.pak
nw_200_percent.pak
nw_elf.dll
nw.dll
resources.pak
v8_context_snapshot.bin
Dictionaries/
locales/
swiftshader/
```

Generate them in:

```text
zs2_modkit/app/gui
zs2_modkit/runtime/trainer
zs2_modkit/runtime/save-harness
```

Do not commit generated runtime files, `node_modules`, `app/gui/app.js`, `app/save-editor/dist`, `*.tsbuildinfo`, bridge state files, or `output` payloads.

## 2. Game-Root Config

Commit only:

```json
{
  "gameRoot": "D:\\SteamLibrary\\steamapps\\common\\再刷一把2：金色传说"
}
```

Each user may copy it to `config.local.json`. The local file is ignored by Git.

Resolve game root in this order:

```text
-GameRoot parameter
ZS2_GAME_ROOT environment variable
config.local.json gameRoot
parent directory of zs2_modkit
```

The selected directory is valid only when it contains `www/index.html`.

PowerShell `-GameRoot` relative paths are relative to the caller's current location. Config and environment relative paths are relative to `zs2_modkit`.

## 3. data.pak

### manifest.enc

JSON envelope:

```json
{
  "iv": "...",
  "encryptedData": "..."
}
```

Decrypt:

```text
AES-256-CBC
key = UTF-8 bytes of "e5c8bec60f27777fdc7161d01125819d"
iv = hex envelope.iv
ciphertext = hex envelope.encryptedData
```

The key string is used as 32 UTF-8 bytes.

### PAKX Outer Format

```text
4 bytes  magic: PAKX
4 bytes  binary index length, little-endian
N bytes  binary index
...      sequential PAK1 entries
```

Current extractor reads sequential `PAK1` entries rather than relying on the binary index:

```text
4 bytes   magic: PAK1
8 bytes   type, null padded
4 bytes   original size, little-endian
4 bytes   compressed size, little-endian
4 bytes   filename length, little-endian
20 bytes  reserved metadata
N bytes   filename
M bytes   zlib payload
```

Each zlib payload is an old AES JSON envelope:

```json
{
  "iv": "...",
  "encryptedData": "..."
}
```

Decrypt that envelope with the manifest key to get the final RPG Maker JSON.

## 4. useData

For files under `www/useData`:

```text
gzip payload
  -> inflate
  -> first 20 bytes are prefix
  -> remaining bytes are MessagePack
  -> decode to JSON
```

Write:

```text
<name>.msgpack
<name>.json
_index.json
```

## 5. Saves

ZS2 `.rpgsave` files do not use the DQ2 AES/HMAC v2 shell.

Decode:

```text
base64 text -> zlib inflate -> MessagePack -> JSON
```

Encode:

```text
JSON -> MessagePack encode -> zlib deflate -> base64 text
```

Slot inference:

```text
global.rpgsave -> 0
file1.rpgsave  -> 1
fileN.rpgsave  -> N
config.rpgsave -> config
```

Always verify generated saves by decoding and comparing JSON.

## 6. Bridge State Files

Directory:

```text
zs2_modkit/runtime/bridge-state
```

Files:

```text
commands.jsonl   GUI/CLI appends commands
events.jsonl     bridge appends command results
state.json       bridge heartbeat and live game summary
bridge.log       bridge diagnostics
```

Command record:

```json
{
  "type": "gold.add",
  "amount": 10000,
  "commandId": "timestamp-random",
  "ts": 1770000000000
}
```

Event record:

```json
{
  "ok": true,
  "type": "gold.add",
  "commandId": "timestamp-random",
  "result": { "gold": 12345 },
  "ts": 1770000000000
}
```

State should include:

```text
bridgeVersion
expected version 0.2.33
url
title
saveDir
saveFiles
hasParty
hasVariables
hasSwitches
hasDataManager
hooksPatched
gold
map
party
options
rateStats
battleStats
lastError
```

## 7. Command Contracts

Core command types:

```text
ping
status
gold.add { amount }
gold.set { value }
variable.set { id, value }
switch.set { id, value }
item.add { kind, id, amount }
actor.unlock { id }
actor.add { id }
actor.remove { id }
actor.recover { id }
actor.level.set { id, level }
actor.exp.add { id, amount }
actor.vitals.set { id, hp, mp, tp }
actor.param.add { id, paramId, value }
actor.name.set { id, name }
actor.skill.learn { id, skillId }
actor.skill.forget { id, skillId }
progress.enemyBook.unlock { ids }
party.recover
trainer.options.set { expRate, goldRate, dropRate, noSkillCost, oneHitKill, invincible }
trainer.options.get
trainer.hooks.info
battle.start { troopId, variableId, canEscape, canLose }
battle.killEnemies
battle.escape
hangup.info / hangup.start / hangup.stop / hangup.refresh
offlineHunt.info / offlineHunt.preview / offlineHunt.run
runtime.search { keywords }
runtime.inspect { path, maxKeys }
talent.points.info / talent.points.set / talent.points.add
title.info / title.unlock / title.unlockAll
costume.info / costume.unlock / costume.unlockAll
baby.info
baby.skill.learn / baby.skill.forget / baby.skill.clear
baby.slots.set / baby.slots.add
map.current
map.transfer { mapId, x, y, direction, fade }
map.through.set { value }
map.through.toggle
commonEvent.run { id }
save { id }
title.refresh
```

CLI aliases may accept positional or key-value forms:

```powershell
node .\tools\trainer-send.mjs item.add item 5 10
node .\tools\trainer-send.mjs trainer.options.set expRate=10 noSkillCost=true
node .\tools\trainer-send.mjs battle.start 2
node .\tools\trainer-send.mjs battle.start variableId=399
node .\tools\trainer-send.mjs talent.points.add party 10
node .\tools\trainer-send.mjs baby.skill.learn 1001 1890 passive
node .\tools\trainer-send.mjs baby.slots.set 1001 5
node .\tools\trainer-send.mjs map.through.set true
node .\tools\trainer-send.mjs offlineHunt.run mapId=31 times=10 enemyBook=true
```

Validate numeric fields with clear errors. The bridge should return failure events rather than throwing out of the polling loop.

## 8. Hook and Runtime Targets

Resolve standard globals and aliases where available:

```js
window.$gameParty
window.$gameActors
window.$gameVariables
window.$gameSwitches
window.$gamePlayer
window.DataManager
window.ConfigManager
window.BattleManager
window.StorageManager
window.TK
```

Prefer runtime methods:

```text
$gameParty.gainGold
$gameParty.gainItem
$gameActors.actor(id).learnSkill
$gameActors.actor(id).forgetSkill
$gameVariables.setValue
$gameSwitches.setValue
DataManager.saveGame
```

Reward and battle options should preserve originals, avoid double patching, and record hit stats for GUI diagnostics.

Do not add:

```text
fishing
skill proficiency / skill mastery
```

ZS2 baby skill slot field:

```text
BBLeranCount = slots * 1.0012
```

Use this when implementing `baby.slots.set` and `baby.slots.add`.

Baby passive skills must be persisted through all three fields:

```text
_skills
_realSkills
_zs2ModkitBabyPassives
```

The bridge should re-sync `_zs2ModkitBabyPassives` into runtime skill arrays after baby refreshes. Adding or removing passive baby skills must not change `BBLeranCount`; only `baby.slots.*` changes learn slots.

## 9. GUI Layout Contracts

Window and scaling:

```text
default window 1120x760
minimum window 760x560
page-scroll-mode for narrow, short, or zoomed viewports
zoom-scroll-mode for approximately 125%+ display scaling
```

Navigation:

```text
topbar
primary tool nav (.tool-nav)
secondary section nav (.tool-section-nav)
```

Measure sticky offsets at runtime and store them in CSS variables:

```text
--topbar-sticky-offset
--tool-nav-sticky-height
--section-nav-sticky-height
```

Top-level tab changes should scroll to the primary nav, not directly to the workspace or secondary nav. Section changes should scroll to the secondary nav while keeping the primary nav visible. Use the real page scroll container; in NW/Chromium this can be `body` rather than `window`.

Catalog lists:

```text
first page by default
search resets to page 1
direct ID selection may locate the containing page
row height from catalogRowHeight()
rendered row writes --catalog-row-height
```

Check 760px width and 125%/150% Windows display scaling after changing rows, buttons, chips, or nav layout. There must be no horizontal page overflow and no overlapping nav bars.

## 10. Validation Commands

Prerequisites:

```powershell
node --version
npm.cmd --version
```

Syntax:

```powershell
node --check .\tools\modkit-config.mjs
node --check .\tools\extract-data-pak.mjs
node --check .\tools\extract-usedata.mjs
node --check .\tools\extract-saves.mjs
node --check .\tools\encrypt-saves.mjs
node --check .\tools\trainer-send.mjs
node --check .\runtime\bridge\page-bridge.js
```

Build:

```powershell
Push-Location .\app\gui
npm.cmd install
npm.cmd run build
node --check .\app.js
Pop-Location

Push-Location .\app\save-editor
npm.cmd install
npm.cmd run build
Pop-Location
```

Runtime:

```powershell
.\tools\setup-runtime.ps1 -Force
.\tools\extract-all.ps1
.\tools\encrypt-saves.ps1
node .\tools\trainer-send.mjs status
node .\tools\trainer-send.mjs ping
node .\tools\trainer-send.mjs trainer.hooks.info
```

Skill:

```powershell
python C:\Users\MengTL\.codex\skills\.system\skill-creator\scripts\quick_validate.py .\skills
.\skills\scripts\scaffold-zs2-modkit.ps1 -GameRoot "." -DryRun
```

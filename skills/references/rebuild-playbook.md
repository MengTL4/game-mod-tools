# Rebuild Playbook

## Table of Contents

1. Scope and constraints
2. Recon checklist
3. Strategy selection
4. Project structure
5. Runtime bridge
6. Runtime setup and cleanup
7. Data and save extractors
8. Runtime trainer features
9. GUI and save editor
10. Documentation and validation

## 1. Scope and Constraints

Build a local modkit for the single-player NW.js/RPG Maker MV game 《再刷一把2：金色传说》.

Core constraints:

- Keep original game files unchanged.
- Do not edit original `package.json`, `www/index.html`, or data files.
- Do not rely on remote debugging.
- Do not attach to arbitrary running processes.
- Only affect game windows launched through this modkit.

Recommended layout:

```text
<game-root>/zs2_modkit
```

Also support portable placement outside the game directory through:

```text
-GameRoot
ZS2_GAME_ROOT
config.local.json
parent directory fallback
```

Required tools:

```text
Windows PowerShell
Node.js 18+
npm
Git only when publishing
```

## 2. Recon Checklist

Confirm the game root contains:

```text
Game.exe
nw.dll
node.dll
resources.pak
www/index.html
www/data.pak
www/manifest.enc
www/useData
www/save
```

Inspect runtime globals from an injected bridge:

```text
$gameParty
$gameActors
$gameVariables
$gameSwitches
$gamePlayer
DataManager
ConfigManager
BattleManager
StorageManager
TK.$.*
```

Confirm the systems actually present in ZS2. Do not port DQ2-only fishing or proficiency features.

## 3. Strategy Selection

Use this decision table before coding:

| Option | Why it is tempting | Why not use it here |
| --- | --- | --- |
| Edit original `index.html` or `package.json` | Direct injection | Dirties game files and is harder to update |
| Remote debugging port | Easy console access | Not required and often blocked |
| Offline save editor only | Durable changes | Cannot affect current battle, current map, reward hooks, no-cost options |
| Modify `data.pak` in place | Static database changes | Repacking risk; use extraction for lookup first |
| Memory scanner/native injection | General-purpose | Overkill for NW/RPG Maker JavaScript runtime |
| Original `Game.exe --load-extension` | Keeps executable path original and injects a local bridge | Adopt this |

Adopted model:

```text
GUI/CLI -> runtime/bridge-state/commands.jsonl
        -> extension content.js -> page-bridge.js -> game runtime objects
        <- runtime/bridge-state/events.jsonl / state.json
```

## 4. Project Structure

Create:

```text
zs2_modkit/
  README.md
  LICENSE
  .gitignore
  .gitattributes
  config.example.json
  app/gui/
    package.json
    package-lock.json
    index.html
    styles.css
    app.ts
    tsconfig.json
  app/save-editor/
    package.json
    package-lock.json
    index.html
    vite.config.ts
    tsconfig.json
    tsconfig.app.json
    tsconfig.node.json
    src/
      App.tsx
      codec.ts
      main.tsx
      styles.css
  runtime/
    trainer/
      package.json
      index.html
    bridge/
      manifest.json
      content.js
      page-bridge.js
    bridge-state/
      .gitkeep
    save-harness/
      package.json
      package-lock.json
      index.html
  tools/
    package.json
    package-lock.json
    modkit-config.ps1
    modkit-config.mjs
    setup-runtime.ps1
    clean-runtime.ps1
    launch-gui.ps1
    launch-save-editor.ps1
    launch-runtime.ps1
    trainer-send.mjs
    extract-bytecode-bundles.mjs
    extract-data-pak.mjs
    extract-usedata.mjs
    extract-saves.mjs
    extract-saves.ps1
    encrypt-saves.mjs
    encrypt-saves.ps1
    extract-all.ps1
  output/
    extract/.gitkeep
    repack/.gitkeep
    backup/.gitkeep
  docs/
    工具使用说明.md
    技术实现文档.md
  skills/
```

## 5. Runtime Bridge

`runtime/bridge/manifest.json` loads `content.js` for local game pages. `content.js` injects `page-bridge.js` into the page context.

Launch the original game executable:

```text
Game.exe --load-extension=<zs2_modkit/runtime/bridge>
```

Set environment variables before launching:

```text
ZS2_MODKIT_ROOT=<zs2_modkit>
ZS2_GAME_ROOT=<game-root>
```

Bridge responsibilities:

- Patch save paths to `ZS2_GAME_ROOT/www/save` when needed.
- Poll `commands.jsonl`.
- Append command results to `events.jsonl`.
- Write `state.json`.
- Ignore commands older than the bridge start time.
- Deduplicate processed command IDs.
- Resolve standard RPG Maker globals and TK/plugin aliases.

## 6. Runtime Setup and Cleanup

`setup-runtime.ps1` should generate NW runtime links in:

```text
app/gui
runtime/trainer
runtime/save-harness
```

Hardlink or copy files:

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
```

Create junctions:

```text
Dictionaries
locales
swiftshader
```

Use explicit npm registry for installs:

```text
Default: https://registry.npmmirror.com
Override parameter: -NpmRegistry
Override environment: ZS2_NPM_REGISTRY
```

`clean-runtime.ps1` must only remove generated artifacts under `zs2_modkit`. It should clean runtime links, GUI `app.js`, Vite `dist`, TypeScript caches, bridge state, extracted/repacked output, and dependency directories only when `-IncludeDependencies` is passed.

## 7. Data and Save Extractors

Implement:

```text
tools/extract-data-pak.mjs
tools/extract-usedata.mjs
tools/extract-saves.mjs
tools/encrypt-saves.mjs
```

Outputs:

```text
output/extract/data
output/extract/useData
output/extract/save
output/repack/save
```

`launch-gui.ps1` should auto-run `extract-data-pak.mjs` when GUI catalog data is missing, stale, or still encrypted.

Save editor and save scripts should support the ZS2 save format:

```text
base64 -> zlib inflate -> MessagePack -> JSON
```

Repack:

```text
JSON -> MessagePack -> zlib deflate -> base64
```

Always verify repacked saves by decoding generated files and comparing JSON.

## 8. Runtime Trainer Features

Core commands:

```text
ping
status
gold.add / gold.set
variable.set / switch.set
item.add
actor.unlock / actor.add / actor.remove / actor.recover
actor.level.set / actor.exp.add / actor.param.add / actor.vitals.set / actor.name.set
actor.skill.learn / actor.skill.forget
party.recover
trainer.options.set / trainer.options.get / trainer.hooks.info
battle.killEnemies / battle.escape
offlineHunt.info / offlineHunt.preview / offlineHunt.run
hangup.info / hangup.start / hangup.stop / hangup.refresh
talent.points.info / talent.points.set / talent.points.add
title.info / title.unlock / title.unlockAll
costume.info / costume.unlock / costume.unlockAll
baby.info
baby.skill.learn / baby.skill.forget / baby.skill.clear
baby.slots.set / baby.slots.add
map.current / map.transfer
commonEvent.run
progress.enemyBook.unlock
save
title.refresh
runtime.search / runtime.inspect
```

ZS2-specific feature placement:

```text
常用        金币、变量、开关、倍率、战斗选项、保存
物品角色    物品添加、角色编辑、技能添加、天赋点
宝宝        宝宝列表、宝宝技能、可学习点数/技能槽位
成长解锁    称号、换装
脱机挂机    地图挂机
敌群挂机    敌群挂机
```

Do not add fishing or proficiency.

## 9. GUI and Save Editor

GUI:

- Use external NW UI.
- Author behavior in `app/gui/app.ts`.
- Compile to `app/gui/app.js`.
- Read extracted JSON catalogs from `output/extract/data`.
- Use searchable paged lists with first/previous/next/last controls.
- Keep long lists on page 1 by default; search returns to page 1, and direct ID selection may locate the containing page.
- Support `760x560` minimum window size plus 125%/150% Windows display scaling.
- Use page scroll mode under narrow, short, or zoomed viewports; keep primary tool navigation visible when switching top-level categories.
- Measure sticky offsets from actual topbar, primary nav, and secondary nav heights. Do not hardcode offsets or scroll directly to the workspace in page scroll mode.
- Make virtual catalog row height responsive to scroll/zoom mode and set `--catalog-row-height` while rendering.
- Keep dense light tool layout.
- Avoid nested card-heavy marketing UI.

Save editor:

- Use Vite + React + `jsoneditor`.
- Use browser file input/download only.
- Do not depend on NW runtime.
- Keep it a raw JSON tree editor with import/export/validation.
- Do not include quick modification buttons.

## 10. Documentation and Validation

Write:

```text
README.md
docs/工具使用说明.md
docs/技术实现文档.md
skills/SKILL.md
skills/references/rebuild-playbook.md
skills/references/formats-and-contracts.md
```

Minimum checks:

```powershell
node --check .\tools\modkit-config.mjs
node --check .\tools\extract-data-pak.mjs
node --check .\tools\extract-usedata.mjs
node --check .\tools\extract-saves.mjs
node --check .\tools\encrypt-saves.mjs
node --check .\tools\trainer-send.mjs
node --check .\runtime\bridge\page-bridge.js

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

Runtime checks:

```powershell
.\tools\setup-runtime.ps1 -Force
.\tools\extract-all.ps1
.\tools\encrypt-saves.ps1
node .\tools\trainer-send.mjs status
node .\tools\trainer-send.mjs ping
```

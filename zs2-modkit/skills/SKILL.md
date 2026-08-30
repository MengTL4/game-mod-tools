---
name: zs2-modkit-builder
description: Build, recreate, port, or maintain the zs2-modkit local toolkit for the single-player NW.js/RPG Maker MV game 再刷一把2：金色传说, including runtime bridge injection through a local extension without editing original game files, data/useData/save extractors, save repacking, GUI trainer, offline save tree editor, setup/clean scripts, documentation, and a reusable project template. Use when the user asks to replicate, rebuild, scaffold, extend, debug, or secondarily develop this ZS2 modkit workflow.
---

# ZS2 Modkit Builder

Use this skill to recreate or extend the local `zs2-modkit` project for 《再刷一把2：金色传说》, or to port the same local single-player NW.js/RPG Maker MV workflow to a similar title.

Keep the scope local and single-player. Do not use this workflow for online games, protected multiplayer clients, anti-cheat bypass, stealthy persistence, or attaching to arbitrary third-party processes.

## Quick Start

For the same ZS2 game, prefer the bundled clean template:

```powershell
& ".\zs2-modkit\skills\scripts\scaffold-zs2-modkit.ps1" `
  -GameRoot "<game-root>" `
  -RunSetup
```

If Windows blocks `.ps1` execution, use per-command bypass:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\zs2-modkit\skills\scripts\scaffold-zs2-modkit.ps1" -GameRoot "." -RunSetup
```

The template is in `assets/zs2-modkit_template`. It intentionally excludes generated runtime files, `node_modules`, extracted data, saves, logs, bridge state, Vite `dist`, TypeScript build caches, and `.jsc` bytecode. `setup-runtime.ps1` regenerates runtime links from the current game install.

Recommended layout:

```text
<game-root>/zs2-modkit
```

In that layout no game-root config is required. If `zs2-modkit` is elsewhere, copy `config.example.json` to `config.local.json`, set `gameRoot`, or pass `-GameRoot` to PowerShell scripts. Keep `config.local.json` ignored and uncommitted.

This project stores the skill inside `zs2-modkit/skills` so it travels with the modkit. If installing it into Codex's global skill directory for automatic discovery, place this same folder as `zs2-modkit-builder`.

When rebuilding from scratch or adapting after a game update, read:

- `references/rebuild-playbook.md` for the implementation order and project architecture.
- `references/formats-and-contracts.md` for data formats, command contracts, runtime hooks, and validation checks.

## Workflow

1. Confirm the target is a local NW.js/RPG Maker MV game. For ZS2, do not modify original `package.json`, `www/index.html`, or game data files.
2. Confirm command-line Node.js/npm are installed. Use Node.js 18+ at minimum; use `npm.cmd` on Windows if `npm.ps1` is blocked.
3. Resolve the game root through `-GameRoot`, `ZS2_GAME_ROOT`, `config.local.json`, then parent directory fallback.
4. Generate runtime links with `tools/setup-runtime.ps1` instead of committing `Game.exe`, `nw.dll`, `node.dll`, `.pak`, `.dat`, locale, dictionary, or swiftshader files.
5. Launch the original `Game.exe` with `--load-extension=<zs2-modkit/runtime/bridge>` and inject `page-bridge.js` via `runtime/bridge/content.js`.
6. Communicate through local JSONL files in `runtime/bridge-state`: GUI/CLI appends commands, bridge appends events, bridge writes state.
7. Extract `www/data.pak` before GUI catalog features. GUI lists for items, actors, skills, maps, troops, enemies, variables, and switches depend on `output/extract/data`.
8. Keep the GUI external, dense, and tool-like. Do not inject UI into the game scene unless explicitly requested.
9. Keep the offline save editor raw and file-oriented: JSON tree editing plus import/export/validation only, no trainer shortcut buttons.
10. Validate every layer independently: setup/clean, JavaScript syntax, GUI build, save-editor build, extraction, save repack, bridge ping, GUI smoke.

## ZS2-Specific Rules

- Remove reference-project fishing features. ZS2 has no fishing system.
- Remove skill mastery/proficiency UI and hook logic. ZS2 has no proficiency system.
- Put talent point editing under `物品角色`.
- Put baby editing in a separate `宝宝` category. Baby editing should support skill add/forget/clear and learn-slot modification.
- Keep title unlock and costume unlock under `成长解锁`.
- Long GUI lists should open on page 1. Searching resets to page 1; selecting a direct ID may jump to the page containing that ID without continuously refreshing the user's selection.
- Prefer runtime game functions over direct field writes when possible: `gainItem`, `learnSkill`, `setValue`, `DataManager.saveGame`.
- Resolve both standard RPG Maker globals and TK/plugin aliases when the game uses aliases.
- Make every command return structured success/failure events with useful error text.
- Keep generated files out of Git: runtime binaries, `node_modules`, `output/extract`, `output/repack`, bridge logs/state, `app/gui/app.js`, `app/save-editor/dist`, `*.tsbuildinfo`.

## Resources

- `scripts/scaffold-zs2-modkit.ps1`: copy the clean template into a target game root and optionally run setup.
- `assets/zs2-modkit_template`: clean source template for the current project.
- `references/rebuild-playbook.md`: rebuild plan and project architecture.
- `references/formats-and-contracts.md`: formats, command contracts, hooks, and checks.

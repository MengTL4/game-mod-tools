# ZS2 Modkit Architecture UI Phase 2 Design

## Purpose

Phase 1 added guardrails and a small GUI source scaffold. Phase 2 reduces the largest remaining maintenance problem: `app/gui/app.ts` still mixes startup paths, catalog parsing, DOM wiring, command IO, rendering, and event binding in one file.

This phase keeps the current NW.js GUI and compiled `app/gui/app.js` output. The goal is not a visual rewrite yet; it is to move independent logic into focused TypeScript namespaces so later UI work can happen without editing a 2700-line file.

## Scope

Phase 2 starts with low-risk GUI boundaries:

- `src/paths.ts` owns game root resolution and common filesystem paths.
- `src/catalogs.ts` owns extracted data catalog loading and text cleanup.
- `src/dom.ts` owns the static DOM element map.
- `src/bridge-client.ts` owns bridge-state file IO and command append helpers.

Runtime behavior must stay compatible. The GUI should still compile into `app/gui/app.js`, launch the same way, and write the same command/event/state files.

## Non-Goals

This phase does not replace NW.js, introduce React/Vite, change the bridge extension injection path, or redesign all panels. It also does not split `runtime/bridge/page-bridge.js` into a bundle yet; bridge feature extraction should happen after GUI source is less tangled.

## Testing

Add a module-structure test before production edits. It should fail until the new files are created, included in `tsconfig.json`, and mirrored into the template.

Existing checks remain required:

- GUI TypeScript build
- compiled GUI syntax check
- template sync
- bridge version sync
- baby cooldown regression
- bridge command router check
- GUI status copy check

## Acceptance Criteria

- `app/gui/app.ts` no longer contains the catalog loader block.
- New GUI source modules are included in both runtime and template `tsconfig.json`.
- Runtime and template copies stay synchronized.
- Automated verification exits with code `0`.

# ZS2 Modkit Architecture and UI Phase 1 Design

## Purpose

The current modkit works, but its main runtime surfaces are too large and tightly coupled:

- `app/gui/app.ts` contains GUI configuration, filesystem access, catalog loading, list virtualization, state rendering, command construction, and event binding in one IIFE.
- `runtime/bridge/page-bridge.js` contains bridge bootstrap, RPG Maker runtime lookup, storage patching, trainer hooks, baby logic, offline hunt simulation, progress unlocks, state collection, command routing, and debug inspection in one injected script.
- Runtime source and `skills/assets/zs2_modkit_template` source are duplicated, so version or bugfix changes can drift.

Phase 1 reduces this risk without changing the user-facing launch model. It prepares the codebase for later UI redesign by creating clearer module boundaries and verification checks first.

## Non-Goals

Phase 1 will not rewrite the GUI in React/Vite, replace NW.js, change the `Game.exe --load-extension` launch path, or redesign every panel visually.

Phase 1 will not change game behavior intentionally. Existing commands and bridge state fields must remain compatible unless a field is proven broken and the change is covered by a regression test.

Phase 1 will not remove the template copy under `skills/assets/zs2_modkit_template`; it will add checks and repeatable sync steps so the copy does not silently drift.

## Architecture Direction

### GUI Source Layout

Keep `app/gui/package.json`, `index.html`, and the NW.js runtime model. Change the GUI TypeScript source from a single `app.ts` file to a small source tree compiled into the existing `app/gui/app.js` output.

Target layout:

```text
app/gui/src/
  main.ts
  config.ts
  dom.ts
  bridge-client.ts
  catalogs.ts
  format.ts
  ui-state.ts
  catalog-view.ts
  panels/
    core.ts
    catalog.ts
    baby.ts
    progress.ts
    offline-hunt.ts
    world.ts
    misc.ts
    debug.ts
  renderers/
    actor.ts
    baby.ts
    catalog.ts
    events.ts
    offline-hunt.ts
    progress.ts
```

`main.ts` should own initialization order only: setup icons, load catalogs, bind panels, activate the default tab, and start refresh timers.

`config.ts` should own paths, expected bridge version, constants, and game root resolution. Version comparison must no longer be a hidden literal in the middle of the GUI file.

`bridge-client.ts` should own command queue writes, event reads, state reads, game launch, save backup, and folder open helpers. UI panels should call typed helper functions rather than write directly to `commands.jsonl`.

`catalogs.ts` and `catalog-view.ts` should own catalog loading, filtering, pagination, virtual list row rendering, and datalist support. Panel modules should configure catalog behavior instead of duplicating list logic.

Panel modules should only bind UI events and construct user-intent commands. They should not read raw JSON catalogs directly unless the panel owns that catalog.

### Bridge Source Layout

The bridge is injected as a browser extension content script, so Phase 1 should be conservative. The first step is to create internal boundaries without changing the external injection contract.

Preferred low-risk path:

```text
runtime/bridge/src/
  main.js
  version.js
  env.js
  runtime-resolve.js
  state.js
  command-router.js
  hooks/
    battle.js
    save-paths.js
    trainer-options.js
  features/
    actor.js
    baby.js
    battle.js
    map.js
    offline-hunt.js
    progress.js
    debug-runtime.js
  utils/
    numbers.js
    data.js
    events.js
```

The build output must remain `runtime/bridge/page-bridge.js`, because `runtime/bridge/manifest.json` already points at that script.

If adding a bridge bundler is too risky for Phase 1, use a generated-concatenation script that produces `page-bridge.js` from ordered source fragments. This keeps the runtime artifact simple while letting development happen in focused files.

### Command Routing

Replace the long `if (type === "...")` route chain with a command table:

```js
const commandHandlers = {
  "ping": () => collectState(),
  "baby.info": () => babySummary(),
  "baby.skill.learn": learnBabySkill
};
```

Unknown commands should keep the current behavior: throw `unknown command type: ${type}` and write a failed bridge event.

The table should be grouped by feature. This makes it visible when adding a command requires updates to GUI controls, bridge handlers, tests, and docs.

## UI and Interaction Direction

Phase 1 UI changes should improve clarity without a full visual rewrite:

- Status messages must distinguish stale state, bridge version mismatch, bridge error, and game-not-ready state.
- Version mismatch text should include both actual and expected versions, not only `需重启`.
- Command feedback should include the command type and whether it is queued, succeeded, or failed when an event result is available.
- Navigation labels should stay stable, but panel headings and hints can be clarified.
- Existing responsive behavior should be preserved.

The later UI redesign can be planned after the architecture split. That redesign can introduce stronger visual hierarchy, a command palette/search center, clearer action grouping, and a less crowded status sidebar.

## Template Sync

Every source change that affects runtime behavior must be reflected in `skills/assets/zs2_modkit_template`.

Phase 1 should add checks for:

- GUI expected bridge version equals bridge script version in runtime source, compiled GUI output, and template source.
- Runtime bridge source and template bridge source are equal after sync for generated artifacts.
- GUI source and template GUI source are equal after sync for source files.

The sync check can start as a Node script under `tools/`. It should fail loudly when a template file drifts.

## Testing and Verification

Required checks after Phase 1 changes:

```powershell
Push-Location .\app\gui
npm run build
Pop-Location

node --check .\app\gui\app.js
node --check .\runtime\bridge\page-bridge.js
node --check .\skills\assets\zs2_modkit_template\runtime\bridge\page-bridge.js
node .\tools\test-bridge-version-sync.ts
node .\tools\test-bridge-baby-cooldowns.ts
```

New checks should cover:

- Template drift for files touched in Phase 1.
- Command routing table contains expected core commands.
- GUI source version constants are generated or imported from one source, not duplicated manually.

Manual smoke checks:

- Launch GUI.
- Start game from GUI.
- Confirm status reaches connected state.
- Send `ping` or use refresh.
- Use one low-risk command such as gold add.
- Confirm event log shows success.

## Migration Order

1. Add version/template sync checks before moving code.
2. Extract GUI constants and pure helpers first.
3. Extract GUI bridge-client and catalog modules.
4. Extract GUI panel binding modules one group at a time.
5. Build after each extraction and keep `app/gui/app.js` working.
6. Refactor bridge command routing into a table without moving feature logic.
7. Extract bridge feature blocks only after routing is stable.
8. Sync template and run all verification commands.

This order prioritizes reversible, testable steps. It avoids a big-bang rewrite where GUI and bridge break at the same time.

## Risks

The bridge runs inside the game page and depends on globals that may only exist after RPG Maker plugins load. Extracting bridge code must preserve initialization timing, IIFE isolation, and global guard behavior.

The GUI currently uses TypeScript with `module: "none"`. Moving to multiple files may require either `outFile` with namespaces, a simple bundler, or a controlled script concatenation step. The lowest-risk option should be chosen during implementation planning.

Template sync checks may initially fail because the current template already omits some generated runtime files. Checks should target source and generated artifacts intentionally, not every file in the project.

## Acceptance Criteria

Phase 1 is complete when:

- GUI source is split into focused files while still producing the existing `app/gui/app.js`.
- Bridge command routing is table-driven or otherwise isolated from feature implementations.
- Version constants and template sync are covered by automated checks.
- Existing baby cooldown regression and version sync regression pass.
- GUI can launch the game and send commands through the bridge.
- No intentional feature removals occur.

# Architecture UI Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move independent GUI catalog/path/DOM/bridge-client boundaries out of the oversized `app/gui/app.ts` while preserving the current NW.js runtime.

**Architecture:** Keep `module: "none"` and `outFile: "app.js"`. Add namespace-based TypeScript modules under `app/gui/src/` and matching template files. Refactor `app.ts` to call those modules without changing command payloads or bridge file locations.

**Tech Stack:** TypeScript namespaces, NW.js, Node.js verification scripts, PowerShell launch script.

---

## File Structure

- Create: `tools/test-gui-phase2-modules.ts`
- Create: `app/gui/src/paths.ts`
- Create: `app/gui/src/dom.ts`
- Create: `app/gui/src/bridge-client.ts`
- Create: `app/gui/src/catalogs.ts`
- Create matching files under `skills/assets/zs2_modkit_template/app/gui/src/`
- Modify: `app/gui/app.ts`
- Modify: `skills/assets/zs2_modkit_template/app/gui/app.ts`
- Modify: `app/gui/tsconfig.json`
- Modify: `skills/assets/zs2_modkit_template/app/gui/tsconfig.json`
- Modify: `tools/test-template-sync.ts`

## Task 1: Add Phase 2 Module Guard

- [ ] Create `tools/test-gui-phase2-modules.ts` that checks the new module files exist in runtime and template, are listed in both GUI tsconfig files, and that `app.ts` no longer defines the catalog-loader functions.
- [ ] Run `node .\tools\test-gui-phase2-modules.ts` and confirm it fails before implementation.

## Task 2: Extract Catalog Loading

- [ ] Create `app/gui/src/catalogs.ts` with `Zs2Gui.Catalogs.loadCatalogs(context)`, `catalogName`, and `catalogEntry`.
- [ ] Replace the catalog loading block and loader function definitions in `app/gui/app.ts` with calls into `Zs2Gui.Catalogs`.
- [ ] Copy the same module and app changes to the template.

## Task 3: Extract Path and DOM Boundaries

- [ ] Create `app/gui/src/paths.ts` with `Zs2Gui.Paths.create(context)`.
- [ ] Create `app/gui/src/dom.ts` with `Zs2Gui.Dom.create(document)`.
- [ ] Update `app.ts` to consume the path and DOM modules.
- [ ] Copy changes to the template.

## Task 4: Extract Bridge File IO

- [ ] Create `app/gui/src/bridge-client.ts` with helpers for ensuring the bridge directory, reading events, reading state, appending commands, and clearing events.
- [ ] Update `app.ts` to call the bridge client helpers while keeping UI-specific toast/render behavior local.
- [ ] Copy changes to the template.

## Task 5: Verification

- [ ] Run `npm run build` in `app/gui`.
- [ ] Run syntax checks for compiled GUI, bridge scripts, and test scripts.
- [ ] Run all regression scripts:
  - `node .\tools\test-template-sync.ts`
  - `node .\tools\test-bridge-version-sync.ts`
  - `node .\tools\test-bridge-baby-cooldowns.ts`
  - `node .\tools\test-bridge-command-router.ts`
  - `node .\tools\test-gui-status-copy.ts`
  - `node .\tools\test-gui-phase2-modules.ts`

Because this directory is not a Git repository, skip commit steps.

# Architecture UI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the highest-risk GUI and bridge responsibilities into clearer boundaries while preserving the existing NW.js GUI, bridge injection path, and user-visible behavior.

**Architecture:** Phase 1 is incremental. Add verification first, then split GUI source into focused TypeScript files that still compile to `app/gui/app.js`, then isolate bridge command routing before moving bridge feature logic. Runtime and template copies must remain synchronized through explicit checks.

**Tech Stack:** TypeScript with `tsc`, NW.js app loaded from `app/gui/index.html`, browser-extension injected bridge JavaScript, Node.js test scripts, PowerShell launch scripts.

---

## File Structure

Create or modify these files:

- Create: `tools/test-template-sync.ts`
- Modify: `tools/test-bridge-version-sync.ts`
- Modify: `tools/launch-gui.ps1`
- Modify: `skills/assets/zs2-modkit_template/tools/launch-gui.ps1`
- Modify: `app/gui/tsconfig.json`
- Modify: `skills/assets/zs2-modkit_template/app/gui/tsconfig.json`
- Create: `app/gui/src/config.ts`
- Create: `app/gui/src/format.ts`
- Create: `app/gui/src/dom.ts`
- Create: `app/gui/src/bridge-client.ts`
- Create: `app/gui/src/catalogs.ts`
- Create: `app/gui/src/catalog-view.ts`
- Create: `app/gui/src/main.ts`
- Create: `app/gui/src/panels/core.ts`
- Create: `app/gui/src/panels/catalog.ts`
- Create: `app/gui/src/panels/baby.ts`
- Create: `app/gui/src/panels/progress.ts`
- Create: `app/gui/src/panels/offline-hunt.ts`
- Create: `app/gui/src/panels/world.ts`
- Create: `app/gui/src/panels/misc.ts`
- Create: `app/gui/src/panels/debug.ts`
- Create: matching files under `skills/assets/zs2-modkit_template/app/gui/src/`
- Modify: `app/gui/app.ts`
- Modify: `skills/assets/zs2-modkit_template/app/gui/app.ts`
- Modify: `runtime/bridge/page-bridge.js`
- Modify: `skills/assets/zs2-modkit_template/runtime/bridge/page-bridge.js`

Keep these generated runtime artifacts:

- `app/gui/app.js`
- `runtime/bridge/page-bridge.js`

Because this directory is not a Git repository, skip commit steps. If it is later initialized as a repository, commit after every completed task.

---

### Task 1: Add Template Drift Verification

**Files:**
- Create: `tools/test-template-sync.ts`
- Modify: `tools/test-bridge-version-sync.ts`

- [ ] **Step 1: Write failing template sync test**

Create `tools/test-template-sync.ts`:

```js
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(projectRoot, "skills", "assets", "zs2-modkit_template");

const pairs = [
  ["runtime bridge", "runtime/bridge/page-bridge.js"],
  ["bridge manifest", "runtime/bridge/manifest.json"],
  ["bridge content", "runtime/bridge/content.js"],
  ["gui tsconfig", "app/gui/tsconfig.json"],
  ["gui source", "app/gui/app.ts"],
  ["gui styles", "app/gui/styles.css"],
  ["gui html", "app/gui/index.html"],
  ["launch gui script", "tools/launch-gui.ps1"]
];

for (const [label, relativePath] of pairs) {
  const runtimePath = path.join(projectRoot, relativePath);
  const templatePath = path.join(templateRoot, relativePath);
  assert.ok(existsSync(runtimePath), `${label} runtime file should exist: ${relativePath}`);
  assert.ok(existsSync(templatePath), `${label} template file should exist: ${relativePath}`);
  assert.equal(
    readFileSync(templatePath, "utf8"),
    readFileSync(runtimePath, "utf8"),
    `${label} should match template copy: ${relativePath}`
  );
}
```

- [ ] **Step 2: Run test to verify current drift**

Run:

```powershell
node .\tools\test-template-sync.ts
```

Expected: FAIL if runtime-only files such as `app/gui/app.js` are not included, but listed source/template files should pass after recent manual sync. If it passes immediately, keep the test because it protects later tasks.

- [ ] **Step 3: Extend version sync to template compiled output policy**

Modify `tools/test-bridge-version-sync.ts` so it explicitly documents why template `app.js` is not checked:

```js
const pairs = [
  {
    label: "runtime ts",
    appPath: path.join(projectRoot, "app", "gui", "app.ts"),
    bridgePath: path.join(projectRoot, "runtime", "bridge", "page-bridge.js")
  },
  {
    label: "runtime js",
    appPath: path.join(projectRoot, "app", "gui", "app.js"),
    bridgePath: path.join(projectRoot, "runtime", "bridge", "page-bridge.js")
  },
  {
    label: "template ts",
    appPath: path.join(projectRoot, "skills", "assets", "zs2-modkit_template", "app", "gui", "app.ts"),
    bridgePath: path.join(projectRoot, "skills", "assets", "zs2-modkit_template", "runtime", "bridge", "page-bridge.js")
  }
];
```

Keep `runtime js` in the list. Do not add template `app.js`, because the clean template does not include compiled GUI output.

- [ ] **Step 4: Run verification**

Run:

```powershell
node .\tools\test-template-sync.ts
node .\tools\test-bridge-version-sync.ts
node --check .\tools\test-template-sync.ts
node --check .\tools\test-bridge-version-sync.ts
```

Expected: all commands exit `0` after any source/template drift is fixed.

---

### Task 2: Make GUI Auto-Build Watch All TypeScript Sources

**Files:**
- Modify: `tools/launch-gui.ps1`
- Modify: `skills/assets/zs2-modkit_template/tools/launch-gui.ps1`

- [ ] **Step 1: Write failing check for source-aware launch script**

Create a temporary one-off check in PowerShell, then delete it after confirming failure. Run:

```powershell
Select-String -LiteralPath .\tools\launch-gui.ps1 -Pattern 'Get-ChildItem.*\.ts|src\\.*\.ts'
```

Expected before implementation: no useful match, proving the script only checks `app.ts`.

- [ ] **Step 2: Update runtime launch script source scan**

In `tools/launch-gui.ps1`, replace:

```powershell
$AppTs = Join-Path $Gui "app.ts"
```

with:

```powershell
$AppTs = Join-Path $Gui "app.ts"
$GuiSrc = Join-Path $Gui "src"
```

Inside `Invoke-GuiBuildIfNeeded`, replace the timestamp logic with:

```powershell
function Get-GuiSourceFiles {
  $files = @()
  if (Test-Path -LiteralPath $AppTs) {
    $files += Get-Item -LiteralPath $AppTs
  }
  if (Test-Path -LiteralPath $GuiSrc) {
    $files += Get-ChildItem -LiteralPath $GuiSrc -Recurse -File -Filter "*.ts"
  }
  return $files
}

function Invoke-GuiBuildIfNeeded {
  $sourceFiles = @(Get-GuiSourceFiles)
  if (-not $sourceFiles.Count) { return }
  $needsBuild = -not (Test-Path -LiteralPath $AppJs)
  if (-not $needsBuild) {
    $appJsTime = (Get-Item -LiteralPath $AppJs).LastWriteTimeUtc
    $needsBuild = [bool]($sourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $appJsTime } | Select-Object -First 1)
  }
  if (-not $needsBuild) { return }

  $Registry = $NpmRegistry
  if (-not $Registry) { $Registry = $env:ZS2_NPM_REGISTRY }
  if (-not $Registry) { $Registry = "https://registry.npmmirror.com" }
  $npmCommand = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npmCommand) {
    $npmCommand = (Get-Command npm -ErrorAction Stop).Source
  }

  if (-not (Test-Path -LiteralPath (Join-Path $Gui "node_modules"))) {
    Push-Location $Gui
    try {
      & $npmCommand install --registry $Registry
      if ($LASTEXITCODE -ne 0) { throw "GUI npm install failed with exit code $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
  }

  Push-Location $Gui
  try {
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) { throw "GUI TypeScript build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}
```

- [ ] **Step 3: Copy the same change to template**

Apply the same PowerShell changes to:

```text
skills/assets/zs2-modkit_template/tools/launch-gui.ps1
```

- [ ] **Step 4: Verify script parses and template sync passes**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "[scriptblock]::Create((Get-Content -LiteralPath '.\tools\launch-gui.ps1' -Raw)) | Out-Null"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[scriptblock]::Create((Get-Content -LiteralPath '.\skills\assets\zs2-modkit_template\tools\launch-gui.ps1' -Raw)) | Out-Null"
node .\tools\test-template-sync.ts
```

Expected: all commands exit `0`.

---

### Task 3: Prepare GUI Multi-File TypeScript Build

**Files:**
- Modify: `app/gui/tsconfig.json`
- Modify: `skills/assets/zs2-modkit_template/app/gui/tsconfig.json`
- Create: `app/gui/src/main.ts`
- Create: `skills/assets/zs2-modkit_template/app/gui/src/main.ts`
- Modify: `app/gui/app.ts`
- Modify: `skills/assets/zs2-modkit_template/app/gui/app.ts`

- [ ] **Step 1: Write failing build-structure check**

Run:

```powershell
Test-Path .\app\gui\src\main.ts
```

Expected: `False` before this task.

- [ ] **Step 2: Add source entry file**

Create `app/gui/src/main.ts`:

```ts
namespace Zs2Gui {
  export function bootstrap(): void {
    setupIconSet();
    setupCatalogs();
    bind();
    activateTab("core");
    refresh();
    setInterval(refresh, 1000);
  }
}
```

Create the same file under:

```text
skills/assets/zs2-modkit_template/app/gui/src/main.ts
```

- [ ] **Step 3: Change `app.ts` final bootstrap to namespace call**

In both runtime and template `app/gui/app.ts`, replace:

```ts
  setupIconSet();
  setupCatalogs();
  bind();
  activateTab("core");
  refresh();
  setInterval(refresh, 1000);
```

with:

```ts
  Zs2Gui.bootstrap();
```

- [ ] **Step 4: Update tsconfig file order**

Change both `app/gui/tsconfig.json` files from:

```json
"files": ["app.ts"]
```

to:

```json
"outFile": "app.js",
"files": ["app.ts", "src/main.ts"]
```

Keep `"module": "none"` so `outFile` works.

- [ ] **Step 5: Build and verify**

Run:

```powershell
Push-Location .\app\gui
npm run build
Pop-Location
node --check .\app\gui\app.js
node .\tools\test-template-sync.ts
node .\tools\test-bridge-version-sync.ts
```

Expected: all commands exit `0`. If TypeScript reports that `Zs2Gui` cannot see IIFE-local functions, do not force namespaces into IIFE scope. Instead, keep `src/main.ts` as a build sentinel and postpone actual bootstrap extraction to Task 4 with explicit global assignment.

---

### Task 4: Extract GUI Config and Formatting Helpers

**Files:**
- Create: `app/gui/src/config.ts`
- Create: `app/gui/src/format.ts`
- Matching template files
- Modify: `app/gui/app.ts`
- Modify: template `app/gui/app.ts`
- Modify: both `app/gui/tsconfig.json`

- [ ] **Step 1: Write failing version-source test**

Add this assertion to `tools/test-bridge-version-sync.ts`:

```js
const runtimeConfigPath = path.join(projectRoot, "app", "gui", "src", "config.ts");
const templateConfigPath = path.join(projectRoot, "skills", "assets", "zs2-modkit_template", "app", "gui", "src", "config.ts");
for (const file of [runtimeConfigPath, templateConfigPath]) {
  const source = readFileSync(file, "utf8");
  const expected = extractVersion(source, /EXPECTED_BRIDGE_VERSION\s*=\s*"([^"]+)"/, file);
  const bridgeSource = readFileSync(file.includes("zs2-modkit_template") ? pairs[2].bridgePath : pairs[0].bridgePath, "utf8");
  const actual = extractVersion(bridgeSource, /version:\s*"([^"]+)"/, `${file} bridge`);
  assert.equal(expected, actual, `${file} expected bridge version should match bridge version`);
}
```

Run:

```powershell
node .\tools\test-bridge-version-sync.ts
```

Expected: FAIL because `src/config.ts` does not exist yet.

- [ ] **Step 2: Create config namespace**

Create `app/gui/src/config.ts`:

```ts
namespace Zs2Gui.Config {
  export const EXPECTED_BRIDGE_VERSION = "0.2.38";
}
```

Copy to template.

- [ ] **Step 3: Create format helpers**

Create `app/gui/src/format.ts`:

```ts
namespace Zs2Gui.Format {
  export function formatNumber(value: any): string {
    if (value == null || value === "") return "-";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("zh-CN").format(number);
  }

  export function escapeHtml(value: any): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  export function looseNumber(value: any): number {
    const text = String(value == null ? "" : value).trim();
    if (text === "") return NaN;
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }
}
```

Copy to template.

- [ ] **Step 4: Replace GUI literals and local helper bodies**

In both `app/gui/app.ts` files:

```ts
const EXPECTED_BRIDGE_VERSION = "0.2.38";
```

becomes:

```ts
const EXPECTED_BRIDGE_VERSION = Zs2Gui.Config.EXPECTED_BRIDGE_VERSION;
```

Replace bodies of `formatNumber`, `escapeHtml`, and `looseNumber` with delegating calls:

```ts
function formatNumber(value) {
  return Zs2Gui.Format.formatNumber(value);
}

function escapeHtml(value) {
  return Zs2Gui.Format.escapeHtml(value);
}

function looseNumber(value) {
  return Zs2Gui.Format.looseNumber(value);
}
```

- [ ] **Step 5: Update tsconfig order**

Both GUI `tsconfig.json` files should include:

```json
"files": ["src/config.ts", "src/format.ts", "app.ts", "src/main.ts"]
```

- [ ] **Step 6: Verify**

Run:

```powershell
Push-Location .\app\gui
npm run build
Pop-Location
node --check .\app\gui\app.js
node .\tools\test-bridge-version-sync.ts
node .\tools\test-template-sync.ts
```

Expected: all commands exit `0`.

---

### Task 5: Extract Bridge Command Router Without Moving Feature Logic

**Files:**
- Modify: `runtime/bridge/page-bridge.js`
- Modify: `skills/assets/zs2-modkit_template/runtime/bridge/page-bridge.js`
- Create: `tools/test-bridge-command-router.ts`

- [ ] **Step 1: Write failing command router test**

Create `tools/test-bridge-command-router.ts`:

```js
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
  assert.match(source, new RegExp(JSON.stringify(command).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:"));
}
```

Run:

```powershell
node .\tools\test-bridge-command-router.ts
```

Expected: FAIL because `commandHandlers` does not exist yet.

- [ ] **Step 2: Add commandHandlers table**

Above `function execute(command)`, add `const commandHandlers = Object.freeze({ ... })` with every existing command from the current `if` chain. Each handler should call the same function or return the same object as the old branch.

Example entries:

```js
  "ping": () => collectState(),
  "runtime.inspect": (command) => runtimeInspect(command),
  "runtime.search": (command) => runtimeSearch(command),
  "baby.info": () => babySummary(),
  "baby.skill.learn": (command) => learnBabySkill(command),
  "trainer.options.get": () => ({ options: { ...bridge.options }, hooks: patchTrainerHooks() }),
  "trainer.options.set": (command) => ({ options: setTrainerOptions(command.options || command) })
```

- [ ] **Step 3: Replace execute body**

Replace `execute(command)` with:

```js
function execute(command) {
  if (!command || typeof command !== "object") throw new Error("invalid command");
  const type = String(command.type || "");
  const handler = commandHandlers[type];
  if (!handler) throw new Error(`unknown command type: ${type}`);
  return handler(command);
}
```

- [ ] **Step 4: Copy bridge change to template**

Copy the same `commandHandlers` and `execute` changes to:

```text
skills/assets/zs2-modkit_template/runtime/bridge/page-bridge.js
```

- [ ] **Step 5: Verify**

Run:

```powershell
node .\tools\test-bridge-command-router.ts
node --check .\runtime\bridge\page-bridge.js
node --check .\skills\assets\zs2-modkit_template\runtime\bridge\page-bridge.js
node .\tools\test-bridge-baby-cooldowns.ts
node .\tools\test-template-sync.ts
```

Expected: all commands exit `0`.

---

### Task 6: Improve Bridge Version Mismatch Status Text

**Files:**
- Modify: `app/gui/app.ts`
- Modify: `skills/assets/zs2-modkit_template/app/gui/app.ts`
- Build output: `app/gui/app.js`

- [ ] **Step 1: Write failing status text check**

Create `tools/test-gui-status-copy.ts`:

```js
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = readFileSync(path.join(projectRoot, "app", "gui", "app.ts"), "utf8");

assert.match(appSource, /桥接版本不一致/);
assert.match(appSource, /实际/);
assert.match(appSource, /期望/);
assert.doesNotMatch(appSource, /setStatus\("error",\s*"需重启"\)/);
```

Run:

```powershell
node .\tools\test-gui-status-copy.ts
```

Expected: FAIL because current source still uses `需重启`.

- [ ] **Step 2: Update status text**

In both GUI `app.ts` files, replace:

```ts
else if (!versionOk) setStatus("error", "需重启");
```

with:

```ts
else if (!versionOk) setStatus("error", "桥接版本不一致");
```

Change bridge state text from:

```ts
? `${state.storagePatched ? "已接入" : "已注入"} v${version}${versionOk ? "" : ` -> v${EXPECTED_BRIDGE_VERSION}`}`
```

to:

```ts
? `${state.storagePatched ? "已接入" : "已注入"} v${version}${versionOk ? "" : `，实际 ${version}，期望 ${EXPECTED_BRIDGE_VERSION}`}`
```

- [ ] **Step 3: Build and verify**

Run:

```powershell
Push-Location .\app\gui
npm run build
Pop-Location
node .\tools\test-gui-status-copy.ts
node --check .\app\gui\app.js
node .\tools\test-template-sync.ts
node .\tools\test-bridge-version-sync.ts
```

Expected: all commands exit `0`.

---

### Task 7: Final Verification

**Files:**
- All files changed in Tasks 1-6.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
Push-Location .\app\gui
npm run build
Pop-Location
node --check .\app\gui\app.js
node --check .\runtime\bridge\page-bridge.js
node --check .\skills\assets\zs2-modkit_template\runtime\bridge\page-bridge.js
node --check .\tools\test-template-sync.ts
node --check .\tools\test-bridge-version-sync.ts
node --check .\tools\test-bridge-baby-cooldowns.ts
node --check .\tools\test-bridge-command-router.ts
node --check .\tools\test-gui-status-copy.ts
node .\tools\test-template-sync.ts
node .\tools\test-bridge-version-sync.ts
node .\tools\test-bridge-baby-cooldowns.ts
node .\tools\test-bridge-command-router.ts
node .\tools\test-gui-status-copy.ts
```

Expected: all commands exit `0`.

- [ ] **Step 2: Manual smoke check**

Run:

```powershell
.\tools\launch-gui.ps1
```

Expected:

- GUI opens.
- If the game is launched from the GUI, bridge status reaches connected or loading without false `需重启`.
- Bridge version mismatch, if forced later, shows actual and expected versions.
- A low-risk command such as gold add writes an event result.

- [ ] **Step 3: Document non-Git status**

Because this directory is not a Git repository, do not run commit commands. Record in the final report:

```text
Git commit skipped: workspace is not a Git repository.
```

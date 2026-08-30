# TOOLS NOTES

## OVERVIEW

Operational scripts for setup, launching, extraction, encryption, save patching, diagnostics, and index generation. PowerShell wrappers are the user-facing entry points; Node `.ts` files hold most codecs and data logic.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Resolve game root/config | `modkit-config.ps1`, `modkit-config.ts` | Supports parent auto-detect, `-GameRoot`, env, and local config. |
| Runtime setup | `setup-runtime.ps1`, `clean-runtime.ps1` | Creates/removes NW runtime links and extracted bytecode. |
| Main launchers | `launch-gui.ps1`, `launch-save-editor.ps1`, `launch-runtime.ps1` | Preferred manual QA surfaces. |
| Data codec | `data-codec.ts`, `extract-data.ts`, `encrypt-data.ts` | AES-192-CBC game data flow. |
| Save codec | `save-codec.ts`, `extract-saves.ts`, `encrypt-saves.ts`, `patch-save.ts` | LZString/zlib save flow. |
| Key validation | `probe-data-key.ts`, `trace-loaders.ts` | Data key and loader tracing. |
| Prison checks | `diagnose-prison-checks.ts` | CLI guardrail diagnostics for saves. |
| Save editor index | `build-save-editor-index.ts` | Regenerates browser lookup data. |

## CONVENTIONS

- Keep `.ps1` wrappers usable from the game root and from inside `nwr-modkit` where existing scripts support both.
- Preserve `-GameRoot`, `NWR_GAME_ROOT`, and `config.local.json` resolution paths.
- Preserve `NWR_NPM_REGISTRY` or explicit registry options for dependency install paths.
- Scripts should write generated cleartext to `output/extract/` and repacked data to `output/repack/`; they should not silently overwrite live game files.
- `.ts` files are ESM/transpiled by `tsx` even though `tools/package.json` uses CommonJS defaults.

## ANTI-PATTERNS

- Do not convert launcher wrappers into one-off local paths. This install may move.
- Do not remove reports such as `_extract-report.json` or `_repack-report.json`; they are the audit trail for generated output.
- Do not rely on `npm test`; the package contains only the default failing stub.
- Do not hand-copy decrypted data back into `www/data` from scripts without an explicit backup/manual replacement step.

## COMMANDS

```powershell
.\tools\launch-gui.ps1
.\tools\launch-save-editor.ps1
.\tools\setup-runtime.ps1 -Force
.\tools\extract-all.ps1
.\tools\extract-data.ps1 -GameRoot .
.\tools\encrypt-data.ps1
.\tools\extract-saves.ps1 -GameRoot .
.\tools\encrypt-saves.ps1
npx tsx .\tools\probe-data-key.ts --game-root .
npx tsx .\tools\diagnose-prison-checks.ts --game-root .
```

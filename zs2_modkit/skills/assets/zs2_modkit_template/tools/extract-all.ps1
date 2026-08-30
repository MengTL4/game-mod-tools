param(
  [string]$GameRoot,
  [string]$NpmRegistry
)

$ErrorActionPreference = "Stop"
$ToolDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ToolDir "..")).Path
. (Join-Path $ToolDir "modkit-config.ps1")
$GameRoot = Resolve-Zs2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Zs2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot

& (Join-Path $ToolDir "setup-runtime.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry

& npx tsx (Join-Path $ToolDir "extract-data-pak.ts")
if ($LASTEXITCODE -ne 0) { throw "extract-data-pak.ts failed with exit code $LASTEXITCODE" }

& npx tsx (Join-Path $ToolDir "extract-usedata.ts")
if ($LASTEXITCODE -ne 0) { throw "extract-usedata.ts failed with exit code $LASTEXITCODE" }

& (Join-Path $ToolDir "extract-saves.ps1") -GameRoot $GameRoot

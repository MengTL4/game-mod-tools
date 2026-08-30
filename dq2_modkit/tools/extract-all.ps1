param(
  [string]$GameRoot,
  [string]$NpmRegistry
)

$ErrorActionPreference = "Stop"
$ToolDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ToolDir "..")).Path
. (Join-Path $ToolDir "modkit-config.ps1")
$GameRoot = Resolve-Dq2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Dq2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot

& (Join-Path $ToolDir "setup-runtime.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry

Push-Location $ToolDir
try {
  & npx tsx "extract-data-pak.ts"
  if ($LASTEXITCODE -ne 0) { throw "extract-data-pak.ts failed with exit code $LASTEXITCODE" }

  & npx tsx "extract-usedata.ts"
  if ($LASTEXITCODE -ne 0) { throw "extract-usedata.ts failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

& (Join-Path $ToolDir "extract-saves.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry

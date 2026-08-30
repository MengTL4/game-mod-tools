param(
  [string]$GameRoot,
  [string]$NpmRegistry
)

$ErrorActionPreference = "Stop"

$TsxCommand = Join-Path $PSScriptRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path -LiteralPath $TsxCommand)) {
  $TsxCommand = (Get-Command tsx -ErrorAction Stop).Source
}
$ToolDir = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ToolDir "..")).Path
. (Join-Path $ToolDir "modkit-config.ps1")
$GameRoot = Resolve-Dq2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Dq2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot

& (Join-Path $ToolDir "setup-runtime.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry

if (Test-Path -LiteralPath (Join-Path $GameRoot "www\data.pak")) {
  & $TsxCommand (Join-Path $ToolDir "extract-data-pak.ts")
  if ($LASTEXITCODE -ne 0) { throw "extract-data-pak.ts failed with exit code $LASTEXITCODE" }
} else {
  & $TsxCommand (Join-Path $ToolDir "extract-data.ts") --game-root $GameRoot
  if ($LASTEXITCODE -ne 0) { throw "extract-data.ts failed with exit code $LASTEXITCODE" }
}

& $TsxCommand (Join-Path $ToolDir "extract-usedata.ts")
if ($LASTEXITCODE -ne 0) { throw "extract-usedata.ts failed with exit code $LASTEXITCODE" }

& (Join-Path $ToolDir "extract-saves.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry

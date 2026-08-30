param(
  [string]$GameRoot
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "modkit-config.ps1")
$GameRoot = Resolve-Zs2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Zs2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot

& npx tsx (Join-Path $PSScriptRoot "extract-saves.ts")
if ($LASTEXITCODE -ne 0) {
  throw "extract-saves.ts failed with exit code $LASTEXITCODE"
}

$OutDir = Join-Path $ProjectRoot "output\extract\save"
Get-ChildItem -LiteralPath $OutDir | Select-Object Name, Length

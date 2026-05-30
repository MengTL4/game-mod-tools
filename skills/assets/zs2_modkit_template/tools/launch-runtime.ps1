param(
  [string]$GameRoot
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "modkit-config.ps1")
$GameRoot = Resolve-Zs2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Zs2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot
$BridgeExtension = Join-Path $ProjectRoot "runtime\bridge"
$GameExe = Join-Path $GameRoot "Game.exe"

if (-not (Test-Path -LiteralPath $GameExe)) {
  throw "Game.exe not found: $GameExe"
}
if (-not (Test-Path -LiteralPath (Join-Path $BridgeExtension "manifest.json"))) {
  throw "Bridge extension not found: $BridgeExtension"
}

Start-Process -FilePath $GameExe -WorkingDirectory $GameRoot -ArgumentList "--load-extension=$BridgeExtension"

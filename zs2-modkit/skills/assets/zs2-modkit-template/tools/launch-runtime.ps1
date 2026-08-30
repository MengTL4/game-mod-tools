param(
  [string]$GameRoot
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "modkit-config.ps1")
$GameRoot = Resolve-Zs2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Zs2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot
$BridgeExtension = Join-Path $ProjectRoot "runtime\bridge"
$BridgeSourceDir = Join-Path $ProjectRoot "runtime\bridge\src"
$BridgeOutput = Join-Path $ProjectRoot "runtime\bridge\page-bridge.js"
$GameExe = Join-Path $GameRoot "Game.exe"

function Invoke-BridgeBuildIfNeeded {
  $sourceFiles = @(Get-ChildItem -LiteralPath $BridgeSourceDir -Recurse -File -Filter "*.js" -ErrorAction SilentlyContinue)
  if (-not $sourceFiles.Count) { return }
  $needsBuild = -not (Test-Path -LiteralPath $BridgeOutput)
  if (-not $needsBuild) {
    $bridgeOutputTime = (Get-Item -LiteralPath $BridgeOutput).LastWriteTimeUtc
    $needsBuild = [bool]($sourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $bridgeOutputTime } | Select-Object -First 1)
  }
  if (-not $needsBuild) { return }

  & npx tsx (Join-Path $PSScriptRoot "build-bridge.ts")
  if ($LASTEXITCODE -ne 0) { throw "build-bridge.ts failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path -LiteralPath $GameExe)) {
  throw "Game.exe not found: $GameExe"
}
if (-not (Test-Path -LiteralPath (Join-Path $BridgeExtension "manifest.json"))) {
  throw "Bridge extension not found: $BridgeExtension"
}

Invoke-BridgeBuildIfNeeded

Start-Process -FilePath $GameExe -WorkingDirectory $GameRoot -ArgumentList "--load-extension=$BridgeExtension"

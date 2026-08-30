param(
  [string]$InputDir,
  [string]$OutputDir,
  [int[]]$Ids = @(0, 1, 3),
  [switch]$NoConfig
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $InputDir) {
  $InputDir = Join-Path $ProjectRoot "output\extract\save"
}
if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot "output\repack\save"
}

$ScriptPath = Join-Path $PSScriptRoot "encrypt-saves.ts"
$ArgsList = @(
  "--input", $InputDir,
  "--output", $OutputDir,
  "--ids", ($Ids -join ",")
)

if ($NoConfig) {
  $ArgsList += "--no-config"
}

Push-Location $PSScriptRoot
try {
  & npx tsx $ScriptPath @ArgsList
  if ($LASTEXITCODE -ne 0) {
    throw "encrypt-saves.ts failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Get-ChildItem -LiteralPath $OutputDir | Select-Object Name, Length

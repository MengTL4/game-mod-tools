param(
  [string]$InputDir,
  [string]$OutputDir,
  [int[]]$Ids,
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

$ArgsList = @(
  (Join-Path $PSScriptRoot "encrypt-saves.ts"),
  "--input", $InputDir,
  "--output", $OutputDir
)

if ($Ids -and $Ids.Count -gt 0) {
  $ArgsList += @("--ids", ($Ids -join ","))
}

if ($NoConfig) {
  $ArgsList += "--no-config"
}

& npx tsx @ArgsList

if ($LASTEXITCODE -ne 0) {
  throw "encrypt-saves.ts failed with exit code $LASTEXITCODE"
}

Get-ChildItem -LiteralPath $OutputDir | Select-Object Name, Length

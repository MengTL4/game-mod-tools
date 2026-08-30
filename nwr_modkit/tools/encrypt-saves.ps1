param(
  [string]$InputDir,
  [string]$OutputDir,
  [int[]]$Ids = @(0, 1, 3),
  [switch]$NoConfig
)

$ErrorActionPreference = "Stop"

$TsxCommand = Join-Path $PSScriptRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path -LiteralPath $TsxCommand)) {
  $TsxCommand = (Get-Command tsx -ErrorAction Stop).Source
}

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
  "--output", $OutputDir,
  "--ids", ($Ids -join ",")
)

if ($NoConfig) {
  $ArgsList += "--no-config"
}

& $TsxCommand @ArgsList

if ($LASTEXITCODE -ne 0) {
  throw "encrypt-saves.ts failed with exit code $LASTEXITCODE"
}

Get-ChildItem -LiteralPath $OutputDir | Select-Object Name, Length

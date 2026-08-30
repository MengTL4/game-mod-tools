param(
  [string]$GameRoot,
  [string]$InputDir,
  [string]$OutputDir
)

$ErrorActionPreference = "Stop"

$TsxCommand = Join-Path $PSScriptRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path -LiteralPath $TsxCommand)) {
  $TsxCommand = (Get-Command tsx -ErrorAction Stop).Source
}

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "modkit-config.ps1")

if (-not $OutputDir) {
  $OutputDir = Join-Path $ProjectRoot "output\extract\js-bytecode"
}

$ArgsList = @(
  (Join-Path $PSScriptRoot "extract-js-bytecode.ts"),
  "--output", $OutputDir
)

if ($InputDir) {
  $ArgsList += @("--input", $InputDir)
} else {
  $GameRoot = Resolve-Dq2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
  Set-Dq2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot
  $ArgsList += @("--game-root", $GameRoot)
}

& $TsxCommand @ArgsList
if ($LASTEXITCODE -ne 0) {
  throw "extract-js-bytecode.ts failed with exit code $LASTEXITCODE"
}

Get-ChildItem -LiteralPath $OutputDir -Recurse -File |
  Where-Object { $_.Name -ne "_js-report.json" } |
  Select-Object -First 30 FullName, Length

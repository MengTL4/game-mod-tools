param(
  [int]$Slot = 1,
  [string]$InputPath,
  [string]$OutputPath,
  [string]$Gold,
  [string[]]$Item = @(),
  [string[]]$Weapon = @(),
  [string[]]$Armor = @(),
  [string[]]$Var = @(),
  [string[]]$GameSwitch = @()
)

$ErrorActionPreference = "Stop"

$TsxCommand = Join-Path $PSScriptRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path -LiteralPath $TsxCommand)) {
  $TsxCommand = (Get-Command tsx -ErrorAction Stop).Source
}

$ArgsList = @(
  (Join-Path $PSScriptRoot "patch-save.ts"),
  "--slot", $Slot
)

if ($InputPath) {
  $ArgsList += @("--input", $InputPath)
}
if ($OutputPath) {
  $ArgsList += @("--output", $OutputPath)
}
if ($PSBoundParameters.ContainsKey("Gold")) {
  $ArgsList += @("--gold", $Gold)
}
foreach ($Value in $Item) {
  $ArgsList += @("--item", $Value)
}
foreach ($Value in $Weapon) {
  $ArgsList += @("--weapon", $Value)
}
foreach ($Value in $Armor) {
  $ArgsList += @("--armor", $Value)
}
foreach ($Value in $Var) {
  $ArgsList += @("--var", $Value)
}
foreach ($Value in $GameSwitch) {
  $ArgsList += @("--switch", $Value)
}

& $TsxCommand @ArgsList

if ($LASTEXITCODE -ne 0) {
  throw "patch-save.ts failed with exit code $LASTEXITCODE"
}

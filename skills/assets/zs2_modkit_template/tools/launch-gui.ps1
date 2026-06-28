param(
  [string]$GameRoot,
  [string]$NpmRegistry
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "modkit-config.ps1")
$GameRoot = Resolve-Zs2GameRoot -ProjectRoot $ProjectRoot -GameRoot $GameRoot
Set-Zs2RuntimeEnvironment -ProjectRoot $ProjectRoot -GameRoot $GameRoot
$Gui = Join-Path $ProjectRoot "app\gui"
$GameExe = Join-Path $Gui "Game.exe"
$AppTs = Join-Path $Gui "app.ts"
$AppJs = Join-Path $Gui "app.js"
$GuiSrc = Join-Path $Gui "src"
$BridgeSourceDir = Join-Path $ProjectRoot "runtime\bridge\src"
$BridgeOutput = Join-Path $ProjectRoot "runtime\bridge\page-bridge.js"
$ExtractDataDir = Join-Path $ProjectRoot "output\extract\data"
$ExtractUseDataDir = Join-Path $ProjectRoot "output\extract\useData"
$DataPak = Join-Path $GameRoot "www\data.pak"
$UseDataDir = Join-Path $GameRoot "www\useData"

function Test-ExtractedJsonPlain {
  param([string]$Path)
  try {
    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return $false }
    $json = $raw | ConvertFrom-Json
    if ($null -eq $json) { return $false }
    $propertyNames = @($json.PSObject.Properties.Name)
    if (($propertyNames -contains "iv") -and ($propertyNames -contains "encryptedData")) {
      return $false
    }
    return $true
  } catch {
    return $false
  }
}

function Test-GuiDataExtractReady {
  if (-not (Test-Path -LiteralPath $ExtractDataDir)) { return $false }
  $requiredFiles = @(
    "_index.json",
    "System.json",
    "Items.json",
    "Weapons.json",
    "Armors.json",
    "Actors.json",
    "Skills.json",
    "MapInfos.json",
    "Troops.json",
    "Enemies.json",
    "CommonEvents.json"
  )
  foreach ($fileName in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $ExtractDataDir $fileName))) {
      return $false
    }
  }
  foreach ($fileName in @("Items.json", "Actors.json", "Skills.json", "Troops.json", "Enemies.json", "MapInfos.json")) {
    if (-not (Test-ExtractedJsonPlain -Path (Join-Path $ExtractDataDir $fileName))) {
      return $false
    }
  }
  $indexPath = Join-Path $ExtractDataDir "_index.json"
  if ((Test-Path -LiteralPath $DataPak) -and (Test-Path -LiteralPath $indexPath)) {
    if ((Get-Item -LiteralPath $DataPak).LastWriteTimeUtc -gt (Get-Item -LiteralPath $indexPath).LastWriteTimeUtc) {
      return $false
    }
  }
  return $true
}

function Invoke-DataExtractIfNeeded {
  if (Test-GuiDataExtractReady) { return }
  Write-Host "Extracted data not found or stale. Extracting www/data.pak for GUI lists..."
  & node (Join-Path $PSScriptRoot "extract-data-pak.mjs")
  if ($LASTEXITCODE -ne 0) { throw "extract-data-pak.mjs failed with exit code $LASTEXITCODE" }
}

function Test-GuiUseDataExtractReady {
  if (-not (Test-Path -LiteralPath $UseDataDir)) { return $false }
  if (-not (Test-Path -LiteralPath $ExtractUseDataDir)) { return $false }

  $indexPath = Join-Path $ExtractUseDataDir "_index.json"
  if (-not (Test-Path -LiteralPath $indexPath)) { return $false }

  $jsonFiles = @(Get-ChildItem -LiteralPath $ExtractUseDataDir -Filter "*.json" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "_index.json" })
  if ($jsonFiles.Count -eq 0) { return $false }

  $latestSource = Get-ChildItem -LiteralPath $UseDataDir -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if ($latestSource -and $latestSource.LastWriteTimeUtc -gt (Get-Item -LiteralPath $indexPath).LastWriteTimeUtc) {
    return $false
  }

  return $true
}

function Invoke-UseDataExtractIfNeeded {
  if (Test-GuiUseDataExtractReady) { return }
  Write-Host "Extracted useData not found or stale. Extracting www/useData for GUI title lists..."
  & node (Join-Path $PSScriptRoot "extract-usedata.mjs")
  if ($LASTEXITCODE -ne 0) { throw "extract-usedata.mjs failed with exit code $LASTEXITCODE" }
}

function Get-GuiSourceFiles {
  $files = @()
  if (Test-Path -LiteralPath $AppTs) {
    $files += Get-Item -LiteralPath $AppTs
  }
  if (Test-Path -LiteralPath $GuiSrc) {
    $files += Get-ChildItem -LiteralPath $GuiSrc -Recurse -File -Filter "*.ts"
  }
  return $files
}

function Invoke-GuiBuildIfNeeded {
  $sourceFiles = @(Get-GuiSourceFiles)
  if (-not $sourceFiles.Count) { return }
  $needsBuild = -not (Test-Path -LiteralPath $AppJs)
  if (-not $needsBuild) {
    $appJsTime = (Get-Item -LiteralPath $AppJs).LastWriteTimeUtc
    $needsBuild = [bool]($sourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $appJsTime } | Select-Object -First 1)
  }
  if (-not $needsBuild) { return }

  $Registry = $NpmRegistry
  if (-not $Registry) { $Registry = $env:ZS2_NPM_REGISTRY }
  if (-not $Registry) { $Registry = "https://registry.npmmirror.com" }
  $npmCommand = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npmCommand) {
    $npmCommand = (Get-Command npm -ErrorAction Stop).Source
  }

  if (-not (Test-Path -LiteralPath (Join-Path $Gui "node_modules"))) {
    Push-Location $Gui
    try {
      & $npmCommand install --registry $Registry
      if ($LASTEXITCODE -ne 0) { throw "GUI npm install failed with exit code $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
  }

  Push-Location $Gui
  try {
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) { throw "GUI TypeScript build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

function Invoke-BridgeBuildIfNeeded {
  $sourceFiles = @(Get-ChildItem -LiteralPath $BridgeSourceDir -Recurse -File -Filter "*.js" -ErrorAction SilentlyContinue)
  if (-not $sourceFiles.Count) { return }
  $needsBuild = -not (Test-Path -LiteralPath $BridgeOutput)
  if (-not $needsBuild) {
    $bridgeOutputTime = (Get-Item -LiteralPath $BridgeOutput).LastWriteTimeUtc
    $needsBuild = [bool]($sourceFiles | Where-Object { $_.LastWriteTimeUtc -gt $bridgeOutputTime } | Select-Object -First 1)
  }
  if (-not $needsBuild) { return }

  & node (Join-Path $PSScriptRoot "build-bridge.mjs")
  if ($LASTEXITCODE -ne 0) { throw "build-bridge.mjs failed with exit code $LASTEXITCODE" }
}

Invoke-DataExtractIfNeeded
Invoke-UseDataExtractIfNeeded
Invoke-BridgeBuildIfNeeded
Invoke-GuiBuildIfNeeded

if (-not (Test-Path -LiteralPath $GameExe)) {
  & (Join-Path $PSScriptRoot "setup-runtime.ps1") -GameRoot $GameRoot -NpmRegistry $NpmRegistry
}

if (-not (Test-Path -LiteralPath $GameExe)) {
  throw "Trainer GUI runtime not found after setup: $GameExe"
}

Start-Process -FilePath $GameExe -WorkingDirectory $Gui

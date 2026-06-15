# Build oncesi kod kontrolleri - EAS kredisi yakmadan once calisir.
param(
  [switch]$SkipExport,
  [switch]$SkipLint,
  [switch]$SkipVoice
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "=== GastroSkor code preflight ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Expo Router config..." -ForegroundColor Yellow
node "$PSScriptRoot\verify-router-config.mjs"
if ($LASTEXITCODE -ne 0) {
  throw "Router config verify failed."
}
Write-Host "  OK" -ForegroundColor Green

if (-not $SkipVoice) {
  Write-Host "[2/4] Voice STT fixes..." -ForegroundColor Yellow
  node "$PSScriptRoot\verify-voice-stt-fixes.mjs"
  if ($LASTEXITCODE -ne 0) {
    throw "Voice STT verify failed."
  }
  Write-Host "  OK" -ForegroundColor Green
} else {
  Write-Host "[2/4] Voice STT - skipped" -ForegroundColor DarkGray
}

if (-not $SkipLint) {
  Write-Host "[3/4] ESLint (errors only)..." -ForegroundColor Yellow
  npx expo lint -- --quiet --max-warnings 999
  if ($LASTEXITCODE -ne 0) {
    throw "Lint failed - build iptal."
  }
  Write-Host "  OK" -ForegroundColor Green
} else {
  Write-Host "[3/4] ESLint - skipped" -ForegroundColor DarkGray
}

if (-not $SkipExport) {
  Write-Host "[4/4] JS bundle export (android smoke)..." -ForegroundColor Yellow
  $exportDir = ".expo/build-preflight"
  if (Test-Path $exportDir) {
    Remove-Item -Recurse -Force $exportDir
  }
  npx expo export --platform android --output-dir $exportDir
  if ($LASTEXITCODE -ne 0) {
    throw "expo export failed - bundle hatasi var."
  }
  Remove-Item -Recurse -Force $exportDir
  Write-Host "  OK" -ForegroundColor Green
} else {
  Write-Host "[4/4] Bundle export - skipped (hizli mod)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Code preflight passed." -ForegroundColor Green
Write-Host "Metro ile tabs smoke testi hala onerilir (runtime hatalar icin)." -ForegroundColor DarkGray
Write-Host ""

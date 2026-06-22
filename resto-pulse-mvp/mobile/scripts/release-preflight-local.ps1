# EAS olmadan surum kontrolu - release-versions.json + app.config.js
param(
  [switch]$Apply,
  [switch]$AndroidOnly,
  [switch]$IosOnly
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$configPath = "app.config.js"
$storePath = "release-versions.json"
$configText = Get-Content $configPath -Raw
$store = Get-Content $storePath -Raw | ConvertFrom-Json

function Read-ConfigValue([string]$pattern) {
  if ($configText -match $pattern) { return $Matches[1] }
  return $null
}

$localVersion = Read-ConfigValue 'version:\s*''([^'']+)'''
$localIosBuild = [int](Read-ConfigValue 'buildNumber:\s*''(\d+)''')
$localAndroidCode = [int](Read-ConfigValue 'versionCode:\s*(\d+)')

Write-Host ""
Write-Host "=== Lokal release preflight ===" -ForegroundColor Cyan
Write-Host ("Magaza kaydi: Play {0}/{1} | iOS {2}/{3}" -f $store.play.versionName, $store.play.versionCode, $store.appStore.version, $store.appStore.buildNumber)
Write-Host ("Local config:  v{0} | Android code {1} | iOS build {2}" -f $localVersion, $localAndroidCode, $localIosBuild)

$needAndroid = $localAndroidCode -le [int]$store.play.versionCode
$needIos = $localIosBuild -le [int]$store.appStore.buildNumber

if ($needAndroid -and (-not $IosOnly)) {
  Write-Host "UYARI: versionCode magazadan buyuk olmali." -ForegroundColor Yellow
}
if ($needIos -and (-not $AndroidOnly)) {
  Write-Host "UYARI: iOS buildNumber magazadan buyuk olmali." -ForegroundColor Yellow
}

if ($Apply) {
  $changed = $false
  if ($needAndroid -and (-not $IosOnly)) {
    $next = [int]$store.play.versionCode + 1
    $configText = $configText -replace 'versionCode:\s*\d+', "versionCode: $next"
    Write-Host "Android versionCode -> $next" -ForegroundColor Green
    $changed = $true
  }
  if ($needIos -and (-not $AndroidOnly)) {
    $next = [int]$store.appStore.buildNumber + 1
    $configText = $configText -replace "buildNumber:\s*'\d+'", "buildNumber: '$next'"
    Write-Host "iOS buildNumber -> $next" -ForegroundColor Green
    $changed = $true
  }
  if ($changed) {
    Set-Content $configPath $configText -NoNewline
  }
}

if (($needAndroid -and -not $IosOnly) -or ($needIos -and -not $AndroidOnly)) {
  if (-not $Apply) {
    Write-Host "Bump icin: ... release-preflight-local.ps1 -Apply" -ForegroundColor Yellow
    exit 1
  }
}

Write-Host ""
Write-Host "expo install --check (SDK uyumu)..." -ForegroundColor Yellow
npx expo install --check 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host "HATA: Expo paket surumleri SDK ile uyumsuz. Once: npx expo install --fix" -ForegroundColor Red
  exit 1
}

exit 0

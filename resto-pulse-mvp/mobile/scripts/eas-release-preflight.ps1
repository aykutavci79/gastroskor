# Build oncesi surum teyidi: magaza + app.config.js + son EAS build'ler.
param(
  [switch]$Apply,
  [switch]$AndroidOnly,
  [switch]$IosOnly
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

$configPath = "app.config.js"
$storePath = "release-versions.json"

if (-not (Test-Path $configPath)) { throw "app.config.js not found" }
if (-not (Test-Path $storePath)) { throw "release-versions.json not found" }

$configText = Get-Content $configPath -Raw
$store = Get-Content $storePath -Raw | ConvertFrom-Json

function Read-ConfigValue([string]$pattern) {
  if ($configText -match $pattern) { return $Matches[1] }
  return $null
}

$localVersion = Read-ConfigValue 'version:\s*''([^'']+)'''
$localIosBuild = Read-ConfigValue 'buildNumber:\s*''(\d+)'''
$localAndroidCode = [int](Read-ConfigValue 'versionCode:\s*(\d+)')

Write-Host ""
Write-Host "=== GastroSkor release preflight ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Store (release-versions.json):" -ForegroundColor Yellow
Write-Host ("  Play  {0} / versionCode {1}  [{2}]" -f $store.play.versionName, $store.play.versionCode, $store.play.track)
Write-Host ("  iOS   {0} / build {1}" -f $store.appStore.version, $store.appStore.buildNumber)
Write-Host ""

Write-Host "Local (app.config.js):" -ForegroundColor Yellow
Write-Host ("  version {0} | iOS build {1} | Android versionCode {2}" -f $localVersion, $localIosBuild, $localAndroidCode)
Write-Host ""

Write-Host "Latest EAS production builds:" -ForegroundColor Yellow
$easBuilds = @()
try {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $easJson = (& eas build:list --limit 8 --json --non-interactive 2>$null | Out-String).Trim()
  $ErrorActionPreference = $prevEap
  if ($easJson) {
    $easBuilds = $easJson | ConvertFrom-Json
  }
} catch {
  Write-Host "  (EAS list skipped)" -ForegroundColor DarkGray
}
if ($easBuilds.Count -gt 0) {
  foreach ($platform in @("ANDROID", "IOS")) {
    $last = $easBuilds | Where-Object { $_.platform -eq $platform -and $_.buildProfile -eq "production" } | Select-Object -First 1
    if ($last) {
      if ($platform -eq "ANDROID") {
        Write-Host ("  Android  {0} / versionCode {1}  ({2})" -f $last.appVersion, $last.appBuildVersion, $last.status)
      } else {
        Write-Host ("  iOS      {0} / build {1}  ({2})" -f $last.appVersion, $last.appBuildVersion, $last.status)
      }
    }
  }
} else {
  Write-Host "  (no EAS data)" -ForegroundColor DarkGray
}
Write-Host ""

$playCode = [int]$store.play.versionCode
$iosBuildStore = [int]$store.appStore.buildNumber
$easAndroidCode = 0
$easIosBuild = 0
$lastAndroid = $easBuilds | Where-Object { $_.platform -eq "ANDROID" -and $_.buildProfile -eq "production" } | Select-Object -First 1
$lastIos = $easBuilds | Where-Object { $_.platform -eq "IOS" -and $_.buildProfile -eq "production" } | Select-Object -First 1
if ($lastAndroid) { $easAndroidCode = [int]$lastAndroid.appBuildVersion }
if ($lastIos) { $easIosBuild = [int]$lastIos.appBuildVersion }

$minAndroidCode = [Math]::Max($playCode, $easAndroidCode) + 1
$minIosBuild = [Math]::Max($iosBuildStore, $easIosBuild) + 1

$storeParts = $store.play.versionName.Split(".")
$nextPatch = [int]$storeParts[2] + 1
$suggestedVersion = "{0}.{1}.{2}" -f $storeParts[0], $storeParts[1], $nextPatch
if ([version]$localVersion -ge [version]$suggestedVersion) {
  $parts = $localVersion.Split(".")
  $suggestedVersion = "{0}.{1}.{2}" -f $parts[0], $parts[1], ([int]$parts[2] + 1)
}

$androidOk = $localAndroidCode -ge $minAndroidCode
$iosOk = [int]$localIosBuild -ge $minIosBuild

Write-Host "Suggested minimum (above store + EAS):" -ForegroundColor Green
Write-Host ("  version       {0}" -f $suggestedVersion)
Write-Host ("  versionCode   {0}" -f $minAndroidCode)
Write-Host ("  iOS build     {0}" -f $minIosBuild)
Write-Host ""

$issues = @()
if (-not $AndroidOnly -and -not $IosOnly) {
  if (-not $androidOk) { $issues += "Android versionCode $localAndroidCode is below $minAndroidCode" }
  if (-not $iosOk) { $issues += "iOS build $localIosBuild is below $minIosBuild" }
} elseif ($AndroidOnly) {
  if (-not $androidOk) { $issues += "Android versionCode $localAndroidCode is below $minAndroidCode" }
} elseif ($IosOnly) {
  if (-not $iosOk) { $issues += "iOS build $localIosBuild is below $minIosBuild" }
}

if ($issues.Count -eq 0) {
  Write-Host "OK - local versions are ready to build." -ForegroundColor Green
} else {
  Write-Host "WARNING:" -ForegroundColor Red
  $issues | ForEach-Object { Write-Host "  - $_" }
  if ($Apply) {
    $newVersion = $suggestedVersion
    $newAndroid = $minAndroidCode
    $newIos = $minIosBuild
    $configText = $configText -replace "version:\s*'[^']+'", "version: '$newVersion'"
    $configText = $configText -replace "buildNumber:\s*'\d+'", "buildNumber: '$newIos'"
    $configText = $configText -replace "versionCode:\s*\d+", "versionCode: $newAndroid"
    Set-Content -Path $configPath -Value $configText -NoNewline
    Write-Host ""
    Write-Host "Updated app.config.js:" -ForegroundColor Green
    Write-Host ("  {0} | iOS {1} | Android {2}" -f $newVersion, $newIos, $newAndroid)
  } else {
    Write-Host ""
    Write-Host "Fix with: npm run release:check:apply" -ForegroundColor Yellow
    exit 1
  }
}

Write-Host ""
& "$PSScriptRoot\run-code-preflight.ps1"

Write-Host "Confirm release-versions.json matches Play/App Store before building." -ForegroundColor Cyan
Write-Host ""

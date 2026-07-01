# prebuild sonrasi Android native locale paketlerini TR ile sinirla (hizli tester build).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$gradlePath = Join-Path (Join-Path "android" "app") "build.gradle"
if (-not (Test-Path $gradlePath)) {
  throw "android/app/build.gradle yok - once: npx expo prebuild --platform android"
}

$gradleText = Get-Content $gradlePath -Raw
if ($gradleText -match 'resConfigs\s+"tr"') {
  Write-Host "resConfigs tr zaten uygulanmis." -ForegroundColor DarkGray
  exit 0
}

if ($gradleText -notmatch 'defaultConfig\s*\{') {
  throw "defaultConfig blogu bulunamadi: $gradlePath"
}

$gradleText = $gradleText -replace '(defaultConfig\s*\{)', "`$1`n        resConfigs `"tr`""
Set-Content -Path $gradlePath -Value $gradleText -NoNewline
Write-Host "resConfigs tr uygulandi (native locale strip)." -ForegroundColor Green

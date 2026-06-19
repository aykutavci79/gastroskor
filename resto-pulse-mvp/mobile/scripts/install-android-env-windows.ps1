# ANDROID_HOME + JAVA_HOME + Path (bir kez calistir, PowerShell kapat-ac)
$ErrorActionPreference = "Stop"

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$javaHome = "C:\Program Files\Android\Android Studio\jbr"

if (-not (Test-Path $sdk)) {
  throw "SDK bulunamadi: $sdk"
}
if (-not (Test-Path "$javaHome\bin\java.exe")) {
  throw "Java bulunamadi: $javaHome"
}

[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdk, "User")
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")

$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$prepend = @(
  "$javaHome\bin",
  "$sdk\platform-tools",
  "$sdk\cmdline-tools\latest\bin",
  "$sdk\emulator"
)

foreach ($entry in $prepend) {
  if (-not (Test-Path $entry)) { continue }
  if ($userPath -notlike "*$entry*") {
    $userPath = "$entry;$userPath"
  }
}

[System.Environment]::SetEnvironmentVariable("Path", $userPath, "User")

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$sdk\platform-tools;$env:Path"

Write-Host ""
Write-Host "Tamam - ortam degiskenleri kaydedildi:" -ForegroundColor Green
Write-Host "  ANDROID_HOME = $sdk"
Write-Host "  JAVA_HOME    = $javaHome"
Write-Host ""
Write-Host "Test:" -ForegroundColor Yellow
Write-Host "  java -version"
Write-Host "  adb version"
Write-Host "  npm run setup:android"
Write-Host ""
Write-Host "Kalici olsun diye PowerShell penceresini kapatip yeniden ac." -ForegroundColor Yellow
Write-Host ""

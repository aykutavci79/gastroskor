# Windows: Android Studio / JDK / SDK kurulum kontrolu
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "=== GastroSkor Android build ortami (Windows) ===" -ForegroundColor Cyan
Write-Host ""

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
  $androidHome = $env:ANDROID_SDK_ROOT
}
if (-not $androidHome) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $defaultSdk) {
    $androidHome = $defaultSdk
  }
}

$javaHome = $env:JAVA_HOME
if (-not $javaHome) {
  $studioJbr = "C:\Program Files\Android\Android Studio\jbr"
  if (Test-Path "$studioJbr\bin\java.exe") {
    $javaHome = $studioJbr
  }
}

function Test-CmdInPath {
  param([string]$Name)
  $ok = $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
  if ($ok) {
    Write-Host "  OK   $Name" -ForegroundColor Green
  } else {
    Write-Host "  EKSIK $Name" -ForegroundColor Red
  }
  return $ok
}

$nodeOk = Test-CmdInPath "node"
$npmOk = Test-CmdInPath "npm"

if ($javaHome -and (Test-Path "$javaHome\bin\java.exe")) {
  $env:JAVA_HOME = $javaHome
  if ($env:Path -notlike "*$javaHome\bin*") {
    $env:Path = "$javaHome\bin;$env:Path"
  }
}
$javaOk = Test-CmdInPath "java"

if ($androidHome -and (Test-Path $androidHome)) {
  $env:ANDROID_HOME = $androidHome
  $pt = Join-Path $androidHome "platform-tools"
  if ((Test-Path $pt) -and ($env:Path -notlike "*$pt*")) {
    $env:Path = "$pt;$env:Path"
  }
}
$adbOk = Test-CmdInPath "adb"

if ($androidHome -and (Test-Path $androidHome)) {
  Write-Host "  OK   ANDROID_HOME = $androidHome" -ForegroundColor Green
} else {
  Write-Host "  EKSIK ANDROID_HOME - npm run setup:android:env calistir" -ForegroundColor Red
  $androidHome = $null
}

Write-Host ""
Write-Host "Kurulum adimlari:" -ForegroundColor Yellow
Write-Host "  1. Android Studio -> More Actions -> SDK Manager"
Write-Host "  2. SDK Platform 34/35 + Build-Tools + Platform-Tools"
Write-Host "  3. ANDROID_HOME = C:\Users\iphone\AppData\Local\Android\Sdk"
Write-Host "  4. Path += platform-tools"
Write-Host ""

if (Test-Path ".env") {
  Write-Host "  OK   .env mevcut" -ForegroundColor Green
} else {
  Write-Host "  EKSIK .env - copy .env.example .env" -ForegroundColor Red
}

if (Test-Path "android-keystore.properties") {
  Write-Host "  OK   android-keystore.properties" -ForegroundColor Green
} else {
  Write-Host "  EKSIK android-keystore.properties (Play imza)" -ForegroundColor Yellow
  Write-Host "       copy android-keystore.properties.example android-keystore.properties"
}

Write-Host ""
Write-Host "Build: npm run build:android:local" -ForegroundColor Yellow
Write-Host ""

if ($nodeOk -and $npmOk -and $javaOk -and $adbOk -and $androidHome) {
  Write-Host "Ortam hazir." -ForegroundColor Green
} else {
  Write-Host "Once eksikleri tamamla." -ForegroundColor Yellow
}

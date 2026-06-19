# EAS cloud olmadan Android AAB/APK (Windows + Gradle).
param(
  [switch]$Apk,
  [switch]$SkipPrebuild,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function Assert-ShortProjectPath {
  $root = (Get-Location).Path
  $recommended = "C:\dev\gs"
  $reasons = @()
  if ($root -match 'OneDrive') { $reasons += "OneDrive senkron klasoru" }
  if ($root -match 'nextjs_space\\resto-pulse-mvp\\mobile') { $reasons += "uzun repo yolu" }
  if ($root.Length -gt 48) { $reasons += "proje yolu $($root.Length) karakter" }
  if ($reasons.Count -eq 0) { return }

  Write-Host ""
  Write-Host "=== Android build durduruldu: Windows yol limiti ===" -ForegroundColor Red
  Write-Host "Native moduller (keyboard-controller, screens) CMake yolunu 260+ karakter yapar." -ForegroundColor Yellow
  Write-Host "Mevcut: $root" -ForegroundColor DarkGray
  Write-Host "Neden:  $($reasons -join ', ')" -ForegroundColor DarkGray
  Write-Host ""
  if ((Test-Path $recommended) -and ($root -ne $recommended)) {
    Write-Host "Cozum (onayli - buradan build basarili):" -ForegroundColor Green
    Write-Host "  cd $recommended"
    Write-Host "  npm run build:android:local"
  } else {
    Write-Host "Cozum - projeyi kisa yola tasiyin:" -ForegroundColor Green
    Write-Host "  npm run migrate:short-path"
    Write-Host "  cd $recommended"
    Write-Host "  npm install"
    Write-Host "  npm run build:android:local"
  }
  Write-Host ""
  throw "OneDrive/uzun yoldan lokal Android build desteklenmiyor. C:\dev\gs kullanin."
}

Assert-ShortProjectPath

function Set-AndroidBuildEnv {
  $sdk = if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $env:ANDROID_HOME
  } else {
    Join-Path $env:LOCALAPPDATA "Android\Sdk"
  }
  $javaHome = if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $env:JAVA_HOME
  } else {
    "C:\Program Files\Android\Android Studio\jbr"
  }
  if (-not (Test-Path "$javaHome\bin\java.exe")) {
    throw "Java bulunamadi. Once: npm run setup:android:env"
  }
  if (-not (Test-Path $sdk)) {
    throw "Android SDK bulunamadi. Once: npm run setup:android:env"
  }
  $env:JAVA_HOME = $javaHome
  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk
  if ($env:Path -notlike "*$javaHome\bin*") {
    $env:Path = "$javaHome\bin;$env:Path"
  }
  $pt = Join-Path $sdk "platform-tools"
  if ((Test-Path $pt) -and ($env:Path -notlike "*$pt*")) {
    $env:Path = "$pt;$env:Path"
  }
}

Set-AndroidBuildEnv

# Kurumsal/antivirus SSL kesmesi: ozel trust store olustur (MITM cert dahil).
$script:TrustStore = $null
$tsRaw = & "$PSScriptRoot\setup-java-truststore.ps1"
$script:TrustStore = ($tsRaw | Select-Object -Last 1)
if ($script:TrustStore -and (Test-Path $script:TrustStore)) {
  $tsArg = "-Djavax.net.ssl.trustStore=$script:TrustStore -Djavax.net.ssl.trustStorePassword=changeit"
  if ($env:GRADLE_OPTS -notlike "*trustStore=*") {
    $env:GRADLE_OPTS = ("$tsArg " + $env:GRADLE_OPTS).Trim()
  }
  Write-Host "Java trust store: $script:TrustStore" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== GastroSkor lokal Android build (ucretsiz) ===" -ForegroundColor Cyan

if (-not $SkipPreflight) {
  & "$PSScriptRoot\release-preflight-local.ps1" -AndroidOnly -Apply
  if ($LASTEXITCODE -eq 1) {
    throw "Release preflight basarisiz."
  }
}

if (-not (Test-Path ".env")) {
  throw ".env yok. copy .env.example .env ve canli API + Google client ID doldur."
}

$requiredEnv = @("EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID")
foreach ($key in $requiredEnv) {
  $hit = Select-String -Path ".env" -Pattern "^$key=.+$" -Quiet
  if (-not $hit) {
    throw ".env icinde $key bos - release build icin zorunlu."
  }
}

if (-not (Test-Path "android-keystore.properties")) {
  throw @"
android-keystore.properties yok.
  copy android-keystore.properties.example android-keystore.properties
  keytool -genkeypair -v -storetype PKCS12 -keystore gastroskor-upload.jks -alias gastroskor -keyalg RSA -keysize 2048 -validity 10000
SHA-1 degerini Google Cloud Android OAuth client a ekle.
"@
}

if (-not $SkipPrebuild) {
  Write-Host "prebuild (android)..." -ForegroundColor Yellow
  $env:CI = "1"
  npx expo prebuild --platform android --clean
  if ($LASTEXITCODE -ne 0) {
    throw "expo prebuild basarisiz (exit $LASTEXITCODE)."
  }
} elseif (Test-Path "android") {
  Write-Host "Android config sync (versionCode vb.)..." -ForegroundColor Yellow
  $env:CI = "1"
  npx expo prebuild --platform android
  if ($LASTEXITCODE -ne 0) {
    throw "expo prebuild sync basarisiz (exit $LASTEXITCODE)."
  }
}

& "$PSScriptRoot\apply-android-release-signing.ps1"

# Build JVM'i de ozel trust store kullansin (dependency indirmeleri).
$gradleProps = Join-Path "android" "gradle.properties"
if (Test-Path $gradleProps) {
  # Eski bozuk Windows-ROOT satirlarini temizle.
  $clean = (Get-Content $gradleProps) | Where-Object { $_ -notmatch "Windows-ROOT" }
  Set-Content -Path $gradleProps -Value $clean
}
if ($script:TrustStore -and (Test-Path $script:TrustStore)) {
  $tsForward = ($script:TrustStore -replace '\\', '/')
  $gpContent = if (Test-Path $gradleProps) { Get-Content $gradleProps -Raw } else { "" }
  if ($gpContent -notmatch "trustStore=") {
    Add-Content -Path $gradleProps -Value "systemProp.javax.net.ssl.trustStore=$tsForward"
    Add-Content -Path $gradleProps -Value "systemProp.javax.net.ssl.trustStorePassword=changeit"
  }
}
foreach ($flag in @("android.enableLongPaths=true")) {
  $gpContent = if (Test-Path $gradleProps) { Get-Content $gradleProps -Raw } else { "" }
  $key = ($flag -split '=', 2)[0]
  if ($gpContent -notmatch "(?m)^$([regex]::Escape($key))=") {
    Add-Content -Path $gradleProps -Value $flag
  }
}

$gradlew = Join-Path "android" "gradlew.bat"
if (-not (Test-Path $gradlew)) { throw "gradlew.bat bulunamadi" }

# Gradle SDK yolu (ANDROID_HOME tek basina yetmeyebilir).
$localProps = Join-Path "android" "local.properties"
$sdkDir = $env:ANDROID_HOME -replace '\\', '/'
$sdkDirEsc = $sdkDir -replace '/', '\\'
"sdk.dir=$sdkDirEsc" | Set-Content -Path $localProps -Encoding ASCII

# OneDrive + CMake: bozuk native cache temizle (worklets ninja dirty hatasi).
$cxxRoots = @(
  "node_modules\react-native-worklets\android\.cxx",
  "node_modules\react-native-reanimated\android\.cxx",
  "node_modules\react-native-keyboard-controller\android\.cxx",
  "node_modules\react-native-screens\android\.cxx",
  "android\app\.cxx"
)
foreach ($cxx in $cxxRoots) {
  if (Test-Path $cxx) {
    Write-Host "Native cache temizleniyor: $cxx" -ForegroundColor DarkGray
    Remove-Item $cxx -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# Lokal build: Sentry source map upload kapali (EAS production ile ayni).
$env:SENTRY_DISABLE_AUTO_UPLOAD = "true"
$env:SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD = "true"

# Play icin arm64-v8a yeterli; armeabi-v7a OneDrive'ta CMake dongusune giriyor.
$archFlag = "-PreactNativeArchitectures=arm64-v8a"

Push-Location android
try {
  if ($Apk) {
    Write-Host "Gradle assembleRelease..." -ForegroundColor Yellow
    & .\gradlew.bat assembleRelease --no-daemon $archFlag
    if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease basarisiz." }
    $relOut = "app\build\outputs\apk\release\app-release.apk"
  } else {
    Write-Host "Gradle bundleRelease (Play AAB)..." -ForegroundColor Yellow
    & .\gradlew.bat bundleRelease --no-daemon $archFlag
    if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease basarisiz." }
    $relOut = "app\build\outputs\bundle\release\app-release.aab"
  }
  if (-not (Test-Path $relOut)) {
    throw "Build cikti dosyasi yok: $relOut"
  }
  $out = Resolve-Path $relOut
} finally {
  Pop-Location
}

$dist = Join-Path (Join-Path $PSScriptRoot "..") "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$ext = if ($Apk) { "apk" } else { "aab" }
$dest = Join-Path $dist "gastroskor-$stamp.$ext"
Copy-Item $out $dest -Force

Write-Host ""
Write-Host "Bitti:" -ForegroundColor Green
Write-Host "  $dest"
Write-Host ""
Write-Host "Play Console (ucretsiz yukleme):" -ForegroundColor Yellow
Write-Host "  https://play.google.com/console -> Surum -> Kapali test -> AAB yukle"
Write-Host ""

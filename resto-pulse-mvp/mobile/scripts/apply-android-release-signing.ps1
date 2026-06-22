# prebuild sonrasi release imzasini android/app/build.gradle'a uygular (idempotent).
param(
  [string]$PropsPath = "android-keystore.properties"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$gradlePath = Join-Path (Join-Path "android" "app") "build.gradle"
if (-not (Test-Path $gradlePath)) {
  throw "android/app/build.gradle yok - once: npx expo prebuild --platform android"
}
if (-not (Test-Path $PropsPath)) {
  throw "Keystore ayari yok: $PropsPath"
}

$props = @{}
Get-Content $PropsPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line -match "^([^=]+)=(.*)$") {
    $props[$Matches[1].Trim()] = $Matches[2].Trim()
  }
}

foreach ($key in @("storeFile", "storePassword", "keyAlias", "keyPassword")) {
  if (-not $props[$key]) { throw "android-keystore.properties icinde $key eksik" }
}

# app/build.gradle icinden: android/app -> ../../ = mobile/
$storeFileRaw = $props.storeFile -replace '\\', '/'
if ($storeFileRaw -match '^\.\./\.\./') {
  $storeFile = $storeFileRaw
} elseif ($storeFileRaw -match '^\.\./') {
  $storeFile = "../$storeFileRaw"
} else {
  $storeFile = "../../$storeFileRaw"
}

$gradlePropsPath = Join-Path "android" "gradle.properties"
$entries = @(
  "GASTROSKOR_STORE_FILE=$storeFile",
  "GASTROSKOR_STORE_PASSWORD=$($props.storePassword)",
  "GASTROSKOR_KEY_ALIAS=$($props.keyAlias)",
  "GASTROSKOR_KEY_PASSWORD=$($props.keyPassword)"
)
foreach ($entry in $entries) {
  $key = ($entry -split '=', 2)[0]
  $content = if (Test-Path $gradlePropsPath) { Get-Content $gradlePropsPath -Raw } else { "" }
  if ($content -match "(?m)^$([regex]::Escape($key))=.*$") {
    $lines = Get-Content $gradlePropsPath
    $lines = $lines | ForEach-Object {
      if ($_ -match "^$([regex]::Escape($key))=") { $entry } else { $_ }
    }
    Set-Content -Path $gradlePropsPath -Value $lines
  } else {
    Add-Content -Path $gradlePropsPath -Value $entry
  }
}

$gradleText = Get-Content $gradlePath -Raw

$signingBlock = @'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('GASTROSKOR_STORE_FILE')) {
                storeFile file(GASTROSKOR_STORE_FILE)
                storePassword GASTROSKOR_STORE_PASSWORD
                keyAlias GASTROSKOR_KEY_ALIAS
                keyPassword GASTROSKOR_KEY_PASSWORD
            }
        }
    }
'@

if ($gradleText -match 'GASTROSKOR_STORE_FILE') {
  # Bozuk tekrarli bloklari temizle, tek release blogu birak
  $gradleText = [regex]::Replace(
    $gradleText,
    '(?ms)\s*signingConfigs\s*\{.*?\n\s*\}\s*\n(?=\s*buildTypes)',
    "`n$signingBlock`n"
  )
} elseif ($gradleText -match '(?ms)\s*signingConfigs\s*\{') {
  $gradleText = [regex]::Replace(
    $gradleText,
    '(?ms)\s*signingConfigs\s*\{.*?\n\s*\}\s*\n(?=\s*buildTypes)',
    "`n$signingBlock`n"
  )
} else {
  $gradleText = $gradleText -replace '(?ms)(\s*defaultConfig\s*\{.*?\n\s*\})', "`$1`n$signingBlock"
}

$gradleText = $gradleText -replace '(?ms)(buildTypes\s*\{\s*debug\s*\{\s*)signingConfig signingConfigs\.release', '$1signingConfig signingConfigs.debug'
# release blogu: yorum satirlari arasinda kalan debug imzasini duzelt
$gradleText = $gradleText -replace '(?ms)(release\s*\{.*?)signingConfig signingConfigs\.debug', '$1signingConfig signingConfigs.release'

if ($gradleText -notmatch 'release\s*\{[^\}]*signingConfig signingConfigs\.release') {
  $gradleText = $gradleText -replace '(?ms)(buildTypes\s*\{\s*release\s*\{)', "`$1`n            signingConfig signingConfigs.release"
}

Set-Content -Path $gradlePath -Value $gradleText -NoNewline
Write-Host "Release signing uygulandi." -ForegroundColor Green

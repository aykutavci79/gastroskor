# Play upload keystore + android-keystore.properties (bir kez)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
  if ($env:JAVA_HOME) {
    $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
  }
}
if (-not (Test-Path $keytool)) {
  throw "keytool bulunamadi. Once: npm run setup:android:env"
}

$keystore = Join-Path (Get-Location) "gastroskor-upload.jks"
$props = Join-Path (Get-Location) "android-keystore.properties"

Write-Host ""
Write-Host "=== GastroSkor Android keystore ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $keystore) {
  Write-Host "gastroskor-upload.jks zaten var, atlaniyor." -ForegroundColor Yellow
} else {
  Write-Host "Keystore sifresi belirle (en az 6 karakter, unutma!):" -ForegroundColor Yellow
  $storePass = Read-Host "Store password" -AsSecureString
  $storePlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass)
  )
  if ($storePlain.Length -lt 6) {
    throw "Sifre en az 6 karakter olmali."
  }

  Write-Host "Key password (Enter = store ile ayni):" -ForegroundColor Yellow
  $keyPassSec = Read-Host "Key password" -AsSecureString
  $keyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassSec)
  )
  if ([string]::IsNullOrWhiteSpace($keyPlain)) {
    $keyPlain = $storePlain
  }

  $dname = "CN=GastroSkor, OU=Mobile, O=GastroSkor, L=Bursa, ST=TR, C=TR"
  & $keytool -genkeypair -v -storetype PKCS12 -keystore $keystore -alias gastroskor `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $storePlain -keypass $keyPlain -dname $dname

  if (-not (Test-Path $keystore)) {
    throw "Keystore olusturulamadi."
  }
  Write-Host "OK: gastroskor-upload.jks olusturuldu" -ForegroundColor Green

  if (-not (Test-Path $props)) {
    @"
storeFile=../gastroskor-upload.jks
storePassword=$storePlain
keyAlias=gastroskor
keyPassword=$keyPlain
"@ | Set-Content -Path $props -Encoding UTF8
    Write-Host "OK: android-keystore.properties yazildi" -ForegroundColor Green
  } else {
    Write-Host "android-keystore.properties zaten var - sifreleri elle kontrol et." -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "SHA-1 (Google Cloud Android OAuth client icin):" -ForegroundColor Yellow
  & $keytool -list -v -keystore $keystore -alias gastroskor -storepass $storePlain | Select-String "SHA1:"
}

Write-Host ""
Write-Host "Sonraki adim:" -ForegroundColor Yellow
Write-Host "  npm run build:android:local"
Write-Host ""

# Local uretilen AAB'yi Google Play'e yukler (EAS Submit - ucretsiz).
# Gerekli: mobile/google-play-service-account.json (bir kez kurulur).
param(
  [string]$Path,
  [string]$Track = "Gastroskor-test2"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$saKey = "google-play-service-account.json"
if (-not (Test-Path $saKey)) {
  throw @"
$saKey yok. Otomatik yukleme icin Google Play servis hesabi anahtari gerekli.
Kurulum (bir kez):
  1. Play Console -> Ayarlar -> API erisimi -> Yeni servis hesabi olustur
  2. Google Cloud'da JSON anahtari indir
  3. Play Console'da bu hesaba 'Surumleri yonet' yetkisi ver
  4. JSON'u mobile/$saKey olarak kaydet
Detay: https://docs.expo.dev/submit/android/
"@
}

if (-not $Path) {
  $latest = Get-ChildItem (Join-Path "dist" "*.aab") -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) {
    throw "dist/ icinde .aab yok. Once: npm run build:android:local"
  }
  $Path = $latest.FullName
}

Write-Host "Yuklenecek AAB: $Path" -ForegroundColor Cyan
Write-Host "Track: $Track" -ForegroundColor Cyan
Write-Host ""

$env:NODE_OPTIONS = "--use-system-ca"
& eas submit --platform android --profile production --path $Path --non-interactive
if ($LASTEXITCODE -ne 0) {
  throw "eas submit basarisiz (exit $LASTEXITCODE)."
}

Write-Host ""
Write-Host "Yuklendi. Play Console -> Kapali test -> Gastroskor-test2 surumunde gorunur." -ForegroundColor Green

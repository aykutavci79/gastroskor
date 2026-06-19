# GastroSkor mobile -> C:\dev\gs (Windows 260 char path limiti icin kisa yol)
param(
  [string]$Dest = "C:\dev\gs",
  [switch]$DryRun,
  [switch]$SkipNpmInstall,
  [switch]$RunBuild
)

$ErrorActionPreference = "Stop"
$Source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step([string]$msg) {
  Write-Host "`n>> $msg" -ForegroundColor Cyan
}

Write-Host "=== GastroSkor -> kisa yol tasima ===" -ForegroundColor Green
Write-Host "Kaynak: $Source"
Write-Host "Hedef:  $Dest"

if (-not (Test-Path $Source)) {
  throw "Kaynak bulunamadi: $Source"
}

$destParent = Split-Path $Dest -Parent
if (-not (Test-Path $destParent)) {
  Write-Step "Klasor olusturuluyor: $destParent"
  if (-not $DryRun) {
    New-Item -ItemType Directory -Path $destParent -Force | Out-Null
  }
}

# Robocopy cikis kodlari 0-7 = basari
$excludeDirs = @(
  "node_modules",
  "android",
  "dist",
  ".expo",
  ".git"
)

$roboArgs = @(
  $Source,
  $Dest,
  "/E",
  "/R:2",
  "/W:2",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NP"
)
foreach ($d in $excludeDirs) {
  $roboArgs += "/XD"
  $roboArgs += $d
}

if ($DryRun) {
  $roboArgs += "/L"
  Write-Step "Dry-run (dosya listesi):"
}

Write-Step "Kopyalaniyor (node_modules ve android haric, yeniden uretilecek)..."
$robo = Start-Process -FilePath "robocopy.exe" -ArgumentList $roboArgs -Wait -PassThru -NoNewWindow
if ($robo.ExitCode -ge 8) {
  throw "Robocopy basarisiz (kod $($robo.ExitCode))"
}
Write-Host "Robocopy tamam (kod $($robo.ExitCode))." -ForegroundColor DarkGray

if ($DryRun) {
  Write-Host "Dry-run bitti. Gercek kopya icin -DryRun olmadan calistir." -ForegroundColor Yellow
  exit 0
}

# Zorunlu gizli dosyalar (robocopy zaten kopyaladi; yoksa uyar)
$secrets = @(
  ".env",
  "android-keystore.properties",
  "gastroskor-upload.jks",
  "google-play-service-account.json"
)
foreach ($f in $secrets) {
  $p = Join-Path $Dest $f
  if (Test-Path $p) {
    Write-Host "  OK: $f" -ForegroundColor DarkGreen
  } else {
    Write-Host "  EKSIK: $f - eski konumdan elle kopyala!" -ForegroundColor Red
  }
}

$marker = @"
GastroSkor mobile - kisa yol kopyasi
Olusturulma: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Kaynak: $Source

Build:
  cd C:\dev\gs
  npm install
  npm run build:android:local

Not: Bu klasorde gelistirme yaptiktan sonra degisiklikleri ana repoya geri tasiyabilirsin.
"@
Set-Content -Path (Join-Path $Dest "SHORT_PATH_README.txt") -Value $marker -Encoding UTF8

if (-not $SkipNpmInstall) {
  Write-Step "npm install ($Dest)..."
  Push-Location $Dest
  try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install basarisiz." }
  } finally {
    Pop-Location
  }
}

Write-Host "`n=== Tasima tamam ===" -ForegroundColor Green
Write-Host "  cd $Dest"
Write-Host "  npm run build:android:local"

if ($RunBuild) {
  Write-Step "Android build baslatiliyor..."
  Push-Location $Dest
  try {
    npm run build:android:local
  } finally {
    Pop-Location
  }
}

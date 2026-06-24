# Sofra bulmaca bankasini prod havuza import eder.
# Once: npx tsx scripts/generate-sofra-bank.ts --count 500 --out data/kelime-sofrasi/sofra-bank.json
param(
  [string]$BankFile = 'data/kelime-sofrasi/sofra-bank.json',
  [string]$GunId = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:SOFRA_CRON_SECRET) {
  Write-Host 'SOFRA_CRON_SECRET tanimli degil.' -ForegroundColor Red
  exit 1
}

$bankPath = Join-Path $root $BankFile
if (-not (Test-Path $bankPath)) {
  Write-Host "Bank dosyasi yok: $bankPath" -ForegroundColor Red
  Write-Host 'Once: npx tsx scripts/generate-sofra-bank.ts --count 500' -ForegroundColor Yellow
  exit 1
}

$apiBase = if ($env:SOFRA_API_BASE_URL) { $env:SOFRA_API_BASE_URL.TrimEnd('/') } else { 'https://api.gastroskor.com.tr' }

# Bank entry -> generate-sofra-pool import formatina cevir
$importPath = Join-Path $env:TEMP "sofra-bank-import.json"
node -e @"
const fs=require('fs');
const bank=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const gunId=process.argv[2]||new Date().toISOString().slice(0,10);
const puzzles=bank.entries.filter(e=>e.ok&&e.puzzle).map(e=>({
  gun_id: gunId,
  zorluk: e.zorluk,
  tur: e.tur,
  puzzle_id: e.puzzle_id,
  ok: true,
  generation_ms: e.generation_ms,
  puzzle: e.puzzle,
}));
fs.writeFileSync(process.argv[3], JSON.stringify({gun_id:gunId, puzzles}));
console.log('slots', puzzles.length);
"@ $bankPath $GunId $importPath

$gid = if ($GunId) { $GunId } else { python -c "from datetime import datetime; from zoneinfo import ZoneInfo; d=datetime.now(ZoneInfo('Europe/Istanbul')); print(d.date().isoformat())" }
Write-Host "Import gun_id=$gid" -ForegroundColor Cyan

$respPath = Join-Path $env:TEMP "sofra-bank-import-resp.json"
$http = curl.exe --ssl-no-revoke -sS -o $respPath -w '%{http_code}' `
  -X POST "$apiBase/api/v1/internal/cron/sofra-bulmaca-import" `
  -H "Content-Type: application/json" `
  -H "X-Cron-Secret: $env:SOFRA_CRON_SECRET" `
  --data-binary "@$importPath"
Write-Host "Import HTTP $http"
Get-Content $respPath
if ($http -ne '200') { exit 1 }

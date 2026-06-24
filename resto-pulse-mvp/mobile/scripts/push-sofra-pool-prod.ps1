# Kelime Sofrasi havuzunu uret + prod API import (GitHub Action ile ayni akis).
# Gerekli (Railway CRON_SECRET ile AYNI — bir kez backend/.env.local'a yaz):
#   resto-pulse-mvp/backend/.env.local  →  SOFRA_CRON_SECRET=...
# Alternatif: oturumda $env:SOFRA_CRON_SECRET = '...'
#   $env:SOFRA_API_BASE_URL = 'https://api.gastroskor.com.tr'  # opsiyonel
param(
  [string]$GunId = '',
  [switch]$AlsoTomorrow,
  [switch]$Fast
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Import-BackendEnv {
  $backendRoot = Split-Path -Parent $root
  $envFile = Join-Path $backendRoot 'backend\.env'
  $localFile = Join-Path $backendRoot 'backend\.env.local'

  function Read-DotEnv([string]$path, [bool]$override) {
    if (-not (Test-Path $path)) { return }
    foreach ($line in Get-Content $path) {
      if ($line -match '^\s*#' -or $line -notmatch '^([^=]+)=(.*)$') { continue }
      $name = $Matches[1].Trim()
      $val = $Matches[2].Trim().Trim('"').Trim("'")
      if ([string]::IsNullOrWhiteSpace($val)) { continue }
      if ($name -notin @('GROQ_API_KEY', 'OPENAI_API_KEY', 'CRON_SECRET', 'SOFRA_CRON_SECRET')) { continue }
      if ($override -or -not (Get-Item "Env:$name" -ErrorAction SilentlyContinue)) {
        Set-Item "Env:$name" $val
      }
    }
  }

  Read-DotEnv $envFile $false
  Read-DotEnv $localFile $true
  if (-not $env:SOFRA_CRON_SECRET -and $env:CRON_SECRET) {
    $env:SOFRA_CRON_SECRET = $env:CRON_SECRET
  }
}

Import-BackendEnv
if (-not $env:NODE_OPTIONS) { $env:NODE_OPTIONS = '--use-system-ca' }

if ($env:GROQ_API_KEY) {
  Write-Host 'AI: Groq birincil (backend/.env)' -ForegroundColor DarkGray
} elseif ($env:OPENAI_API_KEY) {
  Write-Host 'AI: OpenAI yedek (Groq yok)' -ForegroundColor DarkGray
} else {
  Write-Host 'AI: kod-only (GROQ/OPENAI env yok)' -ForegroundColor DarkYellow
}

if (-not $env:SOFRA_CRON_SECRET) {
  Write-Host 'SOFRA_CRON_SECRET tanimli degil (Railway CRON_SECRET ile ayni olmali).' -ForegroundColor Red
  exit 1
}
$apiBase = if ($env:SOFRA_API_BASE_URL) { $env:SOFRA_API_BASE_URL.TrimEnd('/') } else { 'https://api.gastroskor.com.tr' }

function Get-TargetGunIds([string]$Manual, [bool]$IncludeTomorrow) {
  if ($Manual) { return @($Manual) }
  $flag = if ($IncludeTomorrow) { '1' } else { '0' }
  $ids = python -c @"
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
include_tomorrow = '$flag' == '1'
IST = ZoneInfo('Europe/Istanbul')
now = datetime.now(IST)
active = now.date()
if now.hour < 17:
    active = (now - timedelta(days=1)).date()
ids = [active.isoformat()]
if include_tomorrow:
    upcoming = now.date()
    if upcoming.isoformat() not in ids:
        ids.append(upcoming.isoformat())
print(' '.join(ids))
"@
  return $ids.Trim().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
}

$gunIds = Get-TargetGunIds -Manual $GunId -IncludeTomorrow:$AlsoTomorrow.IsPresent
Write-Host "Hedef gun_id: $($gunIds -join ', ')" -ForegroundColor Cyan

foreach ($gid in $gunIds) {
  Write-Host "`n=== Uretiliyor: $gid ===" -ForegroundColor Yellow
  $jsonPath = Join-Path $env:TEMP "sofra-pool-$gid.json"
  $logPath = Join-Path $env:TEMP "sofra-pool-$gid.log"
  $genArgs = @('scripts/generate-sofra-pool.ts', '--gun-id', $gid, '--no-qa')
  if ($Fast.IsPresent) { $genArgs += '--no-ai'; Write-Host 'Mod: hizli (AI kapali, validator acik)' -ForegroundColor DarkYellow }
  else { Write-Host 'Mod: Groq kelime + validator (QA kapali)' -ForegroundColor DarkGray }
  npx tsx @genArgs 1> $jsonPath 2> $logPath
  if ($LASTEXITCODE -ne 0) { Get-Content $logPath; exit 1 }
  Get-Content $logPath | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
  $stats = node -e "const d=require(process.argv[1]); console.log(d.filter(x=>x.ok).length+'/'+d.length);" $jsonPath
  Write-Host "Generator: $stats ok"
  $bodyPath = Join-Path $env:TEMP "sofra-import-$gid.json"
  node -e "const fs=require('fs'); const puzzles=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); fs.writeFileSync(process.argv[2], JSON.stringify({gun_id:process.argv[3], puzzles}));" $jsonPath $bodyPath $gid
  $respPath = Join-Path $env:TEMP "sofra-import-resp-$gid.json"
  $http = curl.exe --ssl-no-revoke -sS -o $respPath -w '%{http_code}' `
    -X POST "$apiBase/api/v1/internal/cron/sofra-bulmaca-import" `
    -H "Content-Type: application/json" `
    -H "X-Cron-Secret: $env:SOFRA_CRON_SECRET" `
    --data-binary "@$bodyPath"
  Write-Host "Import HTTP $http"
  Get-Content $respPath
  if ($http -ne '200') { exit 1 }
}

Write-Host "`nDogrulama (is_fallback false olmali):" -ForegroundColor Green
curl.exe --ssl-no-revoke -sS "$apiBase/api/v1/eglence/kelime-sofrasi/puzzle?zorluk=orta&tur=0" | python -c "import sys,json; d=json.load(sys.stdin); print('gun_id',d.get('gun_id'),'is_fallback',d.get('is_fallback'),'source',d.get('source_gun_id'))"

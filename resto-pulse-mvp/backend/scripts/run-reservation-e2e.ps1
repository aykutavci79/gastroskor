# Online rezervasyon — lokal migration + E2E smoke
# Gereksinim: Docker Desktop acik (infra/docker-compose.yml Postgres)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Infra = Join-Path (Split-Path -Parent $Root) "infra"
$Backend = $Root

Write-Host "==> Postgres (docker compose)" -ForegroundColor Cyan
Push-Location $Infra
try {
  docker compose up -d postgres
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker calismiyor. Docker Desktop acip tekrar deneyin." -ForegroundColor Red
    exit 1
  }
} finally {
  Pop-Location
}

Write-Host "==> Postgres hazir olana kadar bekleniyor (max 30s)" -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker exec resto-pulse-postgres pg_isready -U postgres -d resto_pulse 2>$null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  Write-Host "Postgres hazir degil." -ForegroundColor Red
  exit 1
}

Push-Location $Backend
try {
  Write-Host "==> alembic upgrade head" -ForegroundColor Cyan
  python -m alembic upgrade head
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "==> unit test (layout)" -ForegroundColor Cyan
  python -m pytest tests/test_reservation_floor_plan.py -q
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "==> E2E setup + smoke (DB)" -ForegroundColor Cyan
  python scripts/reservation_e2e.py all
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`nTamam. Panel: salon plani + rezervasyon acik. Mobil: /online-rezervasyon/masa/<restaurant_id>" -ForegroundColor Green
} finally {
  Pop-Location
}

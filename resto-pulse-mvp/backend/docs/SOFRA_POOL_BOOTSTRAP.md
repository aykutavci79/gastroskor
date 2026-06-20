# Kelime Sofrası havuz bootstrap — prod

Bu dosya prod ortamına ilk havuzu doldurmak için adımları özetler.

## 1. Migration (Railway)

Railway Dashboard → **gastroskor-api** (backend servisi) → **Settings** → **Deploy** bölümünden
son deploy’un bu commit’i içerdiğinden emin ol. Ardından:

**Railway Shell** (servis → **Deployments** → aktif deploy → **View logs** yanında **Shell**):

```bash
cd backend   # veya repo kökünde resto-pulse-mvp/backend
alembic upgrade head
```

Alternatif — lokal makineden prod `DATABASE_URL` ile:

```powershell
cd resto-pulse-mvp\backend
$env:DATABASE_URL = "postgresql+psycopg://USER:PASS@HOST:PORT/railway"
python -m alembic upgrade head
```

`DATABASE_URL` değerini Railway → **PostgreSQL** servisi → **Variables** → `DATABASE_URL`.

## 2. İlk havuz (GitHub Actions veya manuel)

### A) GitHub Actions (önerilen)

1. GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Secret ekle: `SOFRA_CRON_SECRET`, `SOFRA_API_BASE_URL`
3. **Actions** → **Sofra Bulmaca Daily** → **Run workflow**

### B) Manuel import (deploy sonrası)

```powershell
cd resto-pulse-mvp\mobile
npx tsx scripts/generate-sofra-pool.ts --gun-id 2026-06-20 | Out-File -Encoding utf8 ..\..\sofra-pool.json

# Prod API (CRON_SECRET prod degeri)
curl.exe -X POST "https://api.gastroskor.com.tr/api/v1/internal/cron/sofra-bulmaca-import" `
  -H "Content-Type: application/json" `
  -H "X-Cron-Secret: YOUR_CRON_SECRET" `
  -d "{\"gun_id\":\"2026-06-20\",\"puzzles\":$(Get-Content sofra-pool.json -Raw)}"
```

### C) Lokal DB import

```powershell
cd resto-pulse-mvp\backend
python scripts/import_sofra_pool_json.py --file ..\sofra-pool.json --gun-id 2026-06-20
python scripts/sofra_bulmaca_admin.py liste --gun 2026-06-20
```

## 3. Doğrulama

```powershell
python scripts/sofra_bulmaca_admin.py liste --gun 2026-06-20 --limit 20
# Beklenen: 15 satır, review_status=approved
```

Public API:

```
GET https://api.gastroskor.com.tr/api/v1/eglence/kelime-sofrasi/puzzle?zorluk=orta&tur=0&gun_id=2026-06-20
```

## Cron 2 gün kaçırılırsa

- Kullanıcılar **önceki günün bulmacasının kopyasını** görür (`fetch_puzzle_for_client` fallback).
- Havuz tamamen boşsa API **404** döner; mobil disk cache varsa onu kullanır.
- GitHub Action başarısız olursa e-posta bildirimi; backend `SOFRA_POOL_ALERT` critical log (+ opsiyonel Sentry).

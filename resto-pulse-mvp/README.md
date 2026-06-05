# GastroSkor

Turkiye'deki restoranlarin farkli platform puan/yorumlarini tek catida toplayan ve AI ile analiz eden MVP.

## Secilen Mimari

- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Veritabani:** PostgreSQL (Supabase ile uyumlu)
- **Auth:** Google OAuth (frontend) + backend JWT dogrulama akisina hazir
- **AI Analiz:** OpenAI/Anthropic adapter katmani

## Klasor Yapisi

```text
gastroskor/
  backend/
    app/
      api/v1/           # endpoint routerlari
      core/             # ayarlar, guvenlik
      db/               # engine, base, session
      models/           # SQLAlchemy modelleri
      schemas/          # Pydantic request/response modelleri
      services/         # uygulama is kurallari
      integrations/     # Google Places, AI saglayicilari
      main.py
    requirements.txt
    alembic.ini
  frontend/
    app/
    components/
    lib/
    package.json
  infra/
    docker-compose.yml
  docs/
    architecture.md
```

## API (v1)

- `GET /api/v1/health`
- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/{id}`
- `POST /api/v1/restaurants`
- `GET /api/v1/restaurants/{id}/reviews`
- `POST /api/v1/reviews`
- `POST /api/v1/reviews/{id}/analyze`
- `GET /api/v1/restaurants/{id}/google-review-link`

## Hizli Baslangic

### 1) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Tarayici: `http://localhost:3000`

### 3) Ornek veri (Bursa restoranlari)

PostgreSQL calisiyor olmali (`infra/docker-compose.yml` veya yerel Postgres).

```powershell
cd backend
# .env icinde DATABASE_URL ve istege bagli GOOGLE_PLACES_API_KEY
python seed.py
```

Sifirdan yuklemek icin:

```powershell
python seed.py --reset
```

Onizleme (DB'ye yazmaz):

```powershell
python seed.py --dry-run
```

Seed paketi 8 populer Bursa mekani, Google `place_id` profilleri ve ornek ham yorumlar ekler.
`GOOGLE_PLACES_API_KEY` tanimliysa eksik Place ID'ler otomatik cozulur.

## MVP Kapsami

- Restoran kaydi ve platform bazli kimlikler (Google Place ID vb.)
- Uygulama ici yorum/puan kaydi
- Yorum metnini kategori bazli AI analizi:
  - lezzet
  - servis
  - fiyat
  - hijyen
- "Google'da Yayinla" icin deep link uretimi


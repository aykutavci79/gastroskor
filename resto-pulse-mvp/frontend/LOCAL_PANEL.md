# Local panel test (localhost:3000)

Restoran paneli, takipci kuponlari ve promosyon ayarlari **web** uzerinden test edilir (`/panel`). Mobil sadece musteri tarafi.

## 1. Ortam dosyasi

`frontend/.env.local` (ornek: `.env.local.example`):

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=uzun-rastgele-metin
NEXTAUTH_URL=http://localhost:3000
```

**Sadece panel + mekan aramasi (Postgres kurmadan):**

```env
NEXT_PUBLIC_API_URL=https://api.gastroskor.com.tr
```

(Google girisi yine `http://localhost:3000`. Canli API’de `GOOGLE_PLACES_API_KEY` Railway’de tanimli olmali.)

- Tarayicida **http://localhost:3000** ac ( `127.0.0.1:3000` degil — NextAuth URL ile ayni olmali).

## 2. Google Cloud (Web client)

**Credentials → OAuth 2.0 Client ID → Web application** (paneldeki `GOOGLE_CLIENT_ID` ile ayni client):

**Authorized JavaScript origins**

```
http://localhost:3000
```

**Authorized redirect URIs**

```
http://localhost:3000/api/auth/callback/google
```

Canli site icin ayrica:

```
https://www.gastroskor.com.tr/api/auth/callback/google
```

**OAuth consent screen → Test users:** giris yapacagin Gmail.

Kaydet, 5–10 dk bekle.

## 3. Backend

**Panel `Panel yukleniyor...` da takili kaliyorsa:** buyuk ihtimalle Postgres yok. Ya local Postgres + migration calistir, ya da sadece API icin canli kullan:

```env
NEXT_PUBLIC_API_URL=https://api.gastroskor.com.tr
```

(Google girisi yine `localhost:3000` uzerinden; sadece veri canli API’den gelir.)

Kupon API icin local backend:

```powershell
cd resto-pulse-mvp\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

(`uvicorn` tek basina calismiyorsa her zaman `python -m uvicorn` kullan.)

Migration `20260606_0022` (takipci kupon) uygulanmis olmali.

Alternatif: sadece frontend local, API canli:

```env
NEXT_PUBLIC_API_URL=https://api.gastroskor.com.tr
```

(Google girisi yine localhost callback ile calisir.)

## 4. Calistir

```bash
cd resto-pulse-mvp/frontend
npm run dev
```

Ac: [http://localhost:3000/panel](http://localhost:3000/panel) → **Google ile Giris**.

## 5. Isletme kaydi yoksa

Ilk kez: `/panel/claim` — mekani bagla (SMS / vergi yolu). Sonra dashboard’da **Takipci kuponlari** bolumu.

## 6. Hata ayiklama

Google Cloud URI listesi dogru olsa bile giris tutmuyorsa cogu zaman su ucunden biri:

1. **OAuth consent screen → Test users** — uygulama **Testing** modunda; giris yaptigin Gmail burada yoksa Google reddeder (`AccessDenied`).
2. **Yanlis client** — `.env.local` icindeki `GOOGLE_CLIENT_ID` ekrandaki **Web application** client ile birebir ayni olmali (Android/iOS client degil).
3. **Eski client secret** — Console’da secret yenilendiyse `.env.local` guncelle, `npm run dev` yeniden baslat.

Tarayici: sadece **http://localhost:3000** ( `127.0.0.1:3000` kullanma ).

Giris sonrasi panel bos gorunuyorsa bu **giris basarisiz** degil — isletme bagli degil, `/panel/claim` sayfasina yonlendirilirsin.

Cookie takildiysa: [http://localhost:3000/api/auth/force-signout](http://localhost:3000/api/auth/force-signout) → tekrar `/panel`.

| Belirti | Cozum |
|--------|--------|
| `redirect_uri_mismatch` | Yukaridaki `http://localhost:3000/api/auth/callback/google` eklendi mi? |
| Giris oluyor, panel bos / hata | Backend 8000 acik mi? `NEXT_PUBLIC_API_URL` dogru mu? |
| `Configuration` / NextAuth hata | `NEXTAUTH_SECRET` ve `GOOGLE_CLIENT_SECRET` dolu mu? Sunucuyu yeniden baslat. |
| Kupon 404 | API eski surum — Railway deploy veya local migration |

Terminalde NextAuth `debug: true` development’ta aciktir; callback loglarina bak.

# GastroSkor Mobil (Expo)

Web ile ayni API: `https://api.gastroskor.com.tr`

## Sekmeler

- **Kesfet** — arama, trend listesi, restoran kartlari
- **Isletme** — panel (dashboard, rozetler, menu, rakip AI)
- **Hesap** — Google ile giris, yasal linkler

## Kurulum

```bash
cd mobile
copy .env.example .env
npm install
npm run start:clean
```

`.env` icine Google OAuth client ID'leri ekleyin (detay: [STORE.md](./STORE.md)).

**Expo Go** uygulamasinin guncel oldugundan emin olun (SDK 54).

Telefonda test: Expo Go ile QR okutun (aynı Wi‑Fi).

## Magaza / EAS

App Store ve Play Store adimlari icin **[STORE.md](./STORE.md)** dosyasina bakin.

## Notlar

- Panel ve yorum icin **Google ile giris** onerilir; e-posta girisi test icin acik.
- Menu fotografi yukleme panelden calisir (backend `/panel/promo/menu-image`).

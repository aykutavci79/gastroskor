# GastroSkor Mobil (Expo)

Web ile ayni API: `https://api.gastroskor.com.tr`

## Sekmeler

- **Kesfet** — arama, trend listesi, restoran kartlari
- **Isletme** — panel (dashboard, rozetler, menu, rakip AI)
- **Hesap** — webdeki Google e-postasini baglama (panel icin)

## Kurulum

```bash
cd mobile
cp .env.example .env
npm install
npm run start:clean
```

**Expo Go** uygulamasinin guncel oldugundan emin olun (SDK 54). Eski Expo Go `runtime not ready` / SyntaxError verebilir.

Telefonda test: Expo Go ile QR okutun (aynı Wi‑Fi).

## Notlar

- Panel girisi su an **e-posta eslestirme** ile; webdeki Google hesabiyla ayni olmali.
- Tam Google OAuth ve App Store build sonraki adim.
- Menu fotografi yukleme panelden calisir (backend `/panel/promo/menu-image`).

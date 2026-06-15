# GastroSkor panel tanıtım görselleri

Örnek veri — gerçek restoran girişi gerekmez. CapCut / Meta reklam / işletme başvurusu için.

## PNG dosyaları

| Dosya | İçerik |
|-------|--------|
| `01-panel-dashboard.png` | Özet, istatistikler, puan |
| `02-panel-siparis-onay.png` | Bekleyen sipariş, Onayla/Reddet |
| `03-panel-menu.png` | Menü ve fiyat listesi |
| `04-panel-online-siparis.png` | Kendi kurye, vitrin ayarları |
| `05-mobil-musteri.png` | Müşteri uygulaması (9:16) |
| `gastroskor-laptop-screen-1080.png` | Laptop ekranı — logo + CTA (1920×1080) |
| `gastroskor-laptop-screen-4k.png` | Aynı, 4K (3840×2160) |
| `gastroskor-logo-icon-2048.png` | Sadece ikon, 2048×2048 |
| `gastroskor-logo-icon-4096.png` | Sadece ikon, 4096×4096 (en net) |
| `gastroskor-logo-tagline-2048.png` | Logo + **Tek Tıkla Gastro** (şeffaf arka plan, 2048 genişlik) |
| `gastroskor-logo-tagline-4096.png` | Logo + slogan, 4K (4096 genişlik) |
| `gastroskor-logo-tagline-dark-2048.png` | Koyu zemin (#141414) + logo + slogan |
| `gastroskor-logo-tagline-dark-4096.png` | Aynı, 4K |

Kaynak: `mobile/assets/logo.png` (uygulama ikonu). Yeniden üretmek: `node export-logo-from-asset.mjs` (önce `npm install sharp`).

Vektor yedek: `../gastroskor-logo-with-tagline.svg` — `node export-logo-with-tagline.mjs`.

## Yeniden üretmek

```powershell
cd resto-pulse-mvp/docs/marketing
python -m http.server 8765
# Başka terminal:
npm install playwright
node export-panel-mockups.mjs
```

Kaynak HTML: `panel-mockups.html` (tarayıcıda açıp manuel kırpım da yapılabilir).

## Video ipucu

- Panel ekranlarında köşede **ÖRNEK EKRAN** filigranı var — reklamda blur veya crop uygulayabilirsin.
- İşletme adı kurgusal: **Urfalı Kebap — Osmangazi**.

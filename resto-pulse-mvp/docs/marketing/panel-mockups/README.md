# GastroSkor panel tanıtım görselleri

Örnek veri — gerçek restoran girişi gerekmez. CapCut / sunum / Meta reklam için.

## Sunum ekran görüntüleri (2026)

| Dosya | Ekran |
|-------|--------|
| `dashboard.png` | Ana panel — istatistikler + harita tık özeti |
| `vitrin-menu.png` | Vitrin & menü görseli yükleme |
| `online-siparis.png` | Gelen sipariş kartı (onay/red) |
| `remedy.png` | Düşük puanlı yorum telafisi |
| `ozel-sikayetler.png` | Özel şikâyetler listesi |
| `takipciler-kupon.png` | Takipçiler + kupon kampanyası |
| `rakip-analizi.png` | AI rakip analizi raporu |
| `google-isletme.png` | Google İşletme Profili bağlantısı |
| `bildirimler.png` | Bildirim merkezi |
| `menu-kalemleri.png` | Menü kalemleri (ürün adı, fiyat, kategori, açıklama) |
| `vitrin-iletisim.png` | Telefon, WhatsApp, Instagram + online sipariş toggle |

İşletme adı kurgusal: **Urfalı Kebap — Osmangazi**.

> **Not:** Panelde ayrı route/sekme yok; bu bölümler `/panel` sayfasında aşağı kaydırınca görünür (`RestaurantMenuEditor`, `RestaurantPromoSettings`).

## Eski numaralı mockup'lar

| Dosya | İçerik |
|-------|--------|
| `01-panel-dashboard.png` | (eski) Özet |
| `02-panel-siparis-onay.png` | (eski) Sipariş |
| `03-panel-menu.png` | (eski) Menü |
| `04-panel-online-siparis.png` | (eski) Vitrin |
| `05-mobil-musteri.png` | Müşteri uygulaması (9:16) |
| `gastroskor-laptop-screen-1080.png` | Laptop ekranı — logo + CTA (1920×1080) |
| `gastroskor-laptop-screen-4k.png` | Aynı, 4K (3840×2160) |
| `gastroskor-logo-icon-2048.png` | Sadece ikon, 2048×2048 |
| `gastroskor-logo-icon-4096.png` | Sadece ikon, 4096×4096 (en net) |
| `gastroskor-logo-tagline-2048.png` | Logo + **GastroSkor** + **Tek Tıkla Gastro** (şeffaf arka plan) |
| `gastroskor-logo-tagline-4096.png` | Aynı, 4K |
| `gastroskor-logo-tagline-dark-2048.png` | Koyu zemin (#141414) + logo + yazılar |
| `gastroskor-logo-tagline-dark-4096.png` | Aynı, 4K |

Kaynak: `mobile/assets/logo.png` (uygulama ikonu). Yeniden üretmek: `node export-logo-from-asset.mjs` (önce `npm install sharp`).

Vektor yedek: `../gastroskor-logo-with-tagline.svg` — `node export-logo-with-tagline.mjs`.

## Yeniden üretmek

```powershell
cd resto-pulse-mvp/docs/marketing
npm install playwright
npx playwright install chromium
node export-panel-mockups.mjs
```

Kaynak HTML: `panel-mockups.html` (tarayıcıda açıp manuel kırpım da yapılabilir).

## Video ipucu

- Panel ekranlarında köşede **ÖRNEK EKRAN** filigranı var — reklamda blur veya crop uygulayabilirsin.
- İşletme adı kurgusal: **Urfalı Kebap — Osmangazi**.

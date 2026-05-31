# GastroSkor — Yol Haritasi (Durum Ozeti)

Son guncelleme: 31 Mayis 2026

## Tamamlanan

| Alan | Ne yapildi |
|------|------------|
| Mobil kesfet | Kompakt kartlar, Google foto fallback, canli arama |
| Restoran detay | GS yorumlari, foto yukleme, Google fotolar |
| Web detay | Canli modal, foto carousel |
| Store hazirligi | Yasal sayfalar, EAS config, app.config.js |
| Google giris (mobil) | Web koprusu `/mobil-giris` + `/auth/google` callback |
| Yorum fotolari | WebP sikistirma, Railway volume notu |

## Simdi eklendi (backend deploy gerekir)

| Alan | Ne yapildi |
|------|------------|
| Yorum moderasyonu | Kufur/argo filtresi, 1. uyari / 2. 7 gun ban / 3. 3 ay ban |

Railway: `alembic upgrade head` calistir.

## Siradaki fazlar (plan — henuz yok)

### Faz A — Topluluk (onerilen sira)
1. **Yararli bul** (tek tik begeni)
2. **Tek seviye yanit** (yorum altina kisa cevap)
3. Bildirim: "Yorumun begenildi" / "Yorumuna cevap geldi"

### Faz B — Magaza
1. EAS preview build (Android APK / iOS TestFlight)
2. Play Store + App Store listesi
3. Native Google Sign-In (store build icin)

### Faz C — Panel / isletme
1. Mevcut panel iyilestirmeleri
2. Yorum moderasyonu panelden gorunurluk (ileride)

## Topluluk kurallari (moderasyon)

- Kufur, argo, kisirlayici kisaltmalar → yorum reddedilir
- 1. ihlal: uyari
- 2. ihlal: 7 gun yorum yazma kapali
- 3. ihlal: 3 ay yorum yazma kapali

Amaç: TikTok ergen dili degil; saygin, yapici yemek toplulugu.

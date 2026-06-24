# GastroSkor mobil — görsel ve asset kuralları

> **Tüm ürün (upload + web + bundle):** [../docs/MEDIA_IMAGES.md](../docs/MEDIA_IMAGES.md)

Eğlence donması (1.0.59–1.0.77) **dev PNG/JPG’lerin ekrandan 10–30 kat büyük bundle edilmesinden** kaynaklandı. Yeni il / yöresel lezzet / hub ikonu eklerken bu kurallara uy.

## Altın kural

> **Ekranda görünen boyut × 3 (retina)** — dosyayı bundan büyük export etme.  
> Tek dosya **1 MB’ı geçmesin**; ideal **≤ 150 KB** (kart/ikon), arka plan **≤ 300 KB**.

Commit öncesi (Eğlence / GastroHub):

```powershell
cd resto-pulse-mvp\mobile
powershell -File .\scripts\optimize-eglence-images.ps1
```

Script’e yeni path eklemek gerekiyorsa `scripts/optimize-eglence-images.ps1` içindeki `$targets` tablosunu güncelle.

---

## Boyut tablosu

| Kullanım | Klasör | Ekranda (yaklaşık) | Max dosya boyutu | Max piksel |
|----------|--------|--------------------|------------------|------------|
| Oyun kartı (carousel) | `gastro-hub/games/` | 158×228 | 500 KB | **512×512** |
| Görev ikonu | `gastro-hub/tasks/` | 52×52 | 80 KB | **192×192** |
| GastroCoin / cüzdan | `gastro-hub/` | 80–120 | 100 KB | **256–360** |
| Tab / badge | `gastro-hub/` | 24–32 | 40 KB | **96×96** |
| **Yöresel lezzet arka plan** (Sofra tam ekran) | CDN veya `regional-flavors/` | tam ekran | **300 KB** | **1080×1920** (veya 720×1280) |
| Yöresel lezzet liste kartı | CDN | ~120×120 | 60 KB | **360×360** |
| Restoran / ürün foto | API URL | değişken | backend/CDN | WebP tercih |

**Yasak:** AI veya tasarım export’unu (1024², 1536×1024, 2 MB JPG) doğrudan `require()` ile bundle’a koymak.

---

## Yöresel lezzetler — 2 il → 81 il

Tam politika: [docs/MEDIA_IMAGES.md](../docs/MEDIA_IMAGES.md) §3.

### Şu an

- **12 JPG** `assets/regional-flavors/` (~**1,8–2,8 MB/adet**, toplam ~**28 MB** bundle).
- Hepsi `constants/regional-flavor-images.ts` içinde `require()` — **APK’ya gömülü**.
- 2 il için idare eder; **her il 10–20 lezzet** olunca bundle **yüzlerce MB** olur → indirme, bellek, Eğlence/Sofra donması.

### Hedef mimari (yeni iller)

| Katman | Ne |
|--------|-----|
| **Bundle’da** | Sadece **fallback** (mevcut 2 il) veya hiç — küçük, optimize JPG/WebP |
| **CDN / site** | `https://www.gastroskor.com.tr/...` veya API’den gelen `image_url` |
| **Mobil** | `expo-image` + `cachePolicy="memory-disk"` — `regionalProductImageSource()` zaten **yerel → remote** sırasını kullanıyor (`lib/regional-product-image.ts`) |

**Yeni il eklerken:**

1. Görseli **web/CDN’e** yükle (Vercel `public/` veya object storage).
2. Backend `regional-flavors` kaydına **URL** yaz.
3. Bundle’a **sadece** offline/fallback gerekiyorsa, optimize edilmiş **tek** kopya ekle — tüm ili bundle’a koyma.
4. Sofra arka planı için `sofraBackgroundForPuzzle()` uzun vadede **remote URI** desteklemeli (backlog).

### Yöresel lezzet export ayarı

- Format: **JPG kalite 75–82** veya **WebP**
- Tam ekran Sofra: **1080 px genişlik**, yükseklik oran korunur
- Liste/kart: **360 px** yeterli
- Dosya adı: `{il-slug}-{urun-slug}.jpg` (küçük harf, tire)

---

## GastroHub / Eğlence

- Yeni oyun ikonu → `gastro-hub/games/`, max **512×512**
- Yeni görev ikonu → `gastro-hub/tasks/`, max **192×192**
- `designs/` altındaki dosyalar **prod bundle’da kullanılmıyorsa** commit etme (sadece tasarım arşivi)

---

## Kontrol listesi (PR / build öncesi)

- [ ] Yeni PNG/JPG eklendi mi? → piksel ve KB tabloya uyuyor mu?
- [ ] 81 il mantığı: görsel **CDN/API** mi, gereksiz `require()` yok mu?
- [ ] Eğlence asset’i ise `optimize-eglence-images.ps1` çalıştırıldı mı?
- [ ] Release build sonrası Play’de **Eğlence sekmesi** smoke test (donma yok)

---

## Referans

- Optimizasyon script: `scripts/optimize-eglence-images.ps1`
- Yerel yöresel map: `constants/regional-flavor-images.ts`
- Remote öncelik: `lib/regional-product-image.ts`
- Eğlence donma teşhisi: 2026-06 — 1024² kart + 1536×1024 görev PNG’leri → 1.0.61’de küçültüldü

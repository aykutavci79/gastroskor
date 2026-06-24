# GastroSkor — görsel ve medya politikası

**Kapsam:** Mobil bundle, web statik dosyalar, Railway/S3 depolama, **kullanıcı ve işletme yüklemeleri**.

Altın kural:

> Kullanıcı ne yüklerse yüklesin, **sunucu kaydetmeden önce** boyutlandırır ve sıkıştırır.  
> Uygulama bundle’ına **dev dosya gömülmez**.  
> İstemci (mobil/web) mümkünse **URL + cache** kullanır; `require()` sadece küçük UI ikonları içindir.

---

## 1. Üç kanal

| Kanal | Örnek | Kim yükler | Nerede kurallanır |
|-------|--------|------------|-------------------|
| **A — Bundle** | Eğlence ikonları, logo | Geliştirici / tasarım | [mobile/assets/README.md](../mobile/assets/README.md) |
| **B — CDN / site statik** | Yöresel lezzet, blog, SSS | Admin / deploy | Bu dosya §3 + web `public/` |
| **C — Kullanıcı upload** | Yorum foto, avatar, menü | Kullanıcı / panel | **Backend Pillow** (§2) |

**81 il / binlerce yöresel lezzet** → kanal **B veya C**, kanal **A değil**.

---

## 2. Kullanıcı ve panel yüklemeleri (backend)

Depolama: `MEDIA_DATA_DIR` (Railway Volume) veya **S3/R2** (`media_storage=s3`).  
Kod: `backend/app/services/media_storage.py` + `*_image_storage.py`.

### Zorunlu pipeline (upload)

1. MIME doğrula (JPG / PNG / WEBP)
2. Max ham boyut (config)
3. **EXIF düzelt + thumbnail + WebP** (Pillow)
4. Sıkıştırılmış bytes’ı kaydet
5. Public URL döndür (`/media/...` veya CDN)

### Tür bazlı limitler (hedef)

| Tür | Endpoint / servis | Max kenar (px) | Format | Kalite | Durum |
|-----|-------------------|----------------|--------|--------|--------|
| Yorum fotoğrafı | `POST /reviews/{id}/images` | **1280** | WebP | 82 | ✅ `review_image_storage.py` |
| Profil avatar | `POST /users/me/avatar` | **512** | WebP | 85 | ✅ `user_avatar_storage.py` |
| Foodcast | foodcast upload | **1280** | WebP | 82 | ✅ (review compressor) |
| Panel menü görseli | `POST /panel/promo/menu-image` | **1280** | WebP | 82 | ⚠️ **Ham kayıt** — sıkıştırma eklenecek |
| Panel kart kapağı | `POST /panel/promo/card-cover-image` | **1280** | WebP | 82 | ⚠️ **Ham kayıt** (menu ile aynı) |
| İşletme belgesi (vergi vb.) | panel başvuru | — | Orijinal PDF/JPG | — | Belge; yemek fotoğrafı değil |

Ham upload **8 MB**’a kadar kabul edilebilir; diskte **WebP ~50–400 KB** hedeflenir.

### Henüz upload olmayan içerik

| Tür | Önerilen kanal | Max kenar | Not |
|-----|----------------|-----------|-----|
| Yöresel lezzet foto | CDN URL (API `image_url`) | 1080 (hero), 360 (kart) | Bundle fallback sınırlı |
| Restoran kapak (Google vb.) | Harici URL | — | Üçüncü taraf; istemci `expo-image` cache |
| Admin kampanya banner | CDN veya upload pipeline | 1280 | Panel/admin route + aynı compressor |

### Backlog (kod)

- [ ] `menu_image_storage.py` → review ile aynı WebP pipeline
- [ ] Ortak modül: `image_processing.py` (`compress_to_webp(data, max_edge, quality)`)
- [ ] Yöresel lezzet admin upload endpoint (varsa) aynı pipeline
- [ ] S3/R2 prod’da `Cache-Control: immutable` (menu/review’de var)

---

## 3. Yöresel lezzetler (ölçek)

**Şu an:** 12 JPG ~2 MB/adet, mobil bundle (`require`) — **2 il için bile büyük**.

**Hedef:**

```
Admin görsel yükler → backend WebP 1080px → R2/Volume URL
Mobil: regionalProductImageSource(slug, remoteUrl)  // yerel sadece fallback
```

Yeni il eklerken **APK’ya onlarca JPG ekleme**.  
Statik web: `frontend/public/regional-flavors/` — yine **1080px, ≤300 KB** export.

---

## 4. Mobil bundle (geliştirici görselleri)

Detay: [mobile/assets/README.md](../mobile/assets/README.md)

| Kullanım | Max piksel | Max dosya |
|----------|------------|-----------|
| Oyun kartı | 512² | 500 KB |
| Görev ikonu | 192² | 80 KB |
| Coin / cüzdan | 360 | 100 KB |

Commit öncesi: `mobile/scripts/optimize-eglence-images.ps1`

---

## 5. Web (Next.js)

- `public/` altı statikler: aynı piksel/KB hedefleri
- Kullanıcı içeriği: **backend URL**; Next.js’te mümkünse `next/image` + width/height
- Büyük hero: **1920 px genişlik** üst sınır, WebP tercih

---

## 6. İstemci gösterimi (mobil + web)

- Uzak URL: **`expo-image`** / lazy load, `cachePolicy="memory-disk"`
- Liste/kart: sunucudan **küçük variant URL** (ileride `?w=360` veya ayrı thumb key)
- Ekranda küçük alan → bundle’da dev dosya **yasak** (Eğlence donması dersi)

---

## 7. Railway Volume vs R2

| | Volume | R2 / S3 |
|---|--------|---------|
| Kullanım | Tek region, basit | CDN, ölçek, 81 il |
| Maliyet | GB başına | GB + egress (R2 egress düşük) |
| Kural | Aynı Pillow pipeline | Aynı pipeline |

Görsel sayısı arttıkça **R2 + public URL** tercih edilir; Volume geçiş / yedek için kalabilir.

---

## 8. Kontrol listesi

**Yeni upload endpoint yazarken:**

- [ ] Pillow ile resize + WebP
- [ ] Max edge tabloya uygun
- [ ] Ham boyut limiti (413)
- [ ] `ALLOWED_CONTENT_TYPES` dışı red
- [ ] Prod’da kalıcı depo (Volume veya S3)

**Yeni statik / bundle görseli:**

- [ ] Kanal A mı B mi? (81 il → B)
- [ ] Piksel ×3 retina kuralı
- [ ] Tek dosya ≤ 1 MB

**Release öncesi:**

- [ ] Eğlence sekmesi smoke (ağır PNG yok)
- [ ] Örnek yorum/menü upload → dosya boyutu KB mertebesinde mi

---

## 9. Referans (kod)

| Dosya | Rol |
|-------|-----|
| `backend/app/services/review_image_storage.py` | Yorum — örnek pipeline |
| `backend/app/services/user_avatar_storage.py` | Avatar |
| `backend/app/services/menu_image_storage.py` | Menü — **sıkıştırma eksik** |
| `backend/app/services/media_storage.py` | Volume / S3 |
| `mobile/lib/regional-product-image.ts` | Yerel → remote |
| `mobile/scripts/optimize-eglence-images.ps1` | Bundle optimizasyon |

**Olay:** 2026-06 Eğlence ANR — 1024² / 1536×1024 bundle PNG’leri; 1.0.61’de küçültüldü.

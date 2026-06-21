# Güvenlik & Bakım Backlog

> **Agent notu:** Her önemli oturumda bu dosyayı kontrol et. Aşağıdaki tetikleyici koşullardan biri gerçekleşmişse Aykut'a hatırlat.

## Bekleyen — Tetikleyici Koşulla

### 1. Expo SDK Major Upgrade (npm audit moderate temizliği)

- **Durum:** Ertelendi (21.06.2026)
- **Sebep:** 23 moderate npm audit açığı (js-yaml, postcss, uuid) Expo ekosistemi paketlerinden geliyor; `--force` ile düzeltmek major sürüm sıçraması gerektiriyor (breaking change riski).
- **Tetikleyici:** Aşağıdakilerden biri olduğunda bu işi yap:
  - Expo yeni bir SDK sürümü çıkardığında ve App Store / Play Store minimum sürüm gereksinimi yaklaştığında
  - Bu paketlerden biri moderate'tan high / critical'a yükseldiğinde (`npm audit` ile kontrol edilebilir)
  - Yeni bir major özellik için zaten Expo güncellemesi planlanıyorsa, o zaman bu işi de aynı pakete dahil et
- **Yapılacak:** `npm audit fix --force`, ardından TÜM uygulamayı (login, sipariş, sesli arama, jeton, kelime oyunu, panel) baştan sona test et.

### 2. Railway Pro Plan + DB Backup (PITR)

- **Durum:** Ertelendi (21.06.2026)
- **Sebep:** Şu an gerçek kullanıcı / sipariş yok; kayıp riski düşük, ~$20/ay maliyet şimdilik gereksiz.
- **Tetikleyici:** İlk gerçek restoran kaydı + online sipariş aktif olduğunda hemen Railway Pro'ya geç, PITR'ı aç.

### 3. Sentry'de Çözülmemiş Mobil Hatalar (İnceleme Bekliyor)

- **Durum:** Tespit edildi (21.06.2026)
- **Sebep:** Sentry mobil projesinde (gastroskor-mobile) birkaç haftadır açık/çözülmemiş gerçek hatalar birikmiş — örnek: "Panel erişimi yok" (8 events, 4 kullanıcı), "Sunucu hatası — migration eksik olabilir" (4 events), "Only one Recording object can be prepared" (19 events, 3 kullanıcı), "Cannot use href and tabBarButton together" (13 events, 8 kullanıcı, Escalating).
- **Tetikleyici:** Bir sonraki sakin oturumda (acil değil, kullanıcı şikayeti gelmedikçe) Sentry Issues sekmesinden bu hataları tek tek incele, kaç kullanıcıyı etkilediğine göre önceliklendir, gerçek bug'ları düzelt.
- **Not:** "Escalating" etiketli olanlar (artan trend) diğerlerinden öncelikli olmalı.

### 4. Kalan N+1/Performans İyileştirmeleri (Düşük Öncelik)

- **Durum:** Tespit edildi (21.06.2026), şimdilik ertelendi
- **Kapsam:**
  - `GET /restaurants/online-orders-open` — ownership filtrelemesi Python'da yapılıyor, SQL'e taşınmalı (ölçek büyüdükçe)
  - `GET /social/me/dm`, `eglence-leaderboard` — hâlâ per-row sorgu var
  - `GET /panel/menu` — restoran başına menü kalemi sayısında pratik sınır yok
- **Tetikleyici:** Restoran/kullanıcı sayısı önemli ölçüde artıp bu endpoint'lerde gerçek yavaşlama şikayeti gelirse ele al.

### 5. Sipariş Retention Cron'u Aktif Etme

- **Durum:** Hazır ama kapalı (21.06.2026) — `ORDER_RETENTION_CRON_ENABLED=false`
- **Sebep:** Şu an 5 yıldan eski sipariş kaydı yok (dry_run test: `anonymized=0`, `deleted=0`, `cutoff=2021-06-22`). Sistemin kendisi henüz bu kadar eski değil.
- **Tetikleyici:** 2031 yılına yaklaşırken (ya da daha erken, ilk kez dry_run'da `anonymized`/`deleted` sayısı 0'dan büyük çıktığında) `ORDER_RETENTION_CRON_ENABLED=true` yap ve Railway/Vercel cron zamanlamasına bağla (günlük/haftalık `POST /internal/cron/order-retention`).
- **Not:** Bu tarihe kadar periyodik olarak (örnek: yılda bir) `dry_run=true` ile kontrol edilip "hâlâ 0 mı" diye bakılabilir, zorunlu değil.

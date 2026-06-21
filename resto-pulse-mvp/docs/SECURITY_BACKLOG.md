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

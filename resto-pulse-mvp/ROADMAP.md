# GastroSkor — Yol Haritasi (Durum Ozeti)

> **Agent notu:** Aykut unutkan — her sohbet basinda bu dosyayi kontrol et; takili kalan
> madde varsa (Apple Pending, deploy, Faz D, magaza) kisa ve nazik hatirlat. Fazlara
> bolme onayli; kullaniciyi fazlarla bunaltma, sadece siradaki 1-2 adimi soyle.
> **"kral selam"** derse once asagidaki **Yarin backlog** bolumune bak.

Son guncelleme: 17 Haziran 2026

## Yarin backlog (EAS build tek seferde — quota koru)

> Aykut: kucuk fix icin tek basina build alma; asagidakileri topla, **1.0.10** ile birlikte build.

| # | Konu | Durum / not |
|---|------|-------------|
| 1 | **iOS Google giris** | Android web koprusu calisiyor; iOS native OAuth patliyor (EAS'ta iOS client ID yok). Kod hazir: iOS da web koprusu (`mobile/hooks/use-google-sign-in.ts`). Sürüm **1.0.10 (build 10)** local, henuz build yok. |
| 2 | **iOS one cikanlar yok** | Kod: trending ustte + `source: google` + arama hatasi trending'i dusurmuyor. **1.0.10 build** ile TestFlight. |
| 3 | **Web one cikan kart tiklanmiyor** | **Duzeltildi:** `FeaturedCityTop` + `TrendingRestaurants` → `trendingDetailHref` → `/place/[id]`. Vercel deploy. |
| 4 | **Toplu EAS build** | `eas build --profile production --platform all` + submit; iOS Internal TestFlight. |
| 5 | **Universal / App Links** | Kod hazir (`APP_LINKS.md`). Vercel: `ANDROID_SHA256_FINGERPRINTS`. **1.0.10 build** ile test. |

**Simdi calisan (build beklemeden):** Android 1.0.9 Google giris + push; iOS 1.0.9 Internal push (Google giris icin e-posta ile devam veya 1.0.10 bekle).

## Tamamlanan

| Alan | Ne yapildi |
|------|------------|
| Mobil kesfet | Kompakt kartlar, Google foto fallback, canli arama |
| Restoran detay | GS yorumlari, foto yukleme, Google fotolar |
| Web detay | Canli modal, foto carousel |
| Store hazirligi | Yasal sayfalar, EAS config, app.config.js |
| Google giris (mobil) | Web koprusu `/mobil-giris` + `/auth/google` callback |
| Yorum fotolari | WebP sikistirma, Railway volume notu |
| Bursa yoresel lezzetler | TPE katalogu (12 urun), urun karti → Google canli arama (web + mobil kod) |
| Destek e-postasi | `destek@gastroskor.com.tr` aktif (web + mobil yasal sayfalar) |

## Simdi eklendi (backend deploy gerekir)

| Alan | Ne yapildi |
|------|------------|
| Yorum moderasyonu | Kufur/argo filtresi, 1. uyari / 2. 7 gun ban / 3. 3 ay ban |
| Yararli + cevap | Tek tik yararli, yorum alti kullanici cevabi, duzenle/sil |
| Kufur sozlugu | `backend/app/services/profanity_tr.py` (genisletilebilir liste) |
| Gurme profil (E1) | Nickname + avatar preset/foto, `/users/gourmet-profile`, yorumda takma ad modu |

Railway: `alembic upgrade head` calistir (0016 + 0017 + **0024** gourmet profil).
**Not:** E1 backend kodu henuz GitHub/Railway'e push edilmediyse mobil profil **404 Not Found** verir — once backend deploy.

## Siradaki fazlar (plan — henuz yok)

### Faz A — Topluluk (devam)
1. ~~**Yararli bul** (tek tik begeni)~~
2. ~~**Tek seviye yanit** (yorum altina kisa cevap)~~
3. ~~Kullanici kendi yorumunu duzenle/sil~~
4. Bildirim: "Yorumun begenildi" / "Yorumuna cevap geldi"
5. **Isletme yaniti** (restoran resmi cevap)

### Faz B — Magaza
1. EAS preview build (Android APK / iOS TestFlight)
2. Play Store + App Store listesi
3. Native Google Sign-In (store build icin)

### Faz C — Panel / isletme
1. Mevcut panel iyilestirmeleri
2. Yorum moderasyonu panelden gorunurluk (sikayet listesi, ihlal gecmisi)
3. **Kufur/argo sozlugu panelden guncelleme** (`profanity_tr.py` yerine DB veya admin arayuzu)
4. **Isletme yaniti** panel ekrani (Faz A #5 ile birlikte)

**C5 — Restoran kayit / panele erisim (Aykut — kisa vade notu)**

> **Mevcut (kodda):** `/panel/claim` — isletme Google'da aranir → SMS OTP veya vergi levhasi yukleme → otomatik baglama (`ClaimRestaurantFlow`, `mobile/app/panel/claim.tsx`).

> **Istenen kisa vade:** Manuel onayli basvuru
> 1. Web formu: isletme adi, istedikleri **panel e-postasi**, telefon, adres/sehir, vergi levhasi (PDF/foto), opsiyonel web sitesi
> 2. Form gonderilince **destek@gastroskor.com.tr** (veya admin) adresine e-posta + ekler
> 3. Aykut inceleyip onaylar → admin panelden ilgili restorana `user_email` / panel erisimi tanimlar
> 4. Isletme o e-posta ile Google giris yapinca **restoran dashboard** acilir
> 5. Red durumunda otomatik e-posta (sebep opsiyonel)

- [ ] Public sayfa: `/isletme-basvuru` veya panel giris altinda "Basvuru yap"
- [ ] Backend: basvuru kaydi + e-posta (SMTP/Railway) veya form → Resend/SendGrid
- [ ] Admin: bekleyen basvurular listesi + onay/red (mevcut `grant-access` genisletilebilir)
- [ ] Mevcut SMS OTP akisi: istege bagli kalir (hizli self-serve) veya sadece onayli isletmelerde acilir

### Faz D — Restoran takip + takipci promosyonu (Aykut fikri — UNUTMA)

> Kullanicilar sevdikleri restoranlari takip eder; yeni GS yorumunda bildirim gider;
> uye isletmeler takipcilerine ozel promosyon yapar. B2B satis argumani: "Musterilerinizi
> takip ettirin, kampanya yapin."

**D1 — Takip + liste (once bu)** — mobil + API (Expo Go test)
- [x] Restoran detay: Takip et / Takipten cik (giris sart)
- [x] Profil: **Takip ettiklerim**
- [x] Backend: `user_restaurant_follows` + `/me/restaurant-follows`, follow/unfollow

**D2 — Yorum bildirimi**
- Onayli yeni GS yorumu → o restorani takip edenlere push (Expo token kaydi)
- Kullanici ayari: acik/kapali; spam icin limit / toplu ozet dusunulebilir
- Web: istege bagli e-posta

**D3 — Takipciye ozel promosyon** — v1 kodlandi
- [x] Panel: kampanya (% , gun, max kupon) + kupon dogrula (kullanildi)
- [x] Kisisel GS- kodu; takip aninda / kampanya acilisinda uretim
- [x] Mobil: takipci kupon kutusu (restoran detay)
- [x] Panel: **Takipçi listesi** (`/panel/followers`)
- [x] Mobil: kupon bildirimi (push + Profil → Bildirimler)
- Sadece `subscription_allows_promo` (aktif/trial uyelik)

**Notlar:** KVKK gizlilik maddesi; bildirim yorgunluguna dikkat. Magaza v1.0 sonrasi v1.1
icin uygun — Apple Active olunca magaza, sonra veya paralel D1 kodlanabilir.

### Faz E — Gurme Sohbetler (Aykut fikri — UNUTMA)

> Kanal adi: **Gurme Sohbetler**. "Bursada en iyi doner?" — nickname ile soru, cevaplar.
> Tavsiyede **GS restoran karti paylasilir**; soru soran karta tiklar → detay (puan, yorum,
> menu). Kesfet + topluluk tek akista.

**E1 — Nickname + profil** — kodlandi (mobil + API; Railway: `alembic upgrade head` 0024)
- [x] Kayit sonrasi veya ilk giris: takma ad sec (**benzersiz** — ayni takma ad baska kullaniciya verilemez; buyuk/kucuk harf ayni sayilir)
- [x] **Profil gorseli:** kendi fotosu VEYA hazir avatar (kullanici secer); nickname yaninda
- [x] Yorumlarda istege bagli nickname + avatar (display mode: takma ad)
- [x] Gurme Sohbetlerde nickname + avatar (E2 feed ile birlikte)

**E2 — Soru-cevap feed (sehir bazli)** — kodlandi (mobil + API; Railway: `alembic upgrade head` 0025)
- [x] Sekme adi: **Gurme Sohbetler**
- [x] Soru: sehir secimi — **Istanbul + Bursa** (acilis); UI cok sehirli, ileride genisleme
- [x] Soru: etiket (doner, sutlac, kahvalti...)
- [ ] Cevap: metin + **restoran karti embed** (foto, ad, GS puani) — tikla → restoran detay (E2.2 / kullanici odalari)

**E2.1 — Oda yapisi (fazli acilis)** — kodlandi (6 sistem odasi seed)
- [x] Baslangic: sistem odalari sabit (kullanicilar direkt oda acamaz)
- [x] 6 cekirdek oda adi:
  - `kes-donerciler`
  - `ocakbasi-muhabbeti`
  - `anne-eli-ev-yemegi`
  - `gece-acikanlar`
  - `fiyat-performans-avcilari`
  - `gizli-kalmis-mekanlar`
- [ ] Kural: once az ama aktif oda; kullanim oturunca "oda oner" ile yeni oda acilisi
- [ ] Ozel/kapali odalar: v1.0'da yok, moderasyon olgunlasinca degerlendir

**E2.2 — Restoran karti paylasim kurali** — kural kodda (sistem odalarinda kapali)
- [x] Sistem odalarinda restoran karti paylasimi kapali (reklam algisini azaltmak icin)
- [x] Restoran kartinda **Paylas** (sistem paylasim menusu — WhatsApp, Instagram, mesaj vb.)
- [x] Universal / App Links (iOS + Android): paylasim linki uygulama yukluysa uygulamada acilir — `mobile/APP_LINKS.md`, Vercel AASA + assetlinks, **1.0.10 build + SHA-256 env ile test**

**E2.3 — Gurme Sohbetler (web)** — henuz yok, degerlendir
- [ ] Web'de Gurme sekmesi / oda listesi + akan sohbet (mobil ile ayni API: `/gourmet-chat/*`)
- [ ] Giris: NextAuth (Google) — nickname zaten E1'de var
- [ ] Mobildeki kurallar gecerli: sistem odalarinda restoran karti embed yok
- [ ] Oncelik: mobil oturduktan sonra; SEO ve masaustu kullanicilar icin faydali

**E3 — Bildirim + moderasyon**
- Soruna cevap gelince push; kartli cevaplarda zengin onizleme
- Kufur/argo filtresi + raporla; isletme spam kurallari

**E4 — Bos sohbet guvenlik agi (3 dk AI oneri)**
- Soruya **3 dk** insan cevabi yoksa: GS **puan 4.5+** mekan oner (sehir + sorudan yemek tipi)
- Mesaj **GastroSkor Asistan** botu olarak (sahte kullanici degil); restoran karti ile
- Mevcut `gastro_score_ranking` + sehir filtresi; yemek tipi icin Gemini veya anahtar kelime
- Insan cevabi gelirse bot yaniti kalir veya "X de onerdi" ile birlesir

**Not:** WhatsApp degil — herkese acik soru-cevap. Faz D (takip) ile birlestirilebilir.
Acilis sehirleri: **Istanbul (hacim) + Bursa (yerel tohum)**; tek sehirle sinirlama yok.

## Magaza / hesap durumu (2 Haziran 2026)

### Apple (iOS)
- TestFlight **Internal**: **v1.0.9 (build 9)** Testing — push profili duzeltildi
- External (GE): 1.0.4 / 1.0.5 hala Waiting for Review (beklenebilir)
- Bundle ID: `com.gastroskor.app` · siradaki build: **v1.0.10** (backlog maddeleriyle)

### Google Play (Android)
- Play Console kapali test — 16 tester
- Paket: `com.gastroskor.app` · canli: **1.0.9 (versionCode 12)** AAB build alindi

### Ortak
- **Canli arama maliyet:** DB-once + 24s cache + tek Google istegi
- **Destek e-postasi:** `destek@gastroskor.com.tr` — **aktif, calisiyor**
  - Kodda zaten: web footer, gizlilik/KVKK/kullanim kosullari, hesap-sil, `mobile/constants/legal.ts`
  - Magaza konsollarinda da ayni adresi kullan (asagida)
- Sistem e-postalari (bildirim vb.): Railway `EMAIL_FROM` → genelde `noreply@gastroskor.com.tr` (destekten ayri)

### Siradaki magaza adimlari
1. Apple onay gelince tester linki paylas
2. Play kapali test geri bildirimlerini topla; kritik bug yoksa track yukselt
3. Native Google Sign-In (store build icin, Faz B)
4. EAS production submit (her iki platform, onay sonrasi)

## Yapilacaklar backlog (acele degil — Haziran 2026)

### Mac lokal build (EAS cloud yerine / ucretsiz)

> **Soru:** Expo kullanmadan build alabilir miyiz? MacBook var.

- **Kisa cevap:** Uygulama Expo SDK ile yazildi; **Expo'yu tamamen atlayamazsin** ama **EAS cloud (ucretli kota) sart degil** — Mac'te lokal build bedava.
- **Yol 1 (en kolay):** `eas build --profile production --platform ios --local` (veya android) — EAS CLI kullanir ama build **senin Mac'inde** calisir, cloud dakikasi yemez.
- **Yol 2 (tam native):** `npx expo prebuild` → `ios/` + `android/` → **Xcode Archive** (iOS) / `gradlew bundleRelease` (Android). `mobile/eas.json` ve `app.config.js` ayni kalir.
- **Hala gerekli:** Apple Developer **$99/yil** (TestFlight/App Store), Google Play **$25** tek sefer. Sertifika/provisioning Xcode veya `eas credentials` ile.
- **Arti:** Sinirsiz build, hizli iterasyon, cloud kuyruk yok.
- **Eksi:** CI otomasyonu sende; her gelistirici Mac + Xcode kurulumu; ilk kez sertifika ayari can sıkıcı.
- **Oneri:** iOS icin Mac + `--local` veya Xcode; Android icin Mac'te de alinir ama EAS cloud da makul. `mobile/STORE.md` + `APP_LINKS.md` ile birlikte bir kez dokumante edelim.

- [ ] `mobile/docs/LOCAL_BUILD_MAC.md` — prebuild, Xcode Archive, TestFlight yukleme adimlari
- [ ] `package.json` script: `build:ios:local` / `build:android:local` (`eas build --local`)
- [ ] Ilk deneme: **preview** profili ile iOS `.ipa` veya Android APK

### Sosyal kanit rozeti — tazelik & uygunluk (yapildi 18 Haz)

- **TTL 7 gun:** `social_proof_cache_ttl_hours=168` — sentiment yavas degisir, maliyet/tazelik dengesi. On-demand tembel yenileme korunur (sürekli tarama yok).
- **Yorum sayisi tabani:** `social_proof_min_reviews=1000` — az taninan mekan (or. 45 yorumlu 4.9) sosyal kanit listesine giremez. Tarama aninda `build_venue_results` filtreler.
- **Google puan kapisi:** `social_proof_min_rating=4.0` — puan altina duserse rozet gizlenir. Iki katman:
  - Tarama aninda (backend pipeline)
  - Gosterim aninda (frontend `socialItemEligible` — cache taze olsa bile guncel Google puani dususe rozet kaybolur; bedava, her render'da)
- **Acik kalan:** esikler env ile ayarlanabilir; gercek Bursa iskender taramasinda mention sayisi gorulunce `social_proof_min_*` ve Wilson esikleri ince ayar.

### GA4 — custom event'ler (web)

> **Durum:** Sadece otomatik `page_view` / `session_start` geliyor; aksiyon event'i yok.
> **Kurulum:** `frontend/components/GoogleAnalytics.tsx` (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `gtag` + `page_path` config).

**Hedef dosyalar (implementasyonda):**

| Aksiyon | Dosya / bilesen | Onerilen event |
|---------|-----------------|----------------|
| Anasayfa / sehir arama kutusu | `HomePageContent.tsx` → `LivePlaceSearch.tsx` | `search` (`search_term`, `city`) |
| Yol tarifi | `MapsDirectionsButton.tsx` | `restaurant_directions` |
| Telefon ara | `LivePlaceDetailPanel.tsx` (`tel:`) | `restaurant_call` |
| Menu goruntule | `RestaurantDetailView.tsx`, `RestaurantPublicMenu.tsx` | `restaurant_menu_view` |
| Takip et / cik | `RestaurantFollowButton.tsx` | `restaurant_follow` / `restaurant_unfollow` |
| (varsa) GS detay diger CTA'lar | `RestaurantDetailView.tsx`, `LivePlaceDetailPanel.tsx` | `restaurant_*` |

**Parametreler (tum restoran event'lerinde):** `restaurant_id`, `restaurant_name`; canli Google mekanlari icin `place_id` / `source: google`.

- [ ] `frontend/lib/analytics.ts` — `trackEvent(name, params)` helper (`gtag` yoksa no-op)
- [ ] Restoran detay CTA'lara event bagla (yukaridaki tablo)
- [ ] `LivePlaceSearch` submit'te `search` event (debounce / ilk anlamli arama)
- [ ] GA4 DebugView ile dogrula; Vercel deploy sonrasi

---


- Kufur, argo → yorum **yayinlanmaz**; isaretli kelimeler kirmizi gosterilir
- **Ban / strike yok** — isaretli kelimeler kirmizi; yorum yayinlanmaz
- Ana sayfa: tek arama (canli Google); ust bar **Kullanici girisi** + **Restoran girisi**; sehir konumdan
- Amac: saygin, yapici yemek toplulugu

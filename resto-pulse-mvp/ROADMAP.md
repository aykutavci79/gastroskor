# GastroSkor — Yol Haritasi (Durum Ozeti)

> **Agent notu:** Aykut unutkan — her sohbet basinda bu dosyayi kontrol et; takili kalan
> madde varsa (Apple Pending, deploy, Faz D, magaza) kisa ve nazik hatirlat. Fazlara
> bolme onayli; kullaniciyi fazlarla bunaltma, sadece siradaki 1-2 adimi soyle.

Son guncelleme: 2 Haziran 2026

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
| Yararli + cevap | Tek tik yararli, yorum alti kullanici cevabi, duzenle/sil |
| Kufur sozlugu | `backend/app/services/profanity_tr.py` (genisletilebilir liste) |

Railway: `alembic upgrade head` calistir (0016 + 0017).

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

**E1 — Nickname + profil**
- Kayit sonrasi veya ilk giris: takma ad sec (benzersiz, moderasyon)
- **Profil gorseli:** kendi fotosu VEYA hazir avatar (kullanici secer); nickname yaninda
- Gurme Sohbetlerde ve istege bagli yorumlarda nickname + avatar

**E2 — Soru-cevap feed (sehir bazli)**
- Sekme adi: **Gurme Sohbetler**
- Soru: sehir secimi — **Istanbul + Bursa** (acilis); UI cok sehirli, ileride genisleme
- Soru: etiket (doner, sutlac, kahvalti...)
- Cevap: metin + **restoran karti embed** (foto, ad, GS puani) — tikla → restoran detay

**E2.1 — Oda yapisi (fazli acilis)**
- Baslangic: sistem odalari sabit (kullanicilar direkt oda acamaz)
- 6 cekirdek oda adi:
  - `kes-donerciler`
  - `ocakbasi-muhabbeti`
  - `anne-eli-ev-yemegi`
  - `gece-acikanlar`
  - `fiyat-performans-avcilari`
  - `gizli-kalmis-mekanlar`
- Kural: once az ama aktif oda; kullanim oturunca "oda oner" ile yeni oda acilisi
- Ozel/kapali odalar: v1.0'da yok, moderasyon olgunlasinca degerlendir

**E2.2 — Restoran karti paylasim kurali**
- Uygulama ici restoran karti paylasimi: sadece kullanici olusturulan odalarda acik
- Sistem odalarinda restoran karti paylasimi kapali (reklam algisini azaltmak icin)
- WhatsApp paylasimi: restoran kartinda "WhatsApp'ta paylas" aksiyonu olacak
- Growth notu: paylasilan kart linki uygulamaya/deep-link'e yonlenir; uygulama kurulumu tesvik edilir

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

## Magaza / hesap durumu (1 Haziran 2026)

- Apple Developer: odeme tamam (siparis W1619280238), kimlik dogrulama gonderildi, **Pending**
- Active + Team ID gelince: App Store Connect, `com.gastroskor.app`, EAS iOS build
- **Google Play Console:** kayit **tamam** (`coolisback@gmail.com`, gelistirici adi GastroSkor, ~25 USD)
- Play dogrulama: kimlik + **telefon faturasi** gonderildi (1 Haziran), Google donus bekleniyor (~1-2 is gunu)
- Play kalan: Android cihaz dogrulama (Console mobil uygulama), SMS telefon (kimlik onayindan sonra)
- **Canli arama maliyet (1 Haziran):** DB-once + 24s cache + tek Google istegi (`live_place_search_service.py`, `data/place_search_cache/`)
- Play hazir olunca: uygulama `com.gastroskor.app`, internal track, EAS Android submit
- Mail TODO: `destek@gastroskor.com.tr` (derivekemik cPanel — addon domain veya yonlendirme)

## Topluluk kurallari (moderasyon)

- Kufur, argo → yorum **yayinlanmaz**; isaretli kelimeler kirmizi gosterilir
- **Ban / strike yok** — isaretli kelimeler kirmizi; yorum yayinlanmaz
- Ana sayfa: tek arama (canli Google); ust bar **Kullanici girisi** + **Restoran girisi**; sehir konumdan
- Amac: saygin, yapici yemek toplulugu

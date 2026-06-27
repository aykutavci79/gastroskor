# GastroSkor — Yol Haritasi (Durum Ozeti)

> **Agent notu:** Aykut unutkan — her sohbet basinda bu dosyayi kontrol et.
> **"kral selam"** → asagidaki **Siradaki 1-2** bolumune bak.
> **"yapilacaklar listesi"** → **Tamamlanan** vs **Backlog** ozetle; 1-2 oncelik hatirlat.

**Son guncelleme:** 25 Haziran 2026

---

## Siradaki 1-2 (oncelik)

| # | Ne | Not |
|---|-----|-----|
| 1 | **MacBook → iOS TestFlight** | Ayni kod (`git pull`); 1.0.52+ lexicon hazir |
| 2 | **Gorev UI gercek durum** | `invite` / `review` su an demo state — backend baglantisi + yorum jetonu |
| 3 | **Rehberden arkadas bul (F1)** | ~1-2 gun dev (asagida detay); Mac gelince iOS izin testi kolay |

---

## Tamamlanan (Haziran 2026 — guncel)

### Magaza & build
| Alan | Durum |
|------|--------|
| Android kapali test | **1.0.52 (versionCode 63)** — Gastroskor-test2, lokal AAB + EAS upload key |
| Lokal Android build | `npm run build:android:local` + `submit:android:local` (Windows, `C:\dev\gs` veya kisa yol) |
| iOS | Mac bekleniyor; son EAS notu 1.0.50 / build 52 TestFlight |

### Eglence — oyunlar
| Oyun | Durum |
|------|--------|
| **Kelime Sofrasi** | Gunluk bulmaca havuzu (API+cron), Word Tracer fix, layout iyilestirme (test edilecek) |
| **Günlük Kelime** | Wordle 5x6, gastro-lexicon **5302 tahmin / 3658 cevap** |
| **Kelime Yarismasi** | 1500 soru, 6 tur |
| **Mini Sudoku** | 6x6, can/ipucu/not modu, beyaz board |
| **Sudoku 9x9 zor** | ~~Backlog~~ — tamam |
| **Soru-Cevap** | Gurme odalari (6 sistem odasi) |

### Lexicon
| Alan | Durum |
|------|--------|
| `gastro-lexicon` | TDK gist + Sofra + Yarismasi → `npm run build:lexicon` |
| Tam set | 7885 kelime; Sofra `tdkLexicon()` genisletildi |
| Repo | Commit `6c35efc` main'de |

### Jeton & Eglence hub
| Alan | Durum |
|------|--------|
| Backend wallet + ledger | Railway canli |
| Gunluk giris odulu | +10 jeton, gunluk 1x (idempotency backend'de) |
| Davet linki (F2) | `gastroskor.com.tr/invite?ref=` + paylasim + referral jeton |
| Jeton gorev sheet | Eglence header chip |
| Hub UI | Gunluk gorevler + Gastro-Market (oyun haklari) |

### Urun / backend
| Alan | Durum |
|------|--------|
| Kesfet canli arama | Named search fix (or. "taskin doner") |
| Isletme panel basvurusu | `/isletme-basvuru` + admin onay — **test edildi, calisiyor** |
| Restoran takip + kupon (D3) | Kodda |
| Gurme Sohbetler (E2) | Mobil odalar |
| Gurme profil nickname (E1) | Kodda |

---

## Bilinen sorunlar / dikkat

| Konu | Aciklama |
|------|----------|
| **Gorev listesi demo** | ~~invite/review sabit tamamlandi~~ — wallet API ile guncellendi (mobil build gerekir) |
| **20 jeton / gun** | Muhtemel: **hos geldin 10** (ilk wallet acilisi) + **gunluk giris 10** — ikinci giris backend'de tekrar vermemeli. Ledger'dan dogrulanmali |
| **Yorum klavyesi** | Restoran detayda form klavyenin altinda kalabiliyor — ayri fix gerekir |

---

## Backlog (acele degil)

### Jeton gorevleri (kisa vade)
- [x] Gunluk giris, takip paketi, davet referral, siparis jetonu (backend)
- [x] Hub gorev kartlari API'den (`review/order/referral_earn_today`)
- [x] Yorum jetonu +5 (GS yorum gonderiminde)
- [ ] Online siparis gorevi UI netlestirme (Keşfet yonlendirme var)

### Faz F — Rehberden arkadas bul (F1)

> **Ne zaman:** Mac oncesi Android prototip mumkun; tam test icin Mac + iOS izin metinleri ideal.
> **Sure tahmini:** **1-2 is gunu** (tek gelistirici, odakli)

| Parca | Is | Sure |
|-------|-----|------|
| Backend | `user_phone_hash` kolonu + `POST /social/contacts/match` + rate limit | ~4 saat |
| Mobil | `expo-contacts`, +90 normalize, hash, **Arkadas bul** ekrani | ~6 saat |
| Uyum | KVKK metni, Play/App Store privacy declaration | ~1-2 saat |
| Test | Android + iOS izin akislari | ~2 saat |

**Bagimliliklar:** Kullanicinin telefon numarasi kayitta yoksa once opsiyonel telefon dogrulama veya sadece “rehberde kayitli olanlari eslestir” (hash eslesmesi icin kayitli kullanicilarda hash gerekir).

**F2 davet linki** — [x] kodda. **F4 arkadaslarin bugun widget** — [ ] bekliyor.

### Online rezervasyon (cift onay) — planlandi 25 Haz 2026

> **Ne zaman:** Aykut onayladi; online siparis/calisma saatleri sonrasi veya paralel MVP.
> **Sure tahmini:** **3-5 is gunu** MVP (oturma plani haric).

**Akis (telefon aramasi yok):**

1. Musteri: tarih, saat, kisi sayisi, not (cam kenari / orta / bebek sandalyesi…) → talep
2. Restoran panel: Onayla / Reddet
3. Musteri push: "Restoran onayladi — siz de onaylayin"
4. Musteri uygulamada onaylar → **kesinlesti**
5. Sure asimi: musteri 24s onaylamazsa `expired`

**Durumlar:** `pending_restaurant` → `approved_by_restaurant` → `confirmed` | `rejected` | `cancelled` | `expired`

**MVP kapsam:**

| Parca | Is |
|-------|-----|
| DB | `restaurant_reservations` + `online_reservations_enabled` (ownership) |
| API | POST talep, panel list/decide, musteri confirm |
| Panel | Rezervasyon sekmesi + `new_reservation` bildirim (siparis zili kalibi) |
| Mobil | Form + "onay bekliyor" / "siz onaylayin" ekrani + push deep link |
| Not | Serbest metin + hazir etiketler (cam kenari, sigara icilmez alan istiyorum vb.) |

**v1.5 — alan / masa tercihi:**

- Musteri ilk kez de gelebilir, mudur mekani de — ikisi icin ayni harita:
  - **Bilmeyen:** Bolge secimi (Salon / Bahce / Teras / Cam kenari…) — acik alan adlari yeterli
  - **Bilen:** Plandan **masa sec** (or. "Bahce 7")
- **Sigara metni yok:** "Sigara serbest/yasak" UI'da yazilmaz; TR'de bahce/teras = ortak anlasilan kod, salon = kapali. Sadece alan adi.
- Panel: bolge + masa; opsiyonel `area_type: indoor | outdoor | semi_outdoor` (sadece filtre/ikon icin, musteriye sigara etiketi yok).
- Mobil: tarih/saat/kisi → plan veya bolge listesi → secim → cift onay.

**v2 (sonra):** Gorsel plan editor (surukle birak), cakisma, bekleme listesi.

**Mevcut altyapi:** Panel bildirim (`panel_notification_jobs`), musteri push token, telefon/ad profili, calisma saatleri tablosu.

### Urun / topluluk
- [ ] Yorum klavyesi fix (restoran detay)
- [ ] Bildirim: yorum begenildi / cevap geldi (Faz A)
- [ ] Isletme resmi yanit
- [ ] Gurme Sohbet: cevapta restoran karti embed (E2)
- [ ] Gurme Sohbet web (E2.3)
- [ ] TDK v12 tam sozluk (99k) — `ogun/guncel-turkce-sozluk` build script genisletme

### Sesli sipariş (mimari onayli)
- [ ] iOS: Whisper backend (kalici)
- [ ] Android: simdilik `expo-speech-recognition`; sonra istege bagli Whisper

### Sesli sipariş — takip listesi scope — onaylandi 25 Haz 2026

> **Ne zaman:** Sesli sepet / akilli sepet sonrasi kisa sprint.
> **Sure tahmini:** **1-2 is gunu**.

**Problem:** Akilli sepet tum online havuzda en ucuz restorani secer — risk istemeyen kullanici tanidik yer ister.

**Akis:**

1. Parser: `takip listem`, `takip ettiklerim`, `favorilerim` → `scope: follows_only`
2. Mod B: `takip listemden X restorandan 3 lahmacun 1 salgam` → ad takip listesinde zorunlu
3. `GET /me/restaurant-follows` ID’leri ∩ online siparis acik ∩ menude urun
4. `rankSmartCartCandidates` sadece bu havuzda (butce ayni)
5. Takip bos / eslesme yok → net TTS + opsiyonel genel arama
6. Profil toggle: **Sesli sipariste sadece takip ettiklerim** (varsayilan kapali)

**Ek:** `salgam` voice catalog alias; follower kupon sepet ozetinde goster.

**Mevcut altyapi:** `listRestaurantFollows`, `smart-voice-cart.ts`, `parse-voice-order-query.ts`.

### Web / analitik
- [ ] GA4 custom event'ler (arama, yol tarifi, takip…)

### Magaza
- [ ] Mac: Xcode Archive → TestFlight (1.0.52+)
- [ ] iOS Google giris web koprusu test
- [ ] Play kapali test → acik test / production (geri bildirim sonrasi)

---

## Magaza durumu (21 Haziran 2026)

| Platform | Surum | Track |
|----------|--------|--------|
| **Android** | 1.0.52 (63) | Kapali test — Gastroskor-test2 |
| **iOS** | 1.0.50 (52) not | TestFlight — Mac ile guncellenecek |
| **API** | Railway | `api.gastroskor.com.tr` — ok |
| **Web** | Vercel | www.gastroskor.com.tr |

**Destek:** destek@gastroskor.com.tr

---

## Eski notlar (arsiv — 1.0.10 backlog artik gecersiz)

<details>
<summary>Eski "Yarin backlog" (Haziran basi — referans)</summary>

- iOS Google giris, one cikanlar, App Links → sonraki buildlerde parca parca alindi
- Web one cikan kart → duzeltildi

</details>

---

## Vizyon hatirlatmalari (uzun vade)

- **Faz D:** Restoran takip + takipci promosyonu — D1/D3 kodda; D2 yorum bildirimi bekliyor
- **Faz E:** Gurme Sohbetler — E2 calisiyor; embed kart + web + AI oneri (E4) bekliyor
- **Faz C:** Panel kufur sozlugu admin, isletme yaniti paneli
- Topluluk: saygin yorum kulturu, kufur filtresi aktif

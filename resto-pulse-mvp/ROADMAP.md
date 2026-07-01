# GastroSkor — Yol Haritasi (Durum Ozeti)

> **Agent notu:** Aykut unutkan — her sohbet basinda bu dosyayi kontrol et.
> **"kral selam"** → asagidaki **Siradaki 1-2** bolumune bak.
> **"yapilacaklar listesi"** → **Tamamlanan** vs **Backlog** ozetle; 1-2 oncelik hatirlat.

**Son guncelleme:** 2 Temmuz 2026 (iOS 1.0.75 build 56 — App Review; Play kapali test 101)

---

## Siradaki 1-2 (oncelik)

| # | Ne | Not |
|---|-----|-----|
| 1 | **iOS App Review (build 56)** | 4.8 Apple Sign-In fix — **Waiting for Review**; sonuc gelene kadar bekleniyor |
| 2 | **Play kapali test 101** | Lokal AAB yuklendi; Google incelemesi (genelde saatler–1-2 gun) |
| 3 | **Online siparis detay saat banner** | Liste karti bitti; kirmizi `Calisma saati HH:MM` |
| 4 | **Rezervasyon prod smoke** | Tester restoran + Railway; uctan uca panel → push → confirm |

**iOS onayi sonrasi:** [Online siparis odeme tercihi (yemek kartlari)](#online-siparis--odeme-tercihi-yemek-kartlari--backlog-1-temmuz-2026)

---

## Online siparis — calisma saati UI (Haziran 2026)

> **Ne istedik:** Kapali restoranda belirsiz *"Kapali · bugun 11:00'de acar"* yerine net **calisma araligi** — kirmizi, ince satir.

| Parca | Durum | Detay |
|-------|--------|--------|
| Backend | [x] kodda | `online_order_hours_range_label` — or. `Calisma saati 11:00-23:00`; bugun kapali gun → `Bugun siparis alinmiyor` |
| Liste karti | [x] kodda | `OnlineOrderRestaurantCard` — kapali iken kirmizi `hoursLine`; sol serit **puan bandi** rengi (indirim degil) |
| API deploy | [ ] | Railway — yeni alan canliya cikmadan kartta saat gorunmeyebilir |
| **Detay ekrani** | [ ] | `OnlineOrderDetailScreen` banner hâlâ eski `online_order_hours_label` — ayni kirmizi aralik formatina gecirilecek |
| Acik restoran | opsiyonel | Istenirse acikken de ince `11:00-23:00` gosterilebilir (simdi sadece kapali) |

**Dosyalar:** `online_order_hours.py`, `OnlineOrderRestaurantCard.tsx`, `OnlineOrderDetailScreen.tsx`

---

## Online siparis — odeme tercihi (yemek kartlari) — backlog 1 Temmuz 2026

> **Ne zaman:** iOS onayindan bagimsiz sprint (Temmuz 2026) — **kod hazir**, Railway migrate + deploy gerekir.
> **Sure tahmini:** **~1 is gunu** (backend enum + panel checkbox + mobil chip secici).

**Karar (Aykut):**

- GastroSkor **odeme almaz** — tahsilat restoran/kurye cihazinda (POS, temassiz telefon).
- Musteri siparis gondermeden **odeme yontemi secer**; restoran panelde badge + mutfak notu gorur.
- Restoran panelden **kabul ettigi yontemleri acar**; musteri sadece o listeyi gorur.

**Master liste (panelde tumu tanimli):**

| Kod | Etiket |
|-----|--------|
| `cash` | Kapida nakit |
| `card_at_door` | Kapida kredi / banka karti |
| `multinet` | Multinet |
| `pluxee` | Pluxee (eski Sodexo) |
| `ticket` | Ticket Restaurant (Edenred) |
| `setcard` | Setcard |
| `metropol` | MetropolCard |
| `paye` | Paye Kart |
| `tokenflex` | Token Flex |
| `yemekmatik` | Yemekmatik |
| `edenred` | Edenred |
| `winwin` | Winwin |
| `custom` | Restoranin yazdigi ozel metin (or. Adana Kent Kart) |

**MVP kapsam:**

| Parca | Is |
|-------|-----|
| DB | `restaurant_orders.payment_method` + ownership `accepted_payment_methods[]` + `custom_payment_label` |
| API | Siparis create/read; restoran promo/ownership okuma |
| Panel | Checkbox list + opsiyonel ozel yemek karti metin kutusu |
| Mobil | `OnlineOrderSection` + `OnlineOrderDetailScreen` — zorunlu chip/radio; restoran listesine gore filtre |
| Panel siparis | Odeme yontemi badge (Multinet vb.) |

**Bilerek yapilmayacak:** iyzico, kart/token saklama, yemek karti API / bakiye dogrulama.

**Simdiki durum:** Backend + panel + mobil chip secici tamam. Deploy sonrasi restoran panelden yontem acar; musteri zorunlu secer.

**Dosyalar (plan):** `restaurant_order.py`, `entities.py`, `RestaurantPromoSettings.tsx`, `OnlineOrderSection.tsx`, `OnlineOrderDetailScreen.tsx`

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
| **Online rezervasyon MVP** | Cift onay, masa plani, panel, mobil, occasion, vitrin — commit `6ecf2cc`…`550e536` |

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

### Online rezervasyon (cift onay) — MVP [x] kodda (Haziran–Temmuz 2026)

> **Durum:** Aykut onayli spec uygulandi. Selamda hatirlatma yok — detay icin bu bolum veya `yapilacaklar listesi`.

**Akis (telefon aramasi yok):**

1. Musteri: tarih, saat, kisi, not, opsiyonel ozel gun → talep
2. Restoran panel: Onayla / Reddet
3. Musteri push: "Restoran onayladi — siz de onaylayin"
4. Musteri uygulamada onaylar → **kesinlesti**
5. Sure asimi: musteri 24s onaylamazsa `expired` (`customer_confirm_expires_at`)

**Durumlar:** `pending_restaurant` → `approved_by_restaurant` → `confirmed` | `rejected` | `cancelled` | `expired`

**Tamamlanan (MVP + v1.5):**

| Parca | Durum | Not |
|-------|--------|-----|
| DB | [x] | `restaurant_table_reservations`, `online_reservations_enabled`, `max_party`, `occasion_type` |
| API | [x] | Talep, panel list/decide, musteri confirm, floor plan active |
| Panel | [x] | Rezervasyon sekmesi, toggle, `new_reservation` bildirim, occasion rozeti, vitrin basvurusu |
| Mobil | [x] | Masa plani, form, onay modal, durum ekrani, push deep link (`/online-rezervasyon/[id]`) |
| Ozel gun | [x] | 8 tip sheet + backend enum + panel/bildirim label — `550e536` |
| Masa plani | [x] | Canvas secim, kapali masa, max kisi limiti, salon fotosu / gece temasi |
| E2E script | [x] | `backend/scripts/reservation_e2e.py` + `run-reservation-e2e.ps1` (lokal Postgres) |

**Dosyalar:** `reservation_routes.py`, `table_reservations.py`, `PanelReservationsSection.tsx`, `mobile/app/online-rezervasyon/`, `ReservationOccasionPicker.tsx`

**Backlog — rezervasyon (siradaki teknik):**

| Oncelik | Is | Not |
|---------|-----|-----|
| 1 | **Prod smoke** | Tester restoran + Railway migration; uctan uca panel → push → confirm |
| 2 | **i18n** | Mobil occasion 9 dil + onay/durum ekrani `t()` — tamam (2026-07) |
| 3 | **v2 occasion** | Panel checklist / otomatik arama listesi (opsiyonel) |
| 4 | **v2 plan** | Surukle-birak editor, cakisma, bekleme listesi |

**Expire sweep:** [x] Saatlik cron — `expire_stale_customer_confirm_reservations` + Vercel `/api/cron/reservation-expirations`

### Online kurye — KVKK uyumlu arama (planlandi 1 Tem 2026)

> **Ne zaman:** Kendi kuryeli restoranlar canliya cikinca; panelde `tel:` ile ham numara **KVKK riski**.
> **Sure tahmini:** **2-4 is gunu** MVP (saglayici secimi + entegrasyon).

**Problem:**

- Restoran/kurye musterinin **gercek cep numarasini** gorup dogrudan arayamaz (KVKK — ucuncu tarafa acik numara + amac sinirlama).
- **Simdiki durum:** Panel siparis kartinda `customer_phone` + `tel:` linki (`PanelOrdersSection`) — kuryeye yazdirilan formda da ayni numara.
- Musteri tarafinda da kurye/restoran numarasi **maskelenmeli** veya uygulama uzerinden **kopru arama** olmali.

**Hedef akis:**

1. Siparis `on_way` / `preparing` → panel + mobil takipte **Ara** butonu
2. Arama **platform uzerinden** (sanal numara veya VoIP) — taraflar birbirinin ham numarasini gormez
3. Arama yalnizca **aktif siparis penceresinde** (or. onay → teslim + 30 dk); log tutulur
4. Panel yazdirma: **gunluk siparis no** (`daily_no`) + adres; ham telefon opsiyonel / maskeli

**Secenek karsilastirma (ucuz olan MVP):**

| Yontem | Nasil | Arti | Eksi | Maliyet (kabaca) |
|--------|--------|------|------|------------------|
| **A — Sanal / maskeli numara** | Netgsm, Mutlucell, Twilio Proxy vb.; siparis basina gecici kopru (0850 / sanal hat) | Kurye normal telefonundan arar; entegrasyon orta | Hat/kanal basina aylik + dk basi | Dusuk hacimde genelde **en ucuz** |
| **B — In-app VoIP** | Twilio/Vonage Voice SDK; uygulama icinden arama | Numara hic acilmaz | Kurye uygulama acmali; daha fazla gelistirme | DK basi; dusuk hacimde A'ya yakin |
| **C — Ham `tel:` link** | Mevcut panel | Sifir is | **KVKK uyumsuz** — yapma | — |

**Karar:** Oncelik **A** icin 2 saglayici fiyat teklifi al; pilot hacim (<100 arama/ay) icin A vs B toplam maliyeti karsilastir. “Numara mask / sanal santral” tipi TR saglayicilar yeterli.

**Mevcut altyapi (yeniden kullan):**

- Musteri `order_phone_e164` + OTP dogrulama (`order_phone_verification`)
- `phone_masked` API’de; `daily_no` gunluk siparis referansi
- Panel `has_own_courier` rozeti — arama butonu bu modda acilir

**MVP kapsam:**

| Parca | Is |
|-------|-----|
| Arastirma | Netgsm / Mutlucell / Twilio Proxy fiyat + API dokumani |
| Backend | Siparis → kopru numara provision; suresi dolunca release; arama logu |
| Panel | `tel:` kaldir → **Ara** (kopru veya callback); yazdirma formunda maskeli no |
| Mobil | Siparis takip: **Ara kurye** / **Ara restoran** (aktif siparis) |
| KVKK | Aydinlatma metni + siparis sirasinda arama amaci; veri isleme kaydi |

**v2:** Musteri ↔ kurye cift yonlu mask; ses kaydi yok; restoran sabit sanal hat.

- [ ] Saglayici secimi (maliyet karsilastirmasi)
- [ ] Backend kopru numara servisi
- [ ] Panel: ham telefonu kurye gorunumunden kaldir / maskele
- [ ] Mobil: aktif siparis **Ara** butonu
- [ ] KVKK metinleri (web + uygulama)

### Yabanci dil entegrasyonu

> Kademeli rollout; TR varsayilan.

- [x] Mobil i18n altyapisi — 9 dil (`locales/*/common.json`, `LanguageSwitcher`)
- [ ] Ekran bazli tamamlama (rezervasyon, panel kritik metinler hâlâ karisik)
- [ ] **Siparis notu ceviri** — musteri notu kendi dilinde; panelde **TR ozet** + orijinal (DeepL/Google; siparis basina ~$0)
- [ ] Siparis **hazir etiketleri** (mayonez yok, acik ayran…) — mutfak icin dil bagimsiz chip’ler
- [ ] Sesli siparis: parser + TTS dil secimi
- [ ] Web + panel: siparis, rezervasyon, menu kritik akislar
- [ ] Restoran menu cok dilli alanlar (panelden opsiyonel)

### Yoresel lezzetler — i18n (1 Tem 2026)

**Tamamlandi — indication_type etiketi**

- **Sorun:** API `item.indication_type` Turkce geliyordu (`Mahreç İşareti`, `Menşe adı`) — frontend oldugu gibi basiyordu; IT/EN/AR ekranda Turkce kaliyordu.
- **Cozum:** `mobile/app/yoresel/index.tsx` — `indicationTypeKey()`:
  - `mahreç işareti` → `yoresel.indicationType_mahrecIsareti` (or. IT: *Indicazione Geografica Protetta*)
  - `menşe adı` → `yoresel.indicationType_menseAdi`
  - diger → `yoresel.indicationType_other`
- **Dosyalar:** `yoresel/index.tsx`, `locales/*/common.json` (`yoresel.indicationType_*`)

**Backlog — DB icerigi (frontend cozemez)**

- [ ] **`item.name`, `item.summary`, `item.region`** — veritabani / geo urun kaynagi; cok dilli alan yok → yabanci dilde ekran Turkce metin gosterir.
- [ ] Backend: urun basligi + ozet + bolge icin **TR + EN** (min.) veya JSON `translations`; API locale query param veya `Accept-Language`.
- [ ] v2: 9 dil tam matris (TURKPATENT resmi adlari ayri is paketi).

> **Not:** SS ve App Store icin yoresel kart goruntusu TR kalabilir; turist kitlesi icin EN ozet backlog.

### Web — ziyaretci asistani (planlandi 1 Tem 2026)

> **Ne zaman:** App Store review sonrasi veya isletme basvurusu arttiginda. **Acil degil.**
> **Sure tahmini:** **0.5 gun** (SSS widget) — **1-2 gun** (FAQ-locked LLM bot).

**Ihtiyac:** Web’e giren ziyaretci “GastroSkor nedir, ne yapar?” sorar. **Mevcut:** `/sss` + `faq-content.ts` (JSON-LD) — chatbot yok.

**Secenekler (pahali → ucuz):**

| Katman | Ne | Maliyet | Not |
|--------|-----|---------|-----|
| **0 — Simdi** | Footer / ana sayfa **SSS** linki belirgin; “Isletme basvurusu” CTA | **0 ₺** | Cogu soruyu karsilar |
| **1 — SSS arama widget** | `GASTRO_FAQ_ITEMS` uzerinde client-side filtre + “Sorunu yaz” | **0 ₺** | Halüsinasyon yok |
| **2 — FAQ-locked bot** | Groq/OpenAI; yalnizca `faq-content` + ROADMAP ozeti context; web API route | **~$5-20/ay** dusuk trafik | Yanlis cevap riski dusuk |
| **3 — Canli destek** | Crisp / TidyChat ucretsiz katman | **0-30 €/ay** | Insan + basit bot |
| **4 — Intercom vb.** | Tam urun | **$$$** | Erken asama icin gereksiz |

**Karar:** Once **katman 0-1**; gercek destek maili artarsa **katman 2**. Restoran B2B sorulari icin panel onboarding PDF zaten var.

- [ ] Ana sayfa / footer “Yardim · SSS” one cikar
- [ ] Opsiyonel: floating SSS arama widget (`faq-content.ts`)
- [ ] v2: FAQ-locked Groq asistan (`/api/site-assistant` veya Railway)

### Web / analitik
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

## Magaza durumu (1 Temmuz 2026)

| Platform | Surum | Track / durum |
|----------|--------|--------|
| **Android** | 1.0.75 (101) | Kapali test — Gastroskor-test2; Google incelemesinde |
| **iOS** | 1.0.75 (56) | App Store Review — 4.8 Apple Sign-In fix |
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

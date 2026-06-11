# CONTEXT

Bu dosya, yeni sohbetlerde baglami hizlica geri kazanmak icin tutulur.
Her oturum sonunda 2-5 dakika ayirip guncelle.

## 1) Proje Amaci
- Ana uygulama: `nextjs_space` altinda cok dilli (tr/en/fr/ar) Next.js 14 web platformu.
- Mobil uygulamalar (ayri Expo projeleri, ayni repoda klasor bazli):
  - `aile-finans`: aile finans / zeytin odakli ilk mobil deneme.
  - `bahce-ustasi`: zeytin bahcesi kayit, rehber, harita, bildirimler, Supabase senkron (aktif gelistirme burada).
- Hedef kullanici: webde hikaye/oyku icerigi tuketen kullanicilar + admin paneli kullanan editor/admin.
- Basari kriteri:
  - Public sayfalar sorunsuz aciliyor ve icerik gezintisi calisiyor.
  - Admin tarafinda icerik/yorum/kullanici islemleri API ile tutarli calisiyor.
  - Cok dilli rotalar (`/`, `/en`, `/fr`, `/ar`) stabil calisiyor.

## 2) Teknoloji ve Kurulum
- Tech stack:
  - Web: Next.js 14 + React 18 + TypeScript + Tailwind + Prisma + NextAuth.
  - Mobil: Expo 54 + React Native 0.81 + Expo Router.
- Paket yoneticisi: `npm` (her iki projede de lock dosyasi mevcut).
- Web calistirma:
  - `npm install`
  - `npm run dev`
- Web build/start:
  - `npm run build`
  - `npm run start`
- Web lint: `npm run lint`
- Prisma:
  - `postinstall` -> `prisma generate`
  - `vercel-build` -> `prisma generate && prisma migrate deploy && next build`
- Mobil (`aile-finans` veya `bahce-ustasi`) calistirma:
  - `cd aile-finans` veya `cd bahce-ustasi`
  - `npm install`
  - `npm run start` (veya `npm run android` / `npm run ios` / `npm run web`)
- Ortam degiskenleri (.env):
  - Webde en az `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` kullanimi goruluyor.
- `bahce-ustasi` icin EAS / TLS (Windows):
  - Kurumsal TLS veya Expo/EAS GraphQL hatalarinda: `NODE_OPTIONS=--use-system-ca` (PowerShell: `$env:NODE_OPTIONS="--use-system-ca"`).
  - Android preview build: `npx eas build --platform android --profile preview --non-interactive` (adb/emulator interaktif promptundan kacinmak icin).
- Next.js kokunde `bahce-ustasi` cron (hava riski push):
  - Route: `app/api/cron/bahce-ustasi-hava-risk/route.ts` (Authorization: `BAHCE_CRON_SECRET`, Supabase service role, istege bagli `OPENWEATHER_API_KEY`, `dryRun=1` test).
  - Lokal dev: kok `package.json` icinde `cross-env` + `NODE_OPTIONS=--use-system-ca` ile `npm run dev` (Node `fetch failed` TLS icin).
  - `.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BAHCE_CRON_SECRET`, `OPENWEATHER_API_KEY` (ornek: `.env.example`).

### 2.1) Klasor tek kaynak, OneDrive ve surum
- **Guncel kod:** Cursor ile yapilan degisiklikler `OneDrive\...\nextjs_space` altindaki repoda tutulur; **EAS build de buradan** alinmali (online sync sonrasi).
- **`C:\dev\bahce-ustasi` (veya baska kopya):** Agent bu klasoru otomatik guncellemez; orada build alacaksan once OneDrive ile **esitle** (`git pull` / tam kopya). Iki kopya = hangisi guncel karisir.
- OneDrive **offline** iken EAS arsiv / dosya okuma hata verebilir; bu durumda sync bekle veya gecici olarak tam senkron bir kopyadan build.
- **Surum (minimum yeterli):** `bahce-ustasi/app.base.json` icindeki `expo.version` (or. `1.0.0` → `1.0.1`) kullaniciya gorunen surum; anlamli degisimde artir. Play Store icin ileride `android.versionCode` / `ios.buildNumber` ayri yonetilir. Repoda **git commit** (+ istenirse `git tag`) hangi kodun hangi build oldugunu cözer; ayri CHANGELOG sadece sik release istenirse.

## 3) Alinan Kararlar (Decision Log)
> Format: Tarih - Karar - Neden - Etki

- 2026-05-02 - Sohbet hafizasi icin proje ici `CONTEXT.md` tutulmasi - Yeni sohbetlerde baglam kaybini azaltmak - Her oturum basinda tek dosya ile hizli geri donus.
- 2026-05-02 - Tek repoda coklu app yapisi korunuyor (kok `web` + `aile-finans` + `bahce-ustasi`) - Gelistirme alanlarini ayirmak - Komutlar ve bagimliliklar proje bazli yonetilecek.
- 2026-05-10 - `aile-finans` uzerinde degisiklik yapilmamasi, yeni mobil appin `bahce-ustasi` olarak ayrilmasi - Mevcut uygulamayi bozmadan yeni yon belirlemek - Gelistirme yeni klasorde izole yurur.
- 2026-05-10 - Zeytin ilac/gubre bilgisinde yalnizca resmi devlet kaynaklari birincil referans olacak - Yanlis ilac/doz kaynakli cezai riskleri azaltmak - Veri girisinde kaynak ve tarih zorunlulugu uygulanacak.
- 2026-05-10 - Kaynak hiyerarsisi genisletildi: ziraat fakulteleri ve ziraat odalari destekleyici kaynak olarak kullanilabilir - Resmi mevzuatla uyumu korurken bolgesel/teknik rehberligi guclendirmek - Kritik doz/PHI alanlari yine sadece birincil resmi kaynakla dogrulanir.
- 2026-05-12 - `bahce-ustasi` Android prod Harita sekmesi native crash riski - gecici olarak `newArchEnabled: false` denendi; **Reanimated 4.x EAS Gradle yeni mimari zorunlu tuttugu** icin `newArchEnabled: true` zorunlu. Harita icin Google Maps API anahtari + Androidde MapView ScrollView disi duzen korunur.
- 2026-05-12 - Androidde koordinatli arazi varken `MapView` ScrollView icinde degil; `harita.tsx` icinde ust/orta/alt bolunmus duzen - Gesture cakismasi / harita crash riskini azaltmak - iOS/web tek ScrollView davranisi korunur.
- 2026-05-12 - Kok Next.js uzerinden `bahce-ustasi-hava-risk` cron + Expo push; Windows dev TLS icin kok `npm run dev` script - Sunucuda zamanlanmis risk bildirimi; lokalde TLS sorunsuz cron testi.
- 2026-05-12 - Kod guncellemeleri OneDrive altindaki `nextjs_space` repo kopyasinda surdurulur; `C:\dev` gibi ikinci kopya tek basina guncel tutulmaz - Cift kopya karmasasi ve eski build riskini azaltmak - EAS oncesi tek kaynak veya git esitleme zorunlu.

- 2026-05-12 - EAS build `expo doctor` hatasi: yan yana `app.json` + `app.config.js` - Statik ayarlar `app.base.json` tasindi, kok `app.json` kaldirildi - expo-doctor 17/17; EAS pipeline `Run expo doctor` asamasinda takilma riski azalir.

- 2026-05-12 - EAS Gradle: `react-native-reanimated` yeni mimari zorunlu; `newArchEnabled` tekrar `true` - Reanimated 4.x ile uyum; harita/regresyon cihazda tekrar smoke test.
- 2026-05-12 - `bahce-ustasi` **İlanlar** listesi kullaniciya gore **cografi filtre**: once kayitli arazide **il+ilce** dolu ilk parsel ile `bahce_talepler` eslestirilir; yoksa yalniz **il** (arazi veya Profil tarim ili); hicbiri yoksa liste bos + arazi/profil yonlendirmesi - Uzak il ilanlarinin gereksiz gorunmesini engellemek - `taleplerListele(yer)` + `lib/ilan-filtre-yer.ts`.
- 2026-05-13 - Ilaclama kaydinda ticari ad / etken madde vb. **manuel giris** korunacak; uygulama **ruhsatli urun onerisi / bayi listesi** tasimayacak (marka degisimi, reklam algisi, bakim yuku; mevzuatta satis bayi CKS/TC ve agac turune gore zaten). Odak: zorunlu **kaynak + tarih** ve denetime uygun kayit.

## 4) Yapilanlar (Done)
> Biten isleri madde madde yaz.

- [x] `CONTEXT.md` olusturuldu ve kalici hafiza akisi tanimlandi.
- [x] Ana proje yapisi tespit edildi (Next.js web + Expo mobil alt proje).
- [x] Yeni sohbet baslangic prompt'u dosyaya eklendi.
- [x] `bahce-ustasi`: Supabase ayar senkronu (`araziler`, `push_tokens`), push token kaydi, il duyuru bildirimi gunluk 12:00, takvim ayin 1'i 09:00, yer sec modal kontrast, harita hava karti (Open-Meteo), ilaclama oncesi yagis uyarisi, arazi hava riski yerel + cron push hatti.
- [x] `nextjs_space`: `@supabase/supabase-js`, cron route `app/api/cron/bahce-ustasi-hava-risk/route.ts`, kok `package.json` TLS-friendly dev script.
- [x] `bahce-ustasi` — **İlanlar** (eski “Talepler” kapsami genisletildi): tab/ekran adi; is talebi + **kiralik / satilik tarim aleti** (`ilan_kategorisi`), gunluk kira / satis fiyati (TRY), en fazla **4 foto** (`resim_urls` jsonb). SQL: `supabase/talep-sohbet.sql` (yeni kurulum kolonlari + `talep-ilan` storage politikalari), mevcut DB icin `supabase/talep-ilan-genisletme.sql`. Kod: `constants/talep-ilan-kategori.ts`, `lib/talep-bulut.ts`, `lib/talep-ilan-foto.ts`, `lib/talep-ilan-resim-bulut.ts` (yerel URI icin **FileSystem base64** okuma — RN `fetch(file://)` guvenilir degil), `app/talep/olustur.tsx`, `app/talep/[id].tsx`, `app/(tabs)/talepler.tsx`, stack basliklari, ana sayfa ozet metni.
- [x] `bahce-ustasi` — İlan listesi **yer filtresi**: `lib/ilan-filtre-yer.ts` (`ilanListeFiltreYeriniOku`), `taleplerListele(yer)`; konum yoksa kullanici mesaji + Arazi / Profil yonlendirmesi.
- [x] `bahce-ustasi` — Talep/ilan tarafinda onceki oturumlardan: Supabase `bahce_talepler` + katilimci + mesaj, RLS (`talep-sohbet.sql` / `talep-sohbet-rls-duzelt.sql`), mesajda `hedef_user_id` ile sahip-katilimci gizlilik, `YerSecModal` klavye, vb. (Detay SQL tek paket olarak `talep-sohbet-rls-duzelt.sql` ile de hatirlanabilir.)

## 5) Devam Edenler (In Progress)
> Su an aktif calisilan konu(lar).

- [ ] Web uygulamasinda aktif feature/bug listesi henuz bu dosyaya girilmedi.
- [ ] `bahce-ustasi` icin resmi kaynakli (tarimorman.gov.tr + Resmi Gazete) veri seti olusturulacak.
- [ ] `bahce-ustasi` Android release/preview: EAS build sonrasi **Harita** smoke testi (`newArchEnabled: true` + Google Maps key + ScrollView/MapView ayrimi); kapanma devam ederse `adb logcat`.
- [ ] Cursor IDE: guncelleme hatasi sonrasi yeniden kurulum yasandi; tekrarlanirsa installer + yedek stratejisi (bkz. bolum 12).

## 6) Siradaki Adimlar (Next)
> Oncelikli siraya gore yaz.

1. Resmi kaynaklardan 2026 Temmuz sonrasi mevzuat maddelerini topla (`tarimorman.gov.tr`, `resmigazete.gov.tr`).
2. Zeytin icin ruhsatli urun/etken madde/doz bilgisini kaynakli veri formatina donustur.
3. `bahce-ustasi` icinde ornek veri alanlarini "resmi kaynaktan dogrulanacak" etiketiyle ayir.
4. `bahce-ustasi` **İlanlar** + liste filtresi + foto: arazide smoke test; notlar `CONTEXT.md` Oturum Ozeti / fikir arsivine islenir.

## 7) Bilinen Sorunlar / Riskler
- Sorun: Cursor guncellemesi bazen yarim kalip IDE'yi bozabiliyor; "silinmis" / asistan calismiyor gibi durum → genelde **Cursor'i sifirdan kurmak** gerekir.
  - Etki: Sohbet gecmisi kaybolabilir; kod repoda kalir.
  - Gecici cozum: cursor.com'dan son installer ile uzerine kur; guncellemeden once tum pencereleri kapat.
  - Kalici: Ayarlar icin Settings Sync; onemli kararlar `CONTEXT.md` + git commit.
- Sorun: Repo icinde cok sayida `.bak` dosyasi var.
  - Etki: Gereksiz dosya karmasasi ve yanlis dosya duzenleme riski.
  - Gecici cozum: Duzenleme oncesi hedef dosya yolunu net kontrol et.
  - Kalici cozum plani: Kullanilmayan yedek dosyalari ayiklama kurali belirle.
- Sorun: Web ve mobil proje ayni repoda ama bagimliliklari farkli.
  - Etki: Yanlis klasorde komut calistirma riski.
  - Gecici cozum: Komutlardan once calisilan dizini dogrula.
  - Kalici cozum plani: Koku netlestiren gelistirici notlari ve script standardi ekle.

## 8) Dosya ve Mimari Notlari
- Kritik dosyalar:
  - `app/layout.tsx`: metadata, locale tespiti, global provider/header/footer akisi.
  - `app/api/...`: admin, auth, yorum, bulten ve diger backend route'lari.
  - `components/...`: UI bilesenleri + sayfa parcalari (`header`, `footer`, kartlar vb.).
  - `components/LocaleHtml.tsx`: locale ile ilgili yardimci bilesen.
  - `aile-finans/app/...`: Expo Router tabanli mobil ekranlar.
  - `bahce-ustasi/app/(tabs)/...`: Ana tab ekranlari; `harita.tsx` harita + hava; `kayitlar.tsx` senkron ve arazi kaydi; `talepler.tsx` ilan listesi (yer filtresi); `app/talep/olustur.tsx`, `app/talep/[id].tsx` ilan olusturma/detay/mesaj.
  - `bahce-ustasi/lib/`: depolama, bulut ayar, bildirimler, push token, hava riski; `talep-bulut.ts` (ilan CRUD/liste); `ilan-filtre-yer.ts` (liste icin il/ilce kaynagi); `talep-ilan-foto.ts`, `talep-ilan-resim-bulut.ts` (galeri + Storage `talep-ilan`).
  - `bahce-ustasi/supabase/`: `talep-sohbet.sql`, `talep-ilan-genisletme.sql` (mevcut projeye kolon + bucket), `talep-sohbet-rls-duzelt.sql` (RLS/mesaj gizliligi bundle).
  - `bahce-ustasi/context/auth-context.tsx`: oturum ve senkron sonrasi push / risk tetikleri.
  - `app/api/cron/bahce-ustasi-hava-risk/route.ts`: Next.js cron endpoint (kok proje).
- Dikkat edilmesi gereken bagimliliklar:
  - Web: Prisma, NextAuth, `@next/third-parties` (GA), cok sayida Radix UI bileseni.
  - Mobil: Expo SDK 54 ve React Native 0.81 uyumlulugu; `react-native-maps` surumu Expo Go / EAS binary ile uyumlu tutulmali (bkz. bolum 11).

## 9) Git Durumu
- Aktif branch: (komutla guncellenecek)
- Son anlamli commit: (komutla guncellenecek)
- Acik PR/Issue: (varsa manuel ekle)

## 10) Oturum Ozeti (Session Log)
> Her sohbet sonunda sadece bu bolume 5-10 satir eklemek yeterli.
> Format:
> - Tarih/Saat:
> - Bu oturumda ne yaptik:
> - Neden boyle yaptik:
> - Sonraki oturum ilk isi:

- Tarih/Saat: 2026-05-02 16:22 (UTC+3)
- Bu oturumda ne yaptik: Sohbet gecmisinin kaybolma sorununa cozum olarak `CONTEXT.md` olusturuldu ve proje gercegine gore ilk icerik eklendi.
- Neden boyle yaptik: Yeni chatlerde baglam kaybi yasamadan hizli devam edebilmek icin kalici referans dosyasi gerekliydi.
- Sonraki oturum ilk isi: `In Progress` ve `Next` bolumlerini guncel bug/feature listesiyle netlestirmek.

- Tarih/Saat: 2026-05-03 21:36 (UTC+3)
- Bu oturumda ne yaptik: `CONTEXT.md` dosyasinin varligi dogrulandi, icerigi kontrol edildi ve kullanim akisi teyit edildi.
- Neden boyle yaptik: Yeni sohbetlerde "nerede kalmistik" sorusuna hizli ve tutarli cevap verebilmek icin.
- Sonraki oturum ilk isi: Aktif teknik hedefi secip `In Progress` bolumune net gorev maddeleri eklemek.

- Tarih/Saat: 2026-05-10 16:35 (UTC+3)
- Bu oturumda ne yaptik: `bahce-ustasi` adinda yeni Expo proje olusturuldu, kurulum sorunlari giderildi, tab yapisi (Ana Sayfa/Takvim/Kayitlar/Profil) hazirlandi; resmi kaynak disi zeytin ilac/doz bilgilerinin nihai referans olmayacagi netlestirildi.
- Neden boyle yaptik: `aile-finans`e dokunmadan yeni urun yonu acmak ve ilac/doz bilgisinde mevzuata uygun, dogrulanabilir veri akisi kurmak icin.
- Sonraki oturum ilk isi: Resmi devlet sitelerinden kaynakli mevzuat + ruhsatli urun veri setini toplayip `bahce-ustasi`na dogrulanabilir formatta eklemek.

- Tarih/Saat: 2026-05-10 16:40 (UTC+3)
- Bu oturumda ne yaptik: Resmi kaynak onceligi teyit edildi; `bahce-ustasi/docs/RESMI_KAYNAK_REFERANSLARI.md` olusturuldu, Resmi Gazete (33106), BKU ve bakanlik sayfalari kaynak olarak eklendi; `official-dose-template.ts` ile dogrulanmis veri formati tanimlandi.
- Neden boyle yaptik: Yanlis ilac/doz riskini azaltmak ve sadece resmi kaynaga dayali veri girisini zorunlu hale getirmek icin.
- Sonraki oturum ilk isi: BKU uzerinden zeytin hastalik/zararli bazli kayitlari tek tek resmi kaynak URL+tarih ile doldurmak.

- Tarih/Saat: 2026-05-10 16:42 (UTC+3)
- Bu oturumda ne yaptik: Kaynak oncelik matrisi guncellendi; ziraat fakulteleri (devlet universiteleri) ve ziraat odalari Seviye 2 destekleyici kaynak olarak eklendi.
- Neden boyle yaptik: Saha kosullarina uygun teknik uyari ve fenolojik yorumlari resmi mevzuatla birlikte degerlendirebilmek icin.
- Sonraki oturum ilk isi: Seviye 1 kaynaklarla kritik doz verisini dogrulayip, Seviye 2 kaynaklardan bolgesel tavsiye notlarini ayrik alanlarda toplamak.

- Tarih/Saat: 2026-05-10 16:44 (UTC+3)
- Bu oturumda ne yaptik: `RESMI_KAYNAK_REFERANSLARI.md` dosyasina "Onayli Domain Kurali" eklendi; Seviye 1 (`resmigazete.gov.tr`, `tarimorman.gov.tr`, `bku.tarimorman.gov.tr`) ve Seviye 2 (`*.edu.tr` ziraat fakulteleri, `tzob.org.tr`) netlestirildi.
- Neden boyle yaptik: Kaynak secimini standardize edip, kritik doz/PHI bilgisinde dogrulama kalitesini sabitlemek icin.
- Sonraki oturum ilk isi: Zeytin kayitlarini bu domain kurallarina gore kaynaklayip `official-dose-template.ts` icinde doldurmak.

- Tarih/Saat: 2026-05-10 20:00 (UTC+3)
- Bu oturumda ne yaptik: `bahce-ustasi` icinde "Rehber" sekmesi ve `rehber/[id]` detay ekrani eklendi; zeytin hastalik/zararlilar icin belirti, izleme donemi, mucadele esigi ve risk notlari `zeytin-tehditler.ts` icinde toplandi; Wikimedia Commons lisansli tanima gorselleri (expo-image URI) ve atif satirlari eklendi; akari/pasakari/yarakosnil icin gorsel yeri sonraya birakildi.
- Neden boyle yaptik: Kullanicinin sahada hizli tanim ve resmi kaynak baglantisiyla ilerlemesi icin.
- Sonraki oturum ilk isi: Eksik gorseller icin Commons veya TARIM fotograf arsivi taranmasi; istenirse gorsellerin `assets` icine indirilerek cevrimdisi kullanim.

- Tarih/Saat: 2026-05-11 15:05 (UTC+3)
- Bu oturumda ne yaptik: `bahce-ustasi` icinde Supabase auth ve cihazlar arasi senkron buyuk olcude stabilize edildi. Kayitlarda kullanici degisince yerel veri karismasi duzeltildi; silinen kaydin diger cihazda geri gelme bug'i cozuldu; Bursa il duyuru URL'i resmi adrese cekildi; kamera/galeri foto URI kalicilastirma duzeltildi.
- Neden boyle yaptik: Ayni hesapla iOS/Android tutarli davranis, veri guvenligi ve resmi kaynak ulasimi icin kritikti.
- Sonraki oturum ilk isi: Android release APK ile PC kapaliyken acilis ve senkron final smoke testi.

- Tarih/Saat: 2026-05-11 15:05 (UTC+3)
- Bu oturumda ne yaptik: Kayit ekranina disa aktarma ozelligi eklendi (XLSX + PDF). Aralik secimi, kayit sayisi, toplam maliyet; XLSX'te toplam satiri "Kayitlar" sheet altina eklendi. Ilaclamada marka + etken madde + pozoloji zorunlu hale getirildi. Gubrelemede urun adi + pozoloji + maliyet takibi eklendi (etken madde zorunlu degil). PDF/XLSX maliyet hesaplama mantigi hizalandi.
- Neden boyle yaptik: Ilce Tarim ve denetim ihtiyaclari icin sezonluk kayitlarin raporlanabilir olmasi gerekiyordu.
- Sonraki oturum ilk isi: Dashboard gorunumu (islem turune gore maliyet dagilimi) ekleyip ayni ozeti PDF/XLSX'e tablo olarak basmak.

- Tarih/Saat: 2026-05-11 15:05 (UTC+3)
- Bu oturumda ne yaptik: Uygulama gorunen adi "Bahce Ustasi" olarak guncellendi (`app.json` ve kullaniciya gorunen metinler). `email-redirect` akisi icin template+deploy yapisi korunup yeniden uretim komutu teyit edildi.
- Neden boyle yaptik: Marka tutarliligi ve kullanici talebi.
- Sonraki oturum ilk isi: Yeni build alip gorunen uygulama adini cihazda dogrulamak.

- Tarih/Saat: 2026-05-11 ~18:00 (UTC+3)
- Bu oturumda ne yaptik: Expo Go'da `TurboModuleRegistry.getEnforcing` / `RNMapsAirModule` hatasi icin `react-native-maps` surumu Expo Go ile uyumlu `1.20.1` olarak sabitlendi; `CONTEXT.md` icine kalici uyarilar eklendi.
- Neden boyle yaptik: Expo Go onceden derlenmis native binary tasir; maps surumu uyusmazsa uygulama mobilde patlar.
- Sonraki oturum ilk isi: Harita ihtiyaci buyurse EAS development build veya resmi parsel geometri entegrasyonu degerlendirmek.

- Tarih/Saat: 2026-05-12 (UTC+3)
- Bu oturumda ne yaptik: `CONTEXT.md` guncellendi. Ozet: `bahce-ustasi` Android Harita crash icin `newArchEnabled: false` ve Androidde MapView'nin ScrollView disina alinmasi; Next cron `bahce-ustasi-hava-risk`; Windows TLS (`NODE_OPTIONS=--use-system-ca`), EAS `--non-interactive`, OneDrive disi build klasoru notlari. Cursor guncelleme hatasi / yeniden kurulum kullanici tarafinda yasandi, dokumante edildi.
- Neden boyle yaptik: Yeni sohbetlerde tek dosyadan baglam; Harita ve infra tuzaklarinin tekrarlanmamasi.
- Sonraki oturum ilk isi: Yeni Android APK kurulduktan sonra Harita smoke testi; devam eden crash varsa logcat paylasimi.

- Tarih/Saat: 2026-05-12 (UTC+3, devam)
- Bu oturumda ne yaptik: Cursor guncelleme/kurulum sorunu kullaniciya not dustu; `CONTEXT.md` tekrar gozden gecirilip karar dosyasi + bolum 8 + repo yapisi satiri netlestirildi.
- Neden boyle yaptik: Yeniden kurulum sonrasi baglam tek dosyada toplansin.
- Sonraki oturum ilk isi: EAS build sonucu + Harita testi.

- Tarih/Saat: 2026-05-12 (UTC+3, OneDrive / surum)
- Bu oturumda ne yaptik: OneDrive `nextjs_space` tek guncel kaynak; `C:\dev` kopyasinin eski kalabilecegi; `app.json` `version` + git commit/tag ile surum takibi; CONTEXT bolum 2.1 ve karar logu eklendi.
- Neden boyle yaptik: Cift klasorde build / kod uyusmazligi ve takip ihtiyaci.
- Sonraki oturum ilk isi: EAS her zaman OneDrive pathinden; anlamli surumda `expo.version` artir.

- Tarih/Saat: 2026-05-12 (UTC+3, İlanlar / talep modülü)
- Bu oturumda ne yaptik: `bahce-ustasi` İlanlar: is + kiralik/satilik alet, TRY fiyat alanlari, en fazla 4 foto, `talep-ilan` Storage + `talep-ilan-genisletme.sql` / `talep-sohbet.sql` guncellemeleri; yerel fotoda RN `fetch` yerine FileSystem base64 ile yukleme; liste **arazi il+ilce** (yoksa il) filtresi + `ilan-filtre-yer.ts` / `taleplerListele(yer)`; konum yoksa UI yonlendirmesi. `CONTEXT.md` bu oturum sonunda tekrar guncellendi.
- Neden boyle yaptik: Liste buyuyunce anlamlı bolge siniri; foto gorunmemesi (yerel URI) duzeltmesi; yeni sohbette kaldigi yerden devam.
- Sonraki oturum ilk isi: Arazide smoke test notlari; coklu arazi icin "ilan filtresi varsayilan arazi" ihtiyaci degerlendirmesi; il/ilce adi eslesmesi sorunlari varsa normalizasyon.

---

## 11) bahce-ustasi — kritik uyarilar (Expo Go, harita, EAS, TKGM)

Bu bolum ileride tekrar ayni tuzaga dusmemek icin tutulur. `bahce-ustasi` klasorunde calis.

### Expo Go + react-native-maps
- Expo Go, **onceden derlenmis** native moduller tasir; `react-native-maps` icin **Expo Go ile uyumlu surum** kullanilmalidir.
- **Hata:** `TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found` → genelde **JS paket surumu**, Expo Go icindeki native surumden **yuksek / farkli** oldugunda olur.
- **Cozum (Expo Go ile test):** `package.json` icinde `react-native-maps` surumunu **`1.20.1` sabit** tut (caret `^` ile rasgele yukseltme yapma). Sorun sonrasi: `npx expo start -c`, Expo Go uygulamasini tam kapatip yeniden ac.
- **Guncel maps / yeni mimari istenirse:** Expo Go yerine **EAS development build** (ozel binary) gerekir; normal Expo Go ile sinirli kalirsin.

### app.base.json + app.config — newArchEnabled
- **Guncel:** `newArchEnabled: true`. `react-native-reanimated` ~4.1 EAS Android derlemesinde `assertNewArchitectureEnabledTask` ile eski mimariyi reddeder; `false` iken Gradle kesin fail. Harita stabilitesi: Google Maps API anahtari + `harita.tsx` Android ScrollView/MapView ayrimi.

### Android Harita — ScrollView ic ice
- Koordinatli arazi (`pinliAraziler`) varken Android ozel: **MapView**, ana `ScrollView` icinde degil; ust scroll (baslik + tarih filtresi) + orta sabit harita kutusu + alt scroll (cipler + detay). Kod: `bahce-ustasi/app/(tabs)/harita.tsx`.

### EAS Build vs "canli"
- EAS ile alinan APK/AAB: **o dosyayi kuran** herkes yeni surumu gorur.
- Play Store / App Store'daki **herkese acik canli**: ayrica **submit + inceleme** gerekir; sadece build almak magazayi otomatik guncellemez.
- Aninda JS guncellemesi (OTA): **EAS Update** ayri kurulur; tek basina normal EAS build bunu yapmaz.

### TKGM / parsel sinir (kirmizi polygon)
- TKGM web arayuzu gibi **otomatik ada-parsel poligonu** cizmek icin uygulama icinde **resmi API erisim / yetki** yoksa (duz kullanici senaryosu) **otomatik sinir cizimi yoktur**.
- Simdiki yaklasim: arazi icin **manuel enlem/boylam pin** + kayitlar; ileride resmi servis veya development build ile genisletilebilir.

---

## 12) Sohbet / fikir kaybi — kalici cozum (Cursor)

**Gercek:** Kapatilan veya kaybolan Cursor sohbetinin tam metnini geri yuklemek genelde **mumkun degil** (IDE yeniden kurulumu, X ile panel kapatma vb. kod klasorunu silmez; sadece o oturumdaki konusmayi kaybettirir).

**Guncelleme (2026-05):** In-app guncelleme bazen hata verip kurulumu tutarsiz birakabiliyor; "asistan silinmis" benzeri durumda **tam yeniden kurulum** gerekebilir. Tekrarlanirsa: tum Cursor pencerelerini kapat, [cursor.com](https://cursor.com) uzerinden son Windows installer ile kur; mumkunse guncelleme sirasinda OneDrive altindaki agir workspace'leri kapali tut.

**Cozum:** Sohbet yerine **repoda dosya** tut; her onemli brainstorm sonunda 2 dakika ayir.

1. Bu dosyada **10) Oturum Ozeti** ve asagidaki **12.1 Fikir arsivi** bolumlerini guncelle (kopyala-yapistir veya madde ekle).
2. Mumkunse **git commit** ile uzak repoya it; OneDrive disinda ikinci yedek olur.
3. Yeni chat acinca zaten kullandigin prompt: `Once CONTEXT.md dosyasini oku...` — fikirler ve kararlar burada **yeniden yuklenmis** olur.
4. Istersen Cursor icinde ayri bir not (Scratchpad / dokuman) acip ayni maddeleri oraya da yapistir; ama **tek kaynak** olarak `CONTEXT.md` yeterli.

### 12.1) bahce-ustasi — urun / gelistirme fikir arsivi (kalici not)

> Asagidaki liste kayip sohbetin yerine **yeniden derlenmis** yonlendirme listesidir; oncelik siran guncelledikce burayi editle.

- **Resmi veri hattı:** BKU + tarimorman + Resmi Gazete ile ruhsatlı ürün / etken / doz; `official-dose-template` ve kaynak URL+tarih zorunluluğu; uygulamada “Seviye 1 doğrulanmış” rozeti.
- **Denetçi özeti:** PDF/XLSX çıktısında özet blok: dönem, işlem sayısı, toplam maliyet, kullanılan kaynak linkleri (özellikle ilaç satırları).
- **Dashboard:** Ana veya kayıtlar üstünde işlem türüne göre maliyet dağılımı (ilaç / gübre / işçilik vb.); aynı tabloyu dışa aktarmaya ekle.
- **Saha modu:** Tek elle hızlı kayıt, minimum alan, sonra “tamamla” ile detay; veya günlük “bugün yaptıklarım” sihirbazı.
- **Çevrimdışı:** Kayıt girişinin yerelde kuyruklanması, ağ gelince senkron; Expo tarafında net “bekleyen senkron” göstergesi.
- **Harita stratejisi:** Expo Go sınırını dokümante tut; ihtiyaç artarsa EAS dev client + güncel maps; parsel için yalnızca yetkili resmi API ile otomatik polygon hedefi.
- **Rehber:** Eksik görselleri Commons / TARIM arşivi veya paketlenmiş `assets` ile tamamla; her görselde lisans/attribution satırı.
- **Bildirim / il duyurusu:** Mevcut il duyuru akışını genişlet; kullanıcı ilçe seçimine göre filtre, okundu işareti.
- **Güvenlik ve hesap:** Oturum süresi, çıkış yapınca yerel önbellek temizleme seçeneği, şifre sıfırlama akışının kısa kullanıcı testi.
- **Erişilebilirlik:** Yazı boyutu, yüksek kontrast, ekran okuyucu etiketleri (özellikle form alanları ve kayıt listesi).
- **Mağaza hazırlığı:** Gizlilik politikası metni, veri saklama açıklaması (Supabase), mağaza ekran görüntüleri ve sürüm notu şablonu.
- **İlanlar / çoklu arazi:** Liste filtresi şu an **ilk tam adresli (il+ilçe) araziyi** kullanıyor; birden fazla parselde “ilanlar için varsayılan arazi” seçimi ileride eklenebilir.
- **İlan eşleşmesi:** İlan oluştururken seçilen il/ilçe adları ile `BahceArazi` / API adları birebir uyumlu olmalı; yazım farkında liste boş kalabilir (gerekirse normalizasyon veya id ile eşleştirme).

---

## 13) resto-pulse-mvp / GastroSkor mobil — durum ve yol haritasi

### 13.1) Mevcut surum (2026-06-10)
- Mobil: `resto-pulse-mvp/mobile` — **1.0.25** (iOS build **29**, Android versionCode **37**).
- Gastro Sipariş: metin + mikrofon (STT) arama; sonuclar **ekranda** A/B/C ile; siparis komutu + onay sheet (Google giris, SMS telefon, adres, Onayla).
- EAS arsiv: kok `.easignore` yalnizca Next.js `/app/` ve `/components/` dislar; `resto-pulse-mvp/mobile/**` dahil.
- Backend: `ORDER_PHONE_TEST_BYPASS` (Railway env) ile test numaralari SMS'siz dogrulama.

### 13.2) Sonraki faz — kullanici istegi (bilincli ertelendi)

| Ozellik | Aciklama | Tahmini maliyet |
|--------|----------|------------------|
| **Ilk 3 restoran sesli okuma (TTS)** | Arama sonrasi mesafeye gore yakin 3 restoran adini sesli okuma (`expo-speech` veya cihaz TTS). | **Ek ucret yok** (yerel TTS). Sadece gelistirme suresi + yeni build. |
| **Uygulama kapaliyken hands-free siparis** | Kilit ekrani / Siri / Assistant ile uygulamayi acip Gastro Siparis akisina girmek. | **Magaza ucreti yok** (mevcut Apple/Google hesabi). **Bulut STT/TTS** secilirse API kullanim ucreti (Google Cloud Speech vb. — dakika basi; kucuk hacimde dusuk). **On-device STT** (mevcut `expo-speech-recognition`) ek API maliyeti yok; iOS App Intents + Android App Actions icin gelistirme ve test cihazi gerekir. **EAS build** mevcut Expo planina gore (pay-as-you-go build dakikasi). |

**Not:** Tam otomatik siparis (tek cumlede arama + siparis + gonderim) henuz yok; TTS ve lock-screen fazinda da SMS/adres/giris kurallari korunabilir veya ayri “guvenilir cihaz” politikasi tanimlanir.

### 13.3) Oturum ozeti (2026-06-10)
- Gastro Siparis UX: dock kaldirildi, GPS fallback, cantik/sutlac voice catalog, mikrofon STT, SMS test bypass backend.
- iOS 1.0.24 build 28 acilis crash'i `.easignore` duzeltmesi ile cozuldu.
- Siradaki: **1.0.25** commit + EAS build; iOS submit asistan, Android submit kullanici.

---

## Yeni Sohbet Baslangic Prompt'u (kopyala-yapistir)
Asagidaki metni yeni chat'e gonder:

`Once CONTEXT.md dosyasini oku. "Oturum Ozeti" ve "Siradaki Adimlar" bolumlerine gore kaldigimiz yerden devam et. Kod degisikligi gerekiyorsa dogrudan uygula ve yaptigin degisiklikleri kisa ozetle.`

# GastroSkor mobil — magaza ve EAS kontrol listesi

Bu dosya App Store / Play Store ve ic test (TestFlight, internal track) icin adim adim rehberdir.

## 1. On kosullar

- [ ] Apple Developer hesabi (yillik ucret)
- [ ] Google Play Console hesabi (tek seferlik kayit)
- [ ] Expo hesabi: https://expo.dev
- [ ] Yasal sayfalar canli: https://www.gastroskor.com.tr/gizlilik (Vercel deploy)

## 2. Ortam dosyasi

```bash
cd mobile
copy .env.example .env
```

`.env` icine:

| Degisken | Aciklama |
|----------|----------|
| `EXPO_PUBLIC_API_URL` | `https://api.gastroskor.com.tr` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud **Web** OAuth client (Expo Go icin zorunlu) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client — bos birakilabilir (Expo Go: Web ID kullanilir) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client — bos birakilabilir (Expo Go: Web ID kullanilir) |
| `EAS_PROJECT_ID` | `eas init` sonrasi UUID |

EAS build sirasinda ayni degiskenleri **EAS Secrets** olarak da ekleyin:

```bash
npx eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "..."
```

## 3. Google Cloud OAuth

1. https://console.cloud.google.com → proje secin veya olusturun
2. **OAuth consent screen** → External, uygulama adi GastroSkor, destek e-postasi
3. **Credentials** → Create credentials → OAuth client ID

| Client | Tip | Not |
|--------|-----|-----|
| Web | Web application | Authorized redirect URI: `https://auth.expo.io/@KULLANICI_ADIN/gastroskor` (Expo Go) |
| iOS | iOS | Bundle ID: `com.gastroskor.app` |
| Android | Android | Package: `com.gastroskor.app`, SHA-1: EAS build veya `keytool` ciktisi |

Web client ID, Next.js panelindeki `GOOGLE_CLIENT_ID` ile ayni olabilir.

## 4. EAS projesi

```bash
npm install -g eas-cli
eas login
cd mobile
eas init
```

`app.config.js` icindeki `extra.eas.projectId` otomatik dolar veya `.env` `EAS_PROJECT_ID` kullanilir.

## 5. Build

```bash
# Android APK (ic dagitim / tester)
eas build --profile preview --platform android

# iOS cihaz (TestFlight oncesi)
eas build --profile preview --platform ios

# Magaza surumu
eas build --profile production --platform all
```

## 6. Magazaya gonderim

`eas.json` submit blogunu doldurun:

- **Android:** Play Console service account JSON → `google-play-service-account.json` (git'e eklemeyin)
- **iOS:** Apple ID, ASC App ID, Team ID

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

## 7. Magaza listesi (her iki platform)

- Uygulama adi: **GastroSkor**
- Kisa aciklama: Turkiye restoran kesfi ve GS yorumlari
- Gizlilik politikasi URL: https://www.gastroskor.com.tr/gizlilik
- Ekran goruntuleri: telefon boyutu (6.7" ve 5.5" onerilir)
- Icerik derecelendirme anketi doldurun
- Konum ve foto izinleri icin aciklama metinleri `app.config.js` ile uyumlu

## 8. Backend (Railway)

Deploy oncesi:

```bash
alembic upgrade head
```

Ortam:

- `PUBLIC_API_BASE_URL=https://api.gastroskor.com.tr`
- `GOOGLE_PLACES_API_KEY` dolu
- Yorum fotolari icin kalici disk: `data/review_images` volume mount

## 9. Test sirasi

1. Expo Go + Web client ID → Google girisi
2. `preview` APK/IPA → gercek cihaz
3. TestFlight / Play internal track
4. Production submit

## 10. Destek

- E-posta: destek@gastroskor.com.tr
- Web panel: https://www.gastroskor.com.tr/panel

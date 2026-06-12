# Universal Links / App Links — GastroSkor

Paylasilan restoran linkleri (`https://www.gastroskor.com.tr/restaurants/...` ve `/place/...`) uygulama yukluysa uygulamada acilir; degilse web sayfasi acilir.

## Kodda ne var?

| Katman | Dosya |
|--------|--------|
| iOS associated domains | `mobile/app.config.js` |
| Android intent filters | `mobile/app.config.js` |
| Mobil route eslemesi | `mobile/app/restaurants/[id].tsx`, `mobile/app/place/[placeId].tsx` → `/restaurant/...` |
| Apple AASA | `frontend/app/.well-known/apple-app-site-association/route.ts` |
| Android assetlinks | `frontend/app/.well-known/assetlinks.json/route.ts` |
| Web fallback | `frontend/components/OpenInAppLink.tsx` (`gastroskor://restaurant/{id}`) |

Apple Team ID varsayilan: `5XTXAT7BXZ` (eas.json). Bundle: `com.gastroskor.app`.

## Deploy oncesi (Vercel)

Android App Links icin **SHA-256** parmak izlerini Vercel ortam degiskenine ekle:

```
ANDROID_SHA256_FINGERPRINTS=AB:CD:...:EF,12:34:...:56
```

Parmak izlerini al:

```bash
cd mobile
eas credentials -p android
```

Ayrica Play Console → **Uygulama imzalama** → **App signing key certificate** SHA-256 (Play Store surumu icin zorunlu).

Iki imza da eklenebilir (EAS upload key + Play app signing key), virgulle ayir.

**Onemli:** Play dahili test / uretim yuklemelerinde telefondaki imza **Play App Signing** anahtaridir. Sadece EAS SHA256 varsa App Links **dogrulanmaz** ve linkler webde acilir. Play SHA256'yi mutlaka ekle.

Opsiyonel:

```
APPLE_TEAM_ID=5XTXAT7BXZ
ANDROID_PACKAGE_NAME=com.gastroskor.app
```

## Mobil build

Universal / App Links **native build** gerektirir (Expo Go'da tam calismaz).

```bash
cd mobile
npm run build:prod          # once iOS, bitince Android
npm run build:prod:ios-only   # sadece iOS
```

Surum: **1.0.10+** (app.config.js intent filter + associated domains).

## Test checklist

### iOS

1. TestFlight veya production build yuklu cihaz
2. Notlar uygulamasina `https://www.gastroskor.com.tr/restaurants/{uuid}` yapistir → GastroSkor acilmali
3. Uygulama silinmis → Safari'de web detay acilmali
4. WhatsApp icinden link: bazen in-app tarayici acilir → **Safari'de ac** veya **Uygulamada ac** fallback

Dogrulama:

```bash
curl -sI https://www.gastroskor.com.tr/.well-known/apple-app-site-association
```

`Content-Type: application/json` olmali.

### Android

1. Internal / production APK-AAB yuklu cihaz
2. Mesajlasma uygulamasindan linke tikla
3. `adb shell pm get-app-links com.gastroskor.app` → `www.gastroskor.com.tr: verified` beklenir (SHA-256 dogruysa)

assetlinks bos fingerprint ile deploy edilirse Android **dogrulama basarisiz** olur; link yine web'de acilir (guvenli fallback).

### Web

- Restoran detayda **Uygulamada ac** → `gastroskor://` scheme (in-app tarayici icin)

## Sorun giderme

| Belirti | Cozum |
|---------|--------|
| Hep web aciliyor (iOS) | AASA yayildi mi? Associated domains build'de var mi? Cihazda eski build mi? |
| Hep web (Android) | `ANDROID_SHA256_FINGERPRINTS` Vercel'de mi? Play imza key eklendi mi? |
| Uygulama aciliyor ama bos ekran | Route: `/restaurants/` → `/restaurant/` redirect calisiyor mu? |
| Expo Go | Normal — store/preview build ile test et |

## Paylasim URL formati

- GS kayitli restoran: `https://www.gastroskor.com.tr/restaurants/{uuid}`
- Sadece Google Place: `https://www.gastroskor.com.tr/place/{placeId}`

Bu URL'ler `mobile/lib/restaurant-share.ts` ve `frontend/lib/restaurant-share.ts` ile uretilir.

# Google giris — Native SDK (GastroSkor mobil)

Mobil uygulama **@react-native-google-signin/google-signin** kullanir. Chrome Custom Tab / redirect URI akisi kaldirildi.

## Gereksinimler

- **Expo Go'da calismaz** — Play dahili test veya EAS build gerekir.
- **Web OAuth client ID** zorunlu (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) — Android'de idToken icin.
- **Android OAuth client** (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`) — Play SHA-1 ile eslesmeli.
- **iOS OAuth client** (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) — **TestFlight/App Store icin zorunlu**.

## Google Cloud Console

### OAuth consent screen

| Alan | Deger |
|------|--------|
| User type | External |
| Publishing status | Testing (veya Production) |
| Test users | Giris yapacak tum Gmail adresleri |

### Android client (GastroSkor Test)

| Alan | Deger |
|------|--------|
| Package | `com.gastroskor.app` |
| SHA-1 | Play **Uygulama imzalama** SHA-1 |

### Web client

Panel icin: `https://www.gastroskor.com.tr/api/auth/callback/google`

Mobil SDK icin **redirect URI eklemen gerekmez** — native SDK kullanilir.

### iOS client (TestFlight / App Store)

| Alan | Deger |
|------|--------|
| Application type | iOS |
| Bundle ID | `com.gastroskor.app` |

Olustur → **Client ID**'yi kopyala → EAS production + Railway (asagida).

## EAS env (production)

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=....apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=....apps.googleusercontent.com   # iOS build
```

## Railway env (backend token dogrulama)

```
GOOGLE_OAUTH_WEB_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_OAUTH_ANDROID_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_OAUTH_IOS_CLIENT_ID=....apps.googleusercontent.com
```

Mobil giris: `POST /api/v1/auth/google/mobile` — `{ "id_token": "..." }`

Backend Google sertifikalari ile idToken dogrular; client'a kör güvenilmez.

## Akis

1. Kullanici **Google ile giris yap**
2. Native SDK hesap secer / sifre+2FA Google tarafinda
3. `idToken` → API `/auth/google/mobile`
4. Profil oturumu acilir

## Sorun giderme

| Belirti | Cozum |
|---------|--------|
| DEVELOPER_ERROR (Android) | Play SHA-1 + package Android client'ta mi? |
| idToken null | Web client ID EAS'ta tanimli mi? |
| iOS: `iosClientId was not provided` | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` EAS production'da yok — iOS OAuth client olustur + yeni build |
| 401 token dogrulanamadi | Railway `GOOGLE_OAUTH_WEB_CLIENT_ID` = ayni Web client |
| Expo Go | Preview/production build kullan |

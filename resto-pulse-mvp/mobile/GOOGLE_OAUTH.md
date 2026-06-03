# Google giris — hata cozumu

`You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy` hatasi genelde **Google Cloud yapilandirmasi** kaynaklidir.

## 1. OAuth consent screen (zorunlu)

Google Cloud → **APIs & Services** → **OAuth consent screen**

| Alan | Deger |
|------|--------|
| User type | External |
| App name | GastroSkor |
| User support email | senin e-postan |
| Privacy policy | `https://www.gastroskor.com.tr/gizlilik` |
| App home page | `https://www.gastroskor.com.tr` |
| Authorized domains | `gastroskor.com.tr` |
| Publishing status | **Testing** (henuz Production degil) |

**Test users:** Giris yapacagin Gmail adresini ekle (Testing modunda sadece bu hesaplar girebilir).

---

## 2. Expo Go — Android client (telefonda test)

Web client ID'yi Android client olarak kullanmak **politika hatasi** verir. Ayri bir **Android** OAuth client gerekir.

**Create Credentials** → **OAuth client ID** → **Android**

| Alan | Expo Go icin |
|------|----------------|
| Name | GastroSkor Expo Go |
| Package name | `host.exp.exponent` |
| SHA-1 | `58:98:25:7A:09:9E:38:EB:06:D4:FC:36:0C:9E:38:40:57:D5:20:EC` |

Olusan **Android Client ID**'yi `.env` dosyasina yaz:

```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=XXXX.apps.googleusercontent.com
```

`npm run start:clean` ile Expo'yu yeniden baslat.

---

## 3. Web client (Expo Go icin kritik)

Mevcut **GastroSkor Web** client → **Authorized redirect URIs** listesine ekle:

```
https://auth.expo.io/@delimanyah/gastroskor
```

(Ayni zamanda panel callback kalir: `https://www.gastroskor.com.tr/api/auth/callback/google`)

Expo Go, `exp://` yerine bu HTTPS adresini kullanir. Bu adim olmadan "OAuth 2.0 policy" hatasi devam eder.

---

## 4. Web client (panel)

Mevcut **GastroSkor Web** client kalir:

- **JavaScript origins:** `https://www.gastroskor.com.tr`, `https://gastroskor.com.tr`
- **Redirect URIs:** `https://www.gastroskor.com.tr/api/auth/callback/google`

---

## 4. Play Store / App Store build

### Android OAuth client

| Alan | Deger |
|------|--------|
| Package name | `com.gastroskor.app` |
| SHA-1 | Play **Uygulama imzalama** SHA-1 + `eas credentials -p android` (ikisi de) |

### Web client — Authorized redirect URIs (400 invalid_request icin zorunlu)

**GastroSkor Web** → Credentials → Redirect URIs listesine ekle:

```
gastroskor://redirect
```

Android Play client ID'n `3397389116-XXXX.apps.googleusercontent.com` ise ayrica:

```
com.googleusercontent.apps.3397389116-XXXX:/oauth2redirect
```

(`XXXX` = Android client ID'deki orta kisim; `apps.googleusercontent.com` olmadan.)

EAS secrets: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Web client, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` = Play Android client (Expo Go degil).

Ayri iOS client: Bundle ID `com.gastroskor.app`

---

## 5. Hala calismiyorsa

1. Giris yaptigin Gmail **Test users** listesinde mi?
2. Gizlilik sayfasi canli mi? (Vercel deploy)
3. Expo terminalinde `[GoogleAuth] redirectUri=` loguna bak
4. Google Cloud degisiklikleri 5–10 dk gecikebilir

Store surumu icin uzun vadede `@react-native-google-signin/google-signin` + EAS development build onerilir (Expo Go disinda).

# EAS cloud olmadan App Store / Play yukleme (ucretsiz build + elle yukleme)

EAS **build kredisi harcamadan** magazaya gitmek icin:

| Platform | Makine | Build | Magazaya yukleme |
|----------|--------|-------|------------------|
| **Android** | Windows | Gradle (lokal) | Play Console web (elle AAB) |
| **iOS** | MacBook | Xcode Archive | App Store Connect (elle upload) |

**Ucretli olan tek sey:** Apple Developer (~99 USD/yil) + Google Play Console (tek sefer ~25 USD).  
**EAS Expo cloud build:** kullanmak zorunda degilsin.

---

## Windows — Android (bir kez kurulum)

### 1. Yazilim

1. [Android Studio](https://developer.android.com/studio) kur
2. SDK Manager: **Android SDK 35**, **Build-Tools**, **Platform-Tools**
3. Ortam degiskeni (Sistem veya kullanici):

```
ANDROID_HOME = C:\Users\KULLANICI\AppData\Local\Android\Sdk
Path += %ANDROID_HOME%\platform-tools
```

4. Kontrol:

```powershell
cd resto-pulse-mvp\mobile
npm run setup:android
```

### 2. Proje ortami

```powershell
copy .env.example .env
# EXPO_PUBLIC_API_URL, GOOGLE_WEB + ANDROID client ID doldur
```

### 3. Imza (Play icin bir kez)

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore gastroskor-upload.jks -alias gastroskor -keyalg RSA -keysize 2048 -validity 10000

copy android-keystore.properties.example android-keystore.properties
# sifreleri duzenle
```

SHA-1 al (Google Cloud > Android OAuth client):

```powershell
keytool -list -v -keystore gastroskor-upload.jks -alias gastroskor
```

Play **App signing** kullaniyorsan: upload key SHA-1 yeterli (kapali test icin).

### 4. Surum bump

```powershell
npm run release:local:check:apply
# versionCode / buildNumber magazadan +1
```

### 5. Build (EAS yok)

```powershell
# Play Store AAB
npm run build:android:local

# Telefona test APK
npm run build:android:local:apk
```

Cikti: `mobile/dist/gastroskor-*.aab` veya `*.apk`

### 6. Google Play'e yukleme (ucretsiz)

1. https://play.google.com/console
2. **GastroSkor** → **Kapali test** (veya Production)
3. **Yeni surum olustur** → AAB dosyasini surukle
4. Surum notlari → **Inceleme gonder**

`eas submit` gerekmez. Service account JSON sadece otomasyon icin.

---

## MacBook — iOS (bir kez kurulum)

### 1. Yazilim

1. App Store → **Xcode** (tam kurulum)
2. Xcode → Settings → **Accounts** → Apple ID (Developer team `5XTXAT7BXZ`)
3. CocoaPods:

```bash
sudo gem install cocoapods
# veya: brew install cocoapods
```

4. Kontrol:

```bash
cd resto-pulse-mvp/mobile
chmod +x scripts/*.sh
npm run setup:ios
```

### 2. Ortam

`.env` — `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` dolu olmali (TestFlight build).

### 3. Build + TestFlight (EAS yok)

```bash
npm run release:local:check:apply   # Mac'te PowerShell yoksa app.config.js buildNumber elle +1
npm run build:ios:local
```

Xcode acilir:

1. Scheme: **GastroSkor**
2. Destination: **Any iOS Device (arm64)**
3. **Product → Archive**
4. **Distribute App → App Store Connect → Upload**
5. https://appstoreconnect.apple.com/apps/6776410673/testflight/ios — build islenince test

---

## Gunluk gelistirme (build maliyeti sifir)

```powershell
npm run start:clean
```

- Cogu degisiklik: Metro reload
- Native modul degisince: Android `expo run:android`, iOS Mac'te `expo run:ios`

---

## EAS ne zaman?

| Durum | Oneri |
|-------|--------|
| Android release | **Lokal Gradle** |
| iOS release + Mac var | **Xcode Archive** |
| iOS release + Mac yok | EAS (ucretli) — seyrek kullan |
| Her commit'te cloud build | **Yapma** — kotayi bitirir |

---

## Sorun giderme

| Sorun | Cozum |
|-------|--------|
| Play "versionCode eski" | `release:local:check:apply` |
| Google giris Android'de fail | Upload keystore SHA-1 OAuth'ta mi? |
| Gradle JDK hatasi | Android Studio JDK 17 |
| iOS signing | Xcode → Signing & Capabilities → Team secili |

Destek: destek@gastroskor.com.tr

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: 'GastroSkor',
  slug: 'gastroskor',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'gastroskor',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#141414',
  },
  ios: {
    supportsTablet: true,
    buildNumber: '2',
    bundleIdentifier: 'com.gastroskor.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#141414',
      foregroundImage: './assets/android-icon-foreground.png',
    },
    package: 'com.gastroskor.app',
    versionCode: 2,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#141414',
        image: './assets/icon.png',
        imageWidth: 160,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Restoran yorumlarina ve isletme menusune fotograf eklemek icin galeriye erisim gerekir.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Yakin restoranlari gostermek icin konum kullanilir.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    privacyPolicyUrl: 'https://www.gastroskor.com.tr/gizlilik',
    termsUrl: 'https://www.gastroskor.com.tr/kullanim-kosullari',
    kvkkUrl: 'https://www.gastroskor.com.tr/kvkk',
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? '3009c65b-6419-4567-a859-363698cf6880',
    },
  },
});

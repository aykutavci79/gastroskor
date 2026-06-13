/** @type {import('expo/config').ExpoConfig} */

function readGoogleIosUrlScheme() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!clientId) return null;
  const prefix = clientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${prefix}`;
}

const googleIosUrlScheme = readGoogleIosUrlScheme();

const appLinkIntentFilter = {
  action: 'VIEW',
  autoVerify: true,
  data: [
    {
      scheme: 'https',
      host: 'www.gastroskor.com.tr',
      pathPrefix: '/restaurants',
    },
    {
      scheme: 'https',
      host: 'www.gastroskor.com.tr',
      pathPrefix: '/place',
    },
  ],
  category: ['BROWSABLE', 'DEFAULT'],
};

const googleSignInPlugin = googleIosUrlScheme
  ? [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: googleIosUrlScheme,
      },
    ]
  : '@react-native-google-signin/google-signin';

module.exports = ({ config }) => ({
  ...config,
  name: 'GastroSkor',
  owner: 'delimanyah',
  slug: 'gastroskor',
  version: '1.0.44',
  orientation: 'portrait',
  icon: './assets/logo.png',
  scheme: 'gastroskor',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#141414',
  },
  ios: {
    supportsTablet: true,
    buildNumber: '45',
    bundleIdentifier: 'com.gastroskor.app',
    associatedDomains: ['applinks:www.gastroskor.com.tr'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['remote-notification'],
    },
    entitlements: {
      'aps-environment': 'production',
      'com.apple.developer.associated-domains': ['applinks:www.gastroskor.com.tr'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#141414',
      foregroundImage: './assets/logo.png',
    },
    package: 'com.gastroskor.app',
    versionCode: 53,
    softwareKeyboardLayoutMode: 'resize',
    intentFilters: [appLinkIntentFilter],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/logo.png',
  },
  plugins: [
    'expo-secure-store',
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization: 'gastroskor',
        project: 'gastroskor-mobile',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
    googleSignInPlugin,
    'expo-web-browser',
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#141414',
        image: './assets/logo.png',
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
    [
      'expo-notifications',
      {
        icon: './assets/logo.png',
        color: '#FF6B00',
      },
    ],
    [
      'expo-av',
      {
        microphonePermission:
          'Gastro Siparis sesli arama icin mikrofon kullanilir.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Gastro Siparis komutlarini konusarak yazmak icin mikrofon kullanilir.',
        speechRecognitionPermission:
          'Gastro Siparis sesli arama icin konusma tanima izni gerekir.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
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
    supportEmail: 'destek@gastroskor.com.tr',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || null,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || null,
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? '3009c65b-6419-4567-a859-363698cf6880',
    },
  },
});

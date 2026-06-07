/** @type {import('expo/config').ExpoConfig} */

/** Play build: Google native OAuth geri donus scheme (EAS production env'den gelir). */
function readGoogleAndroidOAuthScheme() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  if (!clientId) return null;
  const prefix = clientId.replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${prefix}`;
}

const googleOAuthScheme = readGoogleAndroidOAuthScheme();
const appScheme = googleOAuthScheme ? ['gastroskor', googleOAuthScheme] : 'gastroskor';

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

const googleOAuthIntentFilter = googleOAuthScheme
  ? {
      action: 'VIEW',
      data: [{ scheme: googleOAuthScheme, path: '/oauth2redirect' }],
      category: ['BROWSABLE', 'DEFAULT'],
    }
  : null;

const gastroskorOAuthIntentFilter = {
  action: 'VIEW',
  data: [{ scheme: 'gastroskor', path: '/oauth2redirect' }],
  category: ['BROWSABLE', 'DEFAULT'],
};

module.exports = ({ config }) => ({
  ...config,
  name: 'GastroSkor',
  owner: 'delimanyah',
  slug: 'gastroskor',
  version: '1.0.10',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: appScheme,
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#141414',
  },
  ios: {
    supportsTablet: true,
    buildNumber: '13',
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
      foregroundImage: './assets/android-icon-foreground.png',
    },
    package: 'com.gastroskor.app',
    versionCode: 20,
    softwareKeyboardLayoutMode: 'resize',
    intentFilters: [
      appLinkIntentFilter,
      gastroskorOAuthIntentFilter,
      ...(googleOAuthIntentFilter ? [googleOAuthIntentFilter] : []),
    ],
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
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#FF6B00',
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
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? '3009c65b-6419-4567-a859-363698cf6880',
    },
  },
});

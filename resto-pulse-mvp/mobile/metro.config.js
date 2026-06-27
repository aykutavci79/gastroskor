const path = require('path');

const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const exclusionList = require(path.join(
  __dirname,
  'node_modules/metro-config/src/defaults/exclusionList.js',
)).default;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname, {
  // Dev'de Sentry kaynak middleware'i ilk bundle'i belirgin yavaslatir.
  enableSourceContextInDevelopment: false,
});

// SDK 53+ Metro package exports can break some deps on Hermes.
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

// Lokal Android build sonrasi Metro'nun .gradle / .cxx taramasini engelle (Windows).
const nativeBuildBlockList = exclusionList([
  'android/.gradle/.*',
  'android/app/.cxx/.*',
  'android/build/.*',
  'android/.idea/.*',
  'ios/Pods/.*',
  'ios/build/.*',
  '.expo-tmp-.*/.*',
  '.android-build/.*',
]);

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  nativeBuildBlockList,
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
];

// PostHog subpath imports (@posthog/core/surveys) rely on package exports — map manually.
const posthogCoreDist = path.resolve(__dirname, 'node_modules/@posthog/core/dist');
const posthogCoreSubpaths = {
  surveys: path.join(posthogCoreDist, 'surveys/index.js'),
  'error-tracking': path.join(posthogCoreDist, 'error-tracking/index.js'),
  testing: path.join(posthogCoreDist, 'testing/index.js'),
  utils: path.join(posthogCoreDist, 'utils/index.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@posthog/core/')) {
    const subpath = moduleName.slice('@posthog/core/'.length);
    const filePath = posthogCoreSubpaths[subpath];
    if (filePath) {
      return { type: 'sourceFile', filePath };
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

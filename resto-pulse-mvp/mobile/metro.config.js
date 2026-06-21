const path = require('path');

const { getSentryExpoConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// SDK 53+ Metro package exports can break some deps on Hermes.
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

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

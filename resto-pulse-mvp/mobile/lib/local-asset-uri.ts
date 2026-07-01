import type { ImageSourcePropType } from 'react-native';
import { Platform } from 'react-native';

/** require() asset → uri (native + web güvenli). */
export function localAssetUri(source: ImageSourcePropType): string | null {
  if (typeof source === 'string') return source;

  if (typeof source === 'object' && source !== null) {
    if ('uri' in source && typeof source.uri === 'string' && source.uri.trim()) {
      return source.uri;
    }
    const nested = source as { default?: ImageSourcePropType };
    if (nested.default != null) return localAssetUri(nested.default);
  }

  if (typeof source !== 'number') return null;

  if (Platform.OS === 'web') {
    try {
      // Metro web bundle — require() bazen doğrudan URL string döner
      const mod = source as unknown;
      if (typeof mod === 'string' && mod.startsWith('/')) return mod;
    } catch {
      // ignore
    }
  }

  try {
    // RN internal resolver — web'de de çalışır (Image.resolveAssetSource değil)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const resolver = require('react-native/Libraries/Image/resolveAssetSource');
    const fn = resolver.default ?? resolver;
    if (typeof fn === 'function') {
      const resolved = fn(source);
      if (resolved?.uri) return resolved.uri;
    }
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Image } = require('react-native');
    if (typeof Image.resolveAssetSource === 'function') {
      return Image.resolveAssetSource(source)?.uri ?? null;
    }
  } catch {
    // ignore
  }

  return null;
}

/** expo-image source — uri veya require. */
export function imageSourceFromUriOrAsset(
  uri: string | null | undefined,
  fallback?: ImageSourcePropType,
): ImageSourcePropType | null {
  if (uri?.trim()) return { uri: uri.trim() };
  return fallback ?? null;
}

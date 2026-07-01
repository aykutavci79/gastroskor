import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

const TR_ONLY_BUILD =
  process.env.EXPO_PUBLIC_I18N_TR_ONLY === '1' ||
  process.env.EXPO_PUBLIC_I18N_TR_ONLY === 'true';

export const SUPPORTED_LANGUAGES = TR_ONLY_BUILD
  ? (['tr'] as const)
  : (['tr', 'en', 'de', 'es', 'pt', 'ru', 'ar', 'fr', 'it'] as const);
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LOCALE_STORAGE_KEY = 'gastro_locale';

// Metro bundler static require map — template literal dynamic import ÇALIŞMAZ
const resources: Record<string, { common: object }> = TR_ONLY_BUILD
  ? { tr: { common: require('../locales/tr/common.json') } }
  : {
      tr: { common: require('../locales/tr/common.json') },
      en: { common: require('../locales/en/common.json') },
      de: { common: require('../locales/de/common.json') },
      es: { common: require('../locales/es/common.json') },
      pt: { common: require('../locales/pt/common.json') },
      ru: { common: require('../locales/ru/common.json') },
      ar: { common: require('../locales/ar/common.json') },
      fr: { common: require('../locales/fr/common.json') },
      it: { common: require('../locales/it/common.json') },
    };

function getSystemLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const systemLang = locales[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(systemLang)
    ? (systemLang as SupportedLanguage)
    : TR_ONLY_BUILD
      ? 'tr'
      : 'en';
}

export function isLanguageRTL(lang: SupportedLanguage): boolean {
  return lang === 'ar';
}

export function willChangeLayoutDirection(lang: SupportedLanguage): boolean {
  return I18nManager.isRTL !== isLanguageRTL(lang);
}

function configureLayoutDirection(lang: SupportedLanguage): void {
  const shouldUseRTL = isLanguageRTL(lang);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(shouldUseRTL);
}

export async function initI18n(): Promise<void> {
  const cachedLang = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
  const initialLang =
    cachedLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cachedLang)
      ? (cachedLang as SupportedLanguage)
      : getSystemLanguage();

  configureLayoutDirection(initialLang);

  if (i18next.isInitialized) return;

  await i18next
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLang,
      fallbackLng: 'tr',
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  configureLayoutDirection(lang);
  await i18next.changeLanguage(lang);
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lang);
}

export default i18next;

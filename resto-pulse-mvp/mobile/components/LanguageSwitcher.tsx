import { useState } from 'react';
import {
  Alert,
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import {
  changeLanguage,
  SUPPORTED_LANGUAGES,
  willChangeLayoutDirection,
  type SupportedLanguage,
} from '@/lib/i18n';
import { GastroColors } from '@/constants/theme';

type LanguageMeta = {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  isRTL?: boolean;
};

const LANGUAGES: LanguageMeta[] = [
  { code: 'tr', label: 'Türkçe',    nativeLabel: 'Türkçe',    flag: '🇹🇷' },
  { code: 'en', label: 'İngilizce', nativeLabel: 'English',   flag: '🇬🇧' },
  { code: 'de', label: 'Almanca',   nativeLabel: 'Deutsch',   flag: '🇩🇪' },
  { code: 'es', label: 'İspanyolca',nativeLabel: 'Español',   flag: '🇪🇸' },
  { code: 'pt', label: 'Portekizce',nativeLabel: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Rusça',     nativeLabel: 'Русский',   flag: '🇷🇺' },
  { code: 'ar', label: 'Arapça',    nativeLabel: 'العربية',   flag: '🇸🇦', isRTL: true },
  { code: 'fr', label: 'Fransızca', nativeLabel: 'Français',  flag: '🇫🇷' },
  { code: 'it', label: 'İtalyanca', nativeLabel: 'Italiano',  flag: '🇮🇹' },
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];
  const chevronIcon = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  async function handleSelect(lang: LanguageMeta) {
    if (lang.code === i18n.language) {
      setModalVisible(false);
      return;
    }

    if (willChangeLayoutDirection(lang.code)) {
      setModalVisible(false);
      Alert.alert(
        t('settings.restartRequired'),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.restart'),
            onPress: () => void applyLanguage(lang.code),
          },
        ],
      );
      return;
    }

    setModalVisible(false);
    await applyLanguage(lang.code);
  }

  async function applyLanguage(code: SupportedLanguage) {
    setBusy(true);
    try {
      await changeLanguage(code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setModalVisible(true)}
          disabled={busy}>
          <Text style={styles.flag}>{currentLang.flag}</Text>
          <View style={styles.rowText}>
            <Text style={styles.langNative}>{currentLang.nativeLabel}</Text>
            <Text style={styles.langLabel}>{currentLang.label}</Text>
          </View>
          <Ionicons name={chevronIcon} size={18} color={GastroColors.muted} />
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.languageChange')}</Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={GastroColors.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList}>
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === i18n.language;
              return (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.langRow,
                    isActive && styles.langRowActive,
                    pressed && styles.langRowPressed,
                  ]}
                  onPress={() => void handleSelect(lang)}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.rowText}>
                    <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                      {lang.nativeLabel}
                    </Text>
                    <Text style={styles.langLabel}>{lang.label}</Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={GastroColors.accent} />
                  )}
                  {lang.isRTL && (
                    <Text style={styles.rtlBadge}>RTL</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  rowPressed: {
    opacity: 0.6,
  },
  flag: {
    fontSize: 26,
  },
  rowText: {
    flex: 1,
  },
  langNative: {
    color: GastroColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  langNativeActive: {
    color: GastroColors.accent,
  },
  langLabel: {
    color: GastroColors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: GastroColors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
  },
  modalTitle: {
    color: GastroColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalList: {
    padding: 16,
    gap: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langRowActive: {
    backgroundColor: GastroColors.panel,
  },
  langRowPressed: {
    backgroundColor: GastroColors.input,
  },
  rtlBadge: {
    color: GastroColors.gold,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: GastroColors.gold,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});

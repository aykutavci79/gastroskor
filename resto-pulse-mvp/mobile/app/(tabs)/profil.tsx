import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';

import { GourmetProfileSection } from '@/components/GourmetProfileSection';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { GastroBrandMark } from '@/components/GastroBrandMark';
import { PushNotificationsToggle } from '@/components/PushNotificationsToggle';
import { Screen } from '@/components/ui/Screen';
import { UserNotificationsSection } from '@/components/UserNotificationsSection';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { ReviewNameDisplayPicker } from '@/components/ReviewNameDisplayPicker';
import { LEGAL_URLS } from '@/constants/legal';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { REVIEW_NAME_DISPLAY_STORAGE_KEY } from '@/lib/display-name';
import { syncUser, updateGourmetProfile } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { getGoogleSignInSetupHint, isExpoGo } from '@/lib/google-signin-config';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';

export default function ProfilScreen() {
  const { user, loading, signOut } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [nameDisplay, setNameDisplay] = useState<AuthorNameDisplayMode>('full');

  useEffect(() => {
    AsyncStorage.getItem(REVIEW_NAME_DISPLAY_STORAGE_KEY)
      .then((raw) => {
        if (raw === 'masked' || raw === 'full' || raw === 'nickname') setNameDisplay(raw);
      })
      .catch(() => undefined);
  }, []);

  const persistNameDisplay = useCallback(
    async (mode: AuthorNameDisplayMode) => {
      setNameDisplay(mode);
      await AsyncStorage.setItem(REVIEW_NAME_DISPLAY_STORAGE_KEY, mode);
      if (user?.email) {
        try {
          await updateGourmetProfile({
            user_email: user.email,
            default_review_name_display: mode,
          });
          await syncUser({
            email: user.email,
            full_name: user.fullName,
            google_sub: user.googleSub ?? null,
            default_review_name_display: mode,
          });
        } catch {
          /* offline */
        }
      }
    },
    [user],
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Hesap</Text>
        <Text style={styles.sub}>
          Giris, bildirimler ve gizlilik ayarlari. Takip ve arkadaslar Takip sekmesinde.
        </Text>
        <Text style={styles.versionMeta}>
          Surum {Constants.expoConfig?.version ?? '?'} · build{' '}
          {Constants.expoConfig?.android?.versionCode ?? '?'}
        </Text>
      </View>

      <ThemeToggleButton />

      {isExpoGo ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Expo Go — API adresi</Text>
          <Text style={styles.apiUrl}>{getApiBase()}</Text>
          <Text style={styles.muted}>
            Canli arama ve giris bu adrese gider. Degistirmek icin mobile/.env → EXPO_PUBLIC_API_URL,
            sonra expo start --clear.
          </Text>
          <Text style={styles.muted}>
            Google girisi Expo Go&apos;da calismaz. Play dahili test / EAS build kullanin.
          </Text>
          {getGoogleSignInSetupHint() ? (
            <Text style={styles.debugWarn}>{getGoogleSignInSetupHint()}</Text>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <Text style={styles.muted}>Yukleniyor...</Text>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Giris yapildi</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.fullName ? <Text style={styles.muted}>{user.fullName}</Text> : null}
          <Link href="/remedy" asChild>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>Telafi teklifleri</Text>
            </Pressable>
          </Link>
          <Pressable style={styles.btnOutline} onPress={() => void signOut()}>
            <Text style={styles.btnOutlineText}>Cikis</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>
            Guvenlik icin yalnizca Google hesabinizla giris yapabilirsiniz.
          </Text>
          <GoogleSignInButton
            onError={(message) => {
              setError(null);
              handleGoogleError(message);
            }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      {user ? <GourmetProfileSection /> : null}

      {user ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          <PushNotificationsToggle />
          <UserNotificationsSection userEmail={user.email} embedded />
        </View>
      ) : null}

      {user ? (
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Yorumlarda isim gizliligi</Text>
          <Text style={styles.muted}>
            Varsayilan: yeni yorumlarda adin nasil gorunsun (Tam ad veya ay*** gibi gizli).
          </Text>
          <ReviewNameDisplayPicker
            fullName={user.fullName ?? user.email}
            nickname={user.nickname}
            value={nameDisplay}
            onChange={(mode) => void persistNameDisplay(mode)}
          />
        </View>
      ) : null}

      <View style={styles.legal}>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}>
          <Text style={styles.legalLink}>Gizlilik Politikasi</Text>
        </Pressable>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.kvkk)}>
          <Text style={styles.legalLink}>KVKK</Text>
        </Pressable>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}>
          <Text style={styles.legalLink}>Kullanim Kosullari</Text>
        </Pressable>
      </View>

      <View style={styles.about}>
        <GastroBrandMark size="sm" showTagline />
        <Text style={styles.aboutTitle}>Hakkinda</Text>
        <Text style={styles.muted}>Yakinindaki en iyi lezzetleri kesfet.</Text>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync('https://cursor.com')}>
          <Text style={styles.aboutCredit}>
            Gelistirme aracı: <Text style={styles.aboutCreditLink}>Cursor</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6 },
  title: { color: GastroColors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  versionMeta: { color: GastroColors.muted, fontSize: 11, marginTop: 8, opacity: 0.85 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  label: { color: GastroColors.muted, fontSize: 12 },
  email: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: GastroColors.muted, fontSize: 13 },
  dividerLabel: {
    color: GastroColors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  input: {
    ...GastroStyles.input,
    ...GastroStyles.inputSm,
  },
  btn: {
    ...GastroStyles.btnPrimary,
    marginTop: 4,
  },
  btnText: GastroStyles.btnPrimaryText,
  btnOutline: {
    ...GastroStyles.btnOutline,
    marginTop: 8,
  },
  btnOutlineText: { color: GastroColors.muted },
  sectionTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legalLink: { color: GastroColors.accent, fontSize: 12, fontWeight: '600' },
  privacyCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.gold,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  privacyTitle: { color: GastroColors.gold, fontSize: 16, fontWeight: '800' },
  about: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  aboutTitle: { color: GastroColors.text, fontSize: 14, fontWeight: '800', alignSelf: 'stretch' },
  aboutCredit: { color: GastroColors.muted, fontSize: 12, marginTop: 4 },
  aboutCreditLink: { color: GastroColors.muted, fontWeight: '600', textDecorationLine: 'underline' },
  error: GastroStyles.errorText,
  debugCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    padding: 12,
    gap: 6,
  },
  debugTitle: { color: GastroColors.gold, fontSize: 12, fontWeight: '800' },
  apiUrl: {
    color: GastroColors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  debugWarn: { color: GastroColors.gold, fontSize: 11, lineHeight: 16 },
});

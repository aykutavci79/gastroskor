import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Link } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

import { AccountDeletionFlow } from '@/components/AccountDeletionFlow';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { GourmetProfileSection } from '@/components/GourmetProfileSection';
import { GastroBrandMark } from '@/components/GastroBrandMark';
import { PushNotificationsToggle } from '@/components/PushNotificationsToggle';
import { Screen } from '@/components/ui/Screen';
import { UserNotificationsSection } from '@/components/UserNotificationsSection';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { DevSignInButton } from '@/components/DevSignInButton';
import { KvkkConsentCheckbox } from '@/components/KvkkConsentCheckbox';
import { ReviewNameDisplayPicker } from '@/components/ReviewNameDisplayPicker';
import { LEGAL_URLS } from '@/constants/legal';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { REVIEW_NAME_DISPLAY_STORAGE_KEY } from '@/lib/display-name';
import { syncUser, updateGourmetProfile } from '@/lib/api';
import { getApiBase, getApiV1Base } from '@/lib/api-base';
import { notifyAuthFailure } from '@/lib/auth-session-events';
import { authHeaders, ensureAccessToken, refreshAuthTokens } from '@/lib/auth-token';
import { createFetchTimeoutSignal } from '@/lib/fetch-timeout';
import { formatApiError, httpErrorMessage } from '@/lib/format-api-error';
import { getGoogleSignInSetupHint, isExpoGo } from '@/lib/google-signin-config';
import { ensureSslPinningReady } from '@/lib/ssl-pinning';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { useTranslation } from 'react-i18next';

async function fetchMyDataExport(): Promise<Record<string, unknown>> {
  await ensureSslPinningReady();
  await ensureAccessToken();

  const path = '/users/me/export';
  const request = () =>
    fetch(`${getApiV1Base()}${path}`, {
      method: 'GET',
      headers: authHeaders(),
      signal: createFetchTimeoutSignal(60_000),
    });

  let response = await request();
  if (response.status === 401) {
    const refreshed = await refreshAuthTokens();
    if (refreshed) {
      response = await request();
    } else {
      await notifyAuthFailure();
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(httpErrorMessage(response.status, text, 'Veri indirme'));
  }

  return (await response.json()) as Record<string, unknown>;
}

export default function ProfilScreen() {
  const { user, loading, signOut, clearLocalSession } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [deleteFlowOpen, setDeleteFlowOpen] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [nameDisplay, setNameDisplay] = useState<AuthorNameDisplayMode>('full');
  const [exportBusy, setExportBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

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

  const handleExportData = useCallback(async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const payload = await fetchMyDataExport();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File(Paths.cache, `gastroskor-export-${stamp}.json`);
      if (file.exists) {
        file.delete();
      }
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast(t('profile.shareNotAvailable'));
        return;
      }

      const shareUri =
        Platform.OS === 'android' && file.contentUri ? file.contentUri : file.uri;
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: t('profile.dataExportTitle'),
      });
    } catch (err) {
      showToast(formatApiError(err, t('profile.exportError')));
    } finally {
      setExportBusy(false);
    }
  }, [exportBusy, showToast]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Text style={styles.sub}>{t('profile.subtitle')}</Text>
        <Text style={styles.versionMeta}>
          {t('profile.version', {
            version: Constants.expoConfig?.version ?? '?',
            build: Constants.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? '?',
          })}
        </Text>
      </View>

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
        <Text style={styles.muted}>{t('common.loading')}</Text>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.label}>{t('profile.loggedIn')}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.fullName ? <Text style={styles.muted}>{user.fullName}</Text> : null}
          <Link href="/remedy" asChild>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>{t('profile.compensationOffers')}</Text>
            </Pressable>
          </Link>
          <Link href="/yorumlarim" asChild>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>{t('nav.myReviews')}</Text>
            </Pressable>
          </Link>
          <Link href="/siparislerim" asChild>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>{t('nav.myOrders')}</Text>
            </Pressable>
          </Link>
          <Pressable style={styles.btnOutline} onPress={() => void signOut()}>
            <Text style={styles.btnOutlineText}>{t('auth.logout')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>{t('profile.googleOnly')}</Text>
          <KvkkConsentCheckbox checked={kvkkAccepted} onChange={setKvkkAccepted} />
          <GoogleSignInButton
            consentAccepted={kvkkAccepted}
            onError={(message) => {
              setError(null);
              handleGoogleError(message);
            }}
          />
          <DevSignInButton onError={handleGoogleError} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      {user ? <GourmetProfileSection /> : null}

      {user ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
          <PushNotificationsToggle />
          <UserNotificationsSection userEmail={user.email} embedded />
        </View>
      ) : null}

      {user ? (
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>{t('profile.reviewPrivacy')}</Text>
          <Text style={styles.muted}>{t('profile.reviewPrivacyHint')}</Text>
          <ReviewNameDisplayPicker
            fullName={user.fullName ?? user.email}
            nickname={user.nickname}
            value={nameDisplay}
            onChange={(mode) => void persistNameDisplay(mode)}
          />
        </View>
      ) : null}

      <LanguageSwitcher />

      <View style={styles.legal}>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}>
          <Text style={styles.legalLink}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.kvkk)}>
          <Text style={styles.legalLink}>KVKK</Text>
        </Pressable>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}>
          <Text style={styles.legalLink}>{t('profile.termsOfService')}</Text>
        </Pressable>
      </View>

      <View style={styles.about}>
        <GastroBrandMark size="sm" showTagline />
        <Text style={styles.aboutTitle}>{t('profile.about')}</Text>
        <Text style={styles.muted}>{t('profile.tagline')}</Text>
        <Pressable onPress={() => void WebBrowser.openBrowserAsync('https://cursor.com')}>
          <Text style={styles.aboutCredit}>
            {t('profile.developmentTool')}<Text style={styles.aboutCreditLink}>Cursor</Text>
          </Text>
        </Pressable>
      </View>

      {user ? (
        <View style={styles.privacyExportCard}>
          <Text style={styles.privacyTitle}>{t('profile.kvkkData')}</Text>
          <Text style={styles.muted}>{t('profile.kvkkDataHint')}</Text>
          <Pressable
            style={[styles.btnOutline, exportBusy && styles.btnOutlineDisabled]}
            disabled={exportBusy}
            onPress={() => void handleExportData()}>
            {exportBusy ? (
              <ActivityIndicator color={GastroColors.muted} />
            ) : (
              <Text style={styles.btnOutlineText}>{t('profile.downloadMyData')}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {user ? (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>{t('profile.dangerZone')}</Text>
          <Text style={styles.dangerSub}>{t('profile.dangerZoneHint')}</Text>
          <Pressable style={styles.dangerBtn} onPress={() => setDeleteFlowOpen(true)}>
            <Text style={styles.dangerBtnText}>{t('profile.deleteAccount')}</Text>
          </Pressable>
        </View>
      ) : null}

      <AccountDeletionFlow
        visible={deleteFlowOpen}
        onClose={() => setDeleteFlowOpen(false)}
        onDeleted={clearLocalSession}
      />

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
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
  btnOutlineDisabled: {
    opacity: 0.6,
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
  privacyExportCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
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
  dangerZone: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.bad,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 16,
    gap: 10,
  },
  dangerTitle: { color: GastroColors.bad, fontSize: 14, fontWeight: '800' },
  dangerSub: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  dangerBtn: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.bad,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  dangerBtnText: { color: GastroColors.bad, fontSize: 14, fontWeight: '800' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.bad,
    backgroundColor: 'rgba(30, 10, 12, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: { color: GastroColors.text, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});

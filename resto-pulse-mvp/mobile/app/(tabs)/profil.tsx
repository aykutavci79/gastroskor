import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GourmetProfileSection } from '@/components/GourmetProfileSection';
import { Screen } from '@/components/ui/Screen';
import { FollowingRestaurantsSection } from '@/components/FollowingRestaurantsSection';
import { FriendsSection } from '@/components/FriendsSection';
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
  const { user, loading, signInWithEmail, signOut } = useSession();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
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
            avatar_url: user.avatarUrl ?? null,
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

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email, name || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giris basarisiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Hesap</Text>
        <Text style={styles.sub}>
          Yorum yazmak icin giris yapin. Google native SDK (Play build) veya e-posta ile devam edin.
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
        <Text style={styles.muted}>Yukleniyor...</Text>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Giris yapildi</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.fullName ? <Text style={styles.muted}>{user.fullName}</Text> : null}
          <Pressable style={styles.btnOutline} onPress={() => void signOut()}>
            <Text style={styles.btnOutlineText}>Cikis</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <GoogleSignInButton
            busy={busy}
            onError={(message) => {
              setError(null);
              handleGoogleError(message);
            }}
          />

          <Text style={styles.dividerLabel}>veya e-posta ile giris (Google calismazsa)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@gmail.com"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.input}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ad (opsiyonel)"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.btn} onPress={() => void onSave()} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Kaydediliyor...' : 'E-posta ile devam et'}</Text>
          </Pressable>
        </View>
      )}

      {user ? <GourmetProfileSection /> : null}

      {user ? <UserNotificationsSection userEmail={user.email} /> : null}
      {user ? <FriendsSection userEmail={user.email} /> : null}
      {user ? <FollowingRestaurantsSection userEmail={user.email} /> : null}

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

      <Pressable
        style={styles.linkCard}
        onPress={() => void WebBrowser.openBrowserAsync('https://www.gastroskor.com.tr/panel')}>
        <Text style={styles.linkTitle}>Web paneli ac</Text>
        <Text style={styles.muted}>Tarayicida tam panel (admin, detayli ayarlar)</Text>
      </Pressable>

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>Hakkinda</Text>
        <Text style={styles.muted}>GastroSkor — yakinindaki en iyi lezzetleri kesfet.</Text>
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
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legalLink: { color: GastroColors.accent, fontSize: 12, fontWeight: '600' },
  linkCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
    gap: 4,
    marginTop: 8,
  },
  linkTitle: { color: GastroColors.accent, fontWeight: '700', fontSize: 15 },
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
    gap: 6,
  },
  aboutTitle: { color: GastroColors.text, fontSize: 14, fontWeight: '800' },
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

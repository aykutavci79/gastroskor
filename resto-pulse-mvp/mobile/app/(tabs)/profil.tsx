import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { LEGAL_URLS } from '@/constants/legal';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';

export default function ProfilScreen() {
  const { user, loading, signInWithEmail, signOut } = useSession();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Yorum yazmak ve isletme paneli icin Google ile giris yapin. Web panelindeki hesapla ayni olmali.
        </Text>
      </View>

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

          <Text style={styles.dividerLabel}>veya gecici e-posta (test)</Text>
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
});

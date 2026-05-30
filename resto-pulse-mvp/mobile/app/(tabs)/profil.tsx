import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';

export default function ProfilScreen() {
  const { user, loading, signInWithEmail, signOut } = useSession();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          Isletme paneli icin web sitesinde kullandiginiz Google e-postasini girin. Yorum yazmak icin de
          ayni hesap onerilir.
        </Text>
      </View>

      {loading ? (
        <Text style={styles.muted}>Yukleniyor...</Text>
      ) : user ? (
        <View style={styles.card}>
          <Text style={styles.label}>Giris yapildi</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.fullName ? <Text style={styles.muted}>{user.fullName}</Text> : null}
          <Pressable style={styles.btnOutline} onPress={() => signOut()}>
            <Text style={styles.btnOutlineText}>Cikis</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@gmail.com"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.input}
          />
          <Text style={styles.label}>Ad (opsiyonel)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Isim"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.btn} onPress={onSave} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Kaydediliyor...' : 'Hesabi bagla'}</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.linkCard}
        onPress={() => WebBrowser.openBrowserAsync('https://www.gastroskor.com.tr/panel')}>
        <Text style={styles.linkTitle}>Web paneli ac</Text>
        <Text style={styles.muted}>Tarayicida tam panel (admin, detayli ayarlar)</Text>
      </Pressable>
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
  linkCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
    gap: 4,
  },
  linkTitle: { color: GastroColors.accent, fontWeight: '700', fontSize: 15 },
  error: GastroStyles.errorText,
});

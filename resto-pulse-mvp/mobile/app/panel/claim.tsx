import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { searchLivePlaces, startRestaurantClaim } from '@/lib/api';

const PANEL_WEB_URL = `${(process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '')}/panel`;

export default function ClaimScreen() {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Bursa');
  const [placeName, setPlaceName] = useState('');
  const [step, setStep] = useState<'search' | 'pending_admin'>('search');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Screen>
        <Text style={styles.muted}>Once Hesap sekmesinden giris yapin.</Text>
      </Screen>
    );
  }

  if (step === 'pending_admin') {
    return (
      <Screen>
        <Text style={styles.title}>Onay bekleniyor</Text>
        <Text style={styles.sub}>
          {placeName} talebi alindi. Onay sonrasi isletme islemlerini web panelden surdurun.
        </Text>
        <Pressable style={styles.btn} onPress={() => void WebBrowser.openBrowserAsync(PANEL_WEB_URL)}>
          <Text style={styles.btnText}>Web paneli ac</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mekan kaydi</Text>
      <Text style={styles.sub}>Google&apos;daki isletmenizi bulun; talep admin onayina gider.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Isletme adi"
        placeholderTextColor={GastroColors.placeholder}
        style={styles.input}
      />
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="Sehir"
        placeholderTextColor={GastroColors.placeholder}
        style={styles.input}
      />
      <Pressable
        style={styles.btn}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const res = await searchLivePlaces({ q: query.trim(), city: city.trim(), limit: 1 });
            const item = res.items[0];
            if (!item) {
              setMessage('Sonuc bulunamadi');
              return;
            }
            setPlaceName(item.name);
            const started = await startRestaurantClaim({
              user_email: user.email,
              place_id: item.place_id,
              city: city.trim(),
            });
            if (started.phone_info.requires_admin_approval || started.verification_status === 'pending_admin') {
              setStep('pending_admin');
              setMessage('Admin onayi bekleniyor');
            } else {
              setMessage('SMS akisi bu surumde kapali. Web panelden devam edin.');
            }
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Hata');
          } finally {
            setBusy(false);
          }
        }}>
        <Text style={styles.btnText}>{busy ? '...' : 'Talep gonder'}</Text>
      </Pressable>
      {placeName ? <Text style={styles.muted}>Secilen: {placeName}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 14, marginBottom: 8 },
  input: {
    ...GastroStyles.input,
    ...GastroStyles.inputSm,
    backgroundColor: GastroColors.panel,
  },
  btn: {
    ...GastroStyles.btnPrimary,
    padding: 14,
  },
  btnText: GastroStyles.btnPrimaryText,
  muted: { color: GastroColors.muted, fontSize: 13 },
  ok: { color: GastroColors.accent, fontSize: 13 },
});

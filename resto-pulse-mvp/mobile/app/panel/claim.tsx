import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  searchLivePlaces,
  sendRestaurantClaimOtp,
  startRestaurantClaim,
  verifyRestaurantClaimOtp,
} from '@/lib/api';

export default function ClaimScreen() {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Bursa');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'otp'>('search');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Screen>
        <Text style={styles.muted}>Once Hesap sekmesinden giris yapin.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mekan kaydi</Text>
      <Text style={styles.sub}>Google'daki isletmenizi bulun, SMS ile dogrulayin.</Text>

      {step === 'search' ? (
        <>
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
                setPlaceId(item.place_id);
                setPlaceName(item.name);
                const started = await startRestaurantClaim({
                  user_email: user.email,
                  place_id: item.place_id,
                  city: city.trim(),
                });
                const otpRes = await sendRestaurantClaimOtp(user.email);
                setPhoneMasked(started.phone_info.phone_masked ?? otpRes.phone_masked);
                setStep('otp');
                setMessage('SMS kodu gonderildi');
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'Hata');
              } finally {
                setBusy(false);
              }
            }}>
            <Text style={styles.btnText}>{busy ? '...' : 'Bul ve OTP gonder'}</Text>
          </Pressable>
          {placeName ? <Text style={styles.muted}>Secilen: {placeName}</Text> : null}
        </>
      ) : (
        <>
          <Text style={styles.muted}>
            {placeName} · SMS: {phoneMasked ?? '***'}
          </Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="6 haneli kod"
            keyboardType="number-pad"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.input}
          />
          <Pressable
            style={styles.btn}
            disabled={busy || !placeId}
            onPress={async () => {
              setBusy(true);
              try {
                await verifyRestaurantClaimOtp({ user_email: user.email, code: otp.trim() });
                setMessage('Dogrulandi! Panele yonlendiriliyorsunuz.');
                router.replace('/(tabs)/panel');
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'Kod hatali');
              } finally {
                setBusy(false);
              }
            }}>
            <Text style={styles.btnText}>Kodu dogrula</Text>
          </Pressable>
        </>
      )}

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

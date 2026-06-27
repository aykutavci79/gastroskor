import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { gastroCoinStackHeaderTitle } from '@/components/GastroCoinHeaderTitle';
import { OrderContactSetupForm } from '@/components/OrderContactSetupForm';
import { Screen } from '@/components/ui/Screen';
import { GastroColorsLight } from '@/constants/theme';
import { useSession } from '@/context/session-context';

const PAGE_BG = '#FFFFFF';

export default function OrderContactSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useSession();
  const [ready, setReady] = useState(false);

  const returnToRaw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = returnToRaw?.trim() || '/siparis-acik';

  const goBack = useCallback(() => {
    router.replace(returnTo as never);
  }, [returnTo, router]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerTitle: gastroCoinStackHeaderTitle('Telefon ve adres', 'light'),
          headerBackTitle: 'Geri',
          headerBackVisible: true,
          ...(Platform.OS === 'ios' ? { headerBackTitleVisible: true } : {}),
          headerStyle: { backgroundColor: PAGE_BG },
          headerTintColor: GastroColorsLight.text,
          headerShadowVisible: false,
        }}
      />
      <Screen scroll backgroundColor={PAGE_BG} style={styles.page}>
        {!user ? (
          <Text style={styles.muted}>Sipariş bilgileri için önce hesabına giriş yap.</Text>
        ) : (
          <>
            <OrderContactSetupForm userEmail={user.email} onReadyChange={setReady} />
            <Pressable
              style={[styles.continueBtn, !ready && styles.continueDisabled]}
              disabled={!ready}
              onPress={goBack}>
              <Text style={styles.continueText}>Siparişe dön</Text>
            </Pressable>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  page: { gap: 16, paddingTop: 8 },
  muted: { color: GastroColorsLight.muted, fontSize: 14, lineHeight: 20 },
  continueBtn: {
    marginTop: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: '#141414', fontWeight: '900', fontSize: 16 },
});

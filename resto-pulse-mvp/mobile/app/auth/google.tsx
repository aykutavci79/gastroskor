import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';

export default function GoogleAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    email?: string | string[];
    name?: string | string[];
    picture?: string | string[];
    sub?: string | string[];
  }>();
  const { signInWithGoogle } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const read = (value?: string | string[]) => {
      if (Array.isArray(value)) return value[0]?.trim();
      return typeof value === 'string' ? value.trim() : undefined;
    };

    const email = read(params.email)?.toLowerCase();
    if (!email) {
      setError('Giris bilgisi eksik.');
      return;
    }

    void (async () => {
      try {
        await signInWithGoogle({
          sub: read(params.sub) || email,
          email,
          email_verified: true,
          name: read(params.name),
          picture: read(params.picture),
        });
        router.replace('/(tabs)/profil');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Giris basarisiz.');
      }
    })();
  }, [params.email, params.name, params.picture, params.sub, signInWithGoogle]);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={GastroColors.accent} size="large" />
          <Text style={styles.label}>Giris tamamlanıyor...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GastroColors.bg,
    padding: 24,
    gap: 12,
  },
  label: { color: GastroColors.muted, fontSize: 14 },
  error: { color: GastroColors.accent, textAlign: 'center', lineHeight: 20 },
});

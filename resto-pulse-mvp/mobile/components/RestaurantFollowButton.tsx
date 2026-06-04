import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import {
  followRestaurant,
  getRestaurantFollowStatus,
  unfollowRestaurant,
} from '@/lib/api';
import { followApiErrorMessage } from '@/lib/follow-api-errors';

type Props = {
  restaurantId: string;
  userEmail: string | null | undefined;
  onFollowingChange?: (following: boolean) => void;
};

export function RestaurantFollowButton({ restaurantId, userEmail, onFollowingChange }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = userEmail?.trim().toLowerCase() || null;

  useEffect(() => {
    if (!email || !restaurantId) {
      setFollowing(false);
      setLoaded(true);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setError(null);
    getRestaurantFollowStatus(restaurantId, email)
      .then((status) => {
        if (!cancelled) {
          setFollowing(status.following);
          onFollowingChange?.(status.following);
          setLoaded(true);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFollowing(false);
          setLoaded(true);
          setError(followApiErrorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, email]);

  const toggle = useCallback(async () => {
    if (!email) {
      router.push('/(tabs)/profil');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const status = following
        ? await unfollowRestaurant(restaurantId, email)
        : await followRestaurant(restaurantId, email);
      setFollowing(status.following);
      onFollowingChange?.(status.following);
    } catch (err) {
      setError(followApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [following, restaurantId, router, email]);

  if (!loaded) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="small" color={GastroColors.accent} />
      </View>
    );
  }

  const label = email
    ? following
      ? 'Takipten çık'
      : 'Takip et'
    : 'Takip için giriş yap';

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.btn, following && styles.btnFollowing, busy && styles.btnBusy]}
        onPress={() => void toggle()}
        disabled={busy}>
        {busy ? (
          <ActivityIndicator size="small" color={following ? GastroColors.text : '#0a0a0a'} />
        ) : (
          <Text style={[styles.btnText, following && styles.btnTextFollowing]}>{label}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  btn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  btnFollowing: {
    backgroundColor: 'transparent',
    borderColor: GastroColors.border,
  },
  btnBusy: { opacity: 0.7 },
  btnText: { color: '#0a0a0a', fontWeight: '800', fontSize: 14 },
  btnTextFollowing: { color: GastroColors.text },
  error: { color: '#f87171', fontSize: 12, lineHeight: 17, maxWidth: 320 },
});

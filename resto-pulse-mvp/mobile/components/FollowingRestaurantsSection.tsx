import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FollowingRestaurantAccordionRow } from '@/components/FollowingRestaurantAccordionRow';
import { GastroColors } from '@/constants/theme';
import { listRestaurantFollows } from '@/lib/api';
import { followApiErrorMessage } from '@/lib/follow-api-errors';
import { sortRestaurantsByRatingDesc } from '@/lib/sort-restaurants';
import type { RestaurantListItem } from '@/lib/types';

type Props = {
  userEmail: string;
};

export function FollowingRestaurantsSection({ userEmail }: Props) {
  const [items, setItems] = useState<RestaurantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = useMemo(() => sortRestaurantsByRatingDesc(items), [items]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listRestaurantFollows(userEmail.trim().toLowerCase())
      .then((data) => setItems(sortRestaurantsByRatingDesc(data.items)))
      .catch((err) => {
        setItems([]);
        setError(followApiErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Takip ettiklerim</Text>
      <Text style={styles.sub}>
        Liste yüksek puandan düşüğe sıralı. Satıra dokununca kart açılır. Üye işletmelere yeni
        takipçi bildirimi gider.
      </Text>
      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 12 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : sortedItems.length === 0 ? (
        <Text style={styles.muted}>Henüz takip ettiğin mekan yok. Detayda Takip et’e bas.</Text>
      ) : (
        <View style={styles.list}>
          {sortedItems.map((restaurant) => (
            <FollowingRestaurantAccordionRow key={restaurant.id} restaurant={restaurant} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  title: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  muted: { color: GastroColors.muted, fontSize: 13 },
  error: { color: '#f87171', fontSize: 13 },
  list: { gap: 8 },
});

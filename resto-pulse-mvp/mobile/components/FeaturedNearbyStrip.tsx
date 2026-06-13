import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { listTrendingRestaurantsWeek } from '@/lib/api';
import { resolveDeviceCoords } from '@/lib/device-location';
import { filterFeaturedByRating } from '@/lib/featured-rating-filter';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { formatDistanceLabel } from '@/lib/travel-estimate';
import { peekTileWidth } from '@/lib/horizontal-peek-layout';
import { restaurantDetailHref } from '@/lib/uuid';
import type { RestaurantTrendingItem } from '@/lib/types';

const CARD_GAP = 8;
const CARD_PHOTO_H = 54;
const CARD_BODY_H = 34;
const MAX_ITEMS = 6;

type Props = {
  style?: ViewStyle;
};

export function FeaturedNearbyStrip({ style }: Props) {
  const { city, fallbackCoords } = useCity();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = peekTileWidth(screenWidth, { paddingLeft: 12, gap: CARD_GAP, peekRight: 40 });

  const [items, setItems] = useState<RestaurantTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatured = useCallback(async (coords: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      let raw = await listTrendingRestaurantsWeek({
        lat: coords?.lat,
        lng: coords?.lng,
        city,
        limit: 12,
        source: 'google',
      });
      if (raw.length === 0) {
        raw = await listTrendingRestaurantsWeek({
          lat: coords?.lat,
          lng: coords?.lng,
          city,
          limit: 12,
          source: 'gastroskor',
        });
      }
      setItems(filterFeaturedByRating(raw, 3).slice(0, MAX_ITEMS));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      await loadFeatured(fallbackCoords);
      if (cancelled) return;
      const coords = await resolveDeviceCoords({ requestPermission: false, timeoutMs: 10_000 });
      if (!cancelled) await loadFeatured(coords ?? fallbackCoords);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFeatured, fallbackCoords]);

  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Yakınındaki en iyiler</Text>
        <Text style={styles.meta}>4.5+ · ücretsiz vitrin</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={styles.loader} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Yakında öne çıkan restoran yok.</Text>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={styles.row}
          style={styles.rowScroll}>
          {items.map((item, index) => {
            const href = restaurantDetailHref({
              id: item.id,
              restaurant_id: item.restaurant_id,
              google_place_id: item.google_place_id,
            });
            const cover = resolveCardCoverUrl(item);
            const rating = item.week_avg_rating ?? item.google_rating;
            const dist = formatDistanceLabel(item);
            const meta = [
              rating != null ? `G ${rating.toFixed(1)}` : null,
              item.avg_rating != null ? `GS ${item.avg_rating.toFixed(1)}` : null,
              dist,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                key={`${item.id}-${index}`}
                style={[styles.card, { width: cardWidth, marginRight: CARD_GAP }]}
                onPress={() => href && router.push(href as Href)}>
                <View style={[styles.photo, { minHeight: CARD_PHOTO_H }]}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={styles.photoFallback}>
                      <Text style={styles.photoEmoji}>🍽️</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {meta}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 12,
    gap: 5,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: GastroColors.text, fontSize: 11, fontWeight: '800' },
  meta: { color: GastroColors.muted, fontSize: 9 },
  loader: { marginVertical: 10 },
  empty: { color: GastroColors.muted, fontSize: 10, paddingVertical: 8 },
  rowScroll: { flex: 1, minHeight: CARD_PHOTO_H + CARD_BODY_H + 10 },
  row: {
    paddingRight: 12,
    alignItems: 'stretch',
    minHeight: '100%',
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 6,
    gap: 4,
    alignSelf: 'stretch',
  },
  photo: {
    flex: 1,
    borderRadius: 7,
    backgroundColor: GastroColors.input,
    overflow: 'hidden',
  },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoEmoji: { fontSize: 22, opacity: 0.45 },
  name: { color: GastroColors.text, fontSize: 10, fontWeight: '800', lineHeight: 13 },
  cardMeta: { color: GastroColors.muted, fontSize: 8 },
});

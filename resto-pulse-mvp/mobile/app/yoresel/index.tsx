import { useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

export default function YoreselLezzetlerScreen() {
  const { city, cityLabel } = useCity();
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const router = useRouter();
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listRegionalProducts({ city })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>İç turizm · {cityLabel}</Text>
        <Text style={styles.title}>Yöresel lezzetler</Text>
        <Text style={styles.sub}>
          TÜRKPATENT’te tescilli ürünler. Tıklayınca Google canlı araması açılır — GastroSkor restoran onayı
          vermez.
        </Text>

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}

        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.slug}
              style={styles.card}
              onPress={() => router.push(`/yoresel/${item.slug}` as Href)}>
              <View style={styles.cardRow}>
                <View style={styles.cardBody}>
                  <Text style={styles.badge}>MAHREÇ</Text>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.region}>{item.region}</Text>
                  <Text style={styles.summary} numberOfLines={3}>
                    {item.summary}
                  </Text>
                  <Text style={styles.meta}>
                    {item.registration_year} · {item.indication_type} · Canlı arama
                  </Text>
                </View>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: GastroColorScheme, shadow: GastroShadowScheme) {
  return StyleSheet.create({
    scroll: { paddingBottom: 32 },
    kicker: {
      color: colors.gold,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 },
    sub: { color: colors.muted, marginTop: 8, lineHeight: 20, fontSize: 14 },
    list: { marginTop: 20, gap: 12 },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      backgroundColor: colors.panel,
      overflow: 'hidden',
      ...shadow.card,
    },
    cardRow: { flexDirection: 'row', alignItems: 'stretch' },
    cardBody: { flex: 1, padding: 16 },
    thumb: {
      width: 96,
      minHeight: 120,
      backgroundColor: colors.input,
    },
    badge: {
      color: colors.gold,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 6 },
    region: { color: colors.muted, fontSize: 12, marginTop: 2 },
    summary: { color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 18 },
    meta: { color: colors.gold, fontSize: 12, fontWeight: '600', marginTop: 10 },
  });
}

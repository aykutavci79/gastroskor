import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

const PREVIEW_COUNT = 4;

export function RegionalFlavorsHomeSection() {
  const { city, cityLabel } = useCity();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    listRegionalProducts({ city })
      .then((data) => {
        if (!cancelled) setItems(data.items.slice(0, PREVIEW_COUNT));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, city]);

  const moreLabel =
    items.length > 0 ? `Tüm ${cityLabel} lezzetleri` : `${cityLabel} listesine git`;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.teaser}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}>
        <View style={styles.teaserHead}>
          <Text style={styles.title}>🏺 Yöresel Lezzetler</Text>
          <View style={styles.cityPill}>
            <Text style={styles.cityPillText}>{cityLabel}</Text>
          </View>
        </View>
        <Text style={styles.sub}>
          Seçtiğiniz ilin coğrafi işaretli ürünleri hemen yanınızda
        </Text>
        <Text style={styles.toggle}>{expanded ? '▲ Listeyi gizle' : '▼ Listeyi göster'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {loading ? <ActivityIndicator color={GastroColors.gold} style={{ marginVertical: 8 }} /> : null}

          {!loading && loaded && items.length === 0 ? (
            <Text style={styles.empty}>Bu il için yöresel ürün bulunamadı.</Text>
          ) : null}

          {items.map((item) => (
            <Pressable
              key={item.slug}
              style={styles.card}
              onPress={() => router.push(`/yoresel/${item.slug}` as Href)}>
              <Text style={styles.badge}>Tescilli ürün</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.region}>
                {item.region} · {item.registration_year}
              </Text>
              <Text style={styles.summary} numberOfLines={2}>
                {item.summary}
              </Text>
              <Text style={styles.cta}>Bu lezzeti sunan restoranlar →</Text>
            </Pressable>
          ))}

          {loaded && items.length > 0 ? (
            <Pressable style={styles.moreBtn} onPress={() => router.push('/yoresel' as Href)}>
              <Text style={styles.moreBtnText}>{moreLabel}</Text>
            </Pressable>
          ) : null}
          {loaded && items.length === 0 ? (
            <Pressable style={styles.moreBtn} onPress={() => router.push('/yoresel' as Href)}>
              <Text style={styles.moreBtnText}>{moreLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  teaser: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 6,
  },
  teaserHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: GastroColors.text, fontSize: 18, fontWeight: '800', flex: 1 },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  toggle: { color: GastroColors.gold, fontSize: 12, fontWeight: '700', marginTop: 2 },
  cityPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cityPillText: { color: GastroColors.gold, fontSize: 11, fontWeight: '800' },
  list: { gap: 10 },
  empty: { color: GastroColors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    color: GastroColors.gold,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  region: { color: GastroColors.muted, fontSize: 11 },
  summary: { color: GastroColors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  cta: { color: GastroColors.gold, fontSize: 12, fontWeight: '700', marginTop: 6 },
  moreBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  moreBtnText: { color: GastroColors.gold, fontWeight: '700', fontSize: 13 },
});

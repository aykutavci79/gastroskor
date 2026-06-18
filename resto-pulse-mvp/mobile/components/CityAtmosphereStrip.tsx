import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KesfetReviewTickerSheet } from '@/components/KesfetReviewTickerSheet';
import { loadKesfetReviewTicker, type KesfetReviewTickerItem } from '@/lib/kesfet-review-ticker';
import { getCityAtmosphere } from '@/lib/city-atmosphere';

type Props = {
  city: string;
  statusLine?: string;
  manual?: boolean;
  showTicker?: boolean;
  onCityPress?: () => void;
  onCityLongPress?: () => void;
};

const TICKER_MS = 4500;

export function CityAtmosphereStrip({
  city,
  statusLine = 'Konumuna göre',
  manual = false,
  showTicker = true,
  onCityPress,
  onCityLongPress,
}: Props) {
  const theme = getCityAtmosphere(city);
  const palette = theme.darkStrip;
  const [items, setItems] = useState<KesfetReviewTickerItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheetItem, setSheetItem] = useState<KesfetReviewTickerItem | null>(null);

  useEffect(() => {
    if (!showTicker) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void loadKesfetReviewTicker(city).then((rows) => {
      if (cancelled) return;
      setItems(rows);
      setActiveIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, [city, showTicker]);

  useEffect(() => {
    if (!showTicker || items.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, TICKER_MS);
    return () => clearInterval(timer);
  }, [items.length, showTicker]);

  const activeItem = items[activeIndex] ?? null;
  const tickerLine = useMemo(() => {
    if (!activeItem) return null;
    const place =
      activeItem.restaurant_name.length > 18
        ? `${activeItem.restaurant_name.slice(0, 16)}…`
        : activeItem.restaurant_name;
    return `★ ${activeItem.rating} · ${place}: ${activeItem.snippet}`;
  }, [activeItem]);

  return (
    <>
      <Pressable
        onPress={onCityPress}
        onLongPress={onCityLongPress}
        disabled={!onCityPress && !onCityLongPress}
        style={({ pressed }) => [
          styles.wrap,
          {
            backgroundColor: palette.background,
            borderColor: `${theme.darkStrip.accent}44`,
          },
          pressed && styles.wrapPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${theme.label} — ${statusLine}. Şehir değiştirmek için dokun.`}>
        <View style={styles.row}>
          <View style={styles.left}>
            {!manual ? (
              <Ionicons name="location-sharp" size={12} color={palette.accent} style={styles.locationIcon} />
            ) : (
              <View style={[styles.dot, { backgroundColor: palette.accent }]} />
            )}
            <Text style={[styles.city, { color: palette.text }]} numberOfLines={1}>
              {theme.label}
            </Text>
            <Text style={[styles.status, { color: theme.darkStrip.muted }]} numberOfLines={1}>
              · {statusLine}
            </Text>
          </View>
          <Text style={[styles.hint, { color: theme.darkStrip.muted }]} numberOfLines={1}>
            {theme.hint}
          </Text>
        </View>

        {showTicker && tickerLine ? (
          <Pressable
            style={({ pressed }) => [styles.tickerRow, pressed && styles.tickerPressed]}
            onPress={(event) => {
              event.stopPropagation();
              if (activeItem) setSheetItem(activeItem);
            }}
            accessibilityRole="button"
            accessibilityLabel="GS yorumunu oku">
            <Text style={[styles.tickerLabel, { color: palette.accent }]}>GS</Text>
            <Text style={[styles.tickerText, { color: palette.text }]} numberOfLines={1}>
              {tickerLine}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>

      <KesfetReviewTickerSheet item={sheetItem} onClose={() => setSheetItem(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  wrapPressed: { opacity: 0.94 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  locationIcon: { marginRight: 1 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  city: {
    fontSize: 13,
    fontWeight: '800',
  },
  status: {
    fontSize: 10,
    fontWeight: '600',
  },
  hint: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '46%',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 6,
  },
  tickerPressed: { opacity: 0.9 },
  tickerLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tickerText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
});

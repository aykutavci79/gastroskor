import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  KITCHEN_TILE_GRADIENT,
  kitchenCategoryImage,
} from '@/constants/kitchen-category-images';
import { onlineOrderInk, type OnlineOrderUiTone } from '@/constants/online-order-theme';
import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { kitchenEmoji, type KitchenPickerItem } from '@/lib/kitchen-category-visual';

type Props = {
  categories: KitchenPickerItem[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  tone?: OnlineOrderUiTone;
};

const COLS = 4;
const GAP = 6;
const TILE_RADIUS = 14;

export function KitchenCategoryGrid({
  categories,
  selectedSlugs,
  onToggle,
  onClear,
  tone = 'default',
}: Props) {
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow, tone), [colors, shadow, tone]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.hint}>Birden fazla seç · boş bırakırsan tüm mutfaklar</Text>
        {selectedSlugs.length ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.clearBtn}>Temizle</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => {
          const selected = selectedSlugs.includes(cat.slug);
          return (
            <Pressable
              key={cat.slug}
              style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
              onPress={() => onToggle(cat.slug)}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <KitchenTile category={cat} selected={selected} styles={styles} />
              <Text
                style={[styles.labelBelow, selected && styles.labelBelowOn]}
                numberOfLines={2}>
                {cat.label.split('&')[0]?.trim() ?? cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedSlugs.length ? (
        <Text style={styles.selectionLine}>{selectedSlugs.length} mutfak seçili</Text>
      ) : null}
    </View>
  );
}

function KitchenTile({
  category,
  selected,
  styles,
}: {
  category: KitchenPickerItem;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const image = kitchenCategoryImage(category.slug);
  const gradient = KITCHEN_TILE_GRADIENT[category.slug] ?? ['#3a3a3a', '#1a1a1a'];

  return (
    <View style={[styles.tileShell, selected && styles.tileShellOn]}>
      <View style={[styles.tileInner, selected && styles.tileInnerOn]}>
        {image?.kind === 'local' ? (
          <Image
            source={image.source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: gradient[0] }]}>
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{kitchenEmoji(category.slug)}</Text>
            </View>
          </View>
        )}
      </View>

      {selected ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: GastroColorScheme, shadow: GastroShadowScheme, tone: OnlineOrderUiTone) {
  const ink = onlineOrderInk(tone, colors);
  const light = tone === 'light';
  return StyleSheet.create({
    wrap: { gap: 10 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    hint: { flex: 1, color: ink.muted, fontSize: 12, lineHeight: 16 },
    clearBtn: { color: ink.sky, fontSize: 12, fontWeight: '800' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -GAP / 2,
    },
    cell: {
      width: `${100 / COLS}%`,
      padding: GAP / 2,
      gap: 4,
    },
    cellPressed: { opacity: 0.94 },
    tileShell: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: TILE_RADIUS,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: light ? ink.panel : colors.input,
      ...(light ? {} : shadow.card),
    },
    tileShellOn: {
      borderColor: ink.accent,
      borderWidth: 2,
      backgroundColor: light ? ink.accentSoft : undefined,
      ...(light ? {} : shadow.featured),
    },
    tileInner: {
      flex: 1,
      borderRadius: TILE_RADIUS - 1,
      overflow: 'hidden',
      backgroundColor: light ? ink.input : colors.input,
    },
    tileInnerOn: {
      borderRadius: TILE_RADIUS - 2,
    },
    labelBelow: {
      color: ink.muted,
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 12,
      paddingHorizontal: 2,
    },
    labelBelowOn: {
      color: ink.accent,
      fontWeight: '800',
    },
    check: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: ink.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 28 },
    selectionLine: { color: ink.accent, fontSize: 12, fontWeight: '700' },
  });
}

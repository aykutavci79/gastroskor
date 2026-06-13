import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  KITCHEN_TILE_GRADIENT,
  kitchenCategoryImage,
} from '@/constants/kitchen-category-images';
import { GastroColors, GastroShadow } from '@/constants/theme';
import { kitchenEmoji, type KitchenPickerItem } from '@/lib/kitchen-category-visual';

type Props = {
  categories: KitchenPickerItem[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
};

/** 11 mutfak → 4 sütun × 3 satır (- son satırda 3 kutu) */
const COLS = 4;
const GAP = 6;
const TILE_RADIUS = 14;

export function KitchenCategoryGrid({ categories, selectedSlugs, onToggle, onClear }: Props) {
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
              <KitchenTile category={cat} selected={selected} />
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
}: {
  category: KitchenPickerItem;
  selected: boolean;
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
          <Ionicons name="checkmark" size={13} color="#141414" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hint: { flex: 1, color: GastroColors.muted, fontSize: 12, lineHeight: 16 },
  clearBtn: { color: GastroColors.accent, fontSize: 12, fontWeight: '800' },
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
    borderColor: '#3A3A3A',
    backgroundColor: '#252525',
    ...GastroShadow.card,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tileShellOn: {
    borderColor: GastroColors.accent,
    borderWidth: 2,
    ...GastroShadow.featured,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  tileInner: {
    flex: 1,
    borderRadius: TILE_RADIUS - 1,
    overflow: 'hidden',
    backgroundColor: '#252525',
  },
  tileInnerOn: {
    borderRadius: TILE_RADIUS - 2,
  },
  labelBelow: {
    color: GastroColors.muted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  labelBelowOn: {
    color: GastroColors.accent,
    fontWeight: '800',
  },
  check: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GastroColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  selectionLine: { color: GastroColors.gold, fontSize: 12, fontWeight: '700' },
});

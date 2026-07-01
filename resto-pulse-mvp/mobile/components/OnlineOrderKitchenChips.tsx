import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { kitchenCategoryImage, KITCHEN_TILE_GRADIENT } from '@/constants/kitchen-category-images';
import { GastroColorsOnlineOrder } from '@/constants/online-order-theme';
import { kitchenEmoji, kitchenShortLabel, type KitchenPickerItem } from '@/lib/kitchen-category-visual';
import { useCategoryLabel } from '@/lib/use-category-label';

type Props = {
  categories: KitchenPickerItem[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
};

const TILE = 72;

export function OnlineOrderKitchenChips({
  categories,
  selectedSlugs,
  onToggle,
  onClear,
}: Props) {
  const { t } = useTranslation();
  const getCategoryLabel = useCategoryLabel();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.hint}>{t('order.kitchenHint')}</Text>
        {selectedSlugs.length ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.clearBtn}>{t('order.kitchenClear')}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled">
        {categories.map((cat) => {
          const selected = selectedSlugs.includes(cat.slug);
          const image = kitchenCategoryImage(cat.slug);
          const gradient = KITCHEN_TILE_GRADIENT[cat.slug] ?? ['#4a4a4a', '#2a2a2a'];
          return (
            <Pressable
              key={cat.slug}
              style={styles.cell}
              onPress={() => onToggle(cat.slug)}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <View style={[styles.photoShell, selected && styles.photoShellOn]}>
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
                    <Text style={styles.emoji}>{kitchenEmoji(cat.slug)}</Text>
                  </View>
                )}
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={2}>
                {kitchenShortLabel(getCategoryLabel(cat.slug), 12)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selectedSlugs.length ? (
        <Text style={styles.selectionLine}>{t('order.kitchenSelectedCount', { count: selectedSlugs.length })}</Text>
      ) : null}
    </View>
  );
}

function createStyles() {
  const ink = GastroColorsOnlineOrder;
  return StyleSheet.create({
    wrap: { gap: 8 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    hint: { flex: 1, color: ink.muted, fontSize: 12 },
    clearBtn: { color: ink.accent, fontSize: 12, fontWeight: '700' },
    row: { gap: 10, paddingVertical: 2, paddingRight: 4 },
    cell: { width: TILE + 8, alignItems: 'center', gap: 6 },
    photoShell: {
      width: TILE,
      height: TILE,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.input,
    },
    photoShellOn: {
      borderColor: ink.accent,
      borderWidth: 2,
    },
    emoji: {
      flex: 1,
      textAlign: 'center',
      textAlignVertical: 'center',
      fontSize: 28,
      lineHeight: TILE,
    },
    check: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: ink.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: ink.muted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
      width: '100%',
    },
    labelOn: {
      color: ink.accent,
      fontWeight: '800',
    },
    selectionLine: { color: ink.muted, fontSize: 11, fontWeight: '600' },
  });
}

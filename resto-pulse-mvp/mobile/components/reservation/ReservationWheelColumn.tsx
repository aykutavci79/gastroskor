import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReservationTheme } from '@/constants/reservation-theme';

const ITEM_HEIGHT = 40;
const VISIBLE = 3;
const PAD = Math.floor(VISIBLE / 2);

type Props = {
  label: string;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
};

export function ReservationWheelColumn({ label, items, selectedIndex, onSelect, width = 56 }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const height = ITEM_HEIGHT * VISIBLE;

  useEffect(() => {
    if (items.length === 0) return;
    const idx = Math.max(0, Math.min(selectedIndex, items.length - 1));
    scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
  }, [items.length, selectedIndex]);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (clamped !== selectedIndex) onSelect(clamped);
  }

  return (
    <View style={[styles.col, { width }]}>
      <Text style={styles.colLabel}>{label}</Text>
      <View style={[styles.wheel, { height }]}>
        <View pointerEvents="none" style={styles.highlight} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD }}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}>
          {items.map((item, index) => {
            const active = index === selectedIndex;
            return (
              <View key={`${label}-${item}-${index}`} style={styles.item}>
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{item}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center' },
  colLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ReservationTheme.textSoft,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  wheel: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: ReservationTheme.bg,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
  },
  highlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: ITEM_HEIGHT * PAD,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: ReservationTheme.accentGlow,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: ReservationTheme.textSoft,
    fontSize: 15,
    fontWeight: '600',
  },
  itemTextActive: {
    color: ReservationTheme.accent,
    fontSize: 16,
    fontWeight: '800',
  },
});

import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  wheel: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  highlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: ITEM_HEIGHT * PAD,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    fontWeight: '600',
  },
  itemTextActive: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '800',
  },
});

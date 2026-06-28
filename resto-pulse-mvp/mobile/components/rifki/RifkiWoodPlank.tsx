import { StyleSheet, View } from 'react-native';

import { RIFKI_STONE, RIFKI_WOOD } from '@/constants/rifki';

type RifkiWoodPlankProps = {
  width: number;
  height: number;
  selected?: boolean;
  accentSoft?: string;
  isPower?: boolean;
  isStone?: boolean;
};

/** Ahşap karo arka planı — gradient yerine katmanlı View */
export function RifkiWoodPlank({
  width,
  height,
  selected = false,
  accentSoft,
  isPower = false,
  isStone = false,
}: RifkiWoodPlankProps) {
  return (
    <View
      style={[
        styles.plank,
        {
          width,
          height,
          backgroundColor: isStone
            ? RIFKI_STONE.dark
            : selected && accentSoft
              ? accentSoft
              : RIFKI_WOOD.plank,
          borderColor: isPower ? '#FFB347' : isStone ? RIFKI_STONE.mid : RIFKI_WOOD.plankDark,
        },
      ]}>
      <View style={styles.grainTop} />
      <View style={styles.grainMid} />
      <View style={styles.grainBottom} />
      {selected ? <View style={styles.selectedGlow} /> : null}
    </View>
  );
}

type RifkiStonePebbleProps = {
  size: number;
  variant?: number;
};

export function RifkiStonePebble({ size, variant = 0 }: RifkiStonePebbleProps) {
  const colors = [RIFKI_STONE.mid, RIFKI_STONE.light, RIFKI_STONE.dark];
  const bg = colors[variant % colors.length] ?? RIFKI_STONE.mid;
  const pebbleSize = Math.max(4, size * 0.35);

  return (
    <View
      style={[
        styles.pebble,
        {
          width: pebbleSize,
          height: pebbleSize,
          borderRadius: pebbleSize / 2,
          backgroundColor: bg,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  plank: {
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grainTop: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: RIFKI_WOOD.grain,
  },
  grainMid: {
    position: 'absolute',
    top: '42%',
    left: 6,
    right: 12,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: RIFKI_WOOD.grain,
    opacity: 0.7,
  },
  grainBottom: {
    position: 'absolute',
    bottom: 3,
    left: 5,
    right: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: RIFKI_WOOD.plankDark,
    opacity: 0.35,
  },
  selectedGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255, 179, 71, 0.75)',
    borderRadius: 6,
  },
  pebble: {
    opacity: 0.85,
  },
});

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SOFRA_GLASS_BG, SOFRA_GLASS_BORDER, SOFRA_LETTER_COLOR } from '@/constants/kelime-sofrasi';
import { bonusIpucuIlerleme } from '@/lib/kelime-sofrasi/engine';

type Props = {
  bonusFoundCount: number;
};

const SIZE = 58;
const RING = 5;

export function SofraBonusBadge({ bonusFoundCount }: Props) {
  const { cycle, hedef } = bonusIpucuIlerleme(bonusFoundCount);
  const ratio = hedef > 0 ? cycle / hedef : 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'center',
          backgroundColor: SOFRA_GLASS_BG,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: SOFRA_GLASS_BORDER,
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 3,
        },
        ring: {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: RING,
          borderColor: 'rgba(255, 140, 40, 0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
        },
        ringFill: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: SIZE / 2,
          borderWidth: RING,
          borderColor: 'transparent',
          borderTopColor: '#FF8C28',
          borderRightColor: ratio >= 0.5 ? '#FF8C28' : 'transparent',
          borderBottomColor: ratio >= 0.75 ? '#FF8C28' : 'transparent',
          borderLeftColor: ratio >= 0.25 ? '#FF8C28' : 'transparent',
        },
        letter: {
          fontSize: 28,
          fontWeight: '900',
          color: SOFRA_LETTER_COLOR,
          textAlign: 'center',
          includeFontPadding: false,
          lineHeight: 30,
        },
        count: {
          marginTop: 4,
          fontSize: 11,
          fontWeight: '800',
          color: SOFRA_LETTER_COLOR,
        },
        hint: {
          fontSize: 9,
          fontWeight: '700',
          color: '#C45A00',
          marginTop: 1,
        },
      }),
    [ratio],
  );

  return (
    <View style={styles.root} accessibilityLabel="Bonus kelime ilerlemesi">
      <View style={styles.ring}>
        <View style={styles.ringFill} pointerEvents="none" />
        <Text style={styles.letter}>B</Text>
      </View>
      <Text style={styles.count}>
        {cycle}/{hedef}
      </Text>
      <Text style={styles.hint}>3 bonus → +1 ipucu</Text>
    </View>
  );
}

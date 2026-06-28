import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  SOFRA_BONUS_HINT_THRESHOLD,
  SOFRA_GLASS_BG,
  SOFRA_GLASS_BORDER,
  SOFRA_LETTER_COLOR,
} from '@/constants/kelime-sofrasi';
import { bonusIpucuIlerleme } from '@/lib/kelime-sofrasi/engine';

type Props = {
  bonusFoundCount: number;
  pendingClaims: number;
  onClaimReward?: () => void;
};

const SIZE = 58;
const RING = 5;

export function SofraBonusBadge({ bonusFoundCount, pendingClaims, onClaimReward }: Props) {
  const { cycle, hedef } = bonusIpucuIlerleme(bonusFoundCount, pendingClaims);
  const ratio = hedef > 0 ? cycle / hedef : 0;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pendingClaims <= 0) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pendingClaims, pulse]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
        },
        rewardAnchor: {
          position: 'absolute',
          top: -10,
          zIndex: 2,
          alignItems: 'center',
        },
        rewardChip: {
          minWidth: 30,
          height: 30,
          borderRadius: 15,
          paddingHorizontal: 8,
          backgroundColor: '#FF8C28',
          borderWidth: 2,
          borderColor: '#FFF4E8',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FF6B00',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.45,
          shadowRadius: 4,
          elevation: 6,
        },
        rewardText: {
          fontSize: 16,
          fontWeight: '900',
          color: '#fff',
          includeFontPadding: false,
          lineHeight: 18,
        },
        root: {
          alignItems: 'center',
          backgroundColor: SOFRA_GLASS_BG,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: pendingClaims > 0 ? '#FF8C28' : SOFRA_GLASS_BORDER,
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
          borderColor: pendingClaims > 0 ? '#FF8C28' : 'rgba(255, 140, 40, 0.35)',
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
          textAlign: 'center',
        },
      }),
    [pendingClaims, ratio],
  );

  const handleClaim = () => {
    if (pendingClaims <= 0 || !onClaimReward) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClaimReward();
  };

  return (
    <View style={styles.wrap}>
      {pendingClaims > 0 ? (
        <View style={styles.rewardAnchor}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              style={styles.rewardChip}
              onPress={handleClaim}
              accessibilityRole="button"
              accessibilityLabel={`${pendingClaims} ipucu odulu, almak icin dokun`}>
              <Text style={styles.rewardText}>{pendingClaims}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
      <View
        style={styles.root}
        accessibilityLabel={
          pendingClaims > 0
            ? `Bonus ${cycle} bölü ${hedef}, ${pendingClaims} ipucu ödülü hazır`
            : 'Bonus kelime ilerlemesi'
        }>
        <View style={styles.ring}>
          <View style={styles.ringFill} pointerEvents="none" />
          <Text style={styles.letter}>B</Text>
        </View>
        <Text style={styles.count}>
          {cycle}/{hedef}
        </Text>
        <Text style={styles.hint}>
          {pendingClaims > 0
            ? 'Ödüle dokun → +1 ipucu'
            : `${SOFRA_BONUS_HINT_THRESHOLD} bonus → +1 ipucu`}
        </Text>
      </View>
    </View>
  );
}

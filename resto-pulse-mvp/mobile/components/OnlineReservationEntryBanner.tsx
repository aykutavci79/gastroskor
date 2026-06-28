import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { ONLINE_RESERVATION_BANNER_SLIDES } from '@/constants/online-reservation-banner-images';
import { KESFET_VITRIN_BANNER, KESFET_VITRIN_TEXT_SHADOW } from '@/constants/kesfet-vitrin-banner';
import { ONLINE_ORDER_MIN_RATING } from '@/constants/online-orders';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';
import { listOnlineOrderRestaurants } from '@/lib/api';

const MIN_HEIGHT = KESFET_VITRIN_BANNER.minHeight;

type Props = {
  style?: ViewStyle;
};

export function OnlineReservationEntryBanner({ style }: Props) {
  const { city } = useCity();
  const router = useRouter();
  const [openCount, setOpenCount] = useState<number | null>(null);

  const slides = useMemo(() => ONLINE_RESERVATION_BANNER_SLIDES, []);
  const { opacityA, opacityB, indexA, indexB } = useBannerCrossfade(slides.length);

  const refresh = useCallback(() => {
    void listOnlineOrderRestaurants({ city, limit: 80, min_rating: ONLINE_ORDER_MIN_RATING })
      .then((res) => {
        const count = res.items.filter((row) => row.online_reservations_available).length;
        setOpenCount(count);
      })
      .catch(() => setOpenCount(null));
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const countLine =
    openCount == null
      ? 'Masa seç · anında talep'
      : openCount === 0
        ? 'Yakında pilot restoranlar'
        : `${openCount} restoran rezervasyon alıyor`;

  const slideA = slides[indexA];
  const slideB = slides[indexB];

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, style, pressed && styles.pressed]}
      onPress={() => {
        Keyboard.dismiss();
        router.push('/rezervasyon-acik' as never);
      }}
      accessibilityRole="button"
      accessibilityLabel="Online rezervasyon acik restoranlar">
      <View style={styles.mediaClip} pointerEvents="none">
        {slideA ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
            <Image
              source={slideA.source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        ) : null}
        {slideB ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
            <Image
              source={slideB.source}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        ) : null}
        {slideA ? (
          <Animated.View style={[styles.sceneTag, { opacity: opacityA }]} pointerEvents="none">
            <Text style={styles.sceneTagText} numberOfLines={1}>
              {slideA.label}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.content} pointerEvents="none">
        <View style={styles.textBlock}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Online Rezervasyon</Text>
          </View>
          <Text style={styles.title}>
            Tek Tıkla <Text style={styles.accent}>Masa</Text>
          </Text>
          <Text style={styles.hint}>{countLine}</Text>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={KESFET_VITRIN_BANNER.iconSize} color={GastroColors.gold} />
        </View>
      </View>

      <View style={styles.borderGlow} pointerEvents="none" />
    </Pressable>
  );
}

const textShadow = KESFET_VITRIN_TEXT_SHADOW;

const styles = StyleSheet.create({
  banner: {
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#141414',
    minHeight: MIN_HEIGHT,
    flex: 1,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  mediaClip: { ...StyleSheet.absoluteFillObject },
  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 8,
  },
  textBlock: { flex: 1, gap: 3 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    backgroundColor: 'rgba(88,28,135,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.pillFontSize,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  title: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.titleFontSize,
    fontWeight: '800',
    ...textShadow,
  },
  accent: {
    color: GastroColors.gold,
    fontWeight: '900',
    ...textShadow,
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: KESFET_VITRIN_BANNER.hintFontSize,
    fontWeight: '700',
    ...textShadow,
  },
  iconCircle: {
    width: KESFET_VITRIN_BANNER.iconCircle,
    height: KESFET_VITRIN_BANNER.iconCircle,
    borderRadius: KESFET_VITRIN_BANNER.iconCircle / 2,
    backgroundColor: 'rgba(14,14,14,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneTag: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    maxWidth: '52%',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sceneTagText: {
    color: '#fff',
    fontSize: KESFET_VITRIN_BANNER.slideTagFontSize,
    fontWeight: '800',
    ...textShadow,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
});

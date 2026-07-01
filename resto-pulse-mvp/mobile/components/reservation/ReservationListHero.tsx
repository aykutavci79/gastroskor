import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ONLINE_RESERVATION_BANNER_SLIDES } from '@/constants/online-reservation-banner-images';
import { ReservationTheme } from '@/constants/reservation-theme';
import { useBannerCrossfade } from '@/hooks/use-banner-crossfade';

type Props = {
  cityLabel: string;
  openCount: number | null;
};

export function ReservationListHero({ cityLabel, openCount }: Props) {
  const slides = useMemo(() => ONLINE_RESERVATION_BANNER_SLIDES, []);
  const { opacityA, opacityB, indexA, indexB } = useBannerCrossfade(slides.length);
  const { t } = useTranslation();
  const slideA = slides[indexA];
  const slideB = slides[indexB];

  const countLine =
    openCount == null
      ? t('rezervasyon.heroTagline')
      : openCount === 0
        ? t('rezervasyon.heroPilot')
        : t('rezervasyon.heroCount', { count: openCount });

  return (
    <View style={styles.wrap}>
      <View style={styles.media}>
        {slideA ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
            <Image source={slideA.source} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : null}
        {slideB && slides.length > 1 ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
            <Image source={slideB.source} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : null}
        <View style={styles.shadeTop} />
        <View style={styles.shadeBottom} />
      </View>

      <View style={styles.content}>
        <Text style={styles.tagline}>{t('rezervasyon.heroSubtitle')}</Text>
        <Text style={styles.title}>{t('rezervasyon.heroTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('rezervasyon.heroCity', { city: cityLabel })}
        </Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{countLine}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    backgroundColor: ReservationTheme.panel,
    minHeight: 176,
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  shadeTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.25)',
  },
  shadeBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,8,15,0.72)',
  },
  content: {
    position: 'relative',
    zIndex: 2,
    padding: 16,
    gap: 6,
    justifyContent: 'flex-end',
    minHeight: 176,
  },
  tagline: {
    color: ReservationTheme.accent,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  title: {
    color: ReservationTheme.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  subtitle: {
    color: ReservationTheme.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    backgroundColor: ReservationTheme.accentGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: ReservationTheme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { eglenceBannerTheme } from '@/components/eglence/EglenceGameCardPattern';
import { eglenceCardArtTheme } from '@/constants/eglence-card-art-theme';
import { EGLENCE_GAME_CARD_ART } from '@/constants/eglence-game-art';
import { EGLENCE_GAMES, type EglenceGameId, type EglenceGameStatus } from '@/constants/eglence-games';
import { HUB_GAME_JETON_LABEL } from '@/constants/eglence-hub';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  gameStatus: Record<EglenceGameId, EglenceGameStatus>;
  onPlay: (id: EglenceGameId) => void;
};

function statusLabel(status: EglenceGameStatus): string {
  switch (status) {
    case 'tamamlandi':
      return 'Tamamlandı';
    case 'devam':
      return 'Devam et';
    case 'yakinda':
      return 'Yakında';
    default:
      return 'Oyna';
  }
}

function GameHubCard({
  gameId,
  title,
  subtitle,
  icon,
  status,
  disabled,
  onPress,
}: {
  gameId: EglenceGameId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: EglenceGameStatus;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useGastroTheme();
  const banner = eglenceBannerTheme(gameId);
  const jetonLabel = HUB_GAME_JETON_LABEL[gameId];
  const isFree = jetonLabel.toLowerCase().includes('ücretsiz');
  const cardArt = EGLENCE_GAME_CARD_ART[gameId];
  const fullBleedArt = cardArt != null;
  const artTheme = eglenceCardArtTheme(gameId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: 158,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: fullBleedArt ? artTheme.borderColor : banner.borderColor,
          backgroundColor: fullBleedArt ? artTheme.bg : '#FFFFFF',
          overflow: 'hidden',
          minHeight: fullBleedArt ? 228 : undefined,
        },
        fullBleedImage: {
          ...StyleSheet.absoluteFillObject,
        },
        fullBleedOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: artTheme.overlay,
        },
        fullBleedScrim: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '72%',
          backgroundColor: artTheme.scrim,
        },
        fullBleedBody: {
          flex: 1,
          justifyContent: 'flex-end',
          padding: 12,
          gap: 8,
          minHeight: 228,
        },
        art: {
          height: 96,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: banner.iconBg,
          borderBottomWidth: 1,
          borderBottomColor: banner.borderColor,
        },
        artImage: {
          width: '100%',
          height: '100%',
        },
        iconPlate: {
          width: 56,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: banner.iconBorder,
          borderWidth: 2,
          borderColor: banner.iconColor,
        },
        body: { padding: 12, gap: 8 },
        title: {
          color: fullBleedArt ? '#FFFFFF' : banner.titleColor,
          fontSize: 15,
          fontWeight: '800',
        },
        subtitle: {
          color: fullBleedArt ? 'rgba(255,255,255,0.72)' : banner.subtitleColor,
          fontSize: 11,
          lineHeight: 15,
          minHeight: 30,
        },
        jetonPill: {
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: isFree
            ? fullBleedArt
              ? 'rgba(76, 175, 121, 0.28)'
              : 'rgba(76, 175, 121, 0.16)'
            : 'rgba(255, 183, 3, 0.2)',
        },
        jetonText: {
          fontSize: 10,
          fontWeight: '800',
          color: isFree ? (fullBleedArt ? '#7DDFA8' : colors.success) : '#B45309',
        },
        btn: {
          borderRadius: 999,
          paddingVertical: 10,
          alignItems: 'center',
          backgroundColor: status === 'yakinda' ? colors.input : colors.accent,
        },
        btnText: {
          color: status === 'yakinda' ? colors.muted : '#FFFFFF',
          fontSize: 13,
          fontWeight: '800',
        },
        disabled: { opacity: 0.55 },
      }),
    [artTheme, banner, colors, fullBleedArt, isFree, status],
  );

  const bodyContent = (
    <>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      <View style={styles.jetonPill}>
        <Text style={styles.jetonText}>{jetonLabel}</Text>
      </View>
      <View style={styles.btn}>
        <Text style={styles.btnText}>{statusLabel(status)}</Text>
      </View>
    </>
  );

  return (
    <Pressable
      disabled={disabled || status === 'yakinda'}
      onPress={onPress}
      style={({ pressed }) => [styles.card, (disabled || pressed) && styles.disabled]}>
      {fullBleedArt ? (
        <>
          <Image
            source={cardArt}
            style={styles.fullBleedImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={styles.fullBleedOverlay} pointerEvents="none" />
          <View style={styles.fullBleedScrim} pointerEvents="none" />
          <View style={styles.fullBleedBody}>{bodyContent}</View>
        </>
      ) : (
        <>
          <View style={styles.art}>
            {cardArt ? (
              <Image source={cardArt} style={styles.artImage} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={styles.iconPlate}>
                <Ionicons name={icon} size={28} color={banner.iconColor} />
              </View>
            )}
          </View>
          <View style={styles.body}>{bodyContent}</View>
        </>
      )}
    </Pressable>
  );
}

export function EglenceGameCarousel({ gameStatus, onPlay }: Props) {
  const { colors } = useGastroTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Çıtır Oyunlar</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>kaydır →</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast">
        {EGLENCE_GAMES.map((game) => (
          <GameHubCard
            key={game.id}
            gameId={game.id}
            title={game.title}
            subtitle={game.subtitle}
            icon={game.icon}
            status={gameStatus[game.id]}
            disabled={!game.available}
            onPress={() => onPlay(game.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 12, fontWeight: '600' },
  scrollContent: { gap: 12, paddingRight: 4, paddingBottom: 4 },
});

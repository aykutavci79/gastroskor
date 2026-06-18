import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EglenceGameCardPattern,
  eglenceBannerTheme,
} from '@/components/eglence/EglenceGameCardPattern';
import type { EglenceGameId, EglenceGameStatus } from '@/constants/eglence-games';

type Props = {
  gameId: EglenceGameId;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: EglenceGameStatus;
  disabled?: boolean;
  onPress: () => void;
};

function statusLabel(status: EglenceGameStatus): string {
  switch (status) {
    case 'tamamlandi':
      return 'Tamamlandı';
    case 'devam':
      return 'Devam';
    case 'yakinda':
      return 'Yakında';
    default:
      return 'Oyna';
  }
}

export function EglenceGameCard({ gameId, title, subtitle, icon, status, disabled, onPress }: Props) {
  const banner = eglenceBannerTheme(gameId);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: banner.borderColor,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          minHeight: 88,
        },
        cardPressed: { opacity: 0.94 },
        cardDisabled: { opacity: 0.6 },
        content: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          zIndex: 1,
        },
        iconWrap: {
          width: 48,
          height: 48,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: banner.iconBg,
          borderWidth: 1.5,
          borderColor: banner.iconBorder,
        },
        meta: { flex: 1, gap: 4, paddingRight: 4 },
        title: { color: banner.titleColor, fontSize: 16, fontWeight: '800' },
        subtitle: { color: banner.subtitleColor, fontSize: 12, lineHeight: 17 },
        status: {
          color: status === 'yakinda' ? banner.statusMutedColor : banner.statusColor,
          fontSize: 12,
          fontWeight: '800',
        },
      }),
    [banner, status],
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        disabled ? styles.cardDisabled : null,
        pressed && !disabled ? styles.cardPressed : null,
      ]}>
      <EglenceGameCardPattern gameId={gameId} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={24} color={banner.iconColor} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.status}>{statusLabel(status)}</Text>
      </View>
    </Pressable>
  );
}

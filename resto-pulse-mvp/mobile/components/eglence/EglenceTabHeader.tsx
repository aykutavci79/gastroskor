import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { DmAvatarButton } from '@/components/DmAvatarButton';
import { GastroColors } from '@/constants/theme';

type Props = {
  cityLabel: string;
};

export function EglenceTabHeader({ cityLabel }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.kickerPill}>
          <Ionicons name="people" size={13} color={GastroColors.accent} />
          <Text style={styles.kickerText}>Topluluk · {cityLabel}</Text>
        </View>
        <DmAvatarButton />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.title}>Eğlence</Text>
        <View style={styles.tagRow}>
          <View style={styles.tagGames}>
            <Ionicons name="game-controller" size={12} color={GastroColors.accent} />
            <Text style={styles.tagGamesText}>Günlük oyunlar</Text>
          </View>
          <Text style={styles.tagDot}>·</Text>
          <View style={styles.tagChat}>
            <Ionicons name="chatbubbles" size={12} color={GastroColors.sky} />
            <Text style={styles.tagChatText}>Gurme sohbetler</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 107, 53, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.35)',
  },
  kickerText: {
    color: GastroColors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroCard: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.22)',
  },
  title: {
    color: GastroColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tagGames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  tagGamesText: {
    color: '#FFB88A',
    fontSize: 12,
    fontWeight: '700',
  },
  tagDot: { color: GastroColors.muted, fontSize: 12, fontWeight: '700' },
  tagChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(66, 133, 244, 0.14)',
  },
  tagChatText: {
    color: '#9EC5FF',
    fontSize: 12,
    fontWeight: '700',
  },
});

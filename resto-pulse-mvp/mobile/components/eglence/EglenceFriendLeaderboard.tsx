import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { useGastroTheme } from '@/context/theme-context';
import { useSession } from '@/context/session-context';
import {
  buildEglenceChallengeShareText,
  formatChallengeElapsed,
  type EglenceChallengeGame,
} from '@/lib/eglence-challenge-share';
import { getEglenceLeaderboard } from '@/lib/api';
import type { EglenceLeaderboardEntry } from '@/lib/types';

type Props = {
  game: EglenceChallengeGame;
  periodKey: string;
  title?: string;
};

function formatScoreLine(game: EglenceChallengeGame, entry: EglenceLeaderboardEntry): string {
  if ((game === 'mini_sudoku' || game === 'kelime_sofrasi') && entry.elapsed_ms != null) {
    return formatChallengeElapsed(entry.elapsed_ms);
  }
  if (entry.score != null) {
    return `${entry.score} puan`;
  }
  return '—';
}

export function EglenceFriendLeaderboard({ game, periodKey, title }: Props) {
  const { colors } = useGastroTheme();
  const { user } = useSession();
  const [items, setItems] = useState<EglenceLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user?.email) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getEglenceLeaderboard(user.email, game, periodKey, 'friends')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [game, periodKey, user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        },
        title: { color: colors.text, fontWeight: '800', fontSize: 16 },
        sub: { color: colors.muted, fontSize: 12, lineHeight: 18 },
        row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        rank: { width: 22, color: colors.muted, fontWeight: '800', fontSize: 13, textAlign: 'center' },
        meta: { flex: 1, gap: 2 },
        name: { color: colors.text, fontWeight: '700', fontSize: 14 },
        me: { color: colors.accent },
        value: { color: colors.gold, fontWeight: '800', fontSize: 14 },
        empty: { color: colors.muted, fontSize: 13, lineHeight: 20 },
      }),
    [colors],
  );

  const heading =
    title ??
    (game === 'mini_sudoku' ? 'Arkadaş sıralaması' : 'Arkadaş puan tablosu');

  if (!user?.email) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.sub}>
        {game === 'mini_sudoku'
          ? 'En kısa süre üstte. Arkadaşların çözünce burada görünür.'
          : 'En yüksek puan üstte. Eşit puanda kısa süre önde.'}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          Henüz arkadaş skoru yok. Paylaş butonuyla challenge gönder — ilk skor senin olsun.
        </Text>
      ) : (
        items.map((entry) => (
          <View key={entry.user.id} style={styles.row}>
            <Text style={styles.rank}>{entry.rank}</Text>
            <UserAvatar
              avatarUrl={entry.user.avatar_url}
              avatarPreset={entry.user.avatar_preset}
              size={36}
              fallbackLabel={entry.user.nickname}
            />
            <View style={styles.meta}>
              <Text style={[styles.name, entry.is_me && styles.me]}>
                @{entry.user.nickname}
                {entry.is_me ? ' (sen)' : ''}
              </Text>
            </View>
            <Text style={styles.value}>{formatScoreLine(game, entry)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

type ShareProps = {
  game: EglenceChallengeGame;
  elapsedMs?: number;
  score?: number;
};

export function EglenceChallengeShareButton({ game, elapsedMs, score }: ShareProps) {
  const { colors } = useGastroTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          marginTop: 12,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        text: { color: colors.accent, fontWeight: '800', fontSize: 15 },
      }),
    [colors],
  );

  const share = useCallback(async () => {
    const message = buildEglenceChallengeShareText(game, { elapsedMs, score });
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const canWa = await Linking.canOpenURL(waUrl);
      if (canWa) {
        await Linking.openURL(waUrl);
        return;
      }
    } catch {
      /* fallback */
    }
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message, url: 'https://www.gastroskor.com.tr' } : { message },
      );
    } catch {
      /* iptal */
    }
  }, [elapsedMs, game, score]);

  return (
    <Pressable style={styles.btn} onPress={() => void share()} accessibilityRole="button">
      <Text style={styles.text}>Paylaş · Challenge gönder</Text>
    </Pressable>
  );
}

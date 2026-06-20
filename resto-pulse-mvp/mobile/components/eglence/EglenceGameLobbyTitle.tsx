import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import type { EglenceGameId } from '@/constants/eglence-games';

type Props = {
  gameId: EglenceGameId;
  title: string;
};

/** Lobi başlığı — ikon arka planda kalsın, metin net okunaklı. */
export function EglenceGameLobbyTitle({ gameId, title }: Props) {
  const t = eglenceLobbyTheme(gameId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignSelf: 'center',
          paddingHorizontal: 4,
        },
        title: {
          fontSize: 26,
          fontWeight: '900',
          color: t.text,
          textAlign: 'center',
          letterSpacing: 0.2,
          textShadowColor: 'rgba(0, 0, 0, 0.75)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        },
      }),
    [t.text],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

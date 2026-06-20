import { ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { type Edge } from 'react-native-safe-area-context';

import { EglenceGameSceneBackground } from '@/components/eglence/EglenceGameSceneBackground';
import { Screen } from '@/components/ui/Screen';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import type { EglenceGameId } from '@/constants/eglence-games';

type Props = {
  gameId: EglenceGameId;
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
  scrollRef?: RefObject<ScrollView | null>;
};

export function EglenceGameLobbyScreen({
  gameId,
  children,
  scroll = false,
  style,
  edges,
  scrollRef,
}: Props) {
  const theme = eglenceLobbyTheme(gameId);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <EglenceGameSceneBackground gameId={gameId} variant="lobby" />
      <Screen scroll={scroll} style={style} edges={edges} scrollRef={scrollRef} backgroundColor="transparent">
        {children}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export { eglenceLobbyTheme };

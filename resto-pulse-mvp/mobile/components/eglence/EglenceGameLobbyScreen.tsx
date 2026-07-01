import { ReactNode, RefObject, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { EglenceGameSceneBackground } from '@/components/eglence/EglenceGameSceneBackground';
import { EglenceHubSfxToggle } from '@/components/eglence/EglenceHubSfxToggle';
import { Screen } from '@/components/ui/Screen';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import type { EglenceGameId } from '@/constants/eglence-games';
import { warmHubSfxPreference } from '@/lib/hub-sfx-preference';

type Props = {
  gameId: EglenceGameId;
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
  scrollRef?: RefObject<ScrollView | null>;
  /** Lobi ekraninda ses efekti switch — oyun icinde false. */
  showSfxToggle?: boolean;
};

export function EglenceGameLobbyScreen({
  gameId,
  children,
  scroll = false,
  style,
  edges,
  scrollRef,
  showSfxToggle = true,
}: Props) {
  const theme = eglenceLobbyTheme(gameId);
  const defaultEdges: Edge[] = showSfxToggle ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'];
  const screenEdges = (edges ?? defaultEdges).filter((edge) => (showSfxToggle ? edge !== 'bottom' : true));

  useEffect(() => {
    void warmHubSfxPreference();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <EglenceGameSceneBackground gameId={gameId} variant="lobby" />
      <View style={styles.frame}>
        <Screen
          scroll={scroll}
          style={[styles.screen, style]}
          edges={screenEdges}
          scrollRef={scrollRef}
          backgroundColor="transparent">
          {children}
        </Screen>
        {showSfxToggle ? (
          <SafeAreaView edges={['bottom']} style={styles.sfxWrap}>
            <EglenceHubSfxToggle gameId={gameId} />
          </SafeAreaView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1 },
  screen: { flex: 1 },
  sfxWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
});

export { eglenceLobbyTheme };

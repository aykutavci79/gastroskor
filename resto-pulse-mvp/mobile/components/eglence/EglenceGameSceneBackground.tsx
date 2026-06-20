import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import {
  eglenceSceneLayers,
  type EglenceSceneVariant,
} from '@/constants/eglence-card-art-theme';
import { EGLENCE_GAME_CARD_ART } from '@/constants/eglence-game-art';
import type { EglenceGameId } from '@/constants/eglence-games';

type Props = {
  gameId: EglenceGameId;
  variant?: EglenceSceneVariant;
};

export function EglenceGameSceneBackground({ gameId, variant = 'lobby' }: Props) {
  const source = EGLENCE_GAME_CARD_ART[gameId];
  const layers = eglenceSceneLayers(gameId, variant);

  if (!source) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: layers.bg }]} />;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={source}
        style={[
          styles.art,
          {
            opacity: layers.artOpacity,
            transform: [{ scale: layers.artScale }],
          },
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={[styles.overlay, { backgroundColor: layers.overlay }]} />
      <View
        style={[
          styles.bottomScrim,
          {
            height: layers.bottomScrimHeight,
            backgroundColor: layers.bottomScrim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

import type { EglenceGameId } from '@/constants/eglence-games';

export type EglenceSceneVariant = 'carousel' | 'lobby';

/** Full-bleed carousel kartı — kenarlık + scrim katmanları. */
export type EglenceCardArtTheme = {
  borderColor: string;
  overlay: string;
  scrim: string;
  bg: string;
};

/** Lobi metin / panel renkleri + sahne katmanları. */
export type EglenceLobbyTheme = {
  bg: string;
  headerBg: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  panel: string;
  border: string;
  borderStrong: string;
  artOpacity: number;
  artScale: number;
  sceneOverlay: string;
  sceneBottomScrim: string;
};

type GameArtConfig = {
  carousel: EglenceCardArtTheme;
  lobby: EglenceLobbyTheme;
};

const GAME_ART: Record<EglenceGameId, GameArtConfig> = {
  'mini-sudoku': {
    carousel: {
      borderColor: 'rgba(255, 107, 53, 0.45)',
      overlay: 'rgba(10, 10, 10, 0.16)',
      scrim: 'rgba(10, 10, 10, 0.44)',
      bg: '#0A0A0A',
    },
    lobby: {
      bg: '#0A0A0A',
      headerBg: '#0A0A0A',
      text: '#F5F5F5',
      muted: '#A3A3A3',
      accent: '#FF6B35',
      accentSoft: 'rgba(255, 107, 53, 0.18)',
      panel: 'rgba(22, 22, 22, 0.88)',
      border: 'rgba(255, 107, 53, 0.28)',
      borderStrong: 'rgba(255, 107, 53, 0.55)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(10, 10, 10, 0.42)',
      sceneBottomScrim: 'rgba(10, 10, 10, 0.55)',
    },
  },
  'soru-cevap': {
    carousel: {
      borderColor: 'rgba(168, 85, 247, 0.5)',
      overlay: 'rgba(8, 4, 18, 0.14)',
      scrim: 'rgba(12, 6, 28, 0.46)',
      bg: '#0A0614',
    },
    lobby: {
      bg: '#0A0614',
      headerBg: '#0A0614',
      text: '#F5F5F5',
      muted: '#B8A8D0',
      accent: '#C084FC',
      accentSoft: 'rgba(192, 132, 252, 0.18)',
      panel: 'rgba(18, 10, 32, 0.88)',
      border: 'rgba(168, 85, 247, 0.32)',
      borderStrong: 'rgba(168, 85, 247, 0.55)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(8, 4, 18, 0.4)',
      sceneBottomScrim: 'rgba(12, 6, 28, 0.52)',
    },
  },
  'kelime-yarismasi': {
    carousel: {
      borderColor: 'rgba(45, 212, 191, 0.45)',
      overlay: 'rgba(4, 12, 14, 0.14)',
      scrim: 'rgba(6, 14, 16, 0.44)',
      bg: '#060E10',
    },
    lobby: {
      bg: '#060E10',
      headerBg: '#060E10',
      text: '#F0FFFD',
      muted: '#94B8B3',
      accent: '#2DD4BF',
      accentSoft: 'rgba(45, 212, 191, 0.16)',
      panel: 'rgba(8, 20, 22, 0.88)',
      border: 'rgba(45, 212, 191, 0.28)',
      borderStrong: 'rgba(45, 212, 191, 0.52)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(4, 12, 14, 0.4)',
      sceneBottomScrim: 'rgba(6, 14, 16, 0.5)',
    },
  },
  'kelime-sofrasi': {
    carousel: {
      borderColor: 'rgba(255, 170, 60, 0.48)',
      overlay: 'rgba(12, 8, 4, 0.14)',
      scrim: 'rgba(14, 10, 6, 0.46)',
      bg: '#120C08',
    },
    lobby: {
      bg: '#120C08',
      headerBg: '#120C08',
      text: '#FFF8F0',
      muted: '#C4A88A',
      accent: '#FFAA3C',
      accentSoft: 'rgba(255, 170, 60, 0.18)',
      panel: 'rgba(24, 16, 10, 0.88)',
      border: 'rgba(255, 170, 60, 0.3)',
      borderStrong: 'rgba(255, 170, 60, 0.55)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(12, 8, 4, 0.38)',
      sceneBottomScrim: 'rgba(14, 10, 6, 0.48)',
    },
  },
  'gunluk-kelime': {
    carousel: {
      borderColor: 'rgba(83, 141, 78, 0.5)',
      overlay: 'rgba(6, 10, 6, 0.18)',
      scrim: 'rgba(8, 12, 8, 0.48)',
      bg: '#0C100C',
    },
    lobby: {
      bg: '#121212',
      headerBg: '#121212',
      text: '#F5F5F5',
      muted: '#9CA3AF',
      accent: '#538D4E',
      accentSoft: 'rgba(83, 141, 78, 0.2)',
      panel: 'rgba(24, 24, 24, 0.92)',
      border: 'rgba(83, 141, 78, 0.32)',
      borderStrong: 'rgba(83, 141, 78, 0.55)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(8, 10, 8, 0.45)',
      sceneBottomScrim: 'rgba(10, 12, 10, 0.55)',
    },
  },
  'kelime-bul': {
    carousel: {
      borderColor: 'rgba(56, 189, 248, 0.45)',
      overlay: 'rgba(4, 10, 18, 0.16)',
      scrim: 'rgba(6, 12, 22, 0.46)',
      bg: '#081018',
    },
    lobby: {
      bg: '#081018',
      headerBg: '#081018',
      text: '#F0F9FF',
      muted: '#94A3B8',
      accent: '#38BDF8',
      accentSoft: 'rgba(56, 189, 248, 0.18)',
      panel: 'rgba(12, 20, 32, 0.9)',
      border: 'rgba(56, 189, 248, 0.28)',
      borderStrong: 'rgba(56, 189, 248, 0.52)',
      artOpacity: 1,
      artScale: 1.08,
      sceneOverlay: 'rgba(4, 10, 18, 0.42)',
      sceneBottomScrim: 'rgba(6, 12, 22, 0.52)',
    },
  },
};

export function eglenceCardArtTheme(gameId: EglenceGameId): EglenceCardArtTheme {
  return GAME_ART[gameId].carousel;
}

export function eglenceLobbyTheme(gameId: EglenceGameId): EglenceLobbyTheme {
  return GAME_ART[gameId].lobby;
}

export function eglenceSceneLayers(gameId: EglenceGameId, variant: EglenceSceneVariant) {
  const { carousel, lobby } = GAME_ART[gameId];
  if (variant === 'carousel') {
    return {
      artOpacity: 1,
      artScale: 1.12,
      overlay: carousel.overlay,
      bottomScrim: carousel.scrim,
      bottomScrimHeight: '72%' as const,
      bg: carousel.bg,
    };
  }
  return {
    artOpacity: lobby.artOpacity,
    artScale: lobby.artScale,
    overlay: lobby.sceneOverlay,
    bottomScrim: lobby.sceneBottomScrim,
    bottomScrimHeight: '88%' as const,
    bg: lobby.bg,
  };
}

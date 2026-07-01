import type { ImageSourcePropType } from 'react-native';

import type { EglenceGameId } from '@/constants/eglence-games';

/** Çıtır Oyunlar kartı / lobi — özel görsel (yoksa Ionicons). */
export const EGLENCE_GAME_CARD_ART: Partial<Record<EglenceGameId, ImageSourcePropType>> = {
  'kelime-sofrasi': require('@/assets/gastro-hub/games/kelime-sofrasi-icon.png'),
  'gunluk-kelime': require('@/assets/gastro-hub/games/gunluk-kelime-icon.png'),
  'mini-sudoku': require('@/assets/gastro-hub/games/sudoku-icon.png'),
  'kelime-yarismasi': require('@/assets/gastro-hub/games/kelime-yarismasi-icon.png'),
  'kelime-bul': require('@/assets/gastro-hub/games/kelime-bul-icon.png'),
  'soru-cevap': require('@/assets/gastro-hub/games/soru-cevap-icon.png'),
};

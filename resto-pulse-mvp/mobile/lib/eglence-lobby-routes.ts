import type { EglenceGameId } from '@/constants/eglence-games';

export const EGLENCE_LOBBY_ROUTES: Record<EglenceGameId, string> = {
  'mini-sudoku': '/oyun/mini-sudoku',
  'gunluk-kelime': '/oyun/gunluk-kelime',
  'kelime-sofrasi': '/oyun/kelime-sofrasi',
  'kelime-yarismasi': '/oyun/kelime-yarismasi',
  'kelime-bul': '/oyun/kelime-bul',
  'soru-cevap': '/(tabs)/eglence',
};

export type EglenceOturumParam = 'yeni' | 'devam';

/** Soru-cevap (BilBakalim bot) icin varsayilan Gurme oda. */
export const SORU_CEVAP_ROOM_SLUG = 'kes-donerciler';

export const SORU_CEVAP_ROOM_META = {
  slug: SORU_CEVAP_ROOM_SLUG,
  title: 'Keş Dönerciler',
  emoji: '🥙',
} as const;

export type EglenceGameId = 'mini-sudoku' | 'soru-cevap' | 'kelime-yarismasi' | 'kelime-sofrasi';

export type EglenceGameStatus = 'oyna' | 'devam' | 'tamamlandi' | 'yakinda';

/** Prod: günde bir bulmaca. Dev build: bitince tekrar oynanabilir. */
export const EGLENCE_GUNLUK_TEK_OYUN = !__DEV__;

export type EglenceGameDef = {
  id: EglenceGameId;
  title: string;
  subtitle: string;
  icon: 'grid-outline' | 'help-circle-outline' | 'text-outline' | 'trophy-outline';
  available: boolean;
};

export const EGLENCE_GAMES: EglenceGameDef[] = [
  {
    id: 'kelime-sofrasi',
    title: 'Kelime Sofrası',
    subtitle: 'Harf çarkı · günlük ızgara · günde 5 tur',
    icon: 'text-outline',
    available: true,
  },
  {
    id: 'mini-sudoku',
    title: 'Sudoku',
    subtitle: 'Klasik 9×9 · günlük bulmaca',
    icon: 'grid-outline',
    available: true,
  },
  {
    id: 'kelime-yarismasi',
    title: 'Kelime Yarışması',
    subtitle: '6 tur · ipucu + süre · 1500 kelimelik havuz',
    icon: 'trophy-outline',
    available: true,
  },
  {
    id: 'soru-cevap',
    title: 'Soru-Cevap',
    subtitle: 'Gurme odasında günlük yemek soruları',
    icon: 'help-circle-outline',
    available: true,
  },
];

/** Soru-cevap (BilBakalim bot) icin varsayilan Gurme oda. */
export const SORU_CEVAP_ROOM_SLUG = 'kes-donerciler';

export const SORU_CEVAP_ROOM_META = {
  slug: SORU_CEVAP_ROOM_SLUG,
  title: 'Keş Dönerciler',
  emoji: '🥙',
} as const;

export type EglenceGameId = 'mini-sudoku' | 'soru-cevap' | 'kelime-yarismasi' | 'kelime-sofrasi';

export type EglenceGameStatus = 'oyna' | 'devam' | 'tamamlandi' | 'yakinda';

export type EglenceGameDef = {
  id: EglenceGameId;
  title: string;
  subtitle: string;
  icon: 'grid-outline' | 'help-circle-outline' | 'text-outline' | 'trophy-outline';
  available: boolean;
};

export const EGLENCE_GAMES: EglenceGameDef[] = [
  {
    id: 'mini-sudoku',
    title: 'Mini Sudoku 6×6',
    subtitle: 'Herkes aynı tabloyu çözer',
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
  {
    id: 'kelime-sofrasi',
    title: 'Kelime Sofrası',
    subtitle: 'Harf çarkı · günlük ızgara · WOW kuralları',
    icon: 'text-outline',
    available: true,
  },
];

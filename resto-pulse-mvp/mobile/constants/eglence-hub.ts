import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { EglenceGameId } from '@/constants/eglence-games';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type HubTaskId = 'daily-login' | 'invite' | 'follow' | 'review' | 'order';

export type HubFollowProgress = {
  current: number;
  target: number;
  granted: boolean;
};

export const HUB_FOLLOW_TARGET = 3;

export type HubTaskDef = {
  id: HubTaskId;
  title: string;
  description: string;
  reward: number;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
  cta: string;
  /** 3 adımlı ilerleme çubuğu (takip görevi) */
  progressSteps?: number;
};

/** v1 — görsel demo; backend bağlanınca tamamlanma state API'den gelir */
export type HubTaskState = 'done' | 'active' | 'idle';

export const HUB_TASKS: HubTaskDef[] = [
  {
    id: 'daily-login',
    title: 'Günlük giriş',
    description: 'Her gün uygulamaya gir · ödülünü al',
    reward: 10,
    icon: 'calendar',
    iconBg: 'rgba(255, 183, 3, 0.22)',
    iconColor: '#FFB703',
    cta: 'Ödülü al',
  },
  {
    id: 'invite',
    title: 'Arkadaşını davet et',
    description: 'Davetli ilk giriş yaptığında',
    reward: 10,
    icon: 'person-add',
    iconBg: 'rgba(255, 107, 53, 0.18)',
    iconColor: '#FF6B35',
    cta: 'Davet et',
  },
  {
    id: 'follow',
    title: '3 restoran takip et',
    description: 'Bugün 3 farklı restoranı takip et',
    reward: 10,
    icon: 'heart',
    iconBg: 'rgba(255, 107, 53, 0.14)',
    iconColor: '#FF6B35',
    cta: 'Takip et',
    progressSteps: HUB_FOLLOW_TARGET,
  },
  {
    id: 'review',
    title: 'Restorana yorum yap ve puan ver',
    description: 'GS yorumu bırak',
    reward: 5,
    icon: 'star',
    iconBg: 'rgba(255, 183, 3, 0.22)',
    iconColor: '#FFB703',
    cta: 'Yorum yaz',
  },
  {
    id: 'order',
    title: 'Online sipariş ver',
    description: 'Favori restorandan sipariş',
    reward: 15,
    icon: 'bag-handle',
    iconBg: 'rgba(76, 175, 121, 0.2)',
    iconColor: '#4CAF79',
    cta: 'Sipariş ver',
  },
];

/** Demo tamamlanma — prod görev API gelene kadar */
export const HUB_TASK_DEMO_STATE: Record<HubTaskId, HubTaskState> = {
  'daily-login': 'active',
  invite: 'done',
  follow: 'active',
  review: 'done',
  order: 'active',
};

export const HUB_GAME_JETON_LABEL: Record<EglenceGameId, string> = {
  'mini-sudoku': 'Ücretsiz',
  'kelime-sofrasi': 'Günlük ücretsiz',
  'gunluk-kelime': 'Günlük ücretsiz',
  'kelime-yarismasi': '10 jeton',
  'soru-cevap': 'Ücretsiz',
};

/**
 * Oyun hakkı market fiyatları (v1)
 *
 * Günlük kazanım ~20–40 jeton (aktif), tavan 100.
 * 10 jeton ≈ 1 sipariş veya 2 günlük görev — ücretli oyun günde 2–3 kez alınabilir.
 * Sofra 5 ücretsiz tur verdiği için ekstra tur biraz ucuz.
 * Sudoku günde 1 ücretsiz; tekrar premium.
 */
export type HubGamePlayProductId =
  | 'kelime-yarismasi-1'
  | 'kelime-sofrasi-extra-1'
  | 'mini-sudoku-extra-1'
  | 'kelime-yarismasi-3pack';

export type HubGamePlayProduct = {
  id: HubGamePlayProductId;
  gameId?: EglenceGameId;
  title: string;
  description: string;
  cost: number;
  badge?: string;
  icon: IoniconName;
  iconBg: string;
  iconColor: string;
};

export const HUB_GAME_PLAY_PRODUCTS: HubGamePlayProduct[] = [
  {
    id: 'kelime-yarismasi-1',
    gameId: 'kelime-yarismasi',
    title: 'Kelime Yarışması',
    description: '1 tam oyun hakkı · 6 tur',
    cost: 10,
    icon: 'trophy',
    iconBg: 'rgba(255, 107, 53, 0.18)',
    iconColor: '#FF6B35',
  },
  {
    id: 'kelime-sofrasi-extra-1',
    gameId: 'kelime-sofrasi',
    title: 'Kelime Sofrası +1 tur',
    description: 'Günlük 5 tur sonrası ekstra',
    cost: 8,
    icon: 'text',
    iconBg: 'rgba(76, 175, 121, 0.2)',
    iconColor: '#4CAF79',
  },
  {
    id: 'mini-sudoku-extra-1',
    gameId: 'mini-sudoku',
    title: 'Sudoku ekstra',
    description: 'Günlük bulmacayı tekrar oyna',
    cost: 12,
    icon: 'grid',
    iconBg: 'rgba(30, 107, 184, 0.16)',
    iconColor: '#1E6BB8',
  },
  {
    id: 'kelime-yarismasi-3pack',
    gameId: 'kelime-yarismasi',
    title: '3× Yarışma paketi',
    description: '3 oyun · tek seferde al',
    cost: 25,
    badge: 'Avantajlı',
    icon: 'layers',
    iconBg: 'rgba(255, 183, 3, 0.22)',
    iconColor: '#FFB703',
  },
];

export type HubMarketItem = {
  id: string;
  title: string;
  description: string;
  cost: number;
};

export const HUB_MARKET_ITEMS: HubMarketItem[] = [
  {
    id: 'restoran-20',
    title: '%20 Restoran indirimi',
    description: 'Seçili restoranlarda geçerli kupon',
    cost: 50,
  },
  {
    id: 'pizza-30',
    title: '%30 Pizza indirimi',
    description: 'Pizza siparişlerinde geçerli',
    cost: 75,
  },
  {
    id: 'tatli',
    title: 'Ücretsiz tatlı',
    description: 'Ana yemek yanında tatlı',
    cost: 40,
  },
  {
    id: 'online-15',
    title: '%15 Online sipariş',
    description: 'Online siparişlerde geçerli',
    cost: 35,
  },
];

import type { GastroColorScheme } from '@/constants/theme';



/** Online sipariş — yumuşak beyaz zemin + GastroSkor turuncu (saf #FFF göz yormasın) */

export const ONLINE_ORDER_PAGE_BG = '#F2F2F2';



export const GastroColorsOnlineOrder: GastroColorScheme = {

  bg: ONLINE_ORDER_PAGE_BG,

  panel: '#FAFAFA',

  input: '#EBEBEB',

  border: '#E0E0E0',

  text: '#141414',

  muted: '#6B7280',

  placeholder: '#9CA3AF',

  accent: '#FF6B35',

  accentHover: '#E55A25',

  gold: '#D97706',

  success: '#16A34A',

  google: '#4285F4',

  bad: '#EF4444',

  amber: '#D97706',

  rose: '#EF4444',

  sky: '#4285F4',

  accentDark: '#FFFFFF',

  overlayRipple: 'rgba(255, 107, 53, 0.08)',

  featuredGlow: 'rgba(255, 107, 53, 0.12)',

  accentSoft: 'rgba(255, 107, 53, 0.1)',

};



export type OnlineOrderUiTone = 'default' | 'light';



export function onlineOrderInk(

  tone: OnlineOrderUiTone | undefined,

  fallback: GastroColorScheme,

): GastroColorScheme {

  return tone === 'light' ? GastroColorsOnlineOrder : fallback;

}


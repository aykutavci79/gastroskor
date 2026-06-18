import type { KokenTipi } from '@/constants/kelime-yarismasi';

export function kokenEtiketi(koken: KokenTipi): string {
  return koken === 'turkce' ? 'Türkçe köken' : 'Yabancı köken';
}

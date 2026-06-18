import type { KokenTipi } from '@/constants/kelime-yarismasi';
import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';

export type Soru = {
  id: string;
  harfSayisi: number;
  cevap: string;
  koken: KokenTipi;
  kokenNot?: string;
  ipucu: string;
  gunluk?: boolean;
};

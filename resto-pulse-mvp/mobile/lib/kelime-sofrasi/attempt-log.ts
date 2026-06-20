import { getApiV1Base } from '@/lib/api-base';

import { sofraKelimeBuyuk } from './turkce-harf';

/** Gürültü filtresi — 2 harf ve altı loglanmaz; 3 harfliler havuz genişletme için kritik. */
const MIN_LOG_LENGTH = 3;

/** Anonim çark denemesi — doğru/yanlış fark etmez; UI bloklanmaz. */
export function logWheelAttempt(raw: string): void {
  const kelime = sofraKelimeBuyuk(raw);
  if (kelime.length < MIN_LOG_LENGTH) return;

  void fetch(`${getApiV1Base()}/eglence/kelime-sofrasi/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kelime }),
  }).catch(() => {
    /* ağ hatası — oyun akışını kesme */
  });
}

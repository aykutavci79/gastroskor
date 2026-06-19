import { getApiV1Base } from '@/lib/api-base';

import { sofraKelimeBuyuk } from './turkce-harf';

/** Gürültü filtresi — 3 harf ve altı loglanmaz. */
const MIN_LOG_LENGTH = 4;

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

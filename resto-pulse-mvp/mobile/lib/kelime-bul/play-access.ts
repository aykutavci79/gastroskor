import { Alert } from 'react-native';

import { KELIME_BUL_GUNLUK_UCRETSIZ, KELIME_BUL_LIMIT_DISABLED } from '@/constants/kelime-bul';
import { spendGamePlay } from '@/lib/api';
import {
  incrementGuestDaily,
  isGuestExhausted,
  loadGuestDaily,
  setGuestExhausted,
} from '@/lib/kelime-bul/storage';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

export type KelimeBulStartResult =
  | { ok: true; puzzleId: string; charged: number; freeRemaining?: number }
  | { ok: false; reason: 'login_required' | 'insufficient_gc' | 'api_error'; balance?: number };

export async function startKelimeBulSession(opts: {
  userEmail?: string | null;
  isLoggedIn: boolean;
}): Promise<KelimeBulStartResult> {
  const puzzleId = String(Date.now());

  if (KELIME_BUL_LIMIT_DISABLED) {
    return { ok: true, puzzleId, charged: 0 };
  }

  if (!opts.isLoggedIn) {
    const guest = await loadGuestDaily();
    if (guest.playCount >= KELIME_BUL_GUNLUK_UCRETSIZ) {
      await setGuestExhausted(true);
      return { ok: false, reason: 'login_required' };
    }
    await incrementGuestDaily();
    return { ok: true, puzzleId, charged: 0 };
  }

  if (!opts.userEmail) {
    return { ok: false, reason: 'login_required' };
  }

  const paidOnly = await isGuestExhausted();

  try {
    const spend = await spendGamePlay({
      userEmail: opts.userEmail,
      game: 'kelime_bul',
      puzzleId,
      paidOnly,
    });
    if (!spend.ok) {
      if (spend.reason === 'insufficient_balance') {
        return { ok: false, reason: 'insufficient_gc', balance: spend.balance };
      }
      return { ok: false, reason: 'api_error' };
    }
    if (paidOnly && spend.charged > 0) {
      await setGuestExhausted(false);
    }
    return {
      ok: true,
      puzzleId,
      charged: spend.charged,
      freeRemaining: spend.free_remaining,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (message.includes('yeterli') || message.includes('jeton')) {
      return { ok: false, reason: 'insufficient_gc' };
    }
    return { ok: false, reason: 'api_error' };
  }
}

export function showKelimeBulLoginAlert(onLogin?: () => void): void {
  Alert.alert(
    'Giriş gerekli',
    'Günlük ücretsiz hakların bitti. Devam etmek için hesabına giriş yap.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      ...(onLogin ? [{ text: 'Giriş yap', onPress: onLogin }] : []),
    ],
  );
}

import { getApiV1Base } from '@/lib/api-base';
import { createFetchTimeoutSignal } from '@/lib/fetch-timeout';

import type { EglenceArchiveGameId } from '@/constants/eglence-archive';

export type ArchiveUnlockListResponse = {
  game: string;
  gun_ids: string[];
  costs: Record<string, number>;
};

export type ArchiveDayUnlockResponse = {
  ok: boolean;
  balance: number;
  charged: number;
  already_unlocked: boolean;
  reason?: string | null;
};

export async function fetchArchiveUnlocks(
  userEmail: string,
  game: EglenceArchiveGameId,
): Promise<ArchiveUnlockListResponse | null> {
  const params = new URLSearchParams({ user_email: userEmail, game });
  const signal = createFetchTimeoutSignal(8_000);
  try {
    const res = await fetch(`${getApiV1Base()}/jeton/me/archive-unlocks?${params}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as ArchiveUnlockListResponse;
  } catch {
    return null;
  }
}

export async function unlockArchiveDay(payload: {
  userEmail: string;
  game: EglenceArchiveGameId;
  gunId: string;
}): Promise<ArchiveDayUnlockResponse> {
  const res = await fetch(`${getApiV1Base()}/jeton/me/spend/archive-day`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: payload.userEmail,
      game: payload.game,
      gun_id: payload.gunId,
    }),
  });
  const body = (await res.json()) as ArchiveDayUnlockResponse & { detail?: unknown };
  if (!res.ok) {
    const detail = body.detail;
    if (res.status === 402 && detail && typeof detail === 'object') {
      const d = detail as { message?: string; balance?: number; cost?: number };
      throw new ArchiveUnlockError(d.message ?? 'Yeterli GastroCoin yok.', {
        status: res.status,
        balance: d.balance,
        cost: d.cost,
      });
    }
    throw new ArchiveUnlockError(
      typeof detail === 'string' ? detail : 'Arşiv açılamadı.',
      { status: res.status },
    );
  }
  return body;
}

export class ArchiveUnlockError extends Error {
  readonly status: number;
  readonly balance?: number;
  readonly cost?: number;

  constructor(message: string, opts: { status: number; balance?: number; cost?: number }) {
    super(message);
    this.name = 'ArchiveUnlockError';
    this.status = opts.status;
    this.balance = opts.balance;
    this.cost = opts.cost;
  }
}

import * as Sentry from '@sentry/react-native';

import { reportEglenceFriendActivity } from '@/lib/api';

export type EglenceFriendGame = 'mini_sudoku' | 'kelime_yarismasi' | 'kelime_sofrasi';

type Payload = {
  game: EglenceFriendGame;
  elapsedMs?: number;
  score?: number;
  puzzleId?: string;
};

/** Arkadaş listesine push + uygulama içi bildirim (sessiz hata). */
export function notifyFriendsEglenceActivity(userEmail: string | null | undefined, payload: Payload): void {
  const email = userEmail?.trim().toLowerCase();
  if (!email) return;

  void reportEglenceFriendActivity({
    user_email: email,
    game: payload.game,
    elapsed_ms: payload.elapsedMs,
    score: payload.score,
    puzzle_id: payload.puzzleId,
  }).catch((err) => {
    if (__DEV__) {
      console.warn('eglence friend notify failed', err);
      return;
    }
    const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
    if (sentryDsn) {
      Sentry.captureException(err, { tags: { flow: 'eglence_friend_activity', game: payload.game } });
    }
  });
}

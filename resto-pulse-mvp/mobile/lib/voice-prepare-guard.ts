export type VoiceAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export interface VoiceRecordingLike {
  prepareToRecordAsync(options: unknown): Promise<unknown>;
  stopAndUnloadAsync?(): Promise<unknown>;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function isAppStateForeground(state: VoiceAppState | null | undefined): boolean {
  return state === 'active';
}

/** expo-av arka plan / inactive prepare hatalari — Sentry gürültüsü, sessizce atla. */
export function isIgnorableBackgroundPrepareError(err: unknown, foreground: boolean): boolean {
  if (!foreground) return true;

  const msg = errorMessage(err);
  if (msg.includes('EXModulesErrorDomain') && /background/i.test(msg)) return true;
  if (msg.includes('Prepare encountered an error') && /background/i.test(msg)) return true;
  if (/currently in the background/i.test(msg)) return true;
  return false;
}

export function shouldSkipVoicePrepare(state: VoiceAppState | null | undefined): boolean {
  return !isAppStateForeground(state);
}

/** prepareToRecordAsync — foreground degilse veya arka plan hatasi ise null. */
export async function prepareVoiceRecordingInstance<T extends VoiceRecordingLike>(
  recording: T,
  options: unknown,
  appState: VoiceAppState | null | undefined,
): Promise<T | null> {
  if (shouldSkipVoicePrepare(appState)) return null;

  const foreground = isAppStateForeground(appState);
  try {
    await recording.prepareToRecordAsync(options);
    return recording;
  } catch (err) {
    if (isIgnorableBackgroundPrepareError(err, foreground)) {
      try {
        await recording.stopAndUnloadAsync?.();
      } catch {
        /* zaten unload */
      }
      return null;
    }
    throw err;
  }
}

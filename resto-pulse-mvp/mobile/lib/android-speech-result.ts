import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';

import { mergeSpeechTranscript } from '@/lib/merge-speech-transcript';

/**
 * expo-speech-recognition ornegi ile uyumlu birikim.
 * Android'de isFinal her zaman false olabilir; yine de final parcalari tally'e eklenir.
 */
export function accumulateSpeechRecognitionResult(
  tally: string,
  event: Pick<ExpoSpeechRecognitionResultEvent, 'isFinal' | 'results'>,
): { tally: string; display: string } {
  const chunk = event.results[0]?.transcript?.trim() ?? '';
  if (!chunk) {
    return { tally, display: tally.trim() };
  }

  if (event.isFinal) {
    const nextTally = mergeSpeechTranscript(tally, chunk);
    return { tally: nextTally, display: nextTally };
  }

  const display = mergeSpeechTranscript(tally, chunk);
  return { tally, display };
}

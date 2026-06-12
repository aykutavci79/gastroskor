import { getApiV1Base } from '@/lib/api-base';
import { authHeaders } from '@/lib/auth-token';
import { createFetchTimeoutSignal } from '@/lib/fetch-timeout';

export type VoiceTranscribeResponse = {
  text: string;
  provider: 'groq' | 'openai';
  language: string;
};

export async function transcribeVoiceAudio(
  localUri: string,
  mimeType = 'audio/m4a',
  fileName = 'voice.m4a',
): Promise<VoiceTranscribeResponse> {
  const form = new FormData();
  form.append('language', 'tr');
  form.append('file', { uri: localUri, type: mimeType, name: fileName } as unknown as Blob);

  const response = await fetch(`${getApiV1Base()}/voice/transcribe`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
    },
    body: form,
    signal: createFetchTimeoutSignal(30_000),
  });

  if (!response.ok) {
    let detail = `Ses tanima basarisiz (${response.status}).`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      /* plain text */
    }
    throw new Error(detail);
  }

  return (await response.json()) as VoiceTranscribeResponse;
}

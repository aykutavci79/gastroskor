import { Platform } from 'react-native';

export type VoiceVadPlatformConfig = {
  graceMs: number;
  silenceMs: number;
  maxWaitSpeechMs: number;
  fallbackUtteranceMs: number;
  speechThresholdDb: number;
  /** Konusma algilandiiktan sonra devam eden konusma icin daha siki esik. */
  postSpeechThresholdDb: number;
  /** Son guclu konusmadan bu sure sonra kayit zorla kapanir (ortam gurultusu). */
  postSpeechTrailMs: number;
  /** Konusma sayilmadan once biriken minimum ses suresi. */
  minSpeechMs: number;
  /** Kayit acildiktan sonra erken kapanmayi engelle. */
  minOpenMs: number;
  statusPollMs: number;
};

const IOS_VAD: VoiceVadPlatformConfig = {
  graceMs: 900,
  silenceMs: 2600,
  maxWaitSpeechMs: 10000,
  fallbackUtteranceMs: 6200,
  speechThresholdDb: -50,
  postSpeechThresholdDb: -44,
  postSpeechTrailMs: 3200,
  minSpeechMs: 500,
  minOpenMs: 1800,
  statusPollMs: 120,
};

const ANDROID_VAD: VoiceVadPlatformConfig = {
  graceMs: 900,
  silenceMs: 2600,
  maxWaitSpeechMs: 10000,
  fallbackUtteranceMs: 6200,
  speechThresholdDb: -48,
  postSpeechThresholdDb: -42,
  postSpeechTrailMs: 3200,
  minSpeechMs: 500,
  minOpenMs: 1800,
  statusPollMs: 120,
};

export function getVoiceVadConfig(): VoiceVadPlatformConfig {
  return Platform.OS === 'ios' ? IOS_VAD : ANDROID_VAD;
}

export type VoiceSilenceVadState = VoiceVadPlatformConfig & {
  startedAtMs: number;
  speechDetected: boolean;
  speechMsAccumulated: number;
  meteringSeen: boolean;
  meteringWorks: boolean;
  silenceSinceMs: number | null;
  lastSpeechAtMs: number | null;
};

export type VoiceSilenceVadTickInput = {
  nowMs: number;
  elapsedMs: number;
  metering?: number;
  pollMs?: number;
};

export type VoiceSilenceVadDecision =
  | { action: 'continue' }
  | {
      action: 'auto_stop';
      reason: 'silence' | 'no_speech' | 'fallback_utterance' | 'post_speech_cap';
    };

export function createVoiceSilenceVadState(nowMs: number): VoiceSilenceVadState {
  const config = getVoiceVadConfig();
  return {
    startedAtMs: nowMs,
    ...config,
    speechDetected: false,
    speechMsAccumulated: 0,
    meteringSeen: false,
    meteringWorks: false,
    silenceSinceMs: null,
    lastSpeechAtMs: null,
  };
}

export function isVoiceSpeechLevel(metering: number | undefined, thresholdDb: number): boolean {
  if (metering == null || Number.isNaN(metering)) return false;
  return metering > thresholdDb;
}

function activeSpeechThreshold(state: VoiceSilenceVadState): number {
  return state.speechDetected ? state.postSpeechThresholdDb : state.speechThresholdDb;
}

export function tickVoiceSilenceVad(
  state: VoiceSilenceVadState,
  input: VoiceSilenceVadTickInput,
): { state: VoiceSilenceVadState; decision: VoiceSilenceVadDecision } {
  const next = { ...state };
  const pollMs = input.pollMs ?? next.statusPollMs;

  if (input.elapsedMs < next.graceMs) {
    return { state: next, decision: { action: 'continue' } };
  }

  if (input.metering != null && !Number.isNaN(input.metering)) {
    next.meteringSeen = true;
    if (input.metering > -159) {
      next.meteringWorks = true;
    }
  }

  const thresholdDb = activeSpeechThreshold(next);

  if (isVoiceSpeechLevel(input.metering, thresholdDb)) {
    next.speechMsAccumulated += pollMs;
    if (next.speechMsAccumulated >= next.minSpeechMs) {
      next.speechDetected = true;
    }
    if (next.speechDetected) {
      next.lastSpeechAtMs = input.nowMs;
    }
    next.silenceSinceMs = null;
    return { state: next, decision: { action: 'continue' } };
  }

  if (!next.speechDetected && next.speechMsAccumulated > 0) {
    next.speechMsAccumulated = Math.max(0, next.speechMsAccumulated - pollMs);
  }

  if (!next.speechDetected) {
    if (
      Number.isFinite(next.fallbackUtteranceMs) &&
      input.elapsedMs >= next.fallbackUtteranceMs &&
      (!next.meteringWorks || !next.meteringSeen)
    ) {
      return { state: next, decision: { action: 'auto_stop', reason: 'fallback_utterance' } };
    }
    if (next.meteringWorks && input.elapsedMs >= next.maxWaitSpeechMs) {
      return { state: next, decision: { action: 'auto_stop', reason: 'no_speech' } };
    }
    return { state: next, decision: { action: 'continue' } };
  }

  if (
    next.lastSpeechAtMs != null &&
    input.nowMs - next.lastSpeechAtMs >= next.postSpeechTrailMs
  ) {
    return { state: next, decision: { action: 'auto_stop', reason: 'post_speech_cap' } };
  }

  if (input.elapsedMs < next.minOpenMs) {
    next.silenceSinceMs = null;
    return { state: next, decision: { action: 'continue' } };
  }

  if (next.silenceSinceMs == null) {
    next.silenceSinceMs = input.nowMs;
    return { state: next, decision: { action: 'continue' } };
  }

  if (input.nowMs - next.silenceSinceMs >= next.silenceMs) {
    return { state: next, decision: { action: 'auto_stop', reason: 'silence' } };
  }

  return { state: next, decision: { action: 'continue' } };
}

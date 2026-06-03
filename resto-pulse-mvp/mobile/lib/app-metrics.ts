import Constants from 'expo-constants';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { getApiV1Base } from '@/lib/api-base';

type MetricsPayload = {
  event_type: 'session_start' | 'session_end';
  session_id: string;
  duration_seconds?: number;
  platform: string;
  app_version: string | null;
  user_id?: string | null;
};

let sessionId: string | null = null;
let sessionStartedAt: number | null = null;
let appStateSub: { remove: () => void } | null = null;
let currentUserId: string | null | undefined = undefined;

function newSessionId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function appVersion(): string | null {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;
}

async function sendEvent(payload: MetricsPayload): Promise<void> {
  try {
    await fetch(`${getApiV1Base()}/metrics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* KPI kaydi basarisiz olsa uygulama devam eder */
  }
}

function beginSession(): void {
  if (sessionId) return;
  sessionId = newSessionId();
  sessionStartedAt = Date.now();
  void sendEvent({
    event_type: 'session_start',
    session_id: sessionId,
    platform: Platform.OS,
    app_version: appVersion(),
    user_id: currentUserId ?? null,
  });
}

function endSession(): void {
  if (!sessionId || sessionStartedAt == null) return;
  const ended = sessionId;
  const started = sessionStartedAt;
  sessionId = null;
  sessionStartedAt = null;
  const durationSeconds = Math.max(1, Math.round((Date.now() - started) / 1000));
  void sendEvent({
    event_type: 'session_end',
    session_id: ended,
    duration_seconds: durationSeconds,
    platform: Platform.OS,
    app_version: appVersion(),
    user_id: currentUserId ?? null,
  });
}

function onAppStateChange(next: AppStateStatus): void {
  if (next === 'active') {
    beginSession();
  } else if (next === 'background' || next === 'inactive') {
    endSession();
  }
}

export function setAppMetricsUserId(userId: string | null | undefined): void {
  currentUserId = userId ?? null;
}

export function startAppMetrics(): void {
  if (appStateSub) return;
  if (AppState.currentState === 'active') {
    beginSession();
  }
  appStateSub = AppState.addEventListener('change', onAppStateChange);
}

export function stopAppMetrics(): void {
  endSession();
  appStateSub?.remove();
  appStateSub = null;
}

import { getApiV1Base } from '@/lib/api-base';

type MetricsPayload = {
  event_type: 'session_start' | 'session_end';
  session_id: string;
  duration_seconds?: number;
  platform: 'web';
  app_version: string | null;
  user_id?: string | null;
};

const SESSION_KEY = 'gs_web_metrics_session';
const VISITOR_KEY = 'gs_web_metrics_visitor';

let sessionId: string | null = null;
let sessionStartedAt: number | null = null;
let currentUserId: string | null | undefined = undefined;
let started = false;

function readStoredSession(): { id: string; startedAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; startedAt?: number };
    if (!parsed.id || !parsed.startedAt) return null;
    return { id: parsed.id, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

function persistSession(id: string, startedAt: number): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, startedAt }));
}

function clearStoredSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function ensureVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

function newSessionId(): string {
  return `w-${ensureVisitorId()}-${Date.now()}`;
}

async function sendEvent(payload: MetricsPayload): Promise<void> {
  try {
    await fetch(`${getApiV1Base()}/metrics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: payload.event_type === 'session_end',
    });
  } catch {
    /* KPI kaydi basarisiz olsa site devam eder */
  }
}

function beginSession(): void {
  if (sessionId) return;

  const restored = readStoredSession();
  if (restored) {
    sessionId = restored.id;
    sessionStartedAt = restored.startedAt;
    return;
  }

  sessionId = newSessionId();
  sessionStartedAt = Date.now();
  persistSession(sessionId, sessionStartedAt);
  void sendEvent({
    event_type: 'session_start',
    session_id: sessionId,
    platform: 'web',
    app_version: null,
    user_id: currentUserId ?? null,
  });
}

function endSession(): void {
  if (!sessionId || sessionStartedAt == null) return;
  const ended = sessionId;
  const started = sessionStartedAt;
  sessionId = null;
  sessionStartedAt = null;
  clearStoredSession();
  const durationSeconds = Math.max(1, Math.round((Date.now() - started) / 1000));
  void sendEvent({
    event_type: 'session_end',
    session_id: ended,
    duration_seconds: durationSeconds,
    platform: 'web',
    app_version: null,
    user_id: currentUserId ?? null,
  });
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    endSession();
  } else if (document.visibilityState === 'visible') {
    beginSession();
  }
}

function onPageHide(): void {
  endSession();
}

export function setWebMetricsUserId(userId: string | null | undefined): void {
  currentUserId = userId ?? null;
}

export function startWebMetrics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  beginSession();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
}

export function stopWebMetrics(): void {
  if (!started || typeof window === 'undefined') return;
  endSession();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pagehide', onPageHide);
  started = false;
}

import type { ErrorEvent, EventHint } from '@sentry/types';

export const SENTRY_REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /^(authorization|access[_-]?token|refresh[_-]?token|password|jwt|secret|api[_-]?key|id[_-]?token|bearer|cookie|set-cookie)$/i;

const PII_KEY =
  /^(email|user_email|author_email|actor_user_email|phone|order_phone|telefon|e164|full_name|nickname|name)$/i;

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;
const LOOSE_EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function maskEmail(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return SENTRY_REDACTED;
  return `***${trimmed.slice(at)}`;
}

function maskEmailsInText(value: string): string {
  return value.replace(LOOSE_EMAIL_PATTERN, (match) => maskEmail(match));
}

function scrubString(value: string, keyHint?: string): string {
  if (keyHint && SENSITIVE_KEY.test(keyHint)) return SENTRY_REDACTED;
  if (keyHint && PII_KEY.test(keyHint)) {
    if (trimmedIncludesEmail(value)) return maskEmail(value);
    if (/^\+?\d[\d\s()-]{6,}$/.test(value.trim())) return SENTRY_REDACTED;
    return SENTRY_REDACTED;
  }
  let next = value;
  if (/^Bearer\s+/i.test(next.trim())) return `Bearer ${SENTRY_REDACTED}`;
  if (JWT_PATTERN.test(next.trim())) return SENTRY_REDACTED;
  next = next.replace(BEARER_PATTERN, `Bearer ${SENTRY_REDACTED}`);
  next = next.replace(JWT_PATTERN, SENTRY_REDACTED);
  return maskEmailsInText(next);
}

function trimmedIncludesEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function scrubUnknown(value: unknown, keyHint?: string, depth = 0): unknown {
  if (depth > 14) return SENTRY_REDACTED;
  if (value == null) return value;

  if (typeof value === 'string') {
    return scrubString(value, keyHint);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubUnknown(item, keyHint, depth + 1));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = SENTRY_REDACTED;
        continue;
      }
      if (PII_KEY.test(key) && typeof nested === 'string') {
        output[key] = scrubString(nested, key);
        continue;
      }
      output[key] = scrubUnknown(nested, key, depth + 1);
    }
    return output;
  }

  return value;
}

export function scrubSentryEvent<T extends Record<string, unknown>>(event: T): T {
  return scrubUnknown(event) as T;
}

function isBackgroundExpoAvNoise(event: ErrorEvent): boolean {
  const chunks: string[] = [];
  for (const value of event.exception?.values ?? []) {
    if (value.type) chunks.push(value.type);
    if (value.value) chunks.push(value.value);
  }
  if (event.message) chunks.push(event.message);
  const text = chunks.join(' ');
  if (!/EXModulesErrorDomain|Prepare encountered an error/i.test(text)) return false;
  return /background|currently in the background/i.test(text);
}

function isEglenceFriendActivityNetworkNoise(event: ErrorEvent): boolean {
  const flow = event.tags?.flow;
  if (String(flow ?? '') !== 'eglence_friend_activity') return false;

  const chunks: string[] = [];
  for (const value of event.exception?.values ?? []) {
    if (value.value) chunks.push(value.value);
  }
  if (event.message) chunks.push(event.message);
  const text = chunks.join(' ');
  return /Internet veya API baglantisi kurulamadi|Network request failed/i.test(text);
}

export function createSentryBeforeSend(): (
  event: ErrorEvent,
  hint: EventHint,
) => ErrorEvent | null {
  return (event, _hint) => {
    if (isBackgroundExpoAvNoise(event)) return null;
    if (isEglenceFriendActivityNetworkNoise(event)) return null;
    return scrubSentryEvent(event as unknown as Record<string, unknown>) as unknown as ErrorEvent;
  };
}

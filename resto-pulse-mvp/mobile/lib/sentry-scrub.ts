import type { Event } from '@sentry/types';

export const SENTRY_REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /^(authorization|access[_-]?token|refresh[_-]?token|password|jwt|secret|api[_-]?key|id[_-]?token|bearer|cookie|set-cookie)$/i;

const PII_KEY =
  /^(email|user_email|author_email|actor_user_email|phone|order_phone|telefon|e164|full_name|nickname)$/i;

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;

function maskEmail(value: string): string {
  const trimmed = value.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return SENTRY_REDACTED;
  return `***${trimmed.slice(at)}`;
}

function scrubString(value: string, keyHint?: string): string {
  if (keyHint && SENSITIVE_KEY.test(keyHint)) return SENTRY_REDACTED;
  if (keyHint && PII_KEY.test(keyHint)) {
    if (trimmedIncludesEmail(value)) return maskEmail(value);
    if (/^\+?\d[\d\s()-]{6,}$/.test(value.trim())) return SENTRY_REDACTED;
  }
  let next = value;
  if (/^Bearer\s+/i.test(next.trim())) return `Bearer ${SENTRY_REDACTED}`;
  if (JWT_PATTERN.test(next.trim())) return SENTRY_REDACTED;
  next = next.replace(BEARER_PATTERN, `Bearer ${SENTRY_REDACTED}`);
  next = next.replace(JWT_PATTERN, SENTRY_REDACTED);
  return next;
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

export function createSentryBeforeSend(): (event: Event) => Event | null {
  return (event) => scrubSentryEvent(event as Record<string, unknown>) as Event;
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSentryBeforeSend, SENTRY_REDACTED, scrubSentryEvent } from './sentry-scrub.ts';

describe('sentry-scrub', () => {
  it('redacts sensitive headers and token fields', () => {
    const event = scrubSentryEvent({
      request: {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
          'Content-Type': 'application/json',
        },
      },
      extra: {
        access_token: 'secret-access',
        refresh_token: 'secret-refresh',
        status: 401,
      },
      contexts: {
        api: {
          password: 'hunter2',
          jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
        },
      },
    });

    assert.equal(event.request.headers.Authorization, SENTRY_REDACTED);
    assert.equal(event.extra.access_token, SENTRY_REDACTED);
    assert.equal(event.extra.refresh_token, SENTRY_REDACTED);
    assert.equal(event.extra.status, 401);
    assert.equal(event.contexts.api.password, SENTRY_REDACTED);
    assert.equal(event.contexts.api.jwt, SENTRY_REDACTED);
  });

  it('masks email PII but keeps domain', () => {
    const event = scrubSentryEvent({
      user: { email: 'alice@example.com' },
      extra: { user_email: 'bob@gastroskor.com.tr' },
    });

    assert.equal(event.user.email, '***@example.com');
    assert.equal(event.extra.user_email, '***@gastroskor.com.tr');
  });

  it('scrubs embedded bearer tokens in exception messages', () => {
    const beforeSend = createSentryBeforeSend();
    const scrubbed = beforeSend(
      {
        exception: {
          values: [
            {
              type: 'Error',
              value: '401: Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.a.b failed',
            },
          ],
        },
      } as Parameters<ReturnType<typeof createSentryBeforeSend>>[0],
      {},
    );

    const message = scrubbed?.exception?.values?.[0]?.value ?? '';
    assert.ok(message.includes(SENTRY_REDACTED));
    assert.doesNotMatch(message, /eyJhbGci/);
    assert.doesNotMatch(message, /payload\.sig/);
  });

  it('drops expo-av background prepare noise', () => {
    const beforeSend = createSentryBeforeSend();
    const dropped = beforeSend(
      {
        exception: {
          values: [
            {
              type: 'Error',
              value:
                "Prepare encountered an error: Error Domain=EXModulesErrorDomain Code=0 'This experience is currently in the background, so audio recording cannot be configured.'",
            },
          ],
        },
      } as Parameters<ReturnType<typeof createSentryBeforeSend>>[0],
      {},
    );

    assert.equal(dropped, null);
  });
});

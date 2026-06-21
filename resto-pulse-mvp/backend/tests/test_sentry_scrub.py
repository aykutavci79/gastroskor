from __future__ import annotations

from app.core.sentry_scrub import SENTRY_REDACTED, create_sentry_before_send, scrub_sentry_event


def test_scrub_redacts_sensitive_headers_and_tokens() -> None:
    event = scrub_sentry_event(
        {
            "request": {
                "headers": {
                    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig",
                    "Content-Type": "application/json",
                }
            },
            "extra": {
                "access_token": "secret-access",
                "refresh_token": "secret-refresh",
                "status": 401,
            },
            "contexts": {
                "api": {
                    "password": "hunter2",
                    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig",
                }
            },
        }
    )

    assert event["request"]["headers"]["Authorization"] == SENTRY_REDACTED
    assert event["extra"]["access_token"] == SENTRY_REDACTED
    assert event["extra"]["refresh_token"] == SENTRY_REDACTED
    assert event["extra"]["status"] == 401
    assert event["contexts"]["api"]["password"] == SENTRY_REDACTED
    assert event["contexts"]["api"]["jwt"] == SENTRY_REDACTED


def test_scrub_masks_email_pii() -> None:
    event = scrub_sentry_event(
        {
            "user": {"email": "alice@example.com"},
            "extra": {"user_email": "bob@gastroskor.com.tr"},
        }
    )

    assert event["user"]["email"] == "***@example.com"
    assert event["extra"]["user_email"] == "***@gastroskor.com.tr"


def test_before_send_scrubs_bearer_in_exception_message() -> None:
    before_send = create_sentry_before_send()
    scrubbed = before_send(
        {
            "exception": {
                "values": [
                    {
                        "type": "Error",
                        "value": "401: Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.a.b failed",
                    }
                ]
            }
        },
        {},
    )

    message = scrubbed["exception"]["values"][0]["value"]
    assert SENTRY_REDACTED in message
    assert "eyJhbGci" not in message

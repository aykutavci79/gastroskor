from __future__ import annotations

import certifi
import requests
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


class GoogleIdTokenError(ValueError):
    pass


def _google_auth_request() -> google_requests.Request:
    """Windows/lokal SSL: Google certs icin certifi bundle kullan."""
    session = requests.Session()
    session.verify = certifi.where()
    return google_requests.Request(session=session)


def verify_google_id_token(token: str, allowed_audiences: list[str]) -> dict:
    audiences = [value.strip() for value in allowed_audiences if value and value.strip()]
    if not audiences:
        raise GoogleIdTokenError("Google OAuth client ID yapilandirilmamis.")

    auth_request = _google_auth_request()
    last_error: Exception | None = None
    for audience in audiences:
        try:
            payload = id_token.verify_oauth2_token(token, auth_request, audience)
            if not isinstance(payload, dict):
                raise GoogleIdTokenError("Gecersiz Google oturum yaniti.")
            return payload
        except Exception as exc:  # noqa: BLE001 — farkli audience dene
            last_error = exc
            continue

    message = "Google oturum jetonu dogrulanamadi."
    if last_error is not None:
        message = f"{message} ({last_error})"
    raise GoogleIdTokenError(message)

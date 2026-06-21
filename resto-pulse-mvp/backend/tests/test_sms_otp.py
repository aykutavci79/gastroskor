"""SMS OTP hash — HMAC-SHA256 + pepper."""

from __future__ import annotations

import pytest

from app.services.sms_otp import hash_otp_code, verify_otp_code


def test_hash_otp_code_uses_hmac_with_pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "otp_pepper", "test-pepper-secret")
    hashed_a = hash_otp_code("123456")
    hashed_b = hash_otp_code("654321")
    assert hashed_a != hashed_b
    assert hash_otp_code("123456") == hashed_a
    monkeypatch.setattr(settings, "otp_pepper", "other-pepper")
    assert hash_otp_code("123456") != hashed_a


def test_verify_otp_code_matches_hash(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "otp_pepper", "verify-pepper")
    code_hash = hash_otp_code("482910")
    assert verify_otp_code("482910", code_hash) is True
    assert verify_otp_code("482911", code_hash) is False
    assert verify_otp_code(" 482910 ", code_hash) is True


def test_hash_otp_code_rejects_empty_pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "otp_pepper", "")
    with pytest.raises(RuntimeError, match="OTP_PEPPER"):
        hash_otp_code("000000")

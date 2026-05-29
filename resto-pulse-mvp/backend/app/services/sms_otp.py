from __future__ import annotations

import hashlib
import logging
import secrets

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verify_otp_code(code: str, code_hash: str) -> bool:
    return hash_otp_code(code.strip()) == code_hash


async def send_sms_otp(*, phone_e164: str, code: str) -> None:
    if settings.sms_provider == "mock" or settings.environment == "development":
        logger.info("SMS OTP -> %s code=%s (mock provider)", phone_e164, code)
        return

    if settings.sms_provider == "netgsm":
        if not settings.netgsm_user or not settings.netgsm_password or not settings.netgsm_header:
            raise ValueError("Netgsm credentials are not configured.")
        digits = phone_e164.removeprefix("+90")
        message = f"GastroSkor dogrulama kodunuz: {code}"
        params = {
            "usercode": settings.netgsm_user,
            "password": settings.netgsm_password,
            "gsmno": digits,
            "message": message,
            "msgheader": settings.netgsm_header,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get("https://api.netgsm.com.tr/sms/send/get", params=params)
            response.raise_for_status()
            body = response.text.strip()
            if not body.startswith("00"):
                raise RuntimeError(f"Netgsm SMS failed: {body}")
        return

    raise ValueError(f"Unsupported SMS provider: {settings.sms_provider}")

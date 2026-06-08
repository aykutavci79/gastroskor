from __future__ import annotations

import hashlib
import logging
import secrets

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

ILETIMERKEZI_SEND_URL = "https://api.iletimerkezi.com/v1/send-sms/json"


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verify_otp_code(code: str, code_hash: str) -> bool:
    return hash_otp_code(code.strip()) == code_hash


def _phone_for_iletimerkezi(phone_e164: str) -> str:
    digits = phone_e164.removeprefix("+")
    if digits.startswith("90") and len(digits) == 12:
        return digits
    if len(digits) == 10 and digits.startswith("5"):
        return f"90{digits}"
    return digits


async def _send_netgsm_otp(*, phone_e164: str, code: str) -> None:
    if not settings.netgsm_user or not settings.netgsm_password or not settings.netgsm_header:
        raise ValueError("Netgsm credentials are not configured.")
    digits = phone_e164.removeprefix("+90")
    message = f"GastroSkor dogrulama kodunuz: {code}"
    params = {
        "usercode": settings.netgsm_user,
        "password": settings.netgsm_password,
        "msgheader": settings.netgsm_header,
        "msg": message,
        "no": digits,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get("https://api.netgsm.com.tr/sms/send/otp", params=params)
        response.raise_for_status()
        body = response.text.strip()
        if not body.startswith("00"):
            raise RuntimeError(f"Netgsm OTP SMS failed: {body}")


async def _send_iletimerkezi_otp(*, phone_e164: str, code: str) -> None:
    if not settings.iletimerkezi_api_key or not settings.iletimerkezi_api_hash:
        raise ValueError("iletiMerkezi API key/hash are not configured.")
    sender = (settings.iletimerkezi_sender or "APITEST").strip() or "APITEST"
    payload = {
        "request": {
            "authentication": {
                "key": settings.iletimerkezi_api_key,
                "hash": settings.iletimerkezi_api_hash,
            },
            "order": {
                "sender": sender,
                "iys": "0",
                "message": {
                    "text": f"GastroSkor dogrulama kodunuz: {code}",
                    "receipents": {
                        "number": [_phone_for_iletimerkezi(phone_e164)],
                    },
                },
            },
        }
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(ILETIMERKEZI_SEND_URL, json=payload)
        response.raise_for_status()
        body = response.json()
    status = (body.get("response") or {}).get("status") or {}
    code_num = status.get("code")
    if code_num != 200:
        message = status.get("message") or body
        raise RuntimeError(f"iletiMerkezi SMS failed: {message}")


async def send_sms_otp(*, phone_e164: str, code: str) -> None:
    if settings.sms_provider == "mock" or settings.environment == "development":
        logger.info("SMS OTP -> %s code=%s (mock provider)", phone_e164, code)
        return

    provider = (settings.sms_provider or "mock").strip().lower()
    if provider == "netgsm":
        await _send_netgsm_otp(phone_e164=phone_e164, code=code)
        return
    if provider in {"iletimerkezi", "ileti_merkezi", "iletimerkezi.com"}:
        await _send_iletimerkezi_otp(phone_e164=phone_e164, code=code)
        return

    raise ValueError(f"Unsupported SMS provider: {settings.sms_provider}")

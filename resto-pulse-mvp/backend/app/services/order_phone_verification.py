"""Siparis icin cep telefonu SMS dogrulama."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import User, UserOrderPhoneOtp
from app.services.order_phone_test_bypass import is_order_phone_test_bypass
from app.services.phone_tr import normalize_tr_mobile
from app.services.sms_otp import generate_otp_code, hash_otp_code, send_sms_otp, verify_otp_code

RESEND_COOLDOWN_SECONDS = 60
MAX_OTP_ATTEMPTS = 5

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def mask_order_phone(phone_e164: str) -> str:
    digits = re.sub(r"\D", "", phone_e164)
    if len(digits) >= 12:
        local = digits[-10:]
        return f"0{local[:3]} *** ** {local[-2:]}"
    return "***"


def require_tr_mobile_phone(raw: str) -> str:
    phone = normalize_tr_mobile(raw)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gecerli bir cep telefonu girin (05xx xxx xx xx).",
        )
    return phone


def user_has_verified_order_phone(user: User, phone_e164: str) -> bool:
    return bool(user.order_phone_e164 == phone_e164 and user.order_phone_verified_at)


def order_phone_status_for_user(user: User) -> dict:
    if user.order_phone_e164 and user.order_phone_verified_at:
        return {
            "verified": True,
            "phone_e164": user.order_phone_e164,
            "phone_masked": mask_order_phone(user.order_phone_e164),
            "verified_at": user.order_phone_verified_at.isoformat(),
        }
    return {
        "verified": False,
        "phone_e164": None,
        "phone_masked": None,
        "verified_at": None,
    }


def _mark_order_phone_verified(db: Session, *, user: User, phone_e164: str) -> dict:
    user.order_phone_e164 = phone_e164
    user.order_phone_verified_at = _utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return order_phone_status_for_user(user)


async def send_order_phone_otp(db: Session, *, user: User, raw_phone: str) -> dict:
    phone_e164 = require_tr_mobile_phone(raw_phone)

    if is_order_phone_test_bypass(phone_e164):
        status = _mark_order_phone_verified(db, user=user, phone_e164=phone_e164)
        return {
            "sent": True,
            "auto_verified": True,
            "phone_masked": mask_order_phone(phone_e164),
            "expires_in_minutes": 0,
            "delivery_mode": "test_bypass",
            "info_message": "Test numarasi — SMS atlandi, telefon dogrulandi.",
            "order_phone": status,
        }

    recent = db.scalar(
        select(UserOrderPhoneOtp)
        .where(UserOrderPhoneOtp.user_id == user.id, UserOrderPhoneOtp.consumed.is_(False))
        .order_by(UserOrderPhoneOtp.created_at.desc())
        .limit(1)
    )
    if recent and (_utcnow() - recent.created_at).total_seconds() < RESEND_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Yeni kod icin bir dakika bekleyin.",
        )

    code = generate_otp_code()
    challenge = UserOrderPhoneOtp(
        user_id=user.id,
        phone_e164=phone_e164,
        code_hash=hash_otp_code(code),
        expires_at=_utcnow() + timedelta(minutes=settings.otp_expiry_minutes),
    )
    db.add(challenge)
    db.commit()

    try:
        delivery = await send_sms_otp(phone_e164=phone_e164, code=code)
    except Exception as exc:
        logger.exception("order phone OTP SMS failed for %s", mask_order_phone(phone_e164))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SMS gonderilemedi: {exc}",
        ) from exc

    mode = delivery.get("delivery_mode", "live")
    info_message: str | None = None
    if mode == "mock":
        info_message = (
            "Sunucu SMS mock modunda. Railway: SMS_PROVIDER=iletimerkezi ve gecerli API key/hash gerekir."
        )
    elif mode == "apitest":
        info_message = (
            "APITEST modu: SMS yalnizca iletiMerkezi panelindeki test numaraniza gider ve "
            "mesajda dogrulama kodu olmaz. Canli OTP icin onayli SMS basligi (sender) gerekir."
        )

    return {
        "sent": True,
        "phone_masked": mask_order_phone(phone_e164),
        "expires_in_minutes": settings.otp_expiry_minutes,
        "delivery_mode": mode,
        "info_message": info_message,
    }


def verify_order_phone_otp(db: Session, *, user: User, raw_phone: str, code: str) -> dict:
    phone_e164 = require_tr_mobile_phone(raw_phone)

    if is_order_phone_test_bypass(phone_e164):
        return _mark_order_phone_verified(db, user=user, phone_e164=phone_e164)

    challenge = db.scalar(
        select(UserOrderPhoneOtp)
        .where(
            UserOrderPhoneOtp.user_id == user.id,
            UserOrderPhoneOtp.phone_e164 == phone_e164,
            UserOrderPhoneOtp.consumed.is_(False),
        )
        .order_by(UserOrderPhoneOtp.created_at.desc())
        .limit(1)
    )
    if not challenge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Once SMS kodu isteyin.")

    if challenge.expires_at <= _utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Kodun suresi doldu. Yeni kod isteyin.")

    if challenge.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Cok fazla deneme.")

    challenge.attempts += 1
    if not verify_otp_code(code, challenge.code_hash):
        db.add(challenge)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz kod.")

    challenge.consumed = True
    user.order_phone_e164 = phone_e164
    user.order_phone_verified_at = _utcnow()
    db.add(challenge)
    db.add(user)
    db.commit()
    db.refresh(user)
    return order_phone_status_for_user(user)



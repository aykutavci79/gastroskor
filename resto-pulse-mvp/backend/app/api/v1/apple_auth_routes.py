from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.schemas.auth import AppleMobileAuthPayload, GoogleMobileAuthResponse
from app.services.access_token import create_token_pair
from app.services.active_user import assert_account_active
from app.services.app_metrics import record_app_usage_event
from app.services.apple_id_token import AppleIdTokenError, verify_apple_identity_token
from app.services.jeton_service import try_process_referral_on_signup
from app.services.kvkk_consent import require_and_record_kvkk_consent
from app.services.user_accounts import get_or_create_user, serialize_user

router = APIRouter(prefix="/auth/apple", tags=["auth"])


def _apple_auth_response(user, db: Session) -> GoogleMobileAuthResponse:
    tokens = create_token_pair(user_id=user.id, email=user.email)
    record_app_usage_event(db, event_type="user_login", user_id=user.id, platform="mobile-apple")
    return GoogleMobileAuthResponse(
        profile=serialize_user(user, db),
        **tokens,
    )


@router.post("/mobile", response_model=GoogleMobileAuthResponse)
def apple_mobile_auth(payload: AppleMobileAuthPayload, db: Session = Depends(get_db)):
    try:
        claims = verify_apple_identity_token(
            payload.identity_token.strip(),
            settings.apple_ios_bundle_id,
        )
    except AppleIdTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    apple_sub = str(claims.get("sub") or "").strip() or None
    if not apple_sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple hesap kimligi alinamadi.",
        )

    email = str(claims.get("email") or "").strip().lower() or None
    if claims.get("email_verified") is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple e-postasi dogrulanmamis.",
        )

    full_name = (payload.full_name or "").strip() or None
    if not full_name:
        given = str(claims.get("given_name") or "").strip()
        family = str(claims.get("family_name") or "").strip()
        combined = " ".join(part for part in (given, family) if part).strip()
        full_name = combined or None

    existing = db.scalar(select(User).where(User.apple_sub == apple_sub))
    if not email and existing:
        email = existing.email
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple e-postasi paylasilmadi. Apple ID ayarlarindan e-posta paylasimini acip tekrar deneyin.",
        )

    user, created = get_or_create_user(
        db,
        email=email,
        full_name=full_name,
        avatar_url=None,
        apple_sub=apple_sub,
    )
    require_and_record_kvkk_consent(db, user, accepted=payload.kvkk_consent_accepted)
    assert_account_active(user)
    if created:
        try_process_referral_on_signup(
            db,
            referred_user=user,
            referrer_id=payload.referrer_id,
            device_hash=payload.device_hash,
        )
        db.commit()
    return _apple_auth_response(user, db)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.services.user_accounts import get_or_create_user, serialize_user
from app.core.config import settings
from app.db.session import get_db
from app.schemas.auth import GoogleMobileAuthPayload, GoogleMobileAuthResponse
from app.services.app_metrics import record_app_usage_event
from app.services.google_id_token import GoogleIdTokenError, verify_google_id_token

router = APIRouter(prefix="/auth/google", tags=["auth"])


@router.post("/mobile", response_model=GoogleMobileAuthResponse)
def google_mobile_auth(payload: GoogleMobileAuthPayload, db: Session = Depends(get_db)):
    audiences = [
        settings.google_oauth_web_client_id,
        settings.google_oauth_android_client_id,
        settings.google_oauth_ios_client_id,
    ]
    try:
        claims = verify_google_id_token(payload.id_token.strip(), audiences)
    except GoogleIdTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    email = str(claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google hesabi e-posta paylasmadi.",
        )
    if claims.get("email_verified") is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google e-postasi dogrulanmamis.",
        )

    google_sub = str(claims.get("sub") or "").strip() or None
    user = get_or_create_user(
        db,
        email=email,
        full_name=claims.get("name"),
        avatar_url=claims.get("picture"),
        google_sub=google_sub,
    )
    record_app_usage_event(db, event_type="user_login", user_id=user.id, platform="mobile-google")
    return GoogleMobileAuthResponse(profile=serialize_user(user, db))

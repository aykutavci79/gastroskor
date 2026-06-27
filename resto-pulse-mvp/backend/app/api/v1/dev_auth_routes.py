from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.production_guard import is_production_environment
from app.db.session import get_db
from app.schemas.auth import DevLoginPayload, GoogleMobileAuthResponse
from app.services.access_token import create_token_pair
from app.services.active_user import assert_account_active
from app.services.app_metrics import record_app_usage_event
from app.services.kvkk_consent import require_and_record_kvkk_consent
from app.services.user_accounts import get_or_create_user, serialize_user

router = APIRouter(prefix="/auth/dev", tags=["auth-dev"])


def _dev_login_allowed(payload: DevLoginPayload) -> bool:
    if not is_production_environment():
        return True
    configured = (settings.dev_login_secret or "").strip()
    if not configured:
        return False
    supplied = (payload.dev_secret or "").strip()
    return bool(supplied) and supplied == configured


@router.post("/login", response_model=GoogleMobileAuthResponse)
def dev_login(payload: DevLoginPayload, db: Session = Depends(get_db)):
    """Expo Go / yerel test — production'da yalnizca DEV_LOGIN_SECRET ile."""
    if not _dev_login_allowed(payload):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    email = payload.email.strip().lower()
    google_sub = f"dev:{email}"
    user, _ = get_or_create_user(
        db,
        email=email,
        full_name="GastroSkor Dev",
        avatar_url=None,
        google_sub=google_sub,
    )
    require_and_record_kvkk_consent(db, user, accepted=True)
    assert_account_active(user)
    db.commit()

    tokens = create_token_pair(user_id=user.id, email=user.email)
    record_app_usage_event(db, event_type="user_login", user_id=user.id, platform="dev-expo")
    db.commit()
    return GoogleMobileAuthResponse(
        profile=serialize_user(user, db),
        **tokens,
    )

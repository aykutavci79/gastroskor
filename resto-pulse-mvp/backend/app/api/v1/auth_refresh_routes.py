from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AuthRefreshPayload, AuthTokenResponse
from app.services.access_token import create_token_pair, decode_refresh_token
from app.services.user_accounts import get_user_by_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/refresh", response_model=AuthTokenResponse)
def refresh_auth_tokens(payload: AuthRefreshPayload, db: Session = Depends(get_db)):
    try:
        claims = decode_refresh_token(payload.refresh_token.strip())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user = get_user_by_id(db, claims.user_id)
    if user is None or user.email.strip().lower() != claims.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum bulunamadi.")

    tokens = create_token_pair(user_id=user.id, email=user.email)
    return AuthTokenResponse(**tokens)

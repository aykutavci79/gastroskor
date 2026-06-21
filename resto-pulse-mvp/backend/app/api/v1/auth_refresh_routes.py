from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AuthRefreshPayload, AuthTokenResponse
from app.services.access_token import decode_refresh_token
from app.services.refresh_token_revocation import (
    assert_refresh_token_active,
    exchange_refresh_token,
    revoke_refresh_token,
)
from app.services.user_accounts import get_user_by_id
from app.services.account_deletion import assert_account_active

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/refresh", response_model=AuthTokenResponse)
def refresh_auth_tokens(payload: AuthRefreshPayload, db: Session = Depends(get_db)):
    try:
        claims = decode_refresh_token(payload.refresh_token.strip())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    assert_refresh_token_active(db, claims.jti)

    user = get_user_by_id(db, claims.user_id)
    if user is None or user.email.strip().lower() != claims.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum bulunamadi.")
    assert_account_active(user)

    tokens = exchange_refresh_token(db, claims, email=user.email)
    db.commit()
    return AuthTokenResponse(**tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_auth_tokens(payload: AuthRefreshPayload, db: Session = Depends(get_db)):
    try:
        claims = decode_refresh_token(payload.refresh_token.strip())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    revoke_refresh_token(
        db,
        jti=claims.jti,
        user_id=claims.user_id,
        expires_at=claims.expires_at,
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

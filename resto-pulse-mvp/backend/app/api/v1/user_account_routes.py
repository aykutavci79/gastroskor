from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.account_deletion import AccountDeletionPayload
from app.services.account_deletion import AccountDeletionError, delete_user_account
from app.services.request_identity import require_request_auth

router = APIRouter(tags=["users"])


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(payload: AccountDeletionPayload, db: Session = Depends(get_db)) -> Response:
    auth = require_request_auth()
    try:
        delete_user_account(
            db,
            user_id=auth.user_id,
            confirmation=payload.confirmation,
            refresh_token=payload.refresh_token,
        )
        db.commit()
    except AccountDeletionError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

import json

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.account_deletion import AccountDeletionPayload
from app.services.account_deletion import AccountDeletionError, delete_user_account
from app.services.active_user import require_active_request_user
from app.services.user_data_export import build_user_data_export

router = APIRouter(tags=["users"])


@router.get("/users/me/export")
def export_my_data(db: Session = Depends(get_db)) -> JSONResponse:
    user = require_active_request_user(db)
    payload = build_user_data_export(db, user_id=user.id)
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    filename = f"gastroskor-export-{user.id}.json"
    return JSONResponse(
        content=payload,
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Export-Bytes": str(len(body.encode("utf-8"))),
        },
    )


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(payload: AccountDeletionPayload, db: Session = Depends(get_db)) -> Response:
    from app.services.request_identity import require_request_auth

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

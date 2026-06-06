from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import User
from app.schemas.social import (
    DmInboxResponse,
    DmMessageListResponse,
    DmSendPayload,
    DmStartPayload,
    DmThreadSummary,
    FriendAddPayload,
    FriendListItem,
    FriendListResponse,
    PublicUserCard,
)
from app.services.user_social import (
    UserSocialError,
    add_friend,
    find_user_by_nickname,
    list_dm_inbox,
    list_dm_messages,
    list_friends,
    remove_friend,
    send_dm_message,
    serialize_public_user,
    start_dm_thread,
)

router = APIRouter(prefix="/social", tags=["social"])


def _resolve_user(db, email: str) -> User:
    from app.api.v1.routes import get_or_create_user

    return get_or_create_user(db, email=email)


def _raise_social_error(exc: UserSocialError) -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "code": "social",
            "message": exc.message,
            "highlights": exc.highlights,
        },
    ) from exc


@router.get("/users/{nickname}/public", response_model=PublicUserCard)
def get_public_user(
    nickname: str,
    viewer_email: str | None = Query(default=None, min_length=3),
    db: Session = Depends(get_db),
):
    user = find_user_by_nickname(db, nickname)
    if not user or not user.nickname:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    viewer_id = None
    if viewer_email:
        viewer = _resolve_user(db, viewer_email)
        viewer_id = viewer.id
    return PublicUserCard(**serialize_public_user(db, user, viewer_id=viewer_id))


@router.get("/me/friends", response_model=FriendListResponse)
def get_my_friends(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    items = list_friends(db, user_id=user.id, limit=limit)
    return FriendListResponse(items=[FriendListItem(**row) for row in items], total=len(items))


@router.post("/me/friends", response_model=FriendListItem)
def post_add_friend(payload: FriendAddPayload, db: Session = Depends(get_db)):
    user = _resolve_user(db, payload.user_email)
    try:
        row = add_friend(db, user_id=user.id, target_nickname=payload.target_nickname)
    except UserSocialError as exc:
        _raise_social_error(exc)
    return FriendListItem(**row)


@router.delete("/me/friends")
def delete_friend(
    user_email: str = Query(..., min_length=3),
    target_nickname: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    try:
        remove_friend(db, user_id=user.id, target_nickname=target_nickname)
    except UserSocialError as exc:
        _raise_social_error(exc)
    return {"ok": True}


@router.get("/me/dm", response_model=DmInboxResponse)
def get_dm_inbox(
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    payload = list_dm_inbox(db, user_id=user.id, limit=limit)
    return DmInboxResponse(
        items=[DmThreadSummary(**row) for row in payload["items"]],
        total=payload["total"],
        unread_total=payload["unread_total"],
    )


@router.post("/me/dm/start")
def post_start_dm(payload: DmStartPayload, db: Session = Depends(get_db)):
    user = _resolve_user(db, payload.user_email)
    try:
        return start_dm_thread(db, user_id=user.id, target_nickname=payload.target_nickname)
    except UserSocialError as exc:
        _raise_social_error(exc)


@router.get("/me/dm/{thread_id}/messages", response_model=DmMessageListResponse)
def get_dm_messages(
    thread_id: UUID,
    user_email: str = Query(..., min_length=3),
    limit: int = Query(default=80, ge=1, le=200),
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, user_email)
    try:
        payload = list_dm_messages(db, user_id=user.id, thread_id=thread_id, limit=limit)
    except UserSocialError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
    return DmMessageListResponse(**payload)


@router.post("/me/dm/{thread_id}/messages")
def post_dm_message(
    thread_id: UUID,
    payload: DmSendPayload,
    db: Session = Depends(get_db),
):
    user = _resolve_user(db, payload.user_email)
    try:
        return send_dm_message(db, user_id=user.id, thread_id=thread_id, body=payload.body)
    except UserSocialError as exc:
        _raise_social_error(exc)

"""Arkadas listesi ve ozel mesaj (DM) is kurallari."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import DmMessage, DmReadState, DmThread, User, UserFriendship
from app.services.gourmet_profile import nickname_identity_key, public_user_avatar
from app.services.review_moderation import check_review_text
from app.services.user_notification_service import notify_dm_message

DM_BODY_MAX = 800


class UserSocialError(Exception):
    def __init__(self, message: str, *, highlights: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.highlights = highlights or []


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def find_user_by_nickname(db: Session, nickname: str) -> User | None:
    key = nickname_identity_key(nickname)
    rows = db.scalars(select(User).where(User.nickname.is_not(None))).all()
    for user in rows:
        if user.nickname and nickname_identity_key(user.nickname) == key:
            return user
    return None


def serialize_public_user(db: Session, user: User, *, viewer_id: UUID | None = None) -> dict:
    from app.models.entities import Review

    avg_rating = db.scalar(select(func.avg(Review.rating)).where(Review.author_id == user.id))
    review_count = db.scalar(select(func.count(Review.id)).where(Review.author_id == user.id)) or 0
    avatar_url, avatar_preset = public_user_avatar(user)
    is_friend = False
    if viewer_id and viewer_id != user.id:
        is_friend = is_friend_pair(db, viewer_id, user.id)
    return {
        "id": str(user.id),
        "nickname": user.nickname or "Gurme",
        "avatar_url": avatar_url,
        "avatar_preset": avatar_preset,
        "gastro_score": round(float(avg_rating), 1) if avg_rating is not None else None,
        "review_count": int(review_count),
        "is_friend": is_friend,
    }


def is_friend_pair(db: Session, user_a: UUID, user_b: UUID) -> bool:
    if user_a == user_b:
        return False
    row = db.scalar(
        select(UserFriendship.id).where(
            or_(
                (UserFriendship.user_id == user_a) & (UserFriendship.friend_user_id == user_b),
                (UserFriendship.user_id == user_b) & (UserFriendship.friend_user_id == user_a),
            )
        )
    )
    return row is not None


def add_friend(db: Session, *, user_id: UUID, target_nickname: str) -> dict:
    target = find_user_by_nickname(db, target_nickname)
    if not target or not target.nickname:
        raise UserSocialError("Kullanici bulunamadi.")
    if target.id == user_id:
        raise UserSocialError("Kendinizi arkadas olarak ekleyemezsiniz.")
    if is_friend_pair(db, user_id, target.id):
        raise UserSocialError("Zaten arkadas listenizde.")
    row = UserFriendship(user_id=user_id, friend_user_id=target.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "friendship_id": str(row.id),
        "friends_since": row.created_at,
        **serialize_public_user(db, target, viewer_id=user_id),
    }


def remove_friend(db: Session, *, user_id: UUID, target_nickname: str) -> None:
    target = find_user_by_nickname(db, target_nickname)
    if not target:
        raise UserSocialError("Kullanici bulunamadi.")
    row = db.scalar(
        select(UserFriendship).where(
            or_(
                (UserFriendship.user_id == user_id) & (UserFriendship.friend_user_id == target.id),
                (UserFriendship.user_id == target.id) & (UserFriendship.friend_user_id == user_id),
            )
        )
    )
    if not row:
        raise UserSocialError("Arkadas listenizde degil.")
    db.delete(row)
    db.commit()


def list_friends(db: Session, *, user_id: UUID, limit: int = 100) -> list[dict]:
    rows = db.scalars(
        select(UserFriendship)
        .where(
            or_(UserFriendship.user_id == user_id, UserFriendship.friend_user_id == user_id)
        )
        .options(selectinload(UserFriendship.user), selectinload(UserFriendship.friend))
        .order_by(UserFriendship.created_at.desc())
        .limit(min(max(limit, 1), 100))
    ).all()
    items: list[dict] = []
    seen: set[UUID] = set()
    for row in rows:
        peer = row.friend if row.user_id == user_id else row.user
        if peer.id in seen:
            continue
        seen.add(peer.id)
        if not peer.nickname:
            continue
        items.append(
            {
                "friendship_id": str(row.id),
                "friends_since": row.created_at,
                **serialize_public_user(db, peer, viewer_id=user_id),
            }
        )
    return items


def _canonical_pair(user_a: UUID, user_b: UUID) -> tuple[UUID, UUID]:
    return (user_a, user_b) if str(user_a) < str(user_b) else (user_b, user_a)


def get_or_create_thread(db: Session, *, user_id: UUID, peer_id: UUID) -> DmThread:
    low_id, high_id = _canonical_pair(user_id, peer_id)
    thread = db.scalar(
        select(DmThread).where(DmThread.user_low_id == low_id, DmThread.user_high_id == high_id)
    )
    if thread:
        return thread
    now = _utcnow()
    thread = DmThread(
        user_low_id=low_id,
        user_high_id=high_id,
        created_at=now,
        updated_at=now,
        last_message_at=None,
    )
    db.add(thread)
    db.flush()
    return thread


def _thread_peer_id(thread: DmThread, viewer_id: UUID) -> UUID:
    return thread.user_high_id if thread.user_low_id == viewer_id else thread.user_low_id


def _get_read_at(db: Session, thread_id: UUID, user_id: UUID) -> datetime | None:
    row = db.scalar(
        select(DmReadState).where(DmReadState.thread_id == thread_id, DmReadState.user_id == user_id)
    )
    return row.last_read_at if row else None


def _set_read_at(db: Session, thread_id: UUID, user_id: UUID, read_at: datetime) -> None:
    row = db.scalar(
        select(DmReadState).where(DmReadState.thread_id == thread_id, DmReadState.user_id == user_id)
    )
    if row:
        row.last_read_at = read_at
    else:
        db.add(DmReadState(thread_id=thread_id, user_id=user_id, last_read_at=read_at))


def _count_unread(db: Session, thread: DmThread, user_id: UUID) -> int:
    read_at = _get_read_at(db, thread.id, user_id)
    query = select(func.count(DmMessage.id)).where(
        DmMessage.thread_id == thread.id,
        DmMessage.sender_id != user_id,
    )
    if read_at:
        query = query.where(DmMessage.created_at > read_at)
    return int(db.scalar(query) or 0)


def list_dm_inbox(db: Session, *, user_id: UUID, limit: int = 50) -> dict:
    threads = db.scalars(
        select(DmThread)
        .where(or_(DmThread.user_low_id == user_id, DmThread.user_high_id == user_id))
        .order_by(DmThread.last_message_at.desc().nullslast(), DmThread.updated_at.desc())
        .limit(min(max(limit, 1), 100))
    ).all()
    items: list[dict] = []
    unread_total = 0
    for thread in threads:
        peer_id = _thread_peer_id(thread, user_id)
        peer = db.get(User, peer_id)
        if not peer or not peer.nickname:
            continue
        last_msg = db.scalar(
            select(DmMessage)
            .where(DmMessage.thread_id == thread.id)
            .order_by(DmMessage.created_at.desc())
            .limit(1)
        )
        unread = _count_unread(db, thread, user_id)
        unread_total += unread
        items.append(
            {
                "id": str(thread.id),
                "peer": serialize_public_user(db, peer, viewer_id=user_id),
                "last_message": last_msg.body if last_msg else None,
                "last_message_at": thread.last_message_at,
                "unread_count": unread,
            }
        )
    return {"items": items, "total": len(items), "unread_total": unread_total}


def start_dm_thread(db: Session, *, user_id: UUID, target_nickname: str) -> dict:
    target = find_user_by_nickname(db, target_nickname)
    if not target or not target.nickname:
        raise UserSocialError("Kullanici bulunamadi.")
    if target.id == user_id:
        raise UserSocialError("Kendinize mesaj gonderemezsiniz.")
    thread = get_or_create_thread(db, user_id=user_id, peer_id=target.id)
    db.commit()
    db.refresh(thread)
    return {
        "thread_id": str(thread.id),
        "peer": serialize_public_user(db, target, viewer_id=user_id),
    }


def _validate_dm_body(body: str) -> str:
    cleaned = body.strip()
    if not cleaned:
        raise UserSocialError("Mesaj bos olamaz.")
    if len(cleaned) > DM_BODY_MAX:
        raise UserSocialError(f"Mesaj en fazla {DM_BODY_MAX} karakter olabilir.")
    violation = check_review_text(cleaned)
    if violation:
        raise UserSocialError(violation.message, highlights=violation.highlights)
    return cleaned


def list_dm_messages(
    db: Session,
    *,
    user_id: UUID,
    thread_id: UUID,
    limit: int = 80,
) -> dict:
    thread = db.get(DmThread, thread_id)
    if not thread or user_id not in (thread.user_low_id, thread.user_high_id):
        raise UserSocialError("Sohbet bulunamadi.")
    peer_id = _thread_peer_id(thread, user_id)
    peer = db.get(User, peer_id)
    if not peer:
        raise UserSocialError("Kullanici bulunamadi.")
    rows = db.scalars(
        select(DmMessage)
        .where(DmMessage.thread_id == thread.id)
        .order_by(DmMessage.created_at.asc())
        .limit(min(max(limit, 1), 200))
    ).all()
    now = _utcnow()
    _set_read_at(db, thread.id, user_id, now)
    db.commit()
    return {
        "thread_id": str(thread.id),
        "peer": serialize_public_user(db, peer, viewer_id=user_id),
        "items": [
            {
                "id": str(row.id),
                "body": row.body,
                "sender_id": str(row.sender_id),
                "is_own": row.sender_id == user_id,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }


def send_dm_message(
    db: Session,
    *,
    user_id: UUID,
    thread_id: UUID,
    body: str,
) -> dict:
    thread = db.get(DmThread, thread_id)
    if not thread or user_id not in (thread.user_low_id, thread.user_high_id):
        raise UserSocialError("Sohbet bulunamadi.")
    cleaned = _validate_dm_body(body)
    now = _utcnow()
    row = DmMessage(thread_id=thread.id, sender_id=user_id, body=cleaned, created_at=now)
    thread.updated_at = now
    thread.last_message_at = now
    db.add(row)
    _set_read_at(db, thread.id, user_id, now)
    db.flush()

    recipient_id = _thread_peer_id(thread, user_id)
    recipient = db.get(User, recipient_id)
    sender = db.get(User, user_id)
    if recipient and sender:
        notify_dm_message(
            db,
            recipient=recipient,
            actor=sender,
            thread_id=thread.id,
            body=cleaned,
        )
    db.commit()
    db.refresh(row)
    return {
        "id": str(row.id),
        "body": row.body,
        "sender_id": str(row.sender_id),
        "is_own": True,
        "created_at": row.created_at,
    }

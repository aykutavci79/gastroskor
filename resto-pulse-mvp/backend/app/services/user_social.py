"""Arkadas listesi ve ozel mesaj (DM) is kurallari."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    DmMessage,
    DmReadState,
    DmThread,
    FriendRequest,
    FriendRequestStatus,
    User,
    UserFriendship,
)
from app.services.gourmet_profile import nickname_identity_key, public_user_avatar
from app.services.review_moderation import check_review_text
from app.services.user_notification_service import (
    notify_dm_message,
    notify_friend_request,
    notify_friend_request_accepted,
)

DM_BODY_MAX = 800
FRIEND_REQUEST_COOLDOWN_DAYS = 7


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


def _get_friend_request_row(db: Session, from_id: UUID, to_id: UUID) -> FriendRequest | None:
    return db.scalar(
        select(FriendRequest).where(
            FriendRequest.from_user_id == from_id,
            FriendRequest.to_user_id == to_id,
        )
    )


def _friend_request_state_for_viewer(
    db: Session,
    *,
    viewer_id: UUID | None,
    target_id: UUID,
) -> dict:
    if not viewer_id or viewer_id == target_id:
        return {
            "friend_request_status": None,
            "friend_request_id": None,
            "cooldown_until": None,
        }
    if is_friend_pair(db, viewer_id, target_id):
        return {
            "friend_request_status": "friends",
            "friend_request_id": None,
            "cooldown_until": None,
        }

    outgoing = _get_friend_request_row(db, viewer_id, target_id)
    if outgoing:
        if outgoing.status == FriendRequestStatus.pending:
            return {
                "friend_request_status": "pending_outgoing",
                "friend_request_id": str(outgoing.id),
                "cooldown_until": None,
            }
        if outgoing.status == FriendRequestStatus.blocked:
            return {
                "friend_request_status": "blocked",
                "friend_request_id": str(outgoing.id),
                "cooldown_until": None,
            }
        if outgoing.status == FriendRequestStatus.rejected:
            if outgoing.rejection_count >= 2:
                return {
                    "friend_request_status": "blocked",
                    "friend_request_id": str(outgoing.id),
                    "cooldown_until": None,
                }
            if outgoing.last_rejected_at:
                cooldown_until = outgoing.last_rejected_at + timedelta(days=FRIEND_REQUEST_COOLDOWN_DAYS)
                if cooldown_until > _utcnow():
                    return {
                        "friend_request_status": "cooldown",
                        "friend_request_id": str(outgoing.id),
                        "cooldown_until": cooldown_until,
                    }

    incoming = _get_friend_request_row(db, target_id, viewer_id)
    if incoming and incoming.status == FriendRequestStatus.pending:
        return {
            "friend_request_status": "pending_incoming",
            "friend_request_id": str(incoming.id),
            "cooldown_until": None,
        }
    if incoming and incoming.status == FriendRequestStatus.blocked:
        return {
            "friend_request_status": "blocked",
            "friend_request_id": str(incoming.id),
            "cooldown_until": None,
        }

    return {
        "friend_request_status": None,
        "friend_request_id": None,
        "cooldown_until": None,
    }


def serialize_public_user(db: Session, user: User, *, viewer_id: UUID | None = None) -> dict:
    from app.models.entities import Review

    avg_rating = db.scalar(select(func.avg(Review.rating)).where(Review.author_id == user.id))
    review_count = db.scalar(select(func.count(Review.id)).where(Review.author_id == user.id)) or 0
    avatar_url, avatar_preset = public_user_avatar(user)
    is_friend = False
    if viewer_id and viewer_id != user.id:
        is_friend = is_friend_pair(db, viewer_id, user.id)
    request_state = _friend_request_state_for_viewer(db, viewer_id=viewer_id, target_id=user.id)
    return {
        "id": str(user.id),
        "nickname": user.nickname or "Gurme",
        "avatar_url": avatar_url,
        "avatar_preset": avatar_preset,
        "gastro_score": round(float(avg_rating), 1) if avg_rating is not None else None,
        "review_count": int(review_count),
        "is_friend": is_friend,
        **request_state,
    }


def _serialize_friend_request(db: Session, row: FriendRequest, *, viewer_id: UUID) -> dict:
    peer = row.to_user if row.from_user_id == viewer_id else row.from_user
    direction = "outgoing" if row.from_user_id == viewer_id else "incoming"
    return {
        "id": str(row.id),
        "direction": direction,
        "status": row.status.value,
        "created_at": row.created_at,
        "responded_at": row.responded_at,
        "cooldown_until": (
            row.last_rejected_at + timedelta(days=FRIEND_REQUEST_COOLDOWN_DAYS)
            if row.status == FriendRequestStatus.rejected
            and row.rejection_count < 2
            and row.last_rejected_at
            else None
        ),
        "peer": serialize_public_user(db, peer, viewer_id=viewer_id),
    }


def send_friend_request(db: Session, *, user_id: UUID, target_nickname: str) -> dict:
    target = find_user_by_nickname(db, target_nickname)
    if not target or not target.nickname:
        raise UserSocialError("Kullanici bulunamadi.")
    if target.id == user_id:
        raise UserSocialError("Kendinize arkadaslik istegi gonderemezsiniz.")
    if is_friend_pair(db, user_id, target.id):
        raise UserSocialError("Zaten arkadas listenizde.")

    incoming = _get_friend_request_row(db, target.id, user_id)
    if incoming and incoming.status == FriendRequestStatus.pending:
        raise UserSocialError("Bu kullanici size zaten istek gondermis. Gelen isteklerden kabul edebilirsiniz.")

    row = _get_friend_request_row(db, user_id, target.id)
    now = _utcnow()
    if row:
        if row.status == FriendRequestStatus.pending:
            raise UserSocialError("Zaten bekleyen bir isteginiz var.")
        if row.status == FriendRequestStatus.blocked or (
            row.status == FriendRequestStatus.rejected and row.rejection_count >= 2
        ):
            raise UserSocialError("Bu kullaniciya bir daha istek gonderemezsiniz.")
        if row.status == FriendRequestStatus.rejected and row.last_rejected_at:
            cooldown_until = row.last_rejected_at + timedelta(days=FRIEND_REQUEST_COOLDOWN_DAYS)
            if cooldown_until > now:
                days_left = max(1, (cooldown_until.date() - now.date()).days)
                raise UserSocialError(
                    f"Isteginiz reddedildi. {days_left} gun sonra tekrar deneyebilirsiniz."
                )
        row.status = FriendRequestStatus.pending
        row.responded_at = None
        row.created_at = now
    else:
        row = FriendRequest(from_user_id=user_id, to_user_id=target.id, created_at=now)
        db.add(row)

    db.flush()
    sender = db.get(User, user_id)
    if sender and target:
        notify_friend_request(db, recipient=target, actor=sender, request_id=row.id)
    db.commit()
    db.refresh(row)
    return _serialize_friend_request(db, row, viewer_id=user_id)


def add_friend(db: Session, *, user_id: UUID, target_nickname: str) -> dict:
    """Geriye uyumluluk: aninda ekleme yerine istek gonderir."""
    payload = send_friend_request(db, user_id=user_id, target_nickname=target_nickname)
    peer = payload["peer"]
    return {
        "friendship_id": payload["id"],
        "friends_since": payload["created_at"],
        **peer,
    }


def accept_friend_request(db: Session, *, user_id: UUID, request_id: UUID) -> dict:
    row = db.scalar(
        select(FriendRequest)
        .where(FriendRequest.id == request_id)
        .options(selectinload(FriendRequest.from_user), selectinload(FriendRequest.to_user))
    )
    if not row or row.to_user_id != user_id:
        raise UserSocialError("Istek bulunamadi.")
    if row.status != FriendRequestStatus.pending:
        raise UserSocialError("Bu istek artik beklemiyor.")

    now = _utcnow()
    if not is_friend_pair(db, row.from_user_id, row.to_user_id):
        db.add(UserFriendship(user_id=row.from_user_id, friend_user_id=row.to_user_id, created_at=now))
    row.status = FriendRequestStatus.accepted
    row.responded_at = now
    db.flush()

    if row.from_user and row.to_user:
        notify_friend_request_accepted(db, recipient=row.from_user, actor=row.to_user, request_id=row.id)
    db.commit()
    db.refresh(row)
    friendship = db.scalar(
        select(UserFriendship).where(
            UserFriendship.user_id == row.from_user_id,
            UserFriendship.friend_user_id == row.to_user_id,
        )
    )
    peer = row.from_user
    return {
        "friendship_id": str(friendship.id) if friendship else str(row.id),
        "friends_since": friendship.created_at if friendship else now,
        **serialize_public_user(db, peer, viewer_id=user_id),
    }


def reject_friend_request(db: Session, *, user_id: UUID, request_id: UUID) -> dict:
    row = db.scalar(select(FriendRequest).where(FriendRequest.id == request_id))
    if not row or row.to_user_id != user_id:
        raise UserSocialError("Istek bulunamadi.")
    if row.status != FriendRequestStatus.pending:
        raise UserSocialError("Bu istek artik beklemiyor.")

    now = _utcnow()
    row.rejection_count += 1
    row.last_rejected_at = now
    row.responded_at = now
    if row.rejection_count >= 2:
        row.status = FriendRequestStatus.blocked
    else:
        row.status = FriendRequestStatus.rejected
    db.commit()
    db.refresh(row)
    return {"ok": True, "status": row.status.value}


def cancel_friend_request(db: Session, *, user_id: UUID, target_nickname: str) -> None:
    target = find_user_by_nickname(db, target_nickname)
    if not target:
        raise UserSocialError("Kullanici bulunamadi.")
    row = _get_friend_request_row(db, user_id, target.id)
    if not row or row.status != FriendRequestStatus.pending:
        raise UserSocialError("Bekleyen istek bulunamadi.")
    row.status = FriendRequestStatus.cancelled
    row.responded_at = _utcnow()
    db.commit()


def list_friend_requests(db: Session, *, user_id: UUID, limit: int = 50) -> dict:
    rows = db.scalars(
        select(FriendRequest)
        .where(
            FriendRequest.status == FriendRequestStatus.pending,
            or_(FriendRequest.from_user_id == user_id, FriendRequest.to_user_id == user_id),
        )
        .options(selectinload(FriendRequest.from_user), selectinload(FriendRequest.to_user))
        .order_by(FriendRequest.created_at.desc())
        .limit(min(max(limit, 1), 100))
    ).all()
    incoming: list[dict] = []
    outgoing: list[dict] = []
    for row in rows:
        payload = _serialize_friend_request(db, row, viewer_id=user_id)
        if payload["direction"] == "incoming":
            incoming.append(payload)
        else:
            outgoing.append(payload)
    return {
        "incoming": incoming,
        "outgoing": outgoing,
        "total_pending": len(rows),
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
    for from_id, to_id in ((user_id, target.id), (target.id, user_id)):
        req = _get_friend_request_row(db, from_id, to_id)
        if req and req.status == FriendRequestStatus.accepted:
            req.status = FriendRequestStatus.cancelled
            req.responded_at = _utcnow()
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
    if not is_friend_pair(db, user_id, target.id):
        raise UserSocialError("Ozel mesaj icin once arkadas olmalisiniz.")
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
    peer_id = _thread_peer_id(thread, user_id)
    if not is_friend_pair(db, user_id, peer_id):
        raise UserSocialError("Ozel mesaj icin once arkadas olmalisiniz.")
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

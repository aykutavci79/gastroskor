from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import User, UserFriendship, UserNotification
from app.services.user_notification_service import _persist_user_notification, mask_email

ISTANBUL = ZoneInfo("Europe/Istanbul")
EglenceGame = Literal["mini_sudoku", "kelime_yarismasi", "kelime_sofrasi"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _activity_day_key(now: datetime | None = None) -> str:
    instant = now or _utcnow()
    return instant.astimezone(ISTANBUL).strftime("%Y-%m-%d")


def _format_elapsed_ms(ms: int) -> str:
    total_sec = max(0, ms // 1000)
    minutes = total_sec // 60
    seconds = total_sec % 60
    return f"{minutes}:{seconds:02d}"


def _actor_display_name(actor: User) -> str:
    nick = (actor.nickname or "").strip()
    if nick:
        return nick if nick.startswith("@") else f"@{nick}"
    name = (actor.full_name or "").strip()
    if name:
        return name
    return mask_email(actor.email)


def _friend_user_ids(db: Session, user_id: UUID) -> list[UUID]:
    rows = db.scalars(
        select(UserFriendship).where(
            or_(UserFriendship.user_id == user_id, UserFriendship.friend_user_id == user_id)
        )
    ).all()
    peers: list[UUID] = []
    seen: set[UUID] = set()
    for row in rows:
        peer_id = row.friend_user_id if row.user_id == user_id else row.user_id
        if peer_id in seen or peer_id == user_id:
            continue
        seen.add(peer_id)
        peers.append(peer_id)
    return peers


def _already_notified_today(
    db: Session,
    *,
    recipient_id: UUID,
    actor_id: UUID,
    game: str,
    activity_day: str,
) -> bool:
    day_start_local = datetime.strptime(activity_day, "%Y-%m-%d").replace(tzinfo=ISTANBUL)
    day_end_local = day_start_local + timedelta(days=1)
    day_start = day_start_local.astimezone(timezone.utc)
    day_end = day_end_local.astimezone(timezone.utc)
    rows = db.scalars(
        select(UserNotification)
        .where(
            UserNotification.user_id == recipient_id,
            UserNotification.notification_type == "eglence_friend_activity",
            UserNotification.created_at >= day_start,
            UserNotification.created_at < day_end,
        )
        .limit(20)
    ).all()
    actor_key = str(actor_id)
    for row in rows:
        meta = row.metadata_json or {}
        if meta.get("actor_user_id") == actor_key and meta.get("game") == game:
            return True
    return False


def _build_copy(
    *,
    game: EglenceGame,
    actor_label: str,
    elapsed_ms: int | None,
    score: int | None,
) -> tuple[str, str, str, str]:
    if game in ("mini_sudoku", "kelime_sofrasi"):
        if elapsed_ms is None:
            raise ValueError(f"elapsed_ms required for {game}")
        time_label = _format_elapsed_ms(elapsed_ms)
        if game == "mini_sudoku":
            title = "Arkadaşın Sudoku çözdü"
            message = f"{actor_label} Mini Sudoku'yu {time_label} sürede çözdü."
            push_body = f"Mini Sudoku · {time_label}"
            open_path = "/oyun/mini-sudoku"
        else:
            title = "Arkadaşın Kelime Sofrası'nı bitirdi"
            message = f"{actor_label} Kelime Sofrası'nı {time_label} sürede tamamladı."
            push_body = f"Kelime Sofrası · {time_label}"
            open_path = "/oyun/kelime-sofrasi"
        return title, message, push_body, open_path

    if score is None:
        raise ValueError("score required for kelime_yarismasi")
    title = "Arkadaşın kelime yarışması bitirdi"
    message = f"{actor_label} Kelime Yarışması'nda {score} puan yaptı."
    push_body = f"Kelime Yarışması · {score} puan"
    open_path = "/oyun/kelime-yarismasi"
    return title, message, push_body, open_path


def notify_friends_eglence_activity(
    db: Session,
    *,
    actor: User,
    game: EglenceGame,
    elapsed_ms: int | None = None,
    score: int | None = None,
    puzzle_id: str | None = None,
) -> int:
    actor_label = _actor_display_name(actor)
    title, message, push_body, open_path = _build_copy(
        game=game,
        actor_label=actor_label,
        elapsed_ms=elapsed_ms,
        score=score,
    )
    activity_day = _activity_day_key()
    metadata_base = {
        "actor_user_id": str(actor.id),
        "actor_label": actor_label,
        "game": game,
        "activity_day": activity_day,
        "open_path": open_path,
    }
    if puzzle_id:
        metadata_base["puzzle_id"] = puzzle_id
    if elapsed_ms is not None:
        metadata_base["elapsed_ms"] = elapsed_ms
    if score is not None:
        metadata_base["score"] = score

    sent = 0
    for friend_id in _friend_user_ids(db, actor.id):
        if _already_notified_today(
            db,
            recipient_id=friend_id,
            actor_id=actor.id,
            game=game,
            activity_day=activity_day,
        ):
            continue
        _persist_user_notification(
            db,
            recipient_id=friend_id,
            notification_type="eglence_friend_activity",
            title=title,
            message=message,
            metadata=metadata_base,
            push_title=actor_label,
            push_body=push_body,
        )
        sent += 1
    if sent:
        db.commit()
    return sent

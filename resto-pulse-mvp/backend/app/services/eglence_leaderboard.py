from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import User, UserEglenceResult, UserFriendship
from app.services.user_social import serialize_public_user

ISTANBUL = ZoneInfo("Europe/Istanbul")
EglenceGame = Literal["mini_sudoku", "kelime_yarismasi", "kelime_sofrasi"]


def _is_elapsed_game(game: EglenceGame) -> bool:
    return game in ("mini_sudoku", "kelime_sofrasi")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def activity_day_key(now: datetime | None = None) -> str:
    instant = now or _utcnow()
    return instant.astimezone(ISTANBUL).strftime("%Y-%m-%d")


def resolve_period_key(*, game: EglenceGame, puzzle_id: str | None) -> str:
    if _is_elapsed_game(game):
        if not puzzle_id:
            raise ValueError(f"puzzle_id required for {game}")
        return puzzle_id
    return activity_day_key()


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


def _is_better(
    game: EglenceGame,
    *,
    current: UserEglenceResult | None,
    elapsed_ms: int | None,
    score: int | None,
) -> bool:
    if current is None:
        return True
    if _is_elapsed_game(game):
        if elapsed_ms is None:
            return False
        if current.elapsed_ms is None:
            return True
        return elapsed_ms < current.elapsed_ms
    if score is None:
        return False
    if current.score is None:
        return True
    if score > current.score:
        return True
    if score < current.score:
        return False
    if elapsed_ms is None:
        return False
    if current.elapsed_ms is None:
        return True
    return elapsed_ms < current.elapsed_ms


def record_eglence_result(
    db: Session,
    *,
    user: User,
    game: EglenceGame,
    period_key: str,
    elapsed_ms: int | None = None,
    score: int | None = None,
) -> UserEglenceResult | None:
    row = db.scalar(
        select(UserEglenceResult).where(
            UserEglenceResult.user_id == user.id,
            UserEglenceResult.game == game,
            UserEglenceResult.period_key == period_key,
        )
    )
    if not _is_better(game, current=row, elapsed_ms=elapsed_ms, score=score):
        return row

    now = _utcnow()
    if row is None:
        row = UserEglenceResult(
            user_id=user.id,
            game=game,
            period_key=period_key,
            elapsed_ms=elapsed_ms,
            score=score,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.elapsed_ms = elapsed_ms if elapsed_ms is not None else row.elapsed_ms
        row.score = score if score is not None else row.score
        row.updated_at = now
    db.flush()
    return row


def _sort_result_rows(rows: list[UserEglenceResult], game: EglenceGame) -> None:
    if _is_elapsed_game(game):
        rows.sort(key=lambda r: (r.elapsed_ms is None, r.elapsed_ms or 9_999_999))
    else:
        rows.sort(
            key=lambda r: (
                -(r.score or 0),
                r.elapsed_ms is None,
                r.elapsed_ms or 9_999_999,
            )
        )


def _serialize_leaderboard_items(
    db: Session,
    *,
    rows: list[UserEglenceResult],
    viewer_id: UUID | None,
) -> list[dict]:
    if not rows:
        return []
    user_ids = [row.user_id for row in rows]
    users = {
        user.id: user
        for user in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    }
    items: list[dict] = []
    for rank, row in enumerate(rows, start=1):
        user = users.get(row.user_id)
        if not user:
            continue
        items.append(
            {
                "rank": rank,
                "user": serialize_public_user(db, user, viewer_id=viewer_id),
                "elapsed_ms": row.elapsed_ms,
                "score": row.score,
                "is_me": viewer_id is not None and row.user_id == viewer_id,
            }
        )
    return items


def leaderboard_for_friends(
    db: Session,
    *,
    viewer: User,
    game: EglenceGame,
    period_key: str,
) -> list[dict]:
    peer_ids = _friend_user_ids(db, viewer.id)
    user_ids = [viewer.id, *peer_ids]
    if not user_ids:
        return []

    rows = db.scalars(
        select(UserEglenceResult)
        .where(
            UserEglenceResult.game == game,
            UserEglenceResult.period_key == period_key,
            UserEglenceResult.user_id.in_(user_ids),
        )
    ).all()
    _sort_result_rows(rows, game)
    return _serialize_leaderboard_items(db, rows=rows, viewer_id=viewer.id)


def leaderboard_global(
    db: Session,
    *,
    viewer: User | None,
    game: EglenceGame,
    period_key: str,
    limit: int = 50,
) -> list[dict]:
    rows = list(
        db.scalars(
            select(UserEglenceResult).where(
                UserEglenceResult.game == game,
                UserEglenceResult.period_key == period_key,
            )
        ).all()
    )
    _sort_result_rows(rows, game)
    viewer_id = viewer.id if viewer else None
    return _serialize_leaderboard_items(db, rows=rows[:limit], viewer_id=viewer_id)

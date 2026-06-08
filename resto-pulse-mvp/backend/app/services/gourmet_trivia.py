"""Gurme sohbet odalari — BilBakalim trivia botu."""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.gourmet_trivia import (
    ROOM_SLUG_TRIVIA_TAGS,
    TRIVIA_BOT_AVATAR_PRESET,
    TRIVIA_BOT_EMAIL,
    TRIVIA_BOT_NICKNAME,
    TRIVIA_QUESTION_PREFIX,
)
from app.core.config import settings
from app.models.entities import (
    GourmetChatMessage,
    GourmetChatRoom,
    GourmetTriviaQuestion,
    GourmetTriviaRound,
    GourmetTriviaScore,
    User,
)
from app.services.gourmet_chat_assistant import is_assistant_user, normalize_chat_text

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "gourmet_trivia_questions.json"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_trivia_bot_user(user: User | None) -> bool:
    if not user:
        return False
    return (user.email or "").strip().lower() == TRIVIA_BOT_EMAIL


def get_trivia_bot_user(db: Session) -> User:
    email = TRIVIA_BOT_EMAIL
    user = db.scalar(select(User).where(User.email == email))
    if user:
        changed = False
        if user.nickname != TRIVIA_BOT_NICKNAME:
            user.nickname = TRIVIA_BOT_NICKNAME
            changed = True
        if user.full_name != TRIVIA_BOT_NICKNAME:
            user.full_name = TRIVIA_BOT_NICKNAME
            changed = True
        if user.avatar_preset != TRIVIA_BOT_AVATAR_PRESET:
            user.avatar_preset = TRIVIA_BOT_AVATAR_PRESET
            changed = True
        if changed:
            db.add(user)
            db.flush()
        return user

    user = User(
        email=email,
        full_name=TRIVIA_BOT_NICKNAME,
        nickname=TRIVIA_BOT_NICKNAME,
        avatar_preset=TRIVIA_BOT_AVATAR_PRESET,
        role="system",
    )
    db.add(user)
    db.flush()
    return user


def ensure_trivia_questions_seeded(db: Session) -> int:
    count = int(db.scalar(select(func.count()).select_from(GourmetTriviaQuestion)) or 0)
    if count >= 50:
        return count
    if not DATA_PATH.is_file():
        return count
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    added = 0
    for row in raw:
        text = (row.get("text") or "").strip()
        answers = row.get("answers") or []
        if not text or not answers:
            continue
        exists = db.scalar(select(GourmetTriviaQuestion.id).where(GourmetTriviaQuestion.question_text == text))
        if exists:
            continue
        db.add(
            GourmetTriviaQuestion(
                question_text=text,
                answers_json=[str(a).strip() for a in answers if str(a).strip()],
                room_tag=(row.get("room_tag") or None),
            )
        )
        added += 1
    if added:
        db.commit()
    return int(db.scalar(select(func.count()).select_from(GourmetTriviaQuestion)) or 0)


def normalize_guess(text: str) -> str:
    return normalize_chat_text(text)


def answer_matches(guess: str, accepted: list[str]) -> bool:
    norm_guess = normalize_guess(guess)
    if len(norm_guess) < 2 or len(norm_guess) > 80:
        return False
    for raw in accepted:
        norm_answer = normalize_guess(str(raw))
        if not norm_answer:
            continue
        if norm_guess == norm_answer:
            return True
        if len(norm_answer) >= 4 and norm_answer in norm_guess:
            return True
        if len(norm_guess) >= 4 and norm_guess in norm_answer:
            return True
    return False


def _post_bot_message(
    db: Session,
    *,
    room: GourmetChatRoom,
    city: str,
    body: str,
    mention_user: User | None = None,
) -> GourmetChatMessage:
    bot = get_trivia_bot_user(db)
    mentions: list[str] = []
    if mention_user and mention_user.nickname:
        body = f"@{mention_user.nickname} {body}"
        mentions = [str(mention_user.id)]
    row = GourmetChatMessage(
        room_id=room.id,
        author_id=bot.id,
        city=city,
        body=body,
        mentions_json=mentions,
    )
    db.add(row)
    db.flush()
    row.room = room
    row.author = bot
    return row


def _increment_score(db: Session, *, user_id: UUID, room_id: UUID, city: str) -> None:
    row = db.scalar(
        select(GourmetTriviaScore).where(
            GourmetTriviaScore.user_id == user_id,
            GourmetTriviaScore.room_id == room_id,
            GourmetTriviaScore.city == city,
        )
    )
    now = _utcnow()
    if row is None:
        row = GourmetTriviaScore(user_id=user_id, room_id=room_id, city=city, correct_count=1, last_correct_at=now)
        db.add(row)
    else:
        row.correct_count = int(row.correct_count or 0) + 1
        row.last_correct_at = now
        db.add(row)


def _pick_question(db: Session, *, room: GourmetChatRoom, city: str) -> GourmetTriviaQuestion | None:
    tags = ROOM_SLUG_TRIVIA_TAGS.get(room.slug, ("genel",))
    recent_ids = {
        row
        for row in db.scalars(
            select(GourmetTriviaRound.question_id)
            .where(GourmetTriviaRound.room_id == room.id, GourmetTriviaRound.city == city)
            .order_by(GourmetTriviaRound.opened_at.desc())
            .limit(30)
        ).all()
    }
    stmt = select(GourmetTriviaQuestion).where(GourmetTriviaQuestion.is_active.is_(True))
    candidates = list(db.scalars(stmt).all())
    if not candidates:
        return None
    tagged = [q for q in candidates if q.room_tag in tags or q.room_tag is None or q.room_tag == "genel"]
    pool = tagged or candidates
    fresh = [q for q in pool if q.id not in recent_ids]
    pick_from = fresh or pool
    return random.choice(pick_from)


def open_trivia_round(
    db: Session,
    *,
    room: GourmetChatRoom,
    city: str,
    force: bool = False,
    commit: bool = True,
) -> GourmetTriviaRound | None:
    if not settings.gourmet_trivia_enabled:
        return None
    ensure_trivia_questions_seeded(db)
    open_round = db.scalar(
        select(GourmetTriviaRound).where(
            GourmetTriviaRound.room_id == room.id,
            GourmetTriviaRound.city == city,
            GourmetTriviaRound.status == "open",
        )
    )
    if open_round:
        return None

    if not force:
        last_closed = db.scalar(
            select(GourmetTriviaRound.closed_at)
            .where(
                GourmetTriviaRound.room_id == room.id,
                GourmetTriviaRound.city == city,
                GourmetTriviaRound.closed_at.is_not(None),
            )
            .order_by(GourmetTriviaRound.closed_at.desc())
            .limit(1)
        )
        if last_closed and (_utcnow() - last_closed).total_seconds() < settings.gourmet_trivia_interval_sec:
            return None

    question = _pick_question(db, room=room, city=city)
    if not question:
        return None

    now = _utcnow()
    expires = now + timedelta(seconds=settings.gourmet_trivia_answer_window_sec)
    msg = _post_bot_message(db, room=room, city=city, body=f"{TRIVIA_QUESTION_PREFIX}{question.question_text}")
    round_row = GourmetTriviaRound(
        room_id=room.id,
        city=city,
        question_id=question.id,
        status="open",
        question_message_id=msg.id,
        opened_at=now,
        expires_at=expires,
    )
    db.add(round_row)
    if commit:
        db.commit()
    else:
        db.flush()
    return round_row


def expire_open_rounds(db: Session, *, chain_next: bool = True) -> int:
    if not settings.gourmet_trivia_enabled:
        return 0
    now = _utcnow()
    rows = list(
        db.scalars(
            select(GourmetTriviaRound).where(
                GourmetTriviaRound.status == "open",
                GourmetTriviaRound.expires_at <= now,
            )
        ).all()
    )
    expired = 0
    chain_targets: list[tuple[GourmetChatRoom, str]] = []
    for round_row in rows:
        room = db.get(GourmetChatRoom, round_row.room_id)
        question = db.get(GourmetTriviaQuestion, round_row.question_id)
        if not room or not question:
            round_row.status = "expired"
            round_row.closed_at = now
            db.add(round_row)
            expired += 1
            continue
        primary = (question.answers_json or ["?"])[0]
        _post_bot_message(
            db,
            room=room,
            city=round_row.city,
            body=f"Kimse bilemedi. Cevap: {primary}",
        )
        round_row.status = "expired"
        round_row.closed_at = now
        db.add(round_row)
        chain_targets.append((room, round_row.city))
        expired += 1
    if expired:
        db.flush()
        if chain_next:
            for room, city in chain_targets:
                open_trivia_round(db, room=room, city=city, force=True, commit=False)
        db.commit()
    return expired


def try_process_trivia_answer(
    db: Session,
    *,
    room: GourmetChatRoom,
    city: str,
    user: User,
    message_body: str,
) -> bool:
    if not settings.gourmet_trivia_enabled:
        return False
    if is_trivia_bot_user(user) or is_assistant_user(user):
        return False
    if message_body.strip().startswith(TRIVIA_QUESTION_PREFIX):
        return False

    round_row = db.scalar(
        select(GourmetTriviaRound)
        .where(
            GourmetTriviaRound.room_id == room.id,
            GourmetTriviaRound.city == city,
            GourmetTriviaRound.status == "open",
        )
        .order_by(GourmetTriviaRound.opened_at.desc())
        .limit(1)
    )
    if not round_row:
        return False

    question = db.get(GourmetTriviaQuestion, round_row.question_id)
    if not question:
        return False

    answers = question.answers_json if isinstance(question.answers_json, list) else []
    if not answer_matches(message_body, [str(a) for a in answers]):
        return False

    now = _utcnow()
    round_row.status = "won"
    round_row.winner_user_id = user.id
    round_row.closed_at = now
    db.add(round_row)
    _increment_score(db, user_id=user.id, room_id=room.id, city=city)
    _post_bot_message(
        db,
        room=room,
        city=city,
        body="tebrikler, doğru! (+1 puan)",
        mention_user=user,
    )
    open_trivia_round(db, room=room, city=city, force=True, commit=False)
    return True


def process_trivia_tick(db: Session, *, room: GourmetChatRoom | None = None, city: str = "Bursa") -> dict:
    if not settings.gourmet_trivia_enabled:
        return {"enabled": False}
    ensure_trivia_questions_seeded(db)
    expired = expire_open_rounds(db)
    opened = 0
    rooms = [room] if room else list(db.scalars(select(GourmetChatRoom).order_by(GourmetChatRoom.sort_order)).all())
    for item in rooms:
        if open_trivia_round(db, room=item, city=city):
            opened += 1
    return {"expired": expired, "opened": opened}


def leaderboard_for_room(db: Session, *, room_slug: str, city: str, limit: int = 10) -> list[dict]:
    room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
    if not room:
        return []
    rows = db.scalars(
        select(GourmetTriviaScore)
        .where(GourmetTriviaScore.room_id == room.id, GourmetTriviaScore.city == city)
        .options(selectinload_score_user())
        .order_by(GourmetTriviaScore.correct_count.desc(), GourmetTriviaScore.last_correct_at.asc())
        .limit(min(max(limit, 1), 20))
    ).all()
    out: list[dict] = []
    for row in rows:
        nickname = row.user.nickname if row.user else "Gurme"
        out.append(
            {
                "nickname": nickname,
                "correct_count": int(row.correct_count or 0),
                "last_correct_at": row.last_correct_at.isoformat() if row.last_correct_at else None,
            }
        )
    return out


def selectinload_score_user():
    from sqlalchemy.orm import selectinload

    return selectinload(GourmetTriviaScore.user)

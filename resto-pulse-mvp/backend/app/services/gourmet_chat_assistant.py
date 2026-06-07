"""Gurme Sohbetler — GastroSkor Asistan (sablon + DB; opsiyonel Gemini tonu)."""

from __future__ import annotations

import random
import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.constants.gourmet_chat_assistant import (
    ASSISTANT_AVATAR_PRESET,
    ASSISTANT_NICKNAME,
    ASSISTANT_PERSONALITY_SYSTEM,
    ASSISTANT_USER_EMAIL,
    GENERAL_REPLY_TEMPLATES,
    GREETING_PHRASES,
    GREETING_REPLY_TEMPLATES,
    GREETING_TOKENS,
    RESTAURANT_ASK_KEYWORDS,
    RESTAURANT_EMPTY_TEMPLATES,
    RESTAURANT_FOOTER_TEMPLATES,
    RESTAURANT_INTRO_TEMPLATES,
    ROOM_SEARCH_HINTS,
    ROOM_TOPIC_PROMPT,
    THANKS_KEYWORDS,
)
from app.core.config import settings
from app.integrations.gemini_client import gemini_text_prompt
from app.models.entities import (
    GourmetChatAssistantJob,
    GourmetChatMessage,
    GourmetChatRoom,
    GourmetChatRoomAssistantState,
    PlatformName,
    Restaurant,
    RestaurantPlatformProfile,
    Review,
    User,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_assistant_user(user: User | None) -> bool:
    if not user:
        return False
    return (user.email or "").strip().lower() == ASSISTANT_USER_EMAIL


def normalize_chat_text(text: str) -> str:
    lowered = unicodedata.normalize("NFKC", text.strip().lower())
    lowered = re.sub(r"[^\w\s]", " ", lowered, flags=re.UNICODE)
    return re.sub(r"\s+", " ", lowered).strip()


def is_thanks_message(text: str) -> bool:
    norm = normalize_chat_text(text)
    if not norm:
        return False
    return any(token in norm for token in THANKS_KEYWORDS)


def is_greeting_only(text: str) -> bool:
    norm = normalize_chat_text(text)
    if not norm or len(norm) > 48:
        return False
    if norm in GREETING_PHRASES:
        return True
    words = norm.split()
    return bool(words) and all(word in GREETING_TOKENS for word in words)


def is_restaurant_ask(text: str, room_slug: str) -> bool:
    norm = normalize_chat_text(text)
    if not norm:
        return False
    if any(keyword in norm for keyword in RESTAURANT_ASK_KEYWORDS):
        return True
    hints = ROOM_SEARCH_HINTS.get(room_slug, ())
    return any(hint in norm for hint in hints)


def classify_message_intent(text: str, *, room_slug: str) -> str | None:
    """None = cevap planlama (tesekkur vb.)."""
    if is_thanks_message(text):
        return None
    if is_restaurant_ask(text, room_slug):
        return "restaurant"
    if is_greeting_only(text):
        return "greeting"
    if len(normalize_chat_text(text)) >= 2:
        return "general"
    return None


def get_assistant_user(db: Session) -> User:
    email = ASSISTANT_USER_EMAIL
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(
        email=email,
        full_name=ASSISTANT_NICKNAME,
        nickname=ASSISTANT_NICKNAME,
        avatar_preset=ASSISTANT_AVATAR_PRESET,
        avatar_url=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _room_state(db: Session, *, room_id: uuid.UUID, city: str) -> GourmetChatRoomAssistantState:
    row = db.scalar(
        select(GourmetChatRoomAssistantState).where(
            GourmetChatRoomAssistantState.room_id == room_id,
            GourmetChatRoomAssistantState.city == city,
        )
    )
    if row:
        return row
    row = GourmetChatRoomAssistantState(room_id=room_id, city=city, muted_until=None)
    db.add(row)
    db.flush()
    return row


def _set_room_muted(db: Session, *, room_id: uuid.UUID, city: str, seconds: int) -> None:
    state = _room_state(db, room_id=room_id, city=city)
    state.muted_until = _utcnow() + timedelta(seconds=seconds)
    db.add(state)


def _is_room_muted(db: Session, *, room_id: uuid.UUID, city: str) -> bool:
    state = db.scalar(
        select(GourmetChatRoomAssistantState).where(
            GourmetChatRoomAssistantState.room_id == room_id,
            GourmetChatRoomAssistantState.city == city,
        )
    )
    if not state or not state.muted_until:
        return False
    muted_until = state.muted_until
    if muted_until.tzinfo is None:
        muted_until = muted_until.replace(tzinfo=timezone.utc)
    return muted_until > _utcnow()


def _cancel_pending_jobs(db: Session, *, room_id: uuid.UUID, city: str) -> int:
    result = db.execute(
        update(GourmetChatAssistantJob)
        .where(
            GourmetChatAssistantJob.room_id == room_id,
            GourmetChatAssistantJob.city == city,
            GourmetChatAssistantJob.status == "pending",
        )
        .values(status="cancelled")
    )
    return int(result.rowcount or 0)


def _distinct_recent_humans(
    db: Session,
    *,
    room_id: uuid.UUID,
    city: str,
    assistant_id: uuid.UUID,
    since: datetime,
    exclude_user_id: uuid.UUID | None = None,
) -> set[uuid.UUID]:
    rows = db.scalars(
        select(GourmetChatMessage.author_id)
        .where(
            GourmetChatMessage.room_id == room_id,
            GourmetChatMessage.city == city,
            GourmetChatMessage.created_at >= since,
            GourmetChatMessage.author_id != assistant_id,
        )
        .distinct()
    ).all()
    authors = set(rows)
    if exclude_user_id:
        authors.discard(exclude_user_id)
    return authors


def _room_message_count_since(
    db: Session, *, room_id: uuid.UUID, city: str, since: datetime
) -> int:
    return int(
        db.scalar(
            select(func.count(GourmetChatMessage.id)).where(
                GourmetChatMessage.room_id == room_id,
                GourmetChatMessage.city == city,
                GourmetChatMessage.created_at >= since,
            )
        )
        or 0
    )


def _assistant_messages_in_room_since(
    db: Session, *, room_id: uuid.UUID, city: str, assistant_id: uuid.UUID, since: datetime
) -> int:
    return int(
        db.scalar(
            select(func.count(GourmetChatMessage.id)).where(
                GourmetChatMessage.room_id == room_id,
                GourmetChatMessage.city == city,
                GourmetChatMessage.author_id == assistant_id,
                GourmetChatMessage.created_at >= since,
            )
        )
        or 0
    )


def _assistant_messages_for_user_since(
    db: Session,
    *,
    room_id: uuid.UUID,
    city: str,
    assistant_id: uuid.UUID,
    trigger_user_id: uuid.UUID,
    since: datetime,
) -> int:
    """Kullaniciya yonelik cevap sayisi — tetikleyen mesajdan sonra gelen asistan mesajlari."""
    trigger_rows = db.scalars(
        select(GourmetChatMessage.id).where(
            GourmetChatMessage.room_id == room_id,
            GourmetChatMessage.city == city,
            GourmetChatMessage.author_id == trigger_user_id,
            GourmetChatMessage.created_at >= since,
        )
    ).all()
    if not trigger_rows:
        return 0
    return int(
        db.scalar(
            select(func.count(GourmetChatMessage.id)).where(
                GourmetChatMessage.room_id == room_id,
                GourmetChatMessage.city == city,
                GourmetChatMessage.author_id == assistant_id,
                GourmetChatMessage.created_at >= since,
            )
        )
        or 0
    )


def _human_replied_after(
    db: Session,
    *,
    room_id: uuid.UUID,
    city: str,
    after_message: GourmetChatMessage,
    assistant_id: uuid.UUID,
    trigger_user_id: uuid.UUID,
) -> bool:
    """Baska bir insan (tetikleyen disinda) mesaj yazdi mi?"""
    created_at = after_message.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    stmt = (
        select(func.count(GourmetChatMessage.id))
        .where(
            GourmetChatMessage.room_id == room_id,
            GourmetChatMessage.city == city,
            GourmetChatMessage.created_at > created_at,
            GourmetChatMessage.author_id.not_in([assistant_id, trigger_user_id]),
        )
    )
    return int(db.scalar(stmt) or 0) > 0


def _schedule_job(
    db: Session,
    *,
    room: GourmetChatRoom,
    city: str,
    trigger_user: User,
    trigger_message: GourmetChatMessage,
    job_kind: str,
    intent: str,
    delay_seconds: int,
) -> GourmetChatAssistantJob | None:
    db.execute(
        update(GourmetChatAssistantJob)
        .where(
            GourmetChatAssistantJob.room_id == room.id,
            GourmetChatAssistantJob.city == city,
            GourmetChatAssistantJob.trigger_user_id == trigger_user.id,
            GourmetChatAssistantJob.status == "pending",
        )
        .values(status="cancelled")
    )
    job = GourmetChatAssistantJob(
        room_id=room.id,
        city=city,
        trigger_user_id=trigger_user.id,
        trigger_message_id=trigger_message.id,
        job_kind=job_kind,
        intent=intent,
        run_at=_utcnow() + timedelta(seconds=delay_seconds),
        status="pending",
    )
    db.add(job)
    db.flush()
    return job


def fetch_restaurant_suggestions(
    db: Session, *, city: str, room_slug: str, limit: int = 3
) -> list[dict]:
    hints = ROOM_SEARCH_HINTS.get(room_slug, ())
    stmt = (
        select(
            Restaurant,
            RestaurantPlatformProfile.avg_rating,
            RestaurantPlatformProfile.review_count,
        )
        .outerjoin(
            RestaurantPlatformProfile,
            (RestaurantPlatformProfile.restaurant_id == Restaurant.id)
            & (RestaurantPlatformProfile.platform == PlatformName.google_maps),
        )
        .where(Restaurant.is_active.is_(True))
    )
    if city:
        stmt = stmt.where(Restaurant.city.ilike(f"%{city}%"))
    rows = db.execute(stmt.limit(120)).all()

    candidates: list[tuple[float, int, Restaurant, float | None]] = []
    for restaurant, google_avg, google_reviews in rows:
        gs_avg = db.scalar(
            select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant.id)
        )
        rating = float(gs_avg) if gs_avg is not None else (float(google_avg) if google_avg else 0.0)
        if rating and rating < 4.0:
            continue
        review_count = int(
            db.scalar(select(func.count(Review.id)).where(Review.restaurant_id == restaurant.id)) or 0
        )
        if review_count == 0:
            review_count = int(google_reviews or 0)
        if review_count == 0:
            continue

        haystack = " ".join(
            filter(
                None,
                [
                    (restaurant.name or "").lower(),
                    (restaurant.category or "").lower(),
                    (restaurant.district or "").lower(),
                ],
            )
        )
        hint_bonus = 1.0 if hints and any(h in haystack for h in hints) else 0.0
        score = rating * 2.0 + min(review_count, 50) * 0.02 + hint_bonus
        candidates.append((score, review_count, restaurant, rating))

    candidates.sort(key=lambda item: (-item[0], -item[1]))
    picked: list[dict] = []
    seen_names: set[str] = set()
    for _score, _reviews, restaurant, rating in candidates:
        name_key = restaurant.name.strip().lower()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)
        picked.append(
            {
                "name": restaurant.name,
                "district": restaurant.district,
                "rating": round(rating, 1) if rating else None,
            }
        )
        if len(picked) >= limit:
            break
    return picked


def _format_greeting_body(*, nickname: str | None, room_slug: str) -> str:
    nick = nickname or "Gurme"
    topic = ROOM_TOPIC_PROMPT.get(room_slug, "Ne yemek istersin?")
    template = random.choice(GREETING_REPLY_TEMPLATES)
    return template.format(nick=nick, topic=topic)


def _format_restaurant_body(*, suggestions: list[dict], room_slug: str, nickname: str | None) -> str:
    nick = nickname or "Gurme"
    topic = ROOM_TOPIC_PROMPT.get(room_slug, "Mekan aramana yardim edebilirim.")
    if not suggestions:
        template = random.choice(RESTAURANT_EMPTY_TEMPLATES)
        return template.format(nick=nick, topic=topic)
    intro = random.choice(RESTAURANT_INTRO_TEMPLATES).format(nick=nick)
    lines = [intro]
    for index, item in enumerate(suggestions, start=1):
        rating = f" — {item['rating']} puan" if item.get("rating") else ""
        district = f" ({item['district']})" if item.get("district") else ""
        lines.append(f"{index}. {item['name']}{district}{rating}")
    lines.append(random.choice(RESTAURANT_FOOTER_TEMPLATES))
    return "\n".join(lines)


def _format_general_body(*, room_slug: str, nickname: str | None) -> str:
    nick = nickname or "Gurme"
    topic = ROOM_TOPIC_PROMPT.get(room_slug, "Yemek sohbeti")
    template = random.choice(GENERAL_REPLY_TEMPLATES)
    return template.format(nick=nick, topic=topic)


def _polish_reply_with_gemini(
    *,
    draft: str,
    user_message: str,
    intent: str,
    nickname: str | None,
) -> str:
    if not settings.gourmet_assistant_gemini_personality or not settings.gemini_api_key:
        return draft
    nick = nickname or "Gurme"
    prompt = (
        f"Kullanici ({nick}) soyledi: {user_message[:240]}\n"
        f"Niyet: {intent}\n"
        f"Taslak cevabin (samimilesir, hafif espirili yap; mekan isimleri ve puanlari AYNEN koru):\n{draft}"
    )
    polished = gemini_text_prompt(
        system=ASSISTANT_PERSONALITY_SYSTEM,
        user=prompt,
        temperature=0.88,
        max_output_tokens=220,
    )
    if not polished or len(polished) < 12:
        return draft
    return polished[:800]


def build_assistant_reply(
    db: Session,
    *,
    job: GourmetChatAssistantJob,
    room: GourmetChatRoom,
    trigger_user: User,
    trigger_message_body: str,
) -> str:
    nickname = trigger_user.nickname
    if job.job_kind == "greeting" or job.intent == "greeting":
        draft = _format_greeting_body(nickname=nickname, room_slug=room.slug)
    elif job.intent == "restaurant":
        suggestions = fetch_restaurant_suggestions(db, city=job.city, room_slug=room.slug)
        draft = _format_restaurant_body(
            suggestions=suggestions,
            room_slug=room.slug,
            nickname=nickname,
        )
    else:
        draft = _format_general_body(room_slug=room.slug, nickname=nickname)

    return _polish_reply_with_gemini(
        draft=draft,
        user_message=trigger_message_body,
        intent=job.intent,
        nickname=nickname,
    )


def post_assistant_message(
    db: Session, *, room: GourmetChatRoom, city: str, body: str
) -> GourmetChatMessage:
    bot = get_assistant_user(db)
    row = GourmetChatMessage(
        room_id=room.id,
        author_id=bot.id,
        city=city,
        body=body[:800],
        mentions_json=[],
    )
    db.add(row)
    db.flush()
    row.room = room
    row.author = bot
    return row


def handle_human_chat_message(
    db: Session,
    *,
    room: GourmetChatRoom,
    city: str,
    user: User,
    message: GourmetChatMessage,
) -> None:
    if not settings.gourmet_assistant_enabled:
        return
    if is_assistant_user(user):
        return

    assistant = get_assistant_user(db)
    _cancel_pending_jobs(db, room_id=room.id, city=city)

    recent_window = _utcnow() - timedelta(minutes=10)
    other_humans = _distinct_recent_humans(
        db,
        room_id=room.id,
        city=city,
        assistant_id=assistant.id,
        since=recent_window,
    )
    if len(other_humans) >= 2 or (other_humans and user.id not in other_humans):
        _set_room_muted(
            db,
            room_id=room.id,
            city=city,
            seconds=settings.gourmet_assistant_room_cooldown_sec,
        )
        db.commit()
        return

    if _is_room_muted(db, room_id=room.id, city=city):
        db.commit()
        return

    hour_ago = _utcnow() - timedelta(hours=1)
    if _room_message_count_since(db, room_id=room.id, city=city, since=hour_ago) >= settings.gourmet_assistant_room_max_msg_per_hour:
        db.commit()
        return

    intent = classify_message_intent(message.body, room_slug=room.slug)
    if intent is None:
        db.commit()
        return

    day_start = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if _assistant_messages_for_user_since(
        db,
        room_id=room.id,
        city=city,
        assistant_id=assistant.id,
        trigger_user_id=user.id,
        since=day_start,
    ) >= settings.gourmet_assistant_max_per_user_day:
        db.commit()
        return

    if intent == "greeting":
        _schedule_job(
            db,
            room=room,
            city=city,
            trigger_user=user,
            trigger_message=message,
            job_kind="greeting",
            intent="greeting",
            delay_seconds=settings.gourmet_assistant_greeting_delay_sec,
        )
    else:
        _schedule_job(
            db,
            room=room,
            city=city,
            trigger_user=user,
            trigger_message=message,
            job_kind="followup",
            intent=intent,
            delay_seconds=settings.gourmet_assistant_followup_delay_sec,
        )
    db.commit()


def _message_created_at_utc(message: GourmetChatMessage) -> datetime:
    created_at = message.created_at
    if created_at.tzinfo is None:
        return created_at.replace(tzinfo=timezone.utc)
    return created_at


def _bot_replied_after_message(
    db: Session,
    *,
    room_id: uuid.UUID,
    city: str,
    assistant_id: uuid.UUID,
    after_at: datetime,
) -> bool:
    return (
        db.scalar(
            select(func.count(GourmetChatMessage.id)).where(
                GourmetChatMessage.room_id == room_id,
                GourmetChatMessage.city == city,
                GourmetChatMessage.author_id == assistant_id,
                GourmetChatMessage.created_at > after_at,
            )
        )
        or 0
    ) > 0


def recover_stale_for_room(db: Session, *, room: GourmetChatRoom, city: str) -> bool:
    """Job olusmamis veya islenmemis eski mesajlara cevap ver (deploy oncesi selam vb.)."""
    if not settings.gourmet_assistant_enabled:
        return False
    if _is_room_muted(db, room_id=room.id, city=city):
        return False

    assistant = get_assistant_user(db)
    now = _utcnow()
    hour_ago = now - timedelta(hours=1)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if _room_message_count_since(db, room_id=room.id, city=city, since=hour_ago) >= settings.gourmet_assistant_room_max_msg_per_hour:
        return False
    if _assistant_messages_in_room_since(
        db, room_id=room.id, city=city, assistant_id=assistant.id, since=hour_ago
    ) >= settings.gourmet_assistant_max_per_room_hour:
        return False

    rows = db.scalars(
        select(GourmetChatMessage)
        .where(
            GourmetChatMessage.room_id == room.id,
            GourmetChatMessage.city == city,
            GourmetChatMessage.author_id != assistant.id,
        )
        .order_by(GourmetChatMessage.created_at.desc())
        .limit(15)
    ).all()

    for message in rows:
        trigger_user = db.get(User, message.author_id)
        if not trigger_user or is_assistant_user(trigger_user):
            continue

        intent = classify_message_intent(message.body, room_slug=room.slug)
        if intent is None:
            continue

        delay_seconds = (
            settings.gourmet_assistant_greeting_delay_sec
            if intent == "greeting"
            else settings.gourmet_assistant_followup_delay_sec
        )
        msg_at = _message_created_at_utc(message)
        if msg_at + timedelta(seconds=delay_seconds) > now:
            continue

        if _assistant_messages_for_user_since(
            db,
            room_id=room.id,
            city=city,
            assistant_id=assistant.id,
            trigger_user_id=trigger_user.id,
            since=day_start,
        ) >= settings.gourmet_assistant_max_per_user_day:
            continue

        if _human_replied_after(
            db,
            room_id=room.id,
            city=city,
            after_message=message,
            assistant_id=assistant.id,
            trigger_user_id=trigger_user.id,
        ):
            continue

        if _bot_replied_after_message(
            db,
            room_id=room.id,
            city=city,
            assistant_id=assistant.id,
            after_at=msg_at,
        ):
            continue

        existing_job = db.scalar(
            select(GourmetChatAssistantJob).where(
                GourmetChatAssistantJob.trigger_message_id == message.id,
                GourmetChatAssistantJob.status.in_(("pending", "done")),
            )
        )
        if existing_job:
            continue

        job = GourmetChatAssistantJob(
            room_id=room.id,
            city=city,
            trigger_user_id=trigger_user.id,
            trigger_message_id=message.id,
            job_kind="greeting" if intent == "greeting" else "followup",
            intent=intent,
            run_at=now,
            status="pending",
        )
        body = build_assistant_reply(
            db,
            job=job,
            room=room,
            trigger_user=trigger_user,
            trigger_message_body=message.body,
        )
        post_assistant_message(db, room=room, city=city, body=body)
        job.status = "done"
        db.add(job)
        db.commit()
        return True

    return False


def process_due_assistant_jobs(db: Session, *, limit: int = 20) -> dict[str, int]:
    if not settings.gourmet_assistant_enabled:
        return {"processed": 0, "posted": 0, "skipped": 0, "cancelled": 0}

    assistant = get_assistant_user(db)
    now = _utcnow()
    jobs = db.scalars(
        select(GourmetChatAssistantJob)
        .where(
            GourmetChatAssistantJob.status == "pending",
            GourmetChatAssistantJob.run_at <= now,
        )
        .order_by(GourmetChatAssistantJob.run_at.asc())
        .limit(limit)
    ).all()

    stats = {"processed": 0, "posted": 0, "skipped": 0, "cancelled": 0}
    hour_ago = now - timedelta(hours=1)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    for job in jobs:
        stats["processed"] += 1
        job.status = "skipped"

        if _is_room_muted(db, room_id=job.room_id, city=job.city):
            stats["skipped"] += 1
            db.add(job)
            continue

        room = db.get(GourmetChatRoom, job.room_id)
        trigger_user = db.get(User, job.trigger_user_id)
        trigger_message = db.get(GourmetChatMessage, job.trigger_message_id)
        if not room or not trigger_user or not trigger_message:
            stats["skipped"] += 1
            db.add(job)
            continue

        if _room_message_count_since(db, room_id=job.room_id, city=job.city, since=hour_ago) >= settings.gourmet_assistant_room_max_msg_per_hour:
            stats["skipped"] += 1
            db.add(job)
            continue

        if _assistant_messages_in_room_since(
            db, room_id=job.room_id, city=job.city, assistant_id=assistant.id, since=hour_ago
        ) >= settings.gourmet_assistant_max_per_room_hour:
            stats["skipped"] += 1
            db.add(job)
            continue

        if _assistant_messages_for_user_since(
            db,
            room_id=job.room_id,
            city=job.city,
            assistant_id=assistant.id,
            trigger_user_id=job.trigger_user_id,
            since=day_start,
        ) >= settings.gourmet_assistant_max_per_user_day:
            stats["skipped"] += 1
            db.add(job)
            continue

        if _human_replied_after(
            db,
            room_id=job.room_id,
            city=job.city,
            after_message=trigger_message,
            assistant_id=assistant.id,
            trigger_user_id=job.trigger_user_id,
        ):
            _set_room_muted(
                db,
                room_id=job.room_id,
                city=job.city,
                seconds=settings.gourmet_assistant_room_cooldown_sec,
            )
            job.status = "cancelled"
            stats["cancelled"] += 1
            db.add(job)
            continue

        body = build_assistant_reply(
            db,
            job=job,
            room=room,
            trigger_user=trigger_user,
            trigger_message_body=trigger_message.body,
        )
        post_assistant_message(db, room=room, city=job.city, body=body)
        job.status = "done"
        stats["posted"] += 1
        db.add(job)

    db.commit()
    return stats

"""Gurme Sohbetler — is kurallari ve serilestirme."""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.constants.gourmet_chat import (
    ALLOWED_QUESTION_TAGS,
    ANSWER_BODY_MAX,
    GOURMET_CHAT_CITY_KEYS,
    GOURMET_QUESTION_TAGS,
    MESSAGE_BODY_MAX,
    QUESTION_BODY_MAX,
)
from app.models.entities import (
    GourmetChatAnswer,
    GourmetChatMessage,
    GourmetChatQuestion,
    GourmetChatRoom,
    User,
)
from app.services.city_resolver import normalize_city_key, resolve_city_name
from app.services.gourmet_profile import public_user_avatar, nickname_identity_key
from app.services.gourmet_chat_assistant import handle_human_chat_message, is_assistant_user
from app.services.review_moderation import check_review_text
from app.services.user_notification_service import notify_gourmet_chat_mention

MENTION_PATTERN = re.compile(
    r"@([a-zA-Z0-9_\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]{2,23})"
)


class GourmetChatError(Exception):
    def __init__(self, message: str, *, highlights: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.highlights = highlights or []


def list_question_tags() -> list[tuple[str, str]]:
    return list(GOURMET_QUESTION_TAGS)


def resolve_gourmet_city(city: str) -> str:
    resolved = resolve_city_name(city)
    key = normalize_city_key(resolved)
    if key not in GOURMET_CHAT_CITY_KEYS:
        raise GourmetChatError("Su an yalnizca Bursa destekleniyor.")
    return "Bursa"


def normalize_tag(tag: str | None) -> str:
    value = (tag or "genel").strip().lower()
    if value not in ALLOWED_QUESTION_TAGS:
        raise GourmetChatError("Gecersiz etiket.")
    return value


def validate_body(text: str, *, max_len: int) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise GourmetChatError("Mesaj bos olamaz.")
    if len(cleaned) > max_len:
        raise GourmetChatError(f"Mesaj en fazla {max_len} karakter olabilir.")
    violation = check_review_text(cleaned)
    if violation:
        raise GourmetChatError(violation.message, highlights=violation.highlights)
    return cleaned


def serialize_author(user: User | None) -> dict:
    if not user or not user.nickname:
        return {"nickname": "Gurme", "avatar_url": None, "avatar_preset": None, "is_assistant": False}
    avatar_url, avatar_preset = public_user_avatar(user)
    return {
        "nickname": user.nickname,
        "avatar_url": avatar_url,
        "avatar_preset": avatar_preset,
        "is_assistant": is_assistant_user(user),
    }


def serialize_answer(row: GourmetChatAnswer) -> dict:
    return {
        "id": str(row.id),
        "body": row.body,
        "author": serialize_author(row.author),
        "created_at": row.created_at,
    }


def serialize_question(
    row: GourmetChatQuestion,
    *,
    include_answers: bool = False,
    preview_limit: int = 0,
) -> dict:
    preview: list[dict] = []
    answers: list[dict] = []
    if row.answers:
        ordered = sorted(row.answers, key=lambda item: item.created_at)
        if include_answers:
            answers = [serialize_answer(item) for item in ordered]
        elif preview_limit > 0:
            preview = [serialize_answer(item) for item in ordered[-preview_limit:]]

    return {
        "id": str(row.id),
        "room_slug": row.room.slug if row.room else "",
        "city": row.city,
        "tag": row.tag,
        "body": row.body,
        "answer_count": row.answer_count,
        "author": serialize_author(row.author),
        "created_at": row.created_at,
        "preview_answers": preview,
        "answers": answers,
    }


def list_rooms(db: Session, *, city: str) -> list[dict]:
    resolved_city = resolve_gourmet_city(city)
    rooms = db.scalars(select(GourmetChatRoom).order_by(GourmetChatRoom.sort_order.asc())).all()
    counts = {
        room_id: count
        for room_id, count in db.execute(
            select(GourmetChatMessage.room_id, func.count(GourmetChatMessage.id))
            .where(GourmetChatMessage.city == resolved_city)
            .group_by(GourmetChatMessage.room_id)
        ).all()
    }
    return [
        {
            "slug": room.slug,
            "title": room.title,
            "description": room.description,
            "emoji": room.emoji,
            "sort_order": room.sort_order,
            "allow_restaurant_cards": room.allow_restaurant_cards,
            "message_count": int(counts.get(room.id, 0)),
        }
        for room in rooms
    ]


def list_room_questions(
    db: Session,
    *,
    room_slug: str,
    city: str,
    limit: int = 30,
    offset: int = 0,
) -> tuple[GourmetChatRoom, str, list[dict]]:
    room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
    if not room:
        raise GourmetChatError("Oda bulunamadi.")
    resolved_city = resolve_gourmet_city(city)
    rows = db.scalars(
        select(GourmetChatQuestion)
        .where(GourmetChatQuestion.room_id == room.id, GourmetChatQuestion.city == resolved_city)
        .options(
            selectinload(GourmetChatQuestion.author),
            selectinload(GourmetChatQuestion.room),
            selectinload(GourmetChatQuestion.answers).selectinload(GourmetChatAnswer.author),
        )
        .order_by(GourmetChatQuestion.created_at.desc())
        .offset(max(offset, 0))
        .limit(min(max(limit, 1), 50))
    ).all()
    items = [serialize_question(row, preview_limit=1) for row in rows]
    return room, resolved_city, items


def get_question_detail(db: Session, question_id) -> dict:
    row = db.scalar(
        select(GourmetChatQuestion)
        .where(GourmetChatQuestion.id == question_id)
        .options(
            selectinload(GourmetChatQuestion.author),
            selectinload(GourmetChatQuestion.room),
            selectinload(GourmetChatQuestion.answers).selectinload(GourmetChatAnswer.author),
        )
    )
    if not row:
        raise GourmetChatError("Soru bulunamadi.")
    return serialize_question(row, include_answers=True)


def create_question(
    db: Session,
    *,
    room_slug: str,
    user: User,
    city: str,
    tag: str,
    body: str,
) -> dict:
    if not user.nickname:
        raise GourmetChatError("Soru sormak icin once takma ad secmelisiniz.")
    room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
    if not room:
        raise GourmetChatError("Oda bulunamadi.")
    resolved_city = resolve_gourmet_city(city)
    normalized_tag = normalize_tag(tag)
    cleaned_body = validate_body(body, max_len=QUESTION_BODY_MAX)
    row = GourmetChatQuestion(
        room_id=room.id,
        author_id=user.id,
        city=resolved_city,
        tag=normalized_tag,
        body=cleaned_body,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.room = room
    row.author = user
    row.answers = []
    return serialize_question(row)


def create_answer(db: Session, *, question_id, user: User, body: str) -> dict:
    if not user.nickname:
        raise GourmetChatError("Cevap yazmak icin once takma ad secmelisiniz.")
    question = db.scalar(
        select(GourmetChatQuestion)
        .where(GourmetChatQuestion.id == question_id)
        .options(selectinload(GourmetChatQuestion.room))
    )
    if not question:
        raise GourmetChatError("Soru bulunamadi.")
    cleaned_body = validate_body(body, max_len=ANSWER_BODY_MAX)
    row = GourmetChatAnswer(question_id=question.id, author_id=user.id, body=cleaned_body)
    db.add(row)
    question.answer_count = int(question.answer_count or 0) + 1
    db.add(question)
    db.commit()
    db.refresh(row)
    row.author = user
    return serialize_answer(row)


def extract_mention_nicknames(body: str) -> list[str]:
    seen: set[str] = set()
    nicknames: list[str] = []
    for match in MENTION_PATTERN.finditer(body):
        nick = match.group(1)
        key = nickname_identity_key(nick)
        if key not in seen:
            seen.add(key)
            nicknames.append(nick)
    return nicknames


def resolve_mentioned_users(db: Session, nicknames: list[str], *, exclude_user_id: UUID) -> list[User]:
    if not nicknames:
        return []
    keys = {nickname_identity_key(nick) for nick in nicknames}
    rows = db.scalars(select(User).where(User.nickname.is_not(None))).all()
    matched: list[User] = []
    for user in rows:
        if user.id == exclude_user_id or not user.nickname:
            continue
        if nickname_identity_key(user.nickname) in keys:
            matched.append(user)
    return matched


def serialize_message(row: GourmetChatMessage) -> dict:
    mentions = row.mentions_json if isinstance(row.mentions_json, list) else []
    return {
        "id": str(row.id),
        "room_slug": row.room.slug if row.room else "",
        "city": row.city,
        "body": row.body,
        "author": serialize_author(row.author),
        "mentions": [str(item) for item in mentions],
        "created_at": row.created_at,
    }


def list_room_messages(
    db: Session,
    *,
    room_slug: str,
    city: str,
    limit: int = 80,
    before_id: UUID | None = None,
) -> tuple[GourmetChatRoom, str, list[dict]]:
    room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
    if not room:
        raise GourmetChatError("Oda bulunamadi.")
    resolved_city = resolve_gourmet_city(city)
    query = (
        select(GourmetChatMessage)
        .where(GourmetChatMessage.room_id == room.id, GourmetChatMessage.city == resolved_city)
        .options(selectinload(GourmetChatMessage.author), selectinload(GourmetChatMessage.room))
        .order_by(GourmetChatMessage.created_at.desc())
        .limit(min(max(limit, 1), 120))
    )
    if before_id:
        pivot = db.scalar(select(GourmetChatMessage.created_at).where(GourmetChatMessage.id == before_id))
        if pivot:
            query = query.where(GourmetChatMessage.created_at < pivot)
    rows = list(db.scalars(query).all())
    rows.reverse()
    return room, resolved_city, [serialize_message(row) for row in rows]


def create_message(
    db: Session,
    *,
    room_slug: str,
    user: User,
    city: str,
    body: str,
) -> dict:
    if not user.nickname:
        raise GourmetChatError("Mesaj yazmak icin once takma ad secmelisiniz.")
    room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
    if not room:
        raise GourmetChatError("Oda bulunamadi.")
    resolved_city = resolve_gourmet_city(city)
    cleaned_body = validate_body(body, max_len=MESSAGE_BODY_MAX)
    if len(cleaned_body) < 1:
        raise GourmetChatError("Mesaj bos olamaz.")
    mention_nicks = extract_mention_nicknames(cleaned_body)
    mentioned_users = resolve_mentioned_users(db, mention_nicks, exclude_user_id=user.id)
    row = GourmetChatMessage(
        room_id=room.id,
        author_id=user.id,
        city=resolved_city,
        body=cleaned_body,
        mentions_json=[str(item.id) for item in mentioned_users],
    )
    db.add(row)
    db.flush()
    row.room = room
    row.author = user

    actor_name = user.nickname or "Gurme"
    for recipient in mentioned_users:
        notify_gourmet_chat_mention(
            db,
            recipient=recipient,
            actor=user,
            actor_name=actor_name,
            room_slug=room.slug,
            room_title=room.title,
            body=cleaned_body,
        )

    db.commit()
    db.refresh(row)
    handle_human_chat_message(db, room=room, city=resolved_city, user=user, message=row)
    return serialize_message(row)

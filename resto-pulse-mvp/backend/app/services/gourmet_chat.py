"""Gurme Sohbetler — is kurallari ve serilestirme."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.constants.gourmet_chat import (
    ALLOWED_QUESTION_TAGS,
    ANSWER_BODY_MAX,
    GOURMET_CHAT_CITY_KEYS,
    GOURMET_QUESTION_TAGS,
    QUESTION_BODY_MAX,
)
from app.models.entities import GourmetChatAnswer, GourmetChatQuestion, GourmetChatRoom, User
from app.services.city_resolver import normalize_city_key, resolve_city_name
from app.services.gourmet_profile import public_user_avatar
from app.services.review_moderation import check_review_text


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
        raise GourmetChatError("Su an yalnizca Bursa ve Istanbul destekleniyor.")
    return "Istanbul" if key == "istanbul" else "Bursa"


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
        return {"nickname": "Gurme", "avatar_url": None, "avatar_preset": None}
    avatar_url, avatar_preset = public_user_avatar(user)
    return {
        "nickname": user.nickname,
        "avatar_url": avatar_url,
        "avatar_preset": avatar_preset,
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
            select(GourmetChatQuestion.room_id, func.count(GourmetChatQuestion.id))
            .where(GourmetChatQuestion.city == resolved_city)
            .group_by(GourmetChatQuestion.room_id)
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
            "question_count": int(counts.get(room.id, 0)),
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

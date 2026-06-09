from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import User
from app.schemas.gourmet_chat import (
    GourmetChatAnswerCreate,
    GourmetChatAnswerItem,
    GourmetChatMessageCreate,
    GourmetChatMessageItem,
    GourmetChatMessageListResponse,
    GourmetTriviaLeaderboardResponse,
    GourmetChatQuestionCreate,
    GourmetChatQuestionDetail,
    GourmetChatQuestionItem,
    GourmetChatQuestionListResponse,
    GourmetChatRoomListResponse,
    GourmetChatTagItem,
)
from app.services.gourmet_chat import (
    GourmetChatError,
    create_answer,
    create_message,
    create_question,
    get_question_detail,
    list_question_tags,
    list_room_messages,
    list_room_questions,
    list_rooms,
    resolve_gourmet_city,
)
from app.services.request_identity import resolve_authenticated_email

router = APIRouter(prefix="/gourmet-chat", tags=["gourmet-chat"])


def _chat_user(db: Session, email: str) -> User:
    verified_email = resolve_authenticated_email(claimed_email=email)
    user = db.scalar(select(User).where(User.email == verified_email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


def _raise_chat_error(exc: GourmetChatError) -> None:
    detail: str | dict = exc.message
    if exc.highlights:
        detail = {"message": exc.message, "highlights": exc.highlights, "code": "profanity"}
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail) from exc


@router.get("/tags", response_model=list[GourmetChatTagItem])
def gourmet_chat_tags() -> list[GourmetChatTagItem]:
    return [GourmetChatTagItem(id=key, label=label) for key, label in list_question_tags()]


@router.get("/rooms", response_model=GourmetChatRoomListResponse)
def gourmet_chat_rooms(
    city: str = Query(default="Bursa"),
    db: Session = Depends(get_db),
):
    try:
        items = list_rooms(db, city=city)
        resolved_city = resolve_gourmet_city(city)
    except GourmetChatError as exc:
        _raise_chat_error(exc)
    return GourmetChatRoomListResponse(city=resolved_city, items=items)


@router.get("/rooms/{room_slug}/questions", response_model=GourmetChatQuestionListResponse)
def gourmet_chat_room_questions(
    room_slug: str,
    city: str = Query(default="Bursa"),
    limit: int = Query(default=30, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    try:
        _room, resolved_city, items = list_room_questions(
            db, room_slug=room_slug, city=city, limit=limit, offset=offset
        )
    except GourmetChatError as exc:
        if exc.message == "Oda bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatQuestionListResponse(
        city=resolved_city,
        room_slug=room_slug,
        items=[GourmetChatQuestionItem.model_validate(item) for item in items],
    )


@router.get("/questions/{question_id}", response_model=GourmetChatQuestionDetail)
def gourmet_chat_question_detail(question_id: UUID, db: Session = Depends(get_db)):
    try:
        item = get_question_detail(db, question_id)
    except GourmetChatError as exc:
        if exc.message == "Soru bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatQuestionDetail.model_validate(item)


@router.post("/rooms/{room_slug}/questions", response_model=GourmetChatQuestionItem, status_code=status.HTTP_201_CREATED)
def gourmet_chat_create_question(
    room_slug: str,
    payload: GourmetChatQuestionCreate,
    db: Session = Depends(get_db),
):
    user = _chat_user(db, payload.user_email)
    try:
        item = create_question(
            db,
            room_slug=room_slug,
            user=user,
            city=payload.city,
            tag=payload.tag,
            body=payload.body,
        )
    except GourmetChatError as exc:
        if exc.message == "Oda bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatQuestionItem.model_validate(item)


@router.post("/questions/{question_id}/answers", response_model=GourmetChatAnswerItem, status_code=status.HTTP_201_CREATED)
def gourmet_chat_create_answer(
    question_id: UUID,
    payload: GourmetChatAnswerCreate,
    db: Session = Depends(get_db),
):
    user = _chat_user(db, payload.user_email)
    try:
        item = create_answer(db, question_id=question_id, user=user, body=payload.body)
    except GourmetChatError as exc:
        if exc.message == "Soru bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatAnswerItem.model_validate(item)


@router.get("/rooms/{room_slug}/trivia/leaderboard", response_model=GourmetTriviaLeaderboardResponse)
def gourmet_trivia_leaderboard(
    room_slug: str,
    city: str = Query(default="Bursa"),
    limit: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    from app.services.gourmet_trivia import leaderboard_for_room

    resolved_city = resolve_gourmet_city(city)
    items = leaderboard_for_room(db, room_slug=room_slug, city=resolved_city, limit=limit)
    return GourmetTriviaLeaderboardResponse(city=resolved_city, room_slug=room_slug, items=items)


@router.get("/rooms/{room_slug}/messages", response_model=GourmetChatMessageListResponse)
def gourmet_chat_room_messages(
    room_slug: str,
    city: str = Query(default="Bursa"),
    limit: int = Query(default=80, ge=1, le=120),
    before_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        from app.services.gourmet_chat_assistant import process_due_assistant_jobs, recover_stale_for_room
        from app.models.entities import GourmetChatRoom
        from app.services.gourmet_trivia import process_trivia_tick
        from sqlalchemy import select

        room = db.scalar(select(GourmetChatRoom).where(GourmetChatRoom.slug == room_slug))
        resolved_city = resolve_gourmet_city(city)
        if room:
            recover_stale_for_room(db, room=room, city=resolved_city)
            process_trivia_tick(db, room=room, city=resolved_city)
        process_due_assistant_jobs(db, limit=5)
        _room, resolved_city, items = list_room_messages(
            db, room_slug=room_slug, city=city, limit=limit, before_id=before_id
        )
    except GourmetChatError as exc:
        if exc.message == "Oda bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatMessageListResponse(
        city=resolved_city,
        room_slug=room_slug,
        items=[GourmetChatMessageItem.model_validate(item) for item in items],
    )


@router.post("/rooms/{room_slug}/messages", response_model=GourmetChatMessageItem, status_code=status.HTTP_201_CREATED)
def gourmet_chat_create_message(
    room_slug: str,
    payload: GourmetChatMessageCreate,
    db: Session = Depends(get_db),
):
    user = _chat_user(db, payload.user_email)
    try:
        item = create_message(
            db,
            room_slug=room_slug,
            user=user,
            city=payload.city,
            body=payload.body,
        )
    except GourmetChatError as exc:
        if exc.message == "Oda bulunamadi.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.message) from exc
        _raise_chat_error(exc)
    return GourmetChatMessageItem.model_validate(item)

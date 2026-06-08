from datetime import timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.constants.gourmet_chat import SYSTEM_GOURMET_ROOMS
from app.core.config import settings
from app.models.entities import GourmetChatAssistantJob, GourmetChatRoom, User
from app.services.gourmet_chat import create_message
from app.services.gourmet_chat_assistant import (
    classify_message_intent,
    is_greeting_only,
    process_due_assistant_jobs,
)


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    from app.models.entities import (
        GourmetChatAssistantJob,
        GourmetChatMessage,
        GourmetChatRoom,
        GourmetChatRoomAssistantState,
        User,
    )

    tables = [
        User.__table__,
        GourmetChatRoom.__table__,
        GourmetChatMessage.__table__,
        GourmetChatAssistantJob.__table__,
        GourmetChatRoomAssistantState.__table__,
    ]
    for table in tables:
        table.create(engine, checkfirst=True)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    for seed in SYSTEM_GOURMET_ROOMS:
        session.add(
            GourmetChatRoom(
                slug=seed.slug,
                title=seed.title,
                description=seed.description,
                emoji=seed.emoji,
                sort_order=seed.sort_order,
            )
        )
    session.add(User(email="gurme@test.com", full_name="Test", nickname="Donerci42"))
    session.add(User(email="diger@test.com", full_name="Diger", nickname="Veli99"))
    session.commit()
    yield session
    session.close()


def test_is_greeting_only():
    assert is_greeting_only("selam")
    assert is_greeting_only("Slm mrb")
    assert is_greeting_only("selamun aleykum")
    assert not is_greeting_only("selam doner oner")


def test_classify_intent():
    assert classify_message_intent("selam", room_slug="kes-donerciler") == "greeting"
    assert classify_message_intent("gece acik doner oner", room_slug="gece-acikanlar") == "restaurant"
    assert classify_message_intent("ocakbaşı", room_slug="ocakbasi-muhabbeti") == "restaurant"
    assert classify_message_intent("mangal", room_slug="ocakbasi-muhabbeti") == "restaurant"
    assert classify_message_intent("sagol", room_slug="kes-donerciler") is None


def test_ocakbasi_excludes_cig_kofte():
    from app.services.gourmet_chat_assistant import (
        _restaurant_excluded_for_room,
        _restaurant_matches_room,
    )

    komagene = "Komagene Etsiz Cig Kofte Nilufer"
    assert _restaurant_excluded_for_room(komagene, room_slug="ocakbasi-muhabbeti")
    assert not _restaurant_matches_room(komagene, room_slug="ocakbasi-muhabbeti")
    ocak = "Kasap Mehmet Ocakbasi Izgara Nilufer"
    assert not _restaurant_excluded_for_room(ocak, room_slug="ocakbasi-muhabbeti")
    assert _restaurant_matches_room(ocak, room_slug="ocakbasi-muhabbeti")


def test_greeting_templates_are_warm():
    from app.services.gourmet_chat_assistant import _format_greeting_body

    body = _format_greeting_body(nickname="Ali", room_slug="kes-donerciler")
    assert "Ali" in body
    assert len(body) > 20


def test_recover_stale_greeting(db: Session, monkeypatch):
    monkeypatch.setattr(settings, "gourmet_assistant_greeting_delay_sec", 0)
    user = db.query(User).filter(User.email == "gurme@test.com").one()
    # Job planlamadan sadece mesaj birak (deploy oncesi senaryo)
    from app.models.entities import GourmetChatMessage, GourmetChatRoom

    room = db.query(GourmetChatRoom).filter(GourmetChatRoom.slug == "kes-donerciler").one()
    row = GourmetChatMessage(room_id=room.id, author_id=user.id, city="Bursa", body="selam", mentions_json=[])
    db.add(row)
    db.commit()

    from app.services.gourmet_chat_assistant import recover_stale_for_room

    assert recover_stale_for_room(db, room=room, city="Bursa") is True
    bot_messages = db.query(GourmetChatMessage).filter(GourmetChatMessage.author_id != user.id).all()
    assert len(bot_messages) == 1


def test_greeting_job_posts_after_delay(db: Session, monkeypatch):
    monkeypatch.setattr(settings, "gourmet_assistant_greeting_delay_sec", 0)
    user = db.query(User).filter(User.email == "gurme@test.com").one()
    create_message(db, room_slug="kes-donerciler", user=user, city="Bursa", body="selam")

    pending = db.query(GourmetChatAssistantJob).filter(GourmetChatAssistantJob.status == "pending").all()
    assert len(pending) == 1
    assert pending[0].job_kind == "greeting"

    job = pending[0]
    job.run_at = job.run_at - timedelta(seconds=5)
    db.add(job)
    db.commit()

    stats = process_due_assistant_jobs(db)
    assert stats["posted"] == 1


def test_vague_restaurant_ask_detected():
    from app.services.gourmet_chat_assistant import is_vague_restaurant_ask

    assert is_vague_restaurant_ask("cok aciktim onerin var mi", room_slug="kes-donerciler")
    assert not is_vague_restaurant_ask("gece acik doner oner", room_slug="gece-acikanlar")


def test_live_search_guide_mentions_query_not_restaurant_name():
    from app.services.gourmet_chat_assistant import _format_live_search_guide_body

    body = _format_live_search_guide_body(
        room_slug="kes-donerciler",
        nickname="Ali",
        user_message="doner oner lutfen",
    )
    assert "Ali" in body
    assert "doner 4.5 yildiz" in body
    assert "Canli Arama" in body or "Canlı Arama" in body or "canli" in body.lower()
    assert "1." not in body


def test_live_search_ask_craving_when_vague():
    from app.services.gourmet_chat_assistant import _format_live_search_ask_craving_body

    body = _format_live_search_ask_craving_body(room_slug="kes-donerciler", nickname="Veli")
    assert "Veli" in body
    assert "cektigi" in body or "cektiği" in body or "istiyorsun" in body


def test_human_reply_cancels_assistant(db: Session, monkeypatch):
    monkeypatch.setattr(settings, "gourmet_assistant_greeting_delay_sec", 60)
    user_a = db.query(User).filter(User.email == "gurme@test.com").one()
    user_b = db.query(User).filter(User.email == "diger@test.com").one()

    create_message(db, room_slug="kes-donerciler", user=user_a, city="Bursa", body="selam")
    create_message(db, room_slug="kes-donerciler", user=user_b, city="Bursa", body="merhaba ben de burdayim")

    pending = db.query(GourmetChatAssistantJob).filter(GourmetChatAssistantJob.status == "pending").all()
    assert pending == []

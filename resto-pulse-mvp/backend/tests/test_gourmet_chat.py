import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.constants.gourmet_chat import SYSTEM_GOURMET_ROOMS
from app.db.base import Base
from app.models.entities import GourmetChatRoom, User
from app.services.gourmet_chat import (
    GourmetChatError,
    create_answer,
    create_message,
    create_question,
    get_question_detail,
    list_rooms,
    normalize_tag,
    resolve_gourmet_city,
)


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
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
    session.add(User(email="anon@test.com", full_name="Anon"))
    session.add(User(email="ac@test.com", full_name="Ac", nickname="AcAdam"))
    session.commit()
    yield session
    session.close()


def test_resolve_gourmet_city_bursa():
    assert resolve_gourmet_city("bursa") == "Bursa"
    assert resolve_gourmet_city("Bursa") == "Bursa"


def test_resolve_gourmet_city_istanbul():
    assert resolve_gourmet_city("istanbul") == "İstanbul"
    assert resolve_gourmet_city("Istanbul") == "İstanbul"


def test_resolve_gourmet_city_rejects_other():
    with pytest.raises(GourmetChatError):
        resolve_gourmet_city("Ankara")


def test_normalize_tag_ok():
    assert normalize_tag("doner") == "doner"
    assert normalize_tag(None) == "genel"


def test_normalize_tag_invalid():
    with pytest.raises(GourmetChatError):
        normalize_tag("pizza")


def test_list_rooms_empty_counts(db: Session):
    items = list_rooms(db, city="Bursa")
    assert len(items) == 6
    assert items[0]["slug"] == "kes-donerciler"
    assert items[0]["message_count"] == 0


def test_create_question_requires_nickname(db: Session):
    user = db.query(User).filter(User.email == "anon@test.com").one()
    with pytest.raises(GourmetChatError) as exc:
        create_question(
            db,
            room_slug="kes-donerciler",
            user=user,
            city="Bursa",
            tag="doner",
            body="Bursada en iyi doner nerede?",
        )
    assert "takma ad" in exc.value.message.lower()


def test_create_question_and_answer_flow(db: Session):
    user = db.query(User).filter(User.email == "gurme@test.com").one()
    question = create_question(
        db,
        room_slug="kes-donerciler",
        user=user,
        city="Bursa",
        tag="doner",
        body="Bursada en iyi doner nerede?",
    )
    assert question["author"]["nickname"] == "Donerci42"
    assert question["tag"] == "doner"

    rooms = list_rooms(db, city="Bursa")
    doner_room = next(item for item in rooms if item["slug"] == "kes-donerciler")
    assert doner_room["message_count"] == 0
    assert doner_room["title"] == "Kes Dönerciler"

    answer = create_answer(
        db,
        question_id=question["id"],
        user=user,
        body="Osmangazi tarafinda X donercisi cok iyi.",
    )
    assert answer["author"]["nickname"] == "Donerci42"

    detail = get_question_detail(db, question["id"])
    assert detail["answer_count"] == 1
    assert len(detail["answers"]) == 1


def test_create_message_and_mention(db: Session):
    user = db.query(User).filter(User.email == "gurme@test.com").one()
    message = create_message(
        db,
        room_slug="kes-donerciler",
        user=user,
        city="Bursa",
        body="@AcAdam selam, doner onerin var mi?",
    )
    assert message["author"]["nickname"] == "Donerci42"
    assert len(message["mentions"]) == 1

    rooms = list_rooms(db, city="Bursa")
    doner_room = next(item for item in rooms if item["slug"] == "kes-donerciler")
    assert doner_room["message_count"] == 1

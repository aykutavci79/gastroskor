import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models.entities import User
from app.services.gourmet_profile import (
    NicknameValidationError,
    check_nickname_available,
    normalize_nickname,
    validate_nickname_format,
)


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    session.add(User(email="a@test.com", full_name="Test"))
    session.commit()
    yield session
    session.close()


def test_normalize_nickname():
    assert normalize_nickname("  Donerci42  ") == "Donerci42"


def test_validate_nickname_format_ok():
    validate_nickname_format("Donerci_42")


def test_validate_nickname_too_short():
    with pytest.raises(NicknameValidationError):
        validate_nickname_format("ab")


def test_validate_nickname_reserved():
    with pytest.raises(NicknameValidationError):
        validate_nickname_format("admin")


def test_check_nickname_available(db: Session):
    assert check_nickname_available(db, "Donerci42") is None


def test_check_nickname_taken(db: Session):
    user = db.query(User).first()
    user.nickname = "Taken"
    db.commit()
    err = check_nickname_available(db, "Taken")
    assert err is not None
    assert "alinmis" in err.message.lower()

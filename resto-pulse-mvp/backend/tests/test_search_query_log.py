"""search_query_log servisi."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.entities import SearchQueryLog
from app.services.search_query_log import (
    record_google_search_fetch,
    recent_google_search_log,
    should_skip_google_from_query_log,
)


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    SearchQueryLog.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_record_and_skip_when_prefetched_meets_logged_count(db: Session) -> None:
    record_google_search_fetch(db, query_key="durak muhallebi", city_key="bursa", result_count=2)
    assert should_skip_google_from_query_log(
        db,
        query_key="durak muhallebi",
        city_key="bursa",
        prefetched_count=2,
    )
    assert not should_skip_google_from_query_log(
        db,
        query_key="durak muhallebi",
        city_key="bursa",
        prefetched_count=1,
    )


def test_zero_result_log_skips_google_retry(db: Session) -> None:
    record_google_search_fetch(db, query_key="yok mekan", city_key="bursa", result_count=0)
    assert should_skip_google_from_query_log(
        db,
        query_key="yok mekan",
        city_key="bursa",
        prefetched_count=0,
    )


def test_stale_log_does_not_skip(db: Session) -> None:
    record_google_search_fetch(db, query_key="eski", city_key="bursa", result_count=2)
    row = db.query(SearchQueryLog).one()
    row.google_fetched_at = datetime.now(timezone.utc) - timedelta(days=8)
    db.commit()
    assert recent_google_search_log(db, query_key="eski", city_key="bursa") is None
    assert not should_skip_google_from_query_log(
        db,
        query_key="eski",
        city_key="bursa",
        prefetched_count=2,
    )


def test_upsert_updates_existing_row(db: Session) -> None:
    record_google_search_fetch(db, query_key="pide", city_key="bursa", result_count=1)
    record_google_search_fetch(db, query_key="pide", city_key="bursa", result_count=3)
    rows = db.query(SearchQueryLog).all()
    assert len(rows) == 1
    assert rows[0].result_count == 3

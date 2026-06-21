from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models.entities import PrivateFeedback, Restaurant, Review, User
from app.services.order_review import batch_avg_ratings
from app.services.private_feedback_service import list_private_feedbacks_for_user
from app.services.restaurant_follow import build_restaurant_list_rows


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    query_count = {"n": 0}

    def _count_query(*_args, **_kwargs) -> None:
        query_count["n"] += 1

    event.listen(engine, "before_cursor_execute", _count_query)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session._query_count = query_count  # type: ignore[attr-defined]
    try:
        yield session
    finally:
        event.remove(engine, "before_cursor_execute", _count_query)
        session.close()


def _seed_restaurants_with_reviews(db: Session, count: int = 5) -> list[Restaurant]:
    restaurants: list[Restaurant] = []
    author = User(email="author@test.com", full_name="Author")
    db.add(author)
    db.flush()
    for idx in range(count):
        restaurant = Restaurant(
            name=f"Restoran {idx}",
            city="Bursa",
            is_active=True,
        )
        db.add(restaurant)
        db.flush()
        restaurants.append(restaurant)
        for rating in (4, 5, 3):
            db.add(
                Review(
                    restaurant_id=restaurant.id,
                    author_id=author.id,
                    rating=rating,
                    review_text=f"Yorum {idx}-{rating}",
                )
            )
    db.commit()
    return restaurants


def test_batch_avg_ratings_returns_grouped_scores(db: Session) -> None:
    restaurants = _seed_restaurants_with_reviews(db, count=3)
    ratings = batch_avg_ratings(db, [r.id for r in restaurants], visit_only=False)
    assert len(ratings) == 3
    assert ratings[str(restaurants[0].id)] == 4.0


def test_build_restaurant_list_rows_uses_batch_rating_query(db: Session) -> None:
    restaurants = _seed_restaurants_with_reviews(db, count=5)
    db._query_count["n"] = 0  # type: ignore[attr-defined]

    rows = build_restaurant_list_rows(db, restaurants)

    assert len(rows) == 5
    assert all(row["avg_rating"] == 4.0 for row in rows)
    # partner batch + google profiles + avg batch + check-in batch — N restoran basina ayri avg yok
    assert db._query_count["n"] <= 10  # type: ignore[attr-defined]


def test_list_private_feedbacks_for_user_respects_limit(db: Session) -> None:
    user = User(email="user@test.com", full_name="User")
    db.add(user)
    db.flush()
    restaurant_id = uuid.uuid4()
    for idx in range(10):
        db.add(
            PrivateFeedback(
                author_id=user.id,
                restaurant_id=restaurant_id,
                place_id=f"place-{idx}",
                category="service",
                message=f"Mesaj {idx}",
                status="open",
            )
        )
    db.commit()

    rows = list_private_feedbacks_for_user(db, user_uuid=user.id, limit=3)
    assert len(rows) == 3

import pytest
from pydantic import ValidationError

from app.schemas.social import EglenceFriendActivityPayload


def test_friend_activity_accepts_high_game_scores():
    payload = EglenceFriendActivityPayload(
        user_email="player@example.com",
        game="kelime_sofrasi",
        elapsed_ms=120_000,
        score=3_000,
        puzzle_id="2026-06-24:kolay",
    )

    assert payload.score == 3_000


def test_friend_activity_rejects_negative_scores():
    with pytest.raises(ValidationError):
        EglenceFriendActivityPayload(
            user_email="player@example.com",
            game="mini_sudoku",
            elapsed_ms=120_000,
            score=-1,
            puzzle_id="2026-06-24",
        )

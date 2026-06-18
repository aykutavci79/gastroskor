from app.models.entities import UserEglenceResult
from app.services.eglence_leaderboard import _is_better, resolve_period_key


def test_resolve_period_key_sudoku():
    assert resolve_period_key(game="mini_sudoku", puzzle_id="2026-06-16") == "2026-06-16"


def test_resolve_period_key_kelime():
    key = resolve_period_key(game="kelime_yarismasi", puzzle_id=None)
    assert len(key) == 10
    assert key[4] == "-"


def test_is_better_sudoku_faster_wins():
    current = UserEglenceResult(elapsed_ms=200_000)
    assert _is_better("mini_sudoku", current=current, elapsed_ms=150_000, score=None) is True
    assert _is_better("mini_sudoku", current=current, elapsed_ms=250_000, score=None) is False


def test_is_better_kelime_higher_score_wins():
    current = UserEglenceResult(score=70, elapsed_ms=100_000)
    assert _is_better("kelime_yarismasi", current=current, elapsed_ms=90_000, score=80) is True
    assert _is_better("kelime_yarismasi", current=current, elapsed_ms=50_000, score=60) is False


def test_is_better_kelime_tiebreak_time():
    current = UserEglenceResult(score=80, elapsed_ms=100_000)
    assert _is_better("kelime_yarismasi", current=current, elapsed_ms=80_000, score=80) is True
    assert _is_better("kelime_yarismasi", current=current, elapsed_ms=120_000, score=80) is False

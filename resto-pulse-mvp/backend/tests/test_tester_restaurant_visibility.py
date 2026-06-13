from app.services.tester_restaurant_visibility import (
    TESTER_SEED_PLACE_ID_PREFIX,
    is_tester_seed_place_id,
    is_tester_seed_ownership,
)


def test_is_tester_seed_place_id():
    assert is_tester_seed_place_id("gastro-tester-deneme-1")
    assert is_tester_seed_place_id("gastro-tester-deneme-5")
    assert not is_tester_seed_place_id("ChIJ123")
    assert not is_tester_seed_place_id(None)
    assert not is_tester_seed_place_id("")


def test_tester_prefix_constant():
    assert TESTER_SEED_PLACE_ID_PREFIX == "gastro-tester-"


class _FakeOwnership:
    def __init__(self, **kwargs):
        self.google_place_id = kwargs.get("google_place_id")
        self.verification_method = kwargs.get("verification_method")


def test_is_tester_seed_ownership():
    assert is_tester_seed_ownership(_FakeOwnership(google_place_id="gastro-tester-deneme-2"))
    assert is_tester_seed_ownership(_FakeOwnership(verification_method="tester_seed"))
    assert not is_tester_seed_ownership(_FakeOwnership(google_place_id="ChIJabc"))
    assert not is_tester_seed_ownership(None)

from app.services.tester_restaurant_visibility import (
    TESTER_SEED_PLACE_ID_PREFIX,
    is_tester_seed_place_id,
    is_tester_seed_ownership,
    should_hide_tester_ownership,
    viewer_can_see_tester_seeds,
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


def test_viewer_can_see_tester_seeds(monkeypatch):
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.exclude_tester_seeds_public",
        True,
    )
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.internal_preview_emails",
        "tester-restoranlar@gastroskor.local",
    )
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.panel_admin_emails",
        "admin@gastroskor.com",
    )
    assert not viewer_can_see_tester_seeds(None)
    assert not viewer_can_see_tester_seeds("guest@example.com")
    assert viewer_can_see_tester_seeds("tester-restoranlar@gastroskor.local")
    assert viewer_can_see_tester_seeds("admin@gastroskor.com")


def test_should_hide_tester_ownership(monkeypatch):
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.exclude_tester_seeds_public",
        True,
    )
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.internal_preview_emails",
        "tester-restoranlar@gastroskor.local",
    )
    monkeypatch.setattr(
        "app.services.tester_restaurant_visibility.settings.panel_admin_emails",
        "",
    )
    ownership = _FakeOwnership(google_place_id="gastro-tester-deneme-1")
    assert should_hide_tester_ownership(ownership, viewer_email=None)
    assert should_hide_tester_ownership(ownership, viewer_email="guest@example.com")
    assert not should_hide_tester_ownership(
        ownership,
        viewer_email="tester-restoranlar@gastroskor.local",
    )
    assert not should_hide_tester_ownership(_FakeOwnership(google_place_id="ChIJabc"), viewer_email=None)

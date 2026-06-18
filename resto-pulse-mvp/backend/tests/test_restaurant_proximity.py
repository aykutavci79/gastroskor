"""Restoran yakinlik — adres kardes mekanlar (Podyum Park vb.)."""

from app.services.restaurant_proximity import (
    _address_landmark_key,
    min_distance_to_candidates,
)


def test_address_landmark_podyum():
    assert _address_landmark_key("Podyum park, Cumhuriyet, Bursa") == "podyum"


def test_min_distance_meters():
    """Kahve pinine yakin kullanici (~30m)."""
    user_lat, user_lng = 40.22534, 28.99310
    kahve = (40.22535, 28.99314)
    dist = min_distance_to_candidates(user_lat, user_lng, [kahve])
    assert dist is not None
    assert dist < 50

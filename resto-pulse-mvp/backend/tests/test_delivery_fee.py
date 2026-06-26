from app.services.delivery_fee import normalize_delivery_fee_tiers, resolve_delivery_fee_tl


def test_resolve_delivery_fee_default_tiers():
    assert resolve_delivery_fee_tl(500) == 35
    assert resolve_delivery_fee_tl(2500) == 50
    assert resolve_delivery_fee_tl(9000) == 95
    assert resolve_delivery_fee_tl(20_000) == 95


def test_resolve_delivery_fee_custom_tiers():
    tiers = [{"max_km": 3, "fee_tl": 40}, {"max_km": 6, "fee_tl": 60}]
    assert resolve_delivery_fee_tl(1000, tiers=tiers) == 40
    assert resolve_delivery_fee_tl(4000, tiers=tiers) == 60


def test_resolve_delivery_fee_none_without_distance():
    assert resolve_delivery_fee_tl(None) is None


def test_normalize_delivery_fee_tiers():
    assert normalize_delivery_fee_tiers([{"max_km": 2, "fee_tl": 30}]) == [{"max_km": 2.0, "fee_tl": 30.0}]
    assert normalize_delivery_fee_tiers([]) is None

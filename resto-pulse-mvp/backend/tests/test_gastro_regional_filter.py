import pytest

from app.data.gastro_regional_filter import is_gastro_regional_product
from app.data.regional_city_match import detect_city_mismatch
from app.data.turkiye_geo_products import catalog_for_city, catalog_metadata


@pytest.mark.parametrize(
    ("name", "group_id", "expected"),
    [
        ("Bergama Graniti", "33", False),
        ("Bergama Parşömeni", "33", False),
        ("Arslanlar Biberi", "33", False),
        ("Bergama Kozak Çam Fıstığı", "33", False),
        ("Bergama Tulum Peyniri", "33", False),
        ("Ödemiş Nohut Mayalı Ekmeği", "54", False),
        ("Bergama Köftesi", "33", True),
        ("Beydağ Simit Dürüm", "33", True),
        ("İzmir Boyozu", "54", True),
        ("Bursa Cantık", "54", True),
        ("Konya Bıçakarası", "54", True),
    ],
)
def test_gastro_regional_product_filter(name: str, group_id: str, expected: bool) -> None:
    assert (
        is_gastro_regional_product(name=name, aliases=(), product_group_id=group_id) is expected
    )


def test_izmir_catalog_excludes_non_food_noise() -> None:
    items = catalog_for_city("Izmir")
    names = {item.name for item in items}
    assert "İzmir Boyozu" in names
    assert "Bergama Köftesi" in names
    assert "Bergama Graniti" not in names
    assert "Arslanlar Biberi" not in names
    assert "Ödemiş Nohut Mayalı Ekmeği" not in names


def test_aydintepe_not_aydin_mismatch() -> None:
    assert detect_city_mismatch(name="Aydıntepe Şeker Fasulyesi", city="Bayburt") is None


def test_adiyaman_in_aydin_mismatch() -> None:
    mm = detect_city_mismatch(name="Adıyaman Tene Helvası", city="Aydın")
    assert mm is not None
    assert mm["expected_city"] == "Adıyaman"


def test_catalog_metadata_uses_gastro_count() -> None:
    meta = catalog_metadata()
    assert meta["product_count"] < meta["raw_product_count"]
    assert meta["product_count"] > 200

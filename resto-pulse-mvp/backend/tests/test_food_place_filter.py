from app.services.food_place_filter import is_food_related_place


def test_rejects_street_route_type() -> None:
    assert not is_food_related_place(
        name="Atatürk Caddesi",
        types=["route"],
    )


def test_rejects_business_center_name() -> None:
    assert not is_food_related_place(
        name="Kent Plaza İş Merkezi",
        types=["point_of_interest", "establishment"],
    )


def test_accepts_restaurant_type() -> None:
    assert is_food_related_place(
        name="Durak Muhallebicisi",
        types=["restaurant", "food", "point_of_interest", "establishment"],
    )


def test_accepts_doner_shop_name() -> None:
    assert is_food_related_place(
        name="Bursa Dönercisi",
        types=["meal_takeaway", "restaurant", "food", "point_of_interest", "establishment"],
    )


def test_db_rows_always_allowed_flag() -> None:
    assert is_food_related_place(
        name="Herhangi Sokak 12",
        types=["route"],
        from_gastro_db=True,
    )

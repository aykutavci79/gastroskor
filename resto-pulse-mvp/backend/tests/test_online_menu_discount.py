from app.services.online_menu_discount import parse_menu_discount_percent


def test_parse_percent_formats():
    assert parse_menu_discount_percent("%15 tüm menüde") == 15
    assert parse_menu_discount_percent("Tüm ürünlerde %22 indirim") == 22
    assert parse_menu_discount_percent("yüzde 30") == 30
    assert parse_menu_discount_percent("100 TL indirim") is None
    assert parse_menu_discount_percent("%5") is None

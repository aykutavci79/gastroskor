from app.api.v1.routes import parse_geo_indications


def test_parse_geo_indications_with_product():
    items = parse_geo_indications([{"product": "İnegöl Köfte", "region": "Bursa"}])
    assert len(items) == 1
    assert items[0].product == "İnegöl Köfte"

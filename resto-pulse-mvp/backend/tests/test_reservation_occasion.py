from app.constants.reservation_occasion import ReservationOccasionType, occasion_label_tr


def test_occasion_label_tr() -> None:
    assert occasion_label_tr(ReservationOccasionType.birthday) == "Doğum günü"
    assert occasion_label_tr("business_dinner") == "İş yemeği"
    assert occasion_label_tr("invalid") is None
    assert occasion_label_tr(None) is None

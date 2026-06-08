"""Online siparis red sebepleri."""

import pytest

from app.constants.order_reject_reasons import (
    build_reject_customer_message,
    validate_rejection_reason,
)


def test_validate_rejection_reason_requires_code_or_text():
    with pytest.raises(ValueError):
        validate_rejection_reason(reason_code=None, reason_text=None)
    with pytest.raises(ValueError):
        validate_rejection_reason(reason_code=None, reason_text="ab")

    code, text = validate_rejection_reason(reason_code="busy", reason_text=None)
    assert code == "busy"
    assert text is None

    code, text = validate_rejection_reason(reason_code=None, reason_text="Bugun kurye yok")
    assert code is None
    assert text == "Bugun kurye yok"


def test_validate_rejection_reason_rejects_unknown_code():
    with pytest.raises(ValueError):
        validate_rejection_reason(reason_code="invalid", reason_text=None)


def test_build_reject_customer_message():
    assert build_reject_customer_message(reason_code="busy", reason_text=None) == (
        "Restoran su an cok yogun"
    )
    assert build_reject_customer_message(reason_code="no_courier", reason_text="Yarin tekrar deneyin") == (
        "Kurye hizmeti su an musait degil — Yarin tekrar deneyin"
    )
    assert build_reject_customer_message(reason_code=None, reason_text="Stok bitti") == "Stok bitti"

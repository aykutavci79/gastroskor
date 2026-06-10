from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.services.claim_admin_approval import pending_claim_to_dict
from app.services.restaurant_claim import CLAIM_ADMIN_APPROVAL_PHONE_INFO


def test_claim_admin_approval_phone_info_shape():
    assert CLAIM_ADMIN_APPROVAL_PHONE_INFO["requires_admin_approval"] is True
    assert CLAIM_ADMIN_APPROVAL_PHONE_INFO["requires_tax_document"] is False
    assert CLAIM_ADMIN_APPROVAL_PHONE_INFO["is_mobile"] is False


def test_pending_claim_to_dict_maps_fields():
    ownership_id = uuid4()
    restaurant_id = uuid4()
    row = SimpleNamespace(
        id=ownership_id,
        restaurant_id=restaurant_id,
        google_place_id="ChIJtest",
        created_at=datetime(2026, 6, 6, 12, 0, tzinfo=timezone.utc),
        verification_status="pending_admin",
        user=SimpleNamespace(email="owner@test.com", full_name="Owner"),
        restaurant=SimpleNamespace(name="Test Lokanta"),
    )
    data = pending_claim_to_dict(row)
    assert data["ownership_id"] == str(ownership_id)
    assert data["user_email"] == "owner@test.com"
    assert data["restaurant_name"] == "Test Lokanta"
    assert data["verification_status"] == "pending_admin"

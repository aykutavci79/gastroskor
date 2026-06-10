import uuid

import pytest

from app.services.google_business_oauth import (
    GoogleBusinessOAuthError,
    sign_oauth_state,
    verify_oauth_state,
)


def test_oauth_state_roundtrip():
    ownership_id = uuid.uuid4()
    user_id = uuid.uuid4()
    state = sign_oauth_state(ownership_id=ownership_id, user_id=user_id)
    parsed_ownership, parsed_user = verify_oauth_state(state)
    assert parsed_ownership == ownership_id
    assert parsed_user == user_id


def test_oauth_state_tampered_rejected():
    ownership_id = uuid.uuid4()
    user_id = uuid.uuid4()
    state = sign_oauth_state(ownership_id=ownership_id, user_id=user_id)
    tampered = state[:-3] + "xxx"
    with pytest.raises(GoogleBusinessOAuthError):
        verify_oauth_state(tampered)

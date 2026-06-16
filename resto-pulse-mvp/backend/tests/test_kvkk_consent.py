"""KVKK acik riza — giris zorunlulugu."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.kvkk_consent import require_and_record_kvkk_consent, user_needs_kvkk_consent


def _user(*, consent_at=None, version=None):
    return SimpleNamespace(kvkk_consent_at=consent_at, kvkk_consent_version=version)


def test_user_needs_consent_when_missing():
    assert user_needs_kvkk_consent(_user()) is True


def test_user_needs_consent_when_version_stale():
    assert user_needs_kvkk_consent(_user(consent_at=datetime.now(timezone.utc), version="old")) is True


def test_user_does_not_need_consent_when_current():
    from app.constants.kvkk import KVKK_CONSENT_VERSION

    assert (
        user_needs_kvkk_consent(_user(consent_at=datetime.now(timezone.utc), version=KVKK_CONSENT_VERSION))
        is False
    )


def test_require_consent_raises_without_acceptance():
    db = MagicMock()
    user = _user()
    with pytest.raises(HTTPException) as exc:
        require_and_record_kvkk_consent(db, user, accepted=False)
    assert exc.value.status_code == 422


def test_require_consent_skips_when_already_recorded():
    from app.constants.kvkk import KVKK_CONSENT_VERSION

    db = MagicMock()
    user = _user(consent_at=datetime.now(timezone.utc), version=KVKK_CONSENT_VERSION)
    require_and_record_kvkk_consent(db, user, accepted=False)
    db.commit.assert_not_called()

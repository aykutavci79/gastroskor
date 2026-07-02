"""Deneme panel basvurusu — vergi levhasi olmadan."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.services.panel_application import submit_panel_application


class _FakeUpload:
    filename = ""

    async def read(self) -> bytes:
        return b""


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.mark.asyncio
async def test_submit_trial_application_without_tax_document(db: Session) -> None:
    app = await submit_panel_application(
        db,
        business_name="Deneme Restoran",
        contact_name="Ali Veli",
        panel_email="owner@example.com",
        phone="05321234567",
        address="",
        city="Bursa",
        website=None,
        google_place_id="ChIJtest",
        google_place_name="Deneme Restoran",
        applicant_notes=None,
        kvkk_consent=True,
        tax_file=None,
    )
    assert app.status == "pending"
    assert app.tax_document_key is None
    assert app.contract_version is None


@pytest.mark.asyncio
async def test_submit_requires_google_place(db: Session) -> None:
    with pytest.raises(HTTPException) as exc:
        await submit_panel_application(
            db,
            business_name="Deneme Restoran",
            contact_name="Ali Veli",
            panel_email="owner2@example.com",
            phone="05321234567",
            address="Adres",
            city="Bursa",
            website=None,
            google_place_id=None,
            google_place_name=None,
            applicant_notes=None,
            kvkk_consent=True,
            tax_file=None,
        )
    assert exc.value.status_code == 422

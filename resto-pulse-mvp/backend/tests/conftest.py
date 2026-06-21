"""Shared pytest hooks — PostgreSQL JSONB/UUID tiplerini SQLite test DB ile uyumlu hale getirir."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import JSON, String, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB, UUID


class SqliteCompatUUID(TypeDecorator):
    """PostgreSQL UUID kolonlarini SQLite testlerinde string olarak saklar."""

    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value: object | None, dialect) -> str | None:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(value)

    def process_result_value(self, value: object | None, dialect) -> uuid.UUID | None:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


@pytest.fixture(scope="session", autouse=True)
def _sqlite_type_compat():
    """Prod modellere dokunmadan test oturumunda kolon tiplerini SQLite uyumlu yap."""
    from app.db.base import Base

    originals: list[tuple[object, object]] = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, JSONB):
                originals.append((column, column.type))
                column.type = JSON()
            elif isinstance(column.type, UUID):
                originals.append((column, column.type))
                column.type = SqliteCompatUUID()

    yield

    for column, original_type in originals:
        column.type = original_type

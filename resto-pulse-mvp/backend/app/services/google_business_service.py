from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RestaurantGoogleBusinessConnection, RestaurantOwnership
from app.services.google_business_client import GoogleBusinessClient, access_token_from_refresh
from app.services.google_business_oauth import (
    GoogleBusinessOAuthError,
    exchange_code_for_tokens,
    google_business_redirect_uri,
)
from app.services.google_business_own_analysis import analyze_own_google_business_reviews
from app.services.google_business_token import decrypt_refresh_token, encrypt_refresh_token
from app.services.ai_report_storage import save_google_business_report


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def connection_status_dict(conn: RestaurantGoogleBusinessConnection | None) -> dict:
    if conn is None or conn.status == "disconnected":
        return {
            "connected": False,
            "google_email": None,
            "location_title": None,
            "matched_place_id": None,
            "last_sync_at": None,
            "last_review_count": None,
            "last_error": None,
        }
    return {
        "connected": conn.status == "connected",
        "google_email": conn.google_email,
        "location_title": conn.gbp_location_title,
        "matched_place_id": conn.matched_place_id,
        "last_sync_at": conn.last_sync_at.isoformat() if conn.last_sync_at else None,
        "last_review_count": conn.last_review_count,
        "last_error": conn.last_error,
    }


def get_connection(db: Session, ownership_id: uuid.UUID) -> RestaurantGoogleBusinessConnection | None:
    return db.scalar(
        select(RestaurantGoogleBusinessConnection).where(
            RestaurantGoogleBusinessConnection.ownership_id == ownership_id
        )
    )


async def complete_oauth_connection(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    user_email: str,
    code: str,
) -> RestaurantGoogleBusinessConnection:
    tokens = await exchange_code_for_tokens(code)
    refresh = tokens.get("refresh_token")
    if not refresh:
        raise GoogleBusinessOAuthError(
            "Google yenileme anahtari alinamadi. Baglanti sirasinda 'Erisim izni ver' secildiginden emin olun."
        )

    access = await access_token_from_refresh(str(refresh))
    client = GoogleBusinessClient(access)
    matched = await client.find_location_for_place(ownership.google_place_id)
    if matched is None:
        raise GoogleBusinessOAuthError(
            "Bu Google hesabinda paneldeki mekan bulunamadi. "
            "Ayni isletmenin sahibi/oldugu Google Isletme hesabi ile giris yapin."
        )

    existing = get_connection(db, ownership.id)
    if existing is None:
        existing = RestaurantGoogleBusinessConnection(ownership_id=ownership.id)
        db.add(existing)

    existing.google_email = user_email
    existing.gbp_account_name = matched.account_name
    existing.gbp_location_name = matched.location_name
    existing.gbp_location_title = matched.location_title
    existing.matched_place_id = matched.place_id or ownership.google_place_id
    existing.refresh_token_enc = encrypt_refresh_token(str(refresh))
    existing.status = "connected"
    existing.last_error = None
    existing.connected_at = existing.connected_at or _utcnow()
    existing.updated_at = _utcnow()
    db.flush()
    return existing


def disconnect_google_business(db: Session, ownership_id: uuid.UUID) -> None:
    conn = get_connection(db, ownership_id)
    if conn is None:
        return
    conn.refresh_token_enc = None
    conn.status = "disconnected"
    conn.last_error = None
    conn.updated_at = _utcnow()
    db.add(conn)


async def run_google_business_full_analysis(
    db: Session,
    ownership: RestaurantOwnership,
) -> dict:
    conn = get_connection(db, ownership.id)
    if conn is None or conn.status != "connected" or not conn.refresh_token_enc:
        raise GoogleBusinessOAuthError("Google Isletme hesabi bagli degil.")

    refresh = decrypt_refresh_token(conn.refresh_token_enc)
    if not refresh:
        conn.status = "error"
        conn.last_error = "Sakli Google anahtari cozulemedi. Tekrar baglayin."
        db.add(conn)
        raise GoogleBusinessOAuthError(conn.last_error)

    try:
        access = await access_token_from_refresh(refresh)
        client = GoogleBusinessClient(access)
        if not conn.gbp_account_name or not conn.gbp_location_name:
            raise GoogleBusinessOAuthError("Kayitli Google konum bilgisi eksik. Tekrar baglayin.")

        reviews, total = await client.list_all_reviews(
            account_name=conn.gbp_account_name,
            location_name=conn.gbp_location_name,
        )
        place_name = (
            ownership.restaurant.name if ownership.restaurant else conn.gbp_location_title or "Isletmeniz"
        )
        report = await analyze_own_google_business_reviews(
            reviews=reviews,
            place_name=place_name,
            total_count=total,
        )

        saved = save_google_business_report(
            db,
            ownership_id=ownership.id,
            place_name=place_name,
            report=report,
        )

        conn.last_sync_at = _utcnow()
        conn.last_review_count = total
        conn.last_error = None
        conn.updated_at = _utcnow()
        db.add(conn)
        db.flush()

        result = report.copy()
        result["saved_report_id"] = str(saved.id)
        result["report_source"] = "google_business"
        return result
    except GoogleBusinessOAuthError as exc:
        conn.last_error = str(exc)
        conn.updated_at = _utcnow()
        db.add(conn)
        raise


def oauth_redirect_uri_public() -> str:
    return google_business_redirect_uri()

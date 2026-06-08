from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants.panel_contract import (
    CONTRACT_POSTAL_ADDRESS,
    PANEL_CONTRACT_VERSION,
    SUPPORT_EMAIL,
    panel_contract_text,
)
from app.models import RestaurantOwnership, RestaurantPanelApplication, User
from app.services.business_document_storage import document_download_name, read_business_document, save_business_document
from app.services.email_notify import send_panel_email
from app.services.panel_access import start_trial
from app.services.restaurant_claim import ensure_restaurant_for_place

APPLICATION_VERIFICATION_METHOD = "business_application"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def application_to_dict(app: RestaurantPanelApplication) -> dict:
    return {
        "id": str(app.id),
        "status": app.status,
        "business_name": app.business_name,
        "contact_name": app.contact_name,
        "panel_email": app.panel_email,
        "phone": app.phone,
        "address": app.address,
        "city": app.city,
        "website": app.website,
        "google_place_id": app.google_place_id,
        "google_place_name": app.google_place_name,
        "contract_version": app.contract_version,
        "contract_accepted_at": app.contract_accepted_at.isoformat() if app.contract_accepted_at else None,
        "contract_postal_promised": app.contract_postal_promised,
        "applicant_notes": app.applicant_notes,
        "admin_notes": app.admin_notes,
        "reviewed_at": app.reviewed_at.isoformat() if app.reviewed_at else None,
        "reviewed_by_email": app.reviewed_by_email,
        "ownership_id": str(app.ownership_id) if app.ownership_id else None,
        "created_at": app.created_at.isoformat() if app.created_at else None,
    }


async def submit_panel_application(
    db: Session,
    *,
    business_name: str,
    contact_name: str,
    panel_email: str,
    phone: str,
    address: str,
    city: str,
    website: str | None,
    google_place_id: str | None,
    google_place_name: str | None,
    applicant_notes: str | None,
    contract_accepted: bool,
    contract_postal_promised: bool,
    tax_file: UploadFile,
) -> RestaurantPanelApplication:
    business_name = business_name.strip()
    contact_name = contact_name.strip()
    panel_email = panel_email.strip().lower()
    phone = phone.strip()
    address = address.strip()
    city = (city or "Bursa").strip() or "Bursa"

    if len(business_name) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="İşletme adı gerekli.")
    if len(contact_name) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Yetkili adı gerekli.")
    if not EMAIL_RE.match(panel_email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçerli panel e-postası girin.")
    if len(phone) < 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Telefon gerekli.")
    if len(address) < 5:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Adres gerekli.")
    if not contract_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Devam etmek için sözleşmeyi okuyup kabul etmelisiniz.",
        )
    if not contract_postal_promised:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="İmzalı sözleşmeyi posta ile göndereceğinizi onaylamalısınız.",
        )

    pending = db.scalar(
        select(RestaurantPanelApplication).where(
            RestaurantPanelApplication.panel_email == panel_email,
            RestaurantPanelApplication.status == "pending",
        )
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta ile bekleyen bir başvuru zaten var. destek@gastroskor.com.tr ile iletişime geçin.",
        )

    raw = await tax_file.read()
    content_type = (tax_file.content_type or "application/octet-stream").lower()
    storage_key = save_business_document(data=raw, content_type=content_type)

    now = _utcnow()
    application = RestaurantPanelApplication(
        status="pending",
        business_name=business_name,
        contact_name=contact_name,
        panel_email=panel_email,
        phone=phone,
        address=address,
        city=city,
        website=(website or "").strip() or None,
        google_place_id=(google_place_id or "").strip() or None,
        google_place_name=(google_place_name or "").strip() or None,
        tax_document_key=storage_key,
        tax_document_content_type=content_type,
        contract_version=PANEL_CONTRACT_VERSION,
        contract_accepted_at=now,
        contract_postal_promised=contract_postal_promised,
        applicant_notes=(applicant_notes or "").strip() or None,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    await _notify_application_received(application)
    return application


async def _notify_application_received(app: RestaurantPanelApplication) -> None:
    place_line = app.google_place_name or app.google_place_id or "—"
    admin_body = (
        f"Yeni işletme paneli başvurusu\n\n"
        f"İşletme: {app.business_name}\n"
        f"Yetkili: {app.contact_name}\n"
        f"Panel e-posta: {app.panel_email}\n"
        f"Telefon: {app.phone}\n"
        f"Adres: {app.address}, {app.city}\n"
        f"Google mekan: {place_line}\n"
        f"Başvuru no: {app.id}\n"
    )
    await send_panel_email(
        to_email=SUPPORT_EMAIL,
        subject=f"[GastroSkor] Yeni panel başvurusu — {app.business_name}",
        body_text=admin_body,
    )
    applicant_body = (
        f"Merhaba {app.contact_name},\n\n"
        f"{app.business_name} için GastroSkor restoran paneli başvurunuz alındı.\n"
        f"İnceleme sonrası {app.panel_email} adresine bilgi verilecektir.\n\n"
        f"Önemli: Başvuru sırasında kabul ettiğiniz sözleşmenin imzalı nüshasını deneme süresi bitmeden "
        f"posta ile göndermeniz gerekir. Gönderim adresi onay e-postasında paylaşılır.\n\n"
        f"Sorularınız için: {SUPPORT_EMAIL}"
    )
    await send_panel_email(
        to_email=app.panel_email,
        subject="GastroSkor panel başvurunuz alındı",
        body_text=applicant_body,
    )


def list_panel_applications(db: Session, *, status_filter: str | None = None) -> list[dict]:
    stmt = select(RestaurantPanelApplication).order_by(RestaurantPanelApplication.created_at.desc())
    if status_filter:
        stmt = stmt.where(RestaurantPanelApplication.status == status_filter)
    apps = db.scalars(stmt).all()
    return [application_to_dict(app) for app in apps]


async def approve_panel_application(
    db: Session,
    *,
    application_id: UUID,
    admin_email: str,
    force_takeover: bool = False,
    admin_note: str | None = None,
) -> RestaurantPanelApplication:
    app = db.get(RestaurantPanelApplication, application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başvuru bulunamadı.")
    if app.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Başvuru zaten işlenmiş.")

    if not app.google_place_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Başvuruda Google mekan seçilmemiş. Reddedip yeniden başvuru isteyin.",
        )

    user = db.scalar(select(User).where(User.email == app.panel_email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Başvuru sahibi ({app.panel_email}) henüz Google ile giriş yapmamış. "
                "Önce aynı e-posta ile gastroskor.com.tr üzerinden giriş yapmalı."
            ),
        )

    ownership = await _grant_ownership_from_application(
        db,
        user=user,
        application=app,
        force_takeover=force_takeover,
        admin_note=admin_note,
    )

    now = _utcnow()
    app.status = "approved"
    app.reviewed_at = now
    app.reviewed_by_email = admin_email.strip().lower()
    app.ownership_id = ownership.id
    app.admin_notes = (admin_note or "").strip() or app.admin_notes
    db.add(app)
    db.commit()
    db.refresh(app)

    await send_panel_email(
        to_email=app.panel_email,
        subject="GastroSkor panel başvurunuz onaylandı",
        body_text=(
            f"Merhaba {app.contact_name},\n\n"
            f"{app.business_name} için panel erişiminiz açıldı. Google hesabınızla /panel adresine girebilirsiniz.\n\n"
            f"İmzalı sözleşme gönderim adresi:\n{CONTRACT_POSTAL_ADDRESS}\n\n"
            f"Deneme süresi bitmeden imzalı nüshayı iletmezseniz panel kapatılır."
        ),
        cta_label="Panele git",
        cta_url="https://gastroskor.com.tr/panel",
    )
    return app


async def _grant_ownership_from_application(
    db: Session,
    *,
    user: User,
    application: RestaurantPanelApplication,
    force_takeover: bool,
    admin_note: str | None,
) -> RestaurantOwnership:
    place_id = application.google_place_id.strip()

    existing_place_owner = db.scalar(
        select(RestaurantOwnership).where(RestaurantOwnership.google_place_id == place_id)
    )
    if existing_place_owner and existing_place_owner.user_id != user.id:
        if not force_takeover:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mekan başka kullanıcıda. force_takeover=true ile devralınabilir.",
            )
        db.delete(existing_place_owner)
        db.flush()

    existing_user_owner = db.scalar(select(RestaurantOwnership).where(RestaurantOwnership.user_id == user.id))
    if existing_user_owner and existing_user_owner.google_place_id != place_id:
        if not force_takeover:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Kullanıcının başka mekanı var. force_takeover=true ile değiştirilebilir.",
            )
        db.delete(existing_user_owner)
        db.flush()

    restaurant = await ensure_restaurant_for_place(db, place_id=place_id, city=application.city)
    ownership = db.scalar(
        select(RestaurantOwnership).where(
            RestaurantOwnership.user_id == user.id,
            RestaurantOwnership.google_place_id == place_id,
        )
    )
    now = _utcnow()
    if ownership is None:
        ownership = RestaurantOwnership(
            user_id=user.id,
            restaurant_id=restaurant.id,
            google_place_id=place_id,
        )
        db.add(ownership)
        db.flush()
    else:
        ownership.restaurant_id = restaurant.id

    ownership.verification_method = APPLICATION_VERIFICATION_METHOD
    ownership.verification_status = "verified_sms"
    ownership.panel_tier = "full"
    ownership.verified_at = now
    ownership.visit_completed_at = now
    ownership.tax_document_note = f"Başvuru belgesi: {application.tax_document_key}"
    ownership.contract_required = True
    ownership.contract_electronic_accepted_at = application.contract_accepted_at
    ownership.contract_signed_received_at = None
    ownership.panel_application_id = application.id
    note = (admin_note or "").strip() or f"İşletme başvurusu onaylandı ({application.id})."
    ownership.admin_notes = note

    start_trial(db, ownership)
    db.add(ownership)
    db.flush()
    return ownership


def reject_panel_application(
    db: Session,
    *,
    application_id: UUID,
    admin_email: str,
    admin_note: str | None,
) -> RestaurantPanelApplication:
    app = db.get(RestaurantPanelApplication, application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başvuru bulunamadı.")
    if app.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Başvuru zaten işlenmiş.")

    app.status = "rejected"
    app.reviewed_at = _utcnow()
    app.reviewed_by_email = admin_email.strip().lower()
    if admin_note:
        app.admin_notes = admin_note.strip()
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def mark_contract_signed_received(
    db: Session,
    *,
    application_id: UUID,
    admin_email: str,
) -> dict:
    app = db.get(RestaurantPanelApplication, application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başvuru bulunamadı.")
    if app.status != "approved" or not app.ownership_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Onaylı başvuru veya panel kaydı yok.")

    ownership = db.get(RestaurantOwnership, app.ownership_id)
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Panel kaydı bulunamadı.")

    now = _utcnow()
    ownership.contract_signed_received_at = now
    db.add(ownership)
    note = f"İmzalı sözleşme alındı ({admin_email}, {now.date().isoformat()})."
    ownership.admin_notes = f"{ownership.admin_notes or ''}\n{note}".strip()
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return {
        "application": application_to_dict(app),
        "ownership_id": str(ownership.id),
        "contract_signed_received_at": ownership.contract_signed_received_at.isoformat(),
    }


def get_application_tax_document(application_id: UUID, db: Session) -> tuple[bytes, str, str]:
    app = db.get(RestaurantPanelApplication, application_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başvuru bulunamadı.")
    data, content_type = read_business_document(app.tax_document_key)
    filename = document_download_name(app.tax_document_key, prefix=f"basvuru-{str(application_id)[:8]}")
    return data, content_type, filename


def contract_payload() -> dict:
    return {
        "version": PANEL_CONTRACT_VERSION,
        "title": "GastroSkor Restoran Paneli Hizmet Sözleşmesi",
        "updated": "6 Haziran 2026",
        "text": panel_contract_text(),
        "postal_address": CONTRACT_POSTAL_ADDRESS,
        "support_email": SUPPORT_EMAIL,
    }

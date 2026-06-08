"""Online siparis red sebepleri — panel ve musteri bildirimi."""

from __future__ import annotations

ORDER_REJECT_REASONS: dict[str, str] = {
    "busy": "Restoran su an cok yogun",
    "product_unavailable": "Secilen urun(ler) stokta yok",
    "no_courier": "Kurye hizmeti su an musait degil",
    "closing": "Restoran su an siparis alamiyor",
    "other": "Diger",
}

ORDER_REJECT_REASON_CODES = frozenset(ORDER_REJECT_REASONS.keys())


def reject_reason_label(code: str | None) -> str | None:
    if not code:
        return None
    return ORDER_REJECT_REASONS.get(code.strip())


def validate_rejection_reason(*, reason_code: str | None, reason_text: str | None) -> tuple[str | None, str | None]:
    code = (reason_code or "").strip() or None
    text = (reason_text or "").strip() or None

    if not code and (not text or len(text) < 3):
        raise ValueError("Red icin bir sebep secin veya aciklama yazin (en az 3 karakter).")
    if code and code not in ORDER_REJECT_REASON_CODES:
        raise ValueError("Gecersiz red sebebi.")
    if text and len(text) > 500:
        raise ValueError("Aciklama en fazla 500 karakter olabilir.")

    return code, text


def build_reject_customer_message(*, reason_code: str | None, reason_text: str | None) -> str:
    parts: list[str] = []
    label = reject_reason_label(reason_code)
    if label and reason_code != "other":
        parts.append(label)
    elif reason_code == "other" and not reason_text:
        parts.append(ORDER_REJECT_REASONS["other"])
    if reason_text:
        parts.append(reason_text)
    if not parts:
        return "Siparisiniz restoran tarafindan reddedildi."
    return " — ".join(parts)

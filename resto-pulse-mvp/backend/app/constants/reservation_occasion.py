"""Rezervasyon ozel gun tipleri."""

from __future__ import annotations

import enum


class ReservationOccasionType(str, enum.Enum):
    birthday = "birthday"
    anniversary = "anniversary"
    business_dinner = "business_dinner"
    proposal = "proposal"
    celebration = "celebration"
    graduation = "graduation"
    baby_shower = "baby_shower"
    other = "other"


OCCASION_LABELS_TR: dict[ReservationOccasionType, str] = {
    ReservationOccasionType.birthday: "Doğum günü",
    ReservationOccasionType.anniversary: "Yıldönümü",
    ReservationOccasionType.business_dinner: "İş yemeği",
    ReservationOccasionType.proposal: "Evlilik teklifi",
    ReservationOccasionType.celebration: "Kutlama",
    ReservationOccasionType.graduation: "Mezuniyet",
    ReservationOccasionType.baby_shower: "Baby shower",
    ReservationOccasionType.other: "Diğer",
}


def occasion_label_tr(value: str | ReservationOccasionType | None) -> str | None:
    if not value:
        return None
    try:
        key = value if isinstance(value, ReservationOccasionType) else ReservationOccasionType(str(value))
    except ValueError:
        return None
    return OCCASION_LABELS_TR.get(key)

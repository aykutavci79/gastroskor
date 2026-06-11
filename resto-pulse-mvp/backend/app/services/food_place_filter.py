"""Canli arama — yeme-icme disi Google sonuclarini ele."""

from __future__ import annotations

from app.services.profanity_tr import normalize_review_text

FOOD_PLACE_TYPES = frozenset(
    {
        "restaurant",
        "food",
        "cafe",
        "bakery",
        "bar",
        "meal_takeaway",
        "meal_delivery",
        "night_club",
    }
)

EXCLUDE_PLACE_TYPES = frozenset(
    {
        "route",
        "street_address",
        "intersection",
        "geocode",
        "locality",
        "sublocality",
        "sublocality_level_1",
        "sublocality_level_2",
        "sublocality_level_3",
        "neighborhood",
        "political",
        "country",
        "administrative_area_level_1",
        "administrative_area_level_2",
        "administrative_area_level_3",
        "administrative_area_level_4",
        "postal_code",
        "postal_code_prefix",
        "plus_code",
        "premise",
        "subpremise",
        "floor",
        "room",
        "bus_station",
        "train_station",
        "transit_station",
        "subway_station",
        "light_rail_station",
        "parking",
        "gas_station",
        "bank",
        "atm",
        "finance",
        "insurance_agency",
        "real_estate_agency",
        "hospital",
        "doctor",
        "dentist",
        "pharmacy",
        "school",
        "university",
        "library",
        "lodging",
        "shopping_mall",
        "department_store",
        "store",
        "supermarket",
        "convenience_store",
        "church",
        "mosque",
        "park",
        "stadium",
        "gym",
        "spa",
    }
)

# Isim/adres: sokak, bina, is merkezi vb.
EXCLUDE_NAME_MARKERS = (
    " sokak",
    " sok.",
    " sok ",
    " sk.",
    " sk ",
    " cadde",
    " cad.",
    " cad ",
    " cd.",
    " bulvar",
    " bulv.",
    " bulv ",
    " is merkezi",
    " iş merkezi",
    " is merkez",
    " iş merkez",
    " plaza",
    " avm",
    " sitesi",
    " site ",
    " kule",
    " tower",
    " residence",
    " rezidans",
    " konut",
    " apartman",
    " otopark",
    " parki",
    " parkı",
    " sanayi sitesi",
    " organize sanayi",
    " osb ",
    " fabrika",
    " depo",
    " lojistik",
)


def _normalized_blob(*parts: str | None) -> str:
    return normalize_review_text(" ".join(p for p in parts if p)).lower()


def _looks_like_address_only(name: str) -> bool:
    """Ornek: 'Ataturk Caddesi', '15. Sokak'."""
    n = _normalized_blob(name)
    if not n:
        return True
    endings = (
        " sokak",
        " sok",
        " cadde",
        " cad",
        " bulvar",
        " bulv",
        " mahalle",
        " mah",
        " koyu",
        " koy",
    )
    return any(n.endswith(end) for end in endings)


def _has_excluded_name_marker(name: str, address: str | None) -> bool:
    blob = f" {_normalized_blob(name, address)} "
    return any(marker in blob for marker in EXCLUDE_NAME_MARKERS)


def is_food_related_place(
    *,
    name: str,
    address: str | None = None,
    types: list[str] | tuple[str, ...] | None = None,
    from_gastro_db: bool = False,
) -> bool:
    """GastroSkor canli aramada yeme-icme mekani mi?"""
    if from_gastro_db:
        return True

    type_set = {str(t).strip().lower() for t in (types or []) if t}
    name_clean = (name or "").strip()
    if not name_clean:
        return False

    if _has_excluded_name_marker(name_clean, address):
        return False
    if _looks_like_address_only(name_clean):
        return False

    if type_set & FOOD_PLACE_TYPES:
        return True

    if type_set & EXCLUDE_PLACE_TYPES:
        return False

    if type_set and type_set <= {"point_of_interest", "establishment"}:
        return False

    if not type_set:
        return not _looks_like_address_only(name_clean) and not _has_excluded_name_marker(
            name_clean, address
        )

    return False

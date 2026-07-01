from __future__ import annotations

ORDER_PAYMENT_METHOD_LABELS: dict[str, str] = {
    "cash": "Kapıda nakit",
    "card_at_door": "Kapıda kredi / banka kartı",
    "multinet": "Multinet",
    "pluxee": "Pluxee (Sodexo)",
    "ticket": "Ticket Restaurant (Edenred)",
    "setcard": "Setcard",
    "metropol": "MetropolCard",
    "paye": "Paye Kart",
    "tokenflex": "Token Flex",
    "yemekmatik": "Yemekmatik",
    "edenred": "Edenred",
    "winwin": "Winwin",
    "custom": "Diğer",
}

DEFAULT_ORDER_PAYMENT_METHODS: list[str] = ["cash", "card_at_door"]

PANEL_SELECTABLE_ORDER_PAYMENT_METHODS: list[str] = [
    "cash",
    "card_at_door",
    "multinet",
    "pluxee",
    "ticket",
    "setcard",
    "metropol",
    "paye",
    "tokenflex",
    "yemekmatik",
    "edenred",
    "winwin",
]


def normalize_order_payment_methods(raw: list[str] | None) -> list[str]:
    if not raw:
        return list(DEFAULT_ORDER_PAYMENT_METHODS)
    seen: set[str] = set()
    out: list[str] = []
    for code in raw:
        key = str(code or "").strip().lower()
        if not key or key == "custom" or key not in ORDER_PAYMENT_METHOD_LABELS:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out or list(DEFAULT_ORDER_PAYMENT_METHODS)


def payment_method_label(code: str, *, custom_label: str | None = None) -> str:
    key = (code or "").strip().lower()
    if key == "custom":
        label = (custom_label or "").strip()
        return label or "Özel ödeme"
    return ORDER_PAYMENT_METHOD_LABELS.get(key, key)


def build_order_payment_options(
    methods: list[str] | None,
    *,
    custom_label: str | None = None,
) -> list[dict[str, str]]:
    codes = normalize_order_payment_methods(methods)
    options = [{"code": code, "label": payment_method_label(code)} for code in codes]
    label = (custom_label or "").strip()
    if label:
        options.append({"code": "custom", "label": label})
    return options


def validate_order_payment_method(
    code: str,
    *,
    methods: list[str] | None,
    custom_label: str | None = None,
) -> str:
    key = (code or "").strip().lower()
    if not key:
        raise ValueError("Ödeme yöntemi seçin.")
    allowed = {row["code"] for row in build_order_payment_options(methods, custom_label=custom_label)}
    if key not in allowed:
        raise ValueError("Seçilen ödeme yöntemi bu restoran için geçerli değil.")
    return key

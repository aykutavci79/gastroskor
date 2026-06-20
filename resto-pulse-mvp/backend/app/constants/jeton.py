"""Jeton ekonomisi sabitleri — env ile override edilebilir (ileride)."""

from decimal import Decimal

JETON_DAILY_EARN_CAP = 100
JETON_ORDER_AMOUNT = 15
JETON_FIRST_ORDER_BONUS = 5
JETON_ORDER_MIN_TL = Decimal("50")
JETON_ORDER_DAILY_LIMIT = 2

JETON_FOLLOW_BUNDLE_AMOUNT = 10
JETON_FOLLOW_BUNDLE_THRESHOLD = 3

JETON_REFERRAL_AMOUNT = 10
JETON_REFERRAL_DAILY_LIMIT = 5

JETON_HINT_COST = 5
JETON_FREE_HINTS_PER_GAME = 2

# Hoş geldin hediyesi — hesap başına bir kez
JETON_WELCOME_BONUS = 10

# Günlük giriş — günde bir kez (Europe/Istanbul)
JETON_DAILY_LOGIN_AMOUNT = 10

# GS yorum + puan — günde bir kez (yayınlanan / gönderilen yorum)
JETON_REVIEW_AMOUNT = 5
JETON_REVIEW_DAILY_LIMIT = 1

REFERRAL_ATTRIBUTION_DAYS = 7

ISTANBUL_TZ = "Europe/Istanbul"

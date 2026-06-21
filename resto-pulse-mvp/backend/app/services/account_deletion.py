from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.models import (
    AppUsageEvent,
    CompensationCoupon,
    DmThread,
    FollowerCoupon,
    FoodcastPhoto,
    FoodcastPhotoReport,
    FriendRequest,
    GourmetChatAnswer,
    GourmetChatAssistantJob,
    GourmetChatMessage,
    GourmetChatQuestion,
    GourmetTriviaScore,
    JetonDailyEarnTotal,
    JetonFollowReward,
    JetonLedger,
    PrivateFeedback,
    PublicReview,
    Referral,
    ReferralAttribution,
    RestaurantOrder,
    RestaurantOrderStatus,
    RestaurantOwnership,
    RestaurantPanelApplication,
    Review,
    ReviewHelpfulVote,
    ReviewRemedyOffer,
    ReviewReply,
    RevokedRefreshToken,
    SocialProofJob,
    User,
    UserEglenceResult,
    UserFriendship,
    UserNotification,
    UserOrderPhoneOtp,
    UserPushToken,
    UserRestaurantFollow,
    Wallet,
    RestaurantCheckIn,
)
from app.services.access_token import decode_refresh_token
from app.services.refresh_token_revocation import revoke_refresh_token
from app.services.user_accounts import _is_uploaded_avatar_url
from app.services.user_avatar_storage import user_avatars_dir

logger = logging.getLogger(__name__)

DELETION_CONFIRMATION_PHRASE = "EVET SİL"
GOURMET_CHAT_DELETED_PLACEHOLDER = "[silindi]"
ANONYMIZED_ORDER_PHONE = "+00000000000"
DELETED_EMAIL_DOMAIN = "anon.gastroskor.invalid"


class AccountDeletionError(Exception):
    def __init__(self, *, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def is_deletion_confirmation_valid(value: str | None) -> bool:
    if not value:
        return False
    compact = re.sub(r"\s+", " ", value.strip())
    if compact == DELETION_CONFIRMATION_PHRASE:
        return True
    upper = compact.upper()
    return upper in {"EVET SIL", "EVET SİL"}


def deleted_user_email(user_id: UUID) -> str:
    return f"deleted-{user_id}@{DELETED_EMAIL_DOMAIN}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _best_effort_delete_uploaded_avatar(avatar_url: str | None) -> None:
    if not _is_uploaded_avatar_url(avatar_url):
        return
    filename = (avatar_url or "").rstrip("/").split("/")[-1]
    if not filename or "." not in filename:
        return
    path = user_avatars_dir() / filename
    try:
        if path.is_file():
            path.unlink()
    except OSError as exc:
        logger.warning("Avatar silinemedi (%s): %s", path, exc)


def _revoke_optional_refresh_token(db: Session, *, user_id: UUID, refresh_token: str | None) -> None:
    if not refresh_token:
        return
    try:
        claims = decode_refresh_token(refresh_token.strip())
    except ValueError as exc:
        raise AccountDeletionError(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gecersiz yenileme tokeni.",
        ) from exc
    if claims.user_id != user_id:
        raise AccountDeletionError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yenileme tokeni bu hesaba ait degil.",
        )
    revoke_refresh_token(
        db,
        jti=claims.jti,
        user_id=claims.user_id,
        expires_at=claims.expires_at,
    )


def _assert_can_delete(db: Session, user: User, *, confirmation: str) -> None:
    if user.deleted_at is not None:
        raise AccountDeletionError(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hesap zaten silinmis.",
        )
    if not is_deletion_confirmation_valid(confirmation):
        raise AccountDeletionError(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Silme onayi icin "{DELETION_CONFIRMATION_PHRASE}" yazin.',
        )

    pending_orders = db.scalar(
        select(RestaurantOrder.id).where(
            RestaurantOrder.user_id == user.id,
            RestaurantOrder.status == RestaurantOrderStatus.pending,
        ).limit(1)
    )
    if pending_orders is not None:
        raise AccountDeletionError(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bekleyen siparisiniz var. Once siparisi tamamlayin veya iptal edin.",
        )

    ownership = db.scalar(
        select(RestaurantOwnership.id).where(RestaurantOwnership.user_id == user.id).limit(1)
    )
    if ownership is not None:
        raise AccountDeletionError(
            status_code=status.HTTP_409_CONFLICT,
            detail="Panel/restoran sahibi hesabi buradan silinemez. Once panel devri veya destek ile iletisime gecin.",
        )


def delete_user_account(
    db: Session,
    *,
    user_id: UUID,
    confirmation: str,
    refresh_token: str | None = None,
) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise AccountDeletionError(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanici bulunamadi.",
        )

    original_email = user.email.strip().lower()
    _assert_can_delete(db, user, confirmation=confirmation)
    _revoke_optional_refresh_token(db, user_id=user_id, refresh_token=refresh_token)
    _best_effort_delete_uploaded_avatar(user.avatar_url)

    db.execute(
        update(RestaurantOrder)
        .where(RestaurantOrder.user_id == user_id)
        .values(
            customer_phone=ANONYMIZED_ORDER_PHONE,
            customer_name=None,
            customer_address=None,
            note=None,
        )
    )

    db.execute(update(Review).where(Review.author_id == user_id).values(author_id=None))
    db.execute(update(ReviewReply).where(ReviewReply.author_id == user_id).values(author_id=None))

    db.execute(
        update(GourmetChatMessage)
        .where(GourmetChatMessage.author_id == user_id)
        .values(body=GOURMET_CHAT_DELETED_PLACEHOLDER, mentions_json=[])
    )
    db.execute(
        update(GourmetChatQuestion)
        .where(GourmetChatQuestion.author_id == user_id)
        .values(body=GOURMET_CHAT_DELETED_PLACEHOLDER)
    )
    db.execute(
        update(GourmetChatAnswer)
        .where(GourmetChatAnswer.author_id == user_id)
        .values(body=GOURMET_CHAT_DELETED_PLACEHOLDER)
    )

    db.execute(
        delete(DmThread).where(
            or_(DmThread.user_low_id == user_id, DmThread.user_high_id == user_id)
        )
    )

    db.execute(delete(UserFriendship).where(
        or_(UserFriendship.user_id == user_id, UserFriendship.friend_user_id == user_id)
    ))
    db.execute(delete(FriendRequest).where(
        or_(FriendRequest.from_user_id == user_id, FriendRequest.to_user_id == user_id)
    ))
    db.execute(delete(UserRestaurantFollow).where(UserRestaurantFollow.user_id == user_id))
    db.execute(delete(RestaurantCheckIn).where(RestaurantCheckIn.user_id == user_id))
    db.execute(delete(UserPushToken).where(UserPushToken.user_id == user_id))
    db.execute(delete(UserNotification).where(UserNotification.user_id == user_id))
    db.execute(delete(UserOrderPhoneOtp).where(UserOrderPhoneOtp.user_id == user_id))
    db.execute(delete(PublicReview).where(PublicReview.author_id == user_id))
    db.execute(delete(PrivateFeedback).where(PrivateFeedback.author_id == user_id))
    db.execute(delete(ReviewHelpfulVote).where(ReviewHelpfulVote.user_id == user_id))
    db.execute(delete(ReviewRemedyOffer).where(ReviewRemedyOffer.user_id == user_id))
    db.execute(delete(CompensationCoupon).where(CompensationCoupon.user_id == user_id))
    db.execute(delete(UserEglenceResult).where(UserEglenceResult.user_id == user_id))
    db.execute(delete(SocialProofJob).where(SocialProofJob.user_id == user_id))
    db.execute(delete(GourmetTriviaScore).where(GourmetTriviaScore.user_id == user_id))
    db.execute(delete(GourmetChatAssistantJob).where(GourmetChatAssistantJob.trigger_user_id == user_id))
    db.execute(delete(JetonDailyEarnTotal).where(JetonDailyEarnTotal.user_id == user_id))
    db.execute(delete(JetonFollowReward).where(JetonFollowReward.user_id == user_id))
    db.execute(delete(FollowerCoupon).where(FollowerCoupon.user_id == user_id))
    db.execute(
        update(FollowerCoupon)
        .where(FollowerCoupon.redeemed_by_user_id == user_id)
        .values(redeemed_by_user_id=None)
    )
    db.execute(delete(ReferralAttribution).where(ReferralAttribution.referrer_id == user_id))
    db.execute(
        update(Referral)
        .where(Referral.referrer_id == user_id)
        .values(device_hash=None, ip_at_signup=None, referrer_id=None)
    )
    db.execute(
        update(Referral)
        .where(Referral.referred_id == user_id)
        .values(device_hash=None, ip_at_signup=None, referred_id=None)
    )
    db.execute(update(JetonLedger).where(JetonLedger.user_id == user_id).values(user_id=None))
    db.execute(delete(Wallet).where(Wallet.user_id == user_id))
    db.execute(delete(RevokedRefreshToken).where(RevokedRefreshToken.user_id == user_id))
    db.execute(update(AppUsageEvent).where(AppUsageEvent.user_id == user_id).values(user_id=None))
    db.execute(
        update(FoodcastPhoto)
        .where(FoodcastPhoto.author_id == user_id)
        .values(author_id=None, caption=None)
    )
    db.execute(
        update(FoodcastPhotoReport)
        .where(FoodcastPhotoReport.reporter_id == user_id)
        .values(reporter_id=None, reporter_email=None)
    )
    db.execute(
        update(RestaurantPanelApplication)
        .where(RestaurantPanelApplication.panel_email == original_email)
        .values(
            panel_email=f"deleted-{user_id}@{DELETED_EMAIL_DOMAIN}",
            contact_name="[silindi]",
            phone="+00000000000",
            address="[silindi]",
        )
    )

    user.email = deleted_user_email(user.id)
    user.full_name = None
    user.google_sub = None
    user.avatar_url = None
    user.avatar_preset = None
    user.nickname = None
    user.order_phone_e164 = None
    user.order_phone_verified_at = None
    user.kvkk_consent_at = None
    user.kvkk_consent_version = None
    user.default_review_name_display = "anonymous"
    user.review_moderation_strikes = 0
    user.review_banned_until = None
    user.first_order_bonus_claimed = False
    user.deleted_at = _utcnow()
    db.add(user)
    db.flush()

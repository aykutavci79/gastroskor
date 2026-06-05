from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlatformName(str, enum.Enum):
    google_maps = "google_maps"
    yemeksepeti = "yemeksepeti"
    tripadvisor = "tripadvisor"


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(30), default="end_user")
    review_moderation_strikes: Mapped[int] = mapped_column(Integer, default=0)
    review_banned_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    default_review_name_display: Mapped[str] = mapped_column(String(16), default="full")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    reviews: Mapped[list["Review"]] = relationship(back_populates="author")
    review_helpful_votes: Mapped[list["ReviewHelpfulVote"]] = relationship(back_populates="user")
    review_replies: Mapped[list["ReviewReply"]] = relationship(back_populates="author")
    public_reviews: Mapped[list["PublicReview"]] = relationship(back_populates="author")
    private_feedbacks: Mapped[list["PrivateFeedback"]] = relationship(back_populates="author")
    compensation_coupons: Mapped[list["CompensationCoupon"]] = relationship(back_populates="user")
    restaurant_ownerships: Mapped[list["RestaurantOwnership"]] = relationship(back_populates="user")
    panel_notifications: Mapped[list["PanelNotification"]] = relationship(back_populates="user")
    restaurant_follows: Mapped[list["UserRestaurantFollow"]] = relationship(back_populates="user")
    follower_coupons: Mapped[list["FollowerCoupon"]] = relationship(
        back_populates="user",
        foreign_keys="FollowerCoupon.user_id",
    )
    push_tokens: Mapped[list["UserPushToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["UserNotification"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserRestaurantFollow(Base):
    __tablename__ = "user_restaurant_follows"
    __table_args__ = (UniqueConstraint("user_id", "restaurant_id", name="uq_user_restaurant_follow"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="restaurant_follows")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="followers")


class UserPushToken(Base):
    __tablename__ = "user_push_tokens"
    __table_args__ = (UniqueConstraint("expo_push_token", name="uq_user_push_token"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expo_push_token: Mapped[str] = mapped_column(String(255))
    platform: Mapped[str | None] = mapped_column(String(20))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="push_tokens")


class UserNotification(Base):
    __tablename__ = "user_notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    notification_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, default=None)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="notifications")


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    city: Mapped[str | None] = mapped_column(String(120), index=True)
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    address: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    category: Mapped[str | None] = mapped_column(String(120))
    geo_indications: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    has_geographical_indication: Mapped[bool] = mapped_column(Boolean, default=False)
    gi_product_name: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    platform_profiles: Mapped[list["RestaurantPlatformProfile"]] = relationship(back_populates="restaurant")
    reviews: Mapped[list["Review"]] = relationship(back_populates="restaurant")
    public_reviews: Mapped[list["PublicReview"]] = relationship(back_populates="restaurant")
    private_feedbacks: Mapped[list["PrivateFeedback"]] = relationship(back_populates="restaurant")
    compensation_coupons: Mapped[list["CompensationCoupon"]] = relationship(back_populates="restaurant")
    ownerships: Mapped[list["RestaurantOwnership"]] = relationship(back_populates="restaurant")
    analytics_events: Mapped[list["RestaurantAnalyticsEvent"]] = relationship(back_populates="restaurant")
    followers: Mapped[list["UserRestaurantFollow"]] = relationship(back_populates="restaurant")
    follower_promotions: Mapped[list["FollowerPromotion"]] = relationship(back_populates="restaurant")
    follower_coupons: Mapped[list["FollowerCoupon"]] = relationship(back_populates="restaurant")


class FollowerPromotion(Base):
    __tablename__ = "follower_promotions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    discount_percent: Mapped[int] = mapped_column(Integer)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    max_coupons: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="follower_promotions")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="follower_promotions")
    coupons: Mapped[list["FollowerCoupon"]] = relationship(back_populates="promotion", cascade="all, delete-orphan")


class FollowerCoupon(Base):
    __tablename__ = "follower_coupons"
    __table_args__ = (
        UniqueConstraint("promotion_id", "user_id", name="uq_follower_coupon_promo_user"),
        UniqueConstraint("code", name="uq_follower_coupon_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promotion_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("follower_promotions.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(20), default="issued", index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    redeemed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    promotion: Mapped["FollowerPromotion"] = relationship(back_populates="coupons")
    user: Mapped["User"] = relationship(back_populates="follower_coupons", foreign_keys=[user_id])
    restaurant: Mapped["Restaurant"] = relationship(back_populates="follower_coupons")
    redeemed_by: Mapped["User | None"] = relationship(foreign_keys=[redeemed_by_user_id])


class RestaurantOwnership(Base):
    __tablename__ = "restaurant_ownerships"
    __table_args__ = (
        UniqueConstraint("user_id", "restaurant_id", name="uq_user_restaurant_ownership"),
        UniqueConstraint("google_place_id", name="uq_google_place_ownership"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    google_place_id: Mapped[str] = mapped_column(String(255), index=True)
    verification_method: Mapped[str | None] = mapped_column(String(30))
    verification_status: Mapped[str] = mapped_column(String(30), default="pending_sms", index=True)
    panel_tier: Mapped[str] = mapped_column(String(20), default="limited")
    phone_e164: Mapped[str | None] = mapped_column(String(32))
    phone_last_four: Mapped[str | None] = mapped_column(String(4))
    tax_document_note: Mapped[str | None] = mapped_column(Text)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    visit_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_competitor_ai_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    promo_has_own_courier: Mapped[bool] = mapped_column(Boolean, default=False)
    promo_direct_order_text: Mapped[str | None] = mapped_column(String(120))
    promo_direct_order_phone: Mapped[str | None] = mapped_column(String(32))
    promo_direct_order_whatsapp: Mapped[str | None] = mapped_column(String(32))
    promo_direct_order_url: Mapped[str | None] = mapped_column(String(500))
    promo_menu_image_url: Mapped[str | None] = mapped_column(String(1024))
    promo_card_cover_image_url: Mapped[str | None] = mapped_column(String(1024))
    promo_instagram: Mapped[str | None] = mapped_column(String(120))
    card_emoji: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="restaurant_ownerships")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="ownerships")
    subscription: Mapped["RestaurantSubscription | None"] = relationship(
        back_populates="ownership", uselist=False
    )
    competitors: Mapped[list["RestaurantCompetitor"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan"
    )
    otp_challenges: Mapped[list["RestaurantOtpChallenge"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan"
    )
    menu_items: Mapped[list["RestaurantMenuItem"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan", order_by="RestaurantMenuItem.sort_order"
    )
    notification_preferences: Mapped["PanelNotificationPreference | None"] = relationship(
        back_populates="ownership", uselist=False, cascade="all, delete-orphan"
    )
    notifications: Mapped[list["PanelNotification"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan"
    )
    follower_promotions: Mapped[list["FollowerPromotion"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan"
    )


class PanelNotificationPreference(Base):
    __tablename__ = "panel_notification_preferences"
    __table_args__ = (UniqueConstraint("ownership_id", name="uq_panel_notification_prefs_ownership"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    analysis_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    negative_review_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    competitor_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="notification_preferences")


class PanelNotification(Base):
    __tablename__ = "panel_notifications"
    __table_args__ = (UniqueConstraint("ownership_id", "dedupe_key", name="uq_panel_notification_dedupe"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    notification_type: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    cta_label: Mapped[str | None] = mapped_column(String(80))
    cta_url: Mapped[str | None] = mapped_column(String(500))
    dedupe_key: Mapped[str] = mapped_column(String(255))
    email_status: Mapped[str] = mapped_column(String(20), default="pending")
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email_error: Mapped[str | None] = mapped_column(Text)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="notifications")
    user: Mapped["User"] = relationship(back_populates="panel_notifications")


class RestaurantMenuItem(Base):
    __tablename__ = "restaurant_menu_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    price_tl: Mapped[float] = mapped_column(Numeric(10, 2))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="menu_items")


class RestaurantSubscription(Base):
    __tablename__ = "restaurant_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), unique=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), default="trial", index=True)
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    intro_price_used: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ai_analysis_interval_days: Mapped[int] = mapped_column(Integer, default=33)
    ai_analysis_plan: Mapped[str] = mapped_column(String(20), default="standart")
    ai_extra_credits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="subscription")


class RestaurantOtpChallenge(Base):
    __tablename__ = "restaurant_otp_challenges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    phone_e164: Mapped[str] = mapped_column(String(32))
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="otp_challenges")


class RestaurantCompetitor(Base):
    __tablename__ = "restaurant_competitors"
    __table_args__ = (UniqueConstraint("ownership_id", "google_place_id", name="uq_ownership_competitor_place"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    google_place_id: Mapped[str] = mapped_column(String(255), index=True)
    competitor_name: Mapped[str] = mapped_column(String(255))
    competitor_restaurant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), index=True
    )
    last_rating: Mapped[float | None] = mapped_column(Float)
    last_review_count: Mapped[int | None] = mapped_column(Integer)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="competitors")


class RestaurantAnalyticsEvent(Base):
    __tablename__ = "restaurant_analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), index=True
    )
    place_id: Mapped[str | None] = mapped_column(String(255), index=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    restaurant: Mapped["Restaurant | None"] = relationship(back_populates="analytics_events")


class AppUsageEvent(Base):
    """Mobil oturum ve sunucu tarafi KPI olaylari."""

    __tablename__ = "app_usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    session_id: Mapped[str | None] = mapped_column(String(64), index=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    platform: Mapped[str | None] = mapped_column(String(16))
    app_version: Mapped[str | None] = mapped_column(String(32))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class RestaurantPlatformProfile(Base):
    __tablename__ = "restaurant_platform_profiles"
    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
        UniqueConstraint("restaurant_id", "platform", name="uq_restaurant_platform"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[PlatformName] = mapped_column(Enum(PlatformName), index=True)
    external_id: Mapped[str] = mapped_column(String(255), index=True)  # google place id vb.
    profile_url: Mapped[str | None] = mapped_column(String(1024))
    avg_rating: Mapped[float | None] = mapped_column(Float)
    review_count: Mapped[int | None] = mapped_column(Integer)
    photo_reference: Mapped[str | None] = mapped_column(String(512))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    restaurant: Mapped["Restaurant"] = relationship(back_populates="platform_profiles")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    source_platform: Mapped[PlatformName | None] = mapped_column(Enum(PlatformName), index=True)
    source_review_id: Mapped[str | None] = mapped_column(String(255))

    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    review_text: Mapped[str] = mapped_column(Text)
    review_lang: Mapped[str | None] = mapped_column(String(10))

    sentiment_label: Mapped[SentimentLabel | None] = mapped_column(Enum(SentimentLabel))
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    ai_raw_payload: Mapped[dict | None] = mapped_column(JSON)

    published_to_google: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    author_name_display: Mapped[str] = mapped_column(String(16), default="full")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    restaurant: Mapped["Restaurant"] = relationship(back_populates="reviews")
    author: Mapped["User | None"] = relationship(back_populates="reviews")
    category_scores: Mapped[list["ReviewCategoryScore"]] = relationship(back_populates="review")
    images: Mapped[list["ReviewImage"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="ReviewImage.sort_order",
    )
    helpful_votes: Mapped[list["ReviewHelpfulVote"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
    )
    replies: Mapped[list["ReviewReply"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="ReviewReply.created_at.asc()",
    )


class ReviewHelpfulVote(Base):
    __tablename__ = "review_helpful_votes"
    __table_args__ = (UniqueConstraint("review_id", "user_id", name="uq_review_helpful_vote"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="helpful_votes")
    user: Mapped["User"] = relationship(back_populates="review_helpful_votes")


class ReviewReply(Base):
    __tablename__ = "review_replies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    reply_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    review: Mapped["Review"] = relationship(back_populates="replies")
    author: Mapped["User | None"] = relationship(back_populates="review_replies")


class ReviewImage(Base):
    __tablename__ = "review_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), index=True
    )
    image_url: Mapped[str] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="images")


class ReviewCategoryScore(Base):
    __tablename__ = "review_category_scores"
    __table_args__ = (UniqueConstraint("review_id", "category", name="uq_review_category"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(40), index=True)  # lezzet, servis, fiyat, hijyen
    score: Mapped[float | None] = mapped_column(Float)
    label: Mapped[SentimentLabel | None] = mapped_column(Enum(SentimentLabel))
    reason: Mapped[str | None] = mapped_column(Text)

    review: Mapped["Review"] = relationship(back_populates="category_scores")


class PublicReview(Base):
    __tablename__ = "public_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    place_id: Mapped[str] = mapped_column(String(255), index=True)
    restaurant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    review_text: Mapped[str] = mapped_column(Text)
    sentiment_label: Mapped[SentimentLabel | None] = mapped_column(Enum(SentimentLabel), index=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    author: Mapped["User"] = relationship(back_populates="public_reviews")
    restaurant: Mapped["Restaurant | None"] = relationship(back_populates="public_reviews")


class PrivateFeedback(Base):
    __tablename__ = "private_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    place_id: Mapped[str] = mapped_column(String(255), index=True)
    restaurant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)
    severity: Mapped[str] = mapped_column(String(30), default="medium", index=True)
    visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    author: Mapped["User"] = relationship(back_populates="private_feedbacks")
    restaurant: Mapped["Restaurant | None"] = relationship(back_populates="private_feedbacks")
    messages: Mapped[list["FeedbackMessage"]] = relationship(
        back_populates="feedback", cascade="all, delete-orphan"
    )
    compensation_coupons: Mapped[list["CompensationCoupon"]] = relationship(
        back_populates="feedback", cascade="all, delete-orphan"
    )


class FeedbackMessage(Base):
    __tablename__ = "feedback_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("private_feedbacks.id", ondelete="CASCADE"), index=True
    )
    sender_type: Mapped[str] = mapped_column(String(20), index=True)  # user | restaurant
    message: Mapped[str] = mapped_column(Text)
    attachments_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    feedback: Mapped["PrivateFeedback"] = relationship(back_populates="messages")


class CompensationCoupon(Base):
    __tablename__ = "compensation_coupons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("private_feedbacks.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    discount_percent: Mapped[int] = mapped_column(Integer)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="issued", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    feedback: Mapped["PrivateFeedback"] = relationship(back_populates="compensation_coupons")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="compensation_coupons")
    user: Mapped["User"] = relationship(back_populates="compensation_coupons")


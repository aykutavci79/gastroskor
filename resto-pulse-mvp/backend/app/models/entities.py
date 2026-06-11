from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
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


class FriendRequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"
    blocked = "blocked"


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
    nickname: Mapped[str | None] = mapped_column(String(32), index=True)
    avatar_preset: Mapped[str | None] = mapped_column(String(32))
    order_phone_e164: Mapped[str | None] = mapped_column(String(32))
    order_phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
    gourmet_chat_questions: Mapped[list["GourmetChatQuestion"]] = relationship(back_populates="author")
    gourmet_chat_answers: Mapped[list["GourmetChatAnswer"]] = relationship(back_populates="author")
    gourmet_chat_messages: Mapped[list["GourmetChatMessage"]] = relationship(back_populates="author")
    friendships_initiated: Mapped[list["UserFriendship"]] = relationship(
        back_populates="user",
        foreign_keys="UserFriendship.user_id",
    )
    friendships_received: Mapped[list["UserFriendship"]] = relationship(
        back_populates="friend",
        foreign_keys="UserFriendship.friend_user_id",
    )
    dm_messages_sent: Mapped[list["DmMessage"]] = relationship(back_populates="sender")
    dm_read_states: Mapped[list["DmReadState"]] = relationship(back_populates="user")
    check_ins: Mapped[list["RestaurantCheckIn"]] = relationship(back_populates="user")
    friend_requests_sent: Mapped[list["FriendRequest"]] = relationship(
        back_populates="from_user",
        foreign_keys="FriendRequest.from_user_id",
    )
    friend_requests_received: Mapped[list["FriendRequest"]] = relationship(
        back_populates="to_user",
        foreign_keys="FriendRequest.to_user_id",
    )
    restaurant_orders: Mapped[list["RestaurantOrder"]] = relationship(back_populates="user")
    order_phone_otps: Mapped[list["UserOrderPhoneOtp"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserOrderPhoneOtp(Base):
    __tablename__ = "user_order_phone_otps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    phone_e164: Mapped[str] = mapped_column(String(32))
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="order_phone_otps")


class FriendRequest(Base):
    __tablename__ = "friend_requests"
    __table_args__ = (UniqueConstraint("from_user_id", "to_user_id", name="uq_friend_request_pair"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[FriendRequestStatus] = mapped_column(
        Enum(FriendRequestStatus), default=FriendRequestStatus.pending, index=True
    )
    rejection_count: Mapped[int] = mapped_column(Integer, default=0)
    last_rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    from_user: Mapped["User"] = relationship(back_populates="friend_requests_sent", foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship(back_populates="friend_requests_received", foreign_keys=[to_user_id])


class UserFriendship(Base):
    __tablename__ = "user_friendships"
    __table_args__ = (UniqueConstraint("user_id", "friend_user_id", name="uq_user_friendship"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    friend_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="friendships_initiated", foreign_keys=[user_id])
    friend: Mapped["User"] = relationship(back_populates="friendships_received", foreign_keys=[friend_user_id])


class DmThread(Base):
    __tablename__ = "dm_threads"
    __table_args__ = (UniqueConstraint("user_low_id", "user_high_id", name="uq_dm_thread_pair"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_low_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user_high_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    messages: Mapped[list["DmMessage"]] = relationship(back_populates="thread", cascade="all, delete-orphan")
    read_states: Mapped[list["DmReadState"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class DmMessage(Base):
    __tablename__ = "dm_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dm_threads.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    thread: Mapped["DmThread"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(back_populates="dm_messages_sent")


class DmReadState(Base):
    __tablename__ = "dm_read_states"
    __table_args__ = (UniqueConstraint("thread_id", "user_id", name="uq_dm_read_state"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dm_threads.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    last_read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    thread: Mapped["DmThread"] = relationship(back_populates="read_states")
    user: Mapped["User"] = relationship(back_populates="dm_read_states")


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
    check_ins: Mapped[list["RestaurantCheckIn"]] = relationship(back_populates="restaurant")
    orders: Mapped[list["RestaurantOrder"]] = relationship(back_populates="restaurant")


class RestaurantCheckIn(Base):
    __tablename__ = "restaurant_check_ins"
    __table_args__ = (
        UniqueConstraint("user_id", "restaurant_id", "check_in_date", name="uq_check_in_per_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    check_in_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    user: Mapped["User"] = relationship(back_populates="check_ins")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="check_ins")


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


class RestaurantPanelApplication(Base):
    __tablename__ = "restaurant_panel_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    business_name: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str] = mapped_column(String(120))
    panel_email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(32))
    address: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(80), default="Bursa")
    website: Mapped[str | None] = mapped_column(String(500))
    google_place_id: Mapped[str | None] = mapped_column(String(255))
    google_place_name: Mapped[str | None] = mapped_column(String(255))
    tax_document_key: Mapped[str] = mapped_column(String(512))
    tax_document_content_type: Mapped[str] = mapped_column(String(80))
    contract_version: Mapped[str] = mapped_column(String(40))
    contract_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    contract_postal_promised: Mapped[bool] = mapped_column(Boolean, default=True)
    applicant_notes: Mapped[str | None] = mapped_column(Text)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by_email: Mapped[str | None] = mapped_column(String(255))
    ownership_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ownership: Mapped["RestaurantOwnership | None"] = relationship(foreign_keys=[ownership_id])


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
    online_orders_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    online_order_category_tags: Mapped[list] = mapped_column(JSON, default=list)
    promo_direct_order_text: Mapped[str | None] = mapped_column(String(120))
    promo_direct_order_phone: Mapped[str | None] = mapped_column(String(32))
    promo_direct_order_whatsapp: Mapped[str | None] = mapped_column(String(32))
    promo_direct_order_url: Mapped[str | None] = mapped_column(String(500))
    promo_menu_image_url: Mapped[str | None] = mapped_column(String(1024))
    promo_card_cover_image_url: Mapped[str | None] = mapped_column(String(1024))
    promo_instagram: Mapped[str | None] = mapped_column(String(120))
    card_emoji: Mapped[str | None] = mapped_column(String(16))
    contract_required: Mapped[bool] = mapped_column(Boolean, default=False)
    contract_electronic_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contract_signed_received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    panel_application_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_panel_applications.id", ondelete="SET NULL")
    )
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
    ai_analysis_reports: Mapped[list["RestaurantAiAnalysisReport"]] = relationship(
        back_populates="ownership", cascade="all, delete-orphan"
    )
    google_business_connection: Mapped["RestaurantGoogleBusinessConnection | None"] = relationship(
        back_populates="ownership", uselist=False, cascade="all, delete-orphan"
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
    panel_application: Mapped["RestaurantPanelApplication | None"] = relationship(
        foreign_keys=[panel_application_id], uselist=False
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
    voice_product_slug: Mapped[str | None] = mapped_column(String(60), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="menu_items")


class RestaurantOrderStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class RestaurantOrder(Base):
    __tablename__ = "restaurant_orders"
    __table_args__ = (
        UniqueConstraint(
            "restaurant_id",
            "order_day",
            "daily_no",
            name="uq_restaurant_orders_daily_no",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    customer_phone: Mapped[str] = mapped_column(String(32))
    customer_name: Mapped[str | None] = mapped_column(String(120))
    customer_address: Mapped[str | None] = mapped_column(Text)
    order_day: Mapped[date | None] = mapped_column(Date, index=True)
    daily_no: Mapped[int | None] = mapped_column(Integer)
    reject_reason_code: Mapped[str | None] = mapped_column(String(40))
    reject_reason_text: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RestaurantOrderStatus] = mapped_column(
        Enum(RestaurantOrderStatus), default=RestaurantOrderStatus.pending, index=True
    )
    total_tl: Mapped[float] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    restaurant: Mapped["Restaurant"] = relationship(back_populates="orders")
    user: Mapped["User"] = relationship(back_populates="restaurant_orders")
    lines: Mapped[list["RestaurantOrderLine"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class RestaurantOrderLine(Base):
    __tablename__ = "restaurant_order_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_orders.id", ondelete="CASCADE"), index=True
    )
    menu_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_menu_items.id", ondelete="SET NULL"), nullable=True
    )
    name_snapshot: Mapped[str] = mapped_column(String(120))
    price_snapshot: Mapped[float] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)

    order: Mapped["RestaurantOrder"] = relationship(back_populates="lines")
    menu_item: Mapped["RestaurantMenuItem | None"] = relationship()


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
    ai_analysis_reports: Mapped[list["RestaurantAiAnalysisReport"]] = relationship(
        back_populates="competitor"
    )


class RestaurantGoogleBusinessConnection(Base):
    """Isletme sahibinin Google Business Profile OAuth baglantisi."""

    __tablename__ = "restaurant_google_business_connections"
    __table_args__ = (UniqueConstraint("ownership_id", name="uq_google_business_connection_ownership"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    google_email: Mapped[str | None] = mapped_column(String(255))
    gbp_account_name: Mapped[str | None] = mapped_column(String(120))
    gbp_location_name: Mapped[str | None] = mapped_column(String(160))
    gbp_location_title: Mapped[str | None] = mapped_column(String(255))
    matched_place_id: Mapped[str | None] = mapped_column(String(255))
    refresh_token_enc: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="connected")
    last_error: Mapped[str | None] = mapped_column(Text)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_review_count: Mapped[int | None] = mapped_column(Integer)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="google_business_connection")


class RestaurantAiAnalysisReport(Base):
    """Panel AI ozet raporu — ham yorum veya alinti saklanmaz."""

    __tablename__ = "restaurant_ai_analysis_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_ownerships.id", ondelete="CASCADE"), index=True
    )
    report_source: Mapped[str] = mapped_column(String(30), default="competitor", index=True)
    competitor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurant_competitors.id", ondelete="SET NULL"), nullable=True
    )
    competitor_name: Mapped[str] = mapped_column(String(255))
    comparison_summary: Mapped[str] = mapped_column(Text)
    your_strengths_json: Mapped[list] = mapped_column(JSONB, default=list)
    your_gaps_json: Mapped[list] = mapped_column(JSONB, default=list)
    competitor_strengths_json: Mapped[list] = mapped_column(JSONB, default=list)
    reviews_used_json: Mapped[dict | None] = mapped_column(JSONB)
    reviews_total: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    ownership: Mapped["RestaurantOwnership"] = relationship(back_populates="ai_analysis_reports")
    competitor: Mapped["RestaurantCompetitor | None"] = relationship(back_populates="ai_analysis_reports")


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
    publication_status: Mapped[str] = mapped_column(String(32), default="published", index=True)
    remedy_restaurant_deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
    remedy_offer: Mapped["ReviewRemedyOffer | None"] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ReviewRemedyOffer(Base):
    __tablename__ = "review_remedy_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), unique=True, index=True
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    discount_percent: Mapped[int] = mapped_column(Integer)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    coupon_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    offer_message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    offered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    customer_deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="remedy_offer")
    restaurant: Mapped["Restaurant"] = relationship()
    user: Mapped["User"] = relationship()


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


class GourmetChatRoom(Base):
    __tablename__ = "gourmet_chat_rooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(280), default="")
    emoji: Mapped[str] = mapped_column(String(8), default="💬")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_restaurant_cards: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    questions: Mapped[list["GourmetChatQuestion"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    messages: Mapped[list["GourmetChatMessage"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class GourmetChatQuestion(Base):
    __tablename__ = "gourmet_chat_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64), index=True)
    tag: Mapped[str] = mapped_column(String(32), default="genel")
    body: Mapped[str] = mapped_column(Text)
    answer_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    room: Mapped["GourmetChatRoom"] = relationship(back_populates="questions")
    author: Mapped["User"] = relationship(back_populates="gourmet_chat_questions")
    answers: Mapped[list["GourmetChatAnswer"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class GourmetChatAnswer(Base):
    __tablename__ = "gourmet_chat_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_questions.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    question: Mapped["GourmetChatQuestion"] = relationship(back_populates="answers")
    author: Mapped["User"] = relationship(back_populates="gourmet_chat_answers")


class GourmetChatMessage(Base):
    __tablename__ = "gourmet_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64), index=True)
    body: Mapped[str] = mapped_column(Text)
    mentions_json: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    room: Mapped["GourmetChatRoom"] = relationship(back_populates="messages")
    author: Mapped["User"] = relationship(back_populates="gourmet_chat_messages")


class GourmetChatRoomAssistantState(Base):
    __tablename__ = "gourmet_chat_room_assistant_state"
    __table_args__ = (UniqueConstraint("room_id", "city", name="uq_gourmet_chat_assistant_room_city"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64))
    muted_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class GourmetChatAssistantJob(Base):
    __tablename__ = "gourmet_chat_assistant_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64))
    trigger_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    trigger_message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_messages.id", ondelete="CASCADE"), index=True
    )
    job_kind: Mapped[str] = mapped_column(String(20))
    intent: Mapped[str] = mapped_column(String(20))
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class GourmetTriviaQuestion(Base):
    __tablename__ = "gourmet_trivia_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_text: Mapped[str] = mapped_column(Text)
    answers_json: Mapped[list] = mapped_column(JSON, default=list)
    room_tag: Mapped[str | None] = mapped_column(String(40), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class GourmetTriviaRound(Base):
    __tablename__ = "gourmet_trivia_rounds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64), index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_trivia_questions.id", ondelete="CASCADE")
    )
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    winner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    question_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_messages.id", ondelete="SET NULL")
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    room: Mapped["GourmetChatRoom"] = relationship()
    question: Mapped["GourmetTriviaQuestion"] = relationship()
    winner: Mapped["User | None"] = relationship(foreign_keys=[winner_user_id])


class GourmetTriviaScore(Base):
    __tablename__ = "gourmet_trivia_scores"
    __table_args__ = (UniqueConstraint("user_id", "room_id", "city", name="uq_gourmet_trivia_score"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gourmet_chat_rooms.id", ondelete="CASCADE"), index=True
    )
    city: Mapped[str] = mapped_column(String(64))
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    last_correct_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship()
    room: Mapped["GourmetChatRoom"] = relationship()


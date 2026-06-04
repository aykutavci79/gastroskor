from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Restaurant, RestaurantOwnership, User
from app.services.panel_notification_service import panel_base_url, send_panel_notification

logger = logging.getLogger(__name__)


async def notify_restaurant_new_follower(
    db: Session,
    *,
    restaurant_id: UUID,
    follower: User,
) -> None:
    """Uye isletmeye panel bildirimi: yeni takipci."""
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.restaurant_id == restaurant_id)
        .options(selectinload(RestaurantOwnership.restaurant), selectinload(RestaurantOwnership.user))
        .limit(1)
    )
    if not ownership:
        return

    restaurant = ownership.restaurant or db.get(Restaurant, restaurant_id)
    place_name = restaurant.name if restaurant else "İşletmeniz"

    try:
        await send_panel_notification(
            db,
            ownership=ownership,
            notification_type="new_follower",
            title="Yeni takipçi",
            message=f"Bir GastroSkor kullanıcısı «{place_name}» işletmenizi takip etmeye başladı.",
            cta_label="Takipçileri gör",
            cta_url=f"{panel_base_url()}/panel",
            dedupe_key=f"new_follower:{follower.id}:{restaurant_id}",
            metadata={
                "restaurant_id": str(restaurant_id),
                "follower_user_id": str(follower.id),
            },
            skip_active_check=False,
        )
    except Exception:
        logger.exception("new_follower notification failed restaurant=%s", restaurant_id)

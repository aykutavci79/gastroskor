from pydantic import BaseModel, ConfigDict

from app.schemas.restaurant import RestaurantListItem


class RestaurantFollowStatus(BaseModel):
    following: bool
    follower_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class RestaurantFollowListResponse(BaseModel):
    items: list[RestaurantListItem]
    total: int

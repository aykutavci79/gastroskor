from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.services.google_business_oauth import GoogleBusinessOAuthError, refresh_access_token

logger = logging.getLogger(__name__)

ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1"
BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1"
REVIEWS_API = "https://mybusiness.googleapis.com/v4"


@dataclass
class MatchedGbpLocation:
    account_name: str
    location_name: str
    location_title: str
    place_id: str | None


class GoogleBusinessClient:
    def __init__(self, access_token: str) -> None:
        self._access_token = access_token

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def _get_json(self, url: str, *, params: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self._headers(), params=params or {})
            if response.status_code >= 400:
                detail = response.text[:400]
                raise GoogleBusinessOAuthError(f"Google Business API hatasi ({response.status_code}): {detail}")
            return response.json()

    async def list_accounts(self) -> list[dict]:
        payload = await self._get_json(f"{ACCOUNT_API}/accounts")
        return payload.get("accounts") or []

    async def list_locations(self, account_name: str) -> list[dict]:
        payload = await self._get_json(
            f"{BUSINESS_INFO_API}/{account_name}/locations",
            params={"readMask": "name,title,metadata"},
        )
        return payload.get("locations") or []

    async def find_location_for_place(self, target_place_id: str) -> MatchedGbpLocation | None:
        target = (target_place_id or "").strip()
        if not target:
            return None
        accounts = await self.list_accounts()
        for account in accounts:
            account_name = account.get("name")
            if not account_name:
                continue
            try:
                locations = await self.list_locations(account_name)
            except GoogleBusinessOAuthError as exc:
                logger.warning("GBP locations list failed for %s: %s", account_name, exc)
                continue
            for location in locations:
                metadata = location.get("metadata") or {}
                place_id = metadata.get("placeId") or metadata.get("place_id")
                if place_id and str(place_id) == target:
                    return MatchedGbpLocation(
                        account_name=account_name,
                        location_name=str(location.get("name") or ""),
                        location_title=str(location.get("title") or "Isletme"),
                        place_id=str(place_id),
                    )
        return None

    async def list_all_reviews(self, *, account_name: str, location_name: str, max_reviews: int = 200) -> tuple[list[dict], int]:
        account_id = account_name.split("/")[-1]
        location_id = location_name.split("/")[-1]
        parent = f"accounts/{account_id}/locations/{location_id}"
        url = f"{REVIEWS_API}/{parent}/reviews"

        reviews: list[dict] = []
        page_token: str | None = None
        total_reported = 0

        while len(reviews) < max_reviews:
            params: dict[str, str | int] = {"pageSize": min(50, max_reviews - len(reviews))}
            if page_token:
                params["pageToken"] = page_token
            payload = await self._get_json(url, params=params)
            total_reported = int(payload.get("totalReviewCount") or total_reported or 0)
            batch = payload.get("reviews") or []
            reviews.extend(batch)
            page_token = payload.get("nextPageToken")
            if not page_token or not batch:
                break

        if not total_reported:
            total_reported = len(reviews)
        return reviews, total_reported


async def access_token_from_refresh(refresh_token: str) -> str:
    payload = await refresh_access_token(refresh_token)
    token = payload.get("access_token")
    if not token:
        raise GoogleBusinessOAuthError("Google access token alinamadi.")
    return str(token)

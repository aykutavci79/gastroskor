from __future__ import annotations

import re
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.services.food_place_filter import is_food_related_place
from app.services.profanity_tr import normalize_review_text

try:
    import certifi
except ImportError:
    certifi = None


@dataclass
class LivePlaceResult:
    place_id: str
    name: str
    formatted_address: str | None
    rating: float | None
    user_ratings_total: int | None
    latitude: float | None
    longitude: float | None
    photo_reference: str | None = None
    types: tuple[str, ...] = ()


def build_place_photo_url(photo_reference: str, *, maxwidth: int = 400) -> str:
    return (
        "https://maps.googleapis.com/maps/api/place/photo"
        f"?maxwidth={maxwidth}&photo_reference={photo_reference}&key={settings.google_places_api_key}"
    )


def first_photo_reference_from_google_result(result: dict) -> str | None:
    for photo in result.get("photos", [])[:1]:
        if isinstance(photo, dict):
            ref = photo.get("photo_reference")
            if ref:
                return str(ref)
    return None


# Text Search: konum yoksa Google oncelik/populerlik + sorgu metnine gore siralar.
# Sehir merkezi ile location+radius verince sonuclar o bolgeye yakinlasir (GPS degil).
CITY_SEARCH_BIAS: dict[str, tuple[float, float, int]] = {
    "bursa": (40.1885, 29.0610, 50_000),
    "istanbul": (41.0082, 28.9784, 80_000),
    "ankara": (39.9334, 32.8597, 60_000),
    "izmir": (38.4237, 27.1428, 60_000),
}

BAKERY_QUERY_HINTS = (
    "pastane",
    "baklava",
    "tatli",
    "tatlı",
    "pasta",
    "muhallebi",
    "helva",
    "kunefe",
    "künefe",
    "dondurma",
    "cikolata",
    "çikolata",
    "kurabiye",
    "borek",
    "börek",
    "sutlac",
    "sütlac",
    "lokum",
    "tatlici",
    "tatlıcı",
)

CAFE_QUERY_HINTS = ("kahve", "kafe", "coffee", "cafe", "çay", "cay")


def _folded_query(query: str) -> str:
    return normalize_review_text(query).strip().lower()


def resolve_google_nearby_place_type(query: str) -> str:
    """Google Nearby tek type alir — pastane/bakery ayri etiketlenir."""
    folded = _folded_query(query)
    if any(hint in folded for hint in BAKERY_QUERY_HINTS):
        return "bakery"
    if any(hint in folded for hint in CAFE_QUERY_HINTS):
        return "cafe"
    return "restaurant"


def prefers_open_text_search(query: str) -> bool:
    """Isim veya pastane aramasi — type=restaurant daraltmasin."""
    folded = _folded_query(query)
    if any(hint in folded for hint in BAKERY_QUERY_HINTS):
        return True
    tokens = [token for token in folded.split() if token]
    if len(tokens) >= 2:
        return True
    # Tek kelime marka: "rojen", "cantik" (mobil GPS nearby restaurant bunlari kacirir).
    if len(tokens) == 1 and len(tokens[0]) >= 4 and tokens[0].isalpha():
        return True
    return False


def merge_live_place_rows(
    *groups: list[LivePlaceResult],
) -> list[LivePlaceResult]:
    seen: set[str] = set()
    merged: list[LivePlaceResult] = []
    for group in groups:
        for row in group:
            if not row.place_id or row.place_id in seen:
                continue
            seen.add(row.place_id)
            merged.append(row)
    return merged


_GOOGLE_PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{10,}$")


def is_usable_google_place_id(place_id: str | None) -> bool:
    """Google Details API'ye gonderilebilir place_id mi? (bos/test/sentetik haric)."""
    pid = (place_id or "").strip()
    if not pid:
        return False
    if pid.startswith("gastro-tester-"):
        return False
    return bool(_GOOGLE_PLACE_ID_RE.match(pid))


class GooglePlacesLiveClient:
    TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

    def _verify_ssl(self) -> bool | str:
        verify: bool | str = certifi.where() if certifi is not None else True
        if settings.environment == "development":
            return False
        return verify

    async def _fetch_google_payload(self, url: str, params: dict[str, str | int]) -> dict:
        timeout_seconds = max(settings.places_timeout_ms, 1000) / 1000
        async with httpx.AsyncClient(timeout=timeout_seconds, verify=self._verify_ssl()) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def _parse_results(self, payload: dict, *, limit: int) -> list[LivePlaceResult]:
        status = payload.get("status")
        if status not in {"OK", "ZERO_RESULTS"}:
            error_message = payload.get("error_message") or f"Google Places error: {status}"
            raise RuntimeError(error_message)

        results: list[LivePlaceResult] = []
        for row in payload.get("results", [])[:limit]:
            location = row.get("geometry", {}).get("location", {})
            place_id = row.get("place_id", "")
            if not place_id:
                continue
            photos = row.get("photos") or []
            photo_ref = None
            if photos and isinstance(photos[0], dict):
                photo_ref = photos[0].get("photo_reference")
            raw_types = row.get("types") or []
            place_types = tuple(str(t) for t in raw_types if t)
            if not is_food_related_place(
                name=row.get("name", "").strip() or "Isimsiz mekan",
                address=row.get("formatted_address") or row.get("vicinity"),
                types=place_types,
            ):
                continue
            results.append(
                LivePlaceResult(
                    place_id=place_id,
                    name=row.get("name", "").strip() or "Isimsiz mekan",
                    formatted_address=row.get("formatted_address") or row.get("vicinity"),
                    rating=float(row["rating"]) if row.get("rating") is not None else None,
                    user_ratings_total=row.get("user_ratings_total"),
                    latitude=location.get("lat"),
                    longitude=location.get("lng"),
                    photo_reference=photo_ref,
                    types=place_types,
                )
            )
        return results

    async def _nearby_search(
        self,
        query: str,
        *,
        lat: float,
        lng: float,
        limit: int,
        place_type: str = "restaurant",
    ) -> list[LivePlaceResult]:
        """Kullanici konumuna gore en yakin mekanlar (rankby=distance)."""
        params: dict[str, str | int] = {
            "location": f"{lat},{lng}",
            "rankby": "distance",
            "keyword": query.strip(),
            "type": place_type,
            "language": "tr",
            "key": settings.google_places_api_key or "",
        }
        payload = await self._fetch_google_payload(self.NEARBY_SEARCH_URL, params)
        return self._parse_results(payload, limit=limit)

    async def _text_search(
        self,
        query: str,
        *,
        city: str,
        limit: int,
        bias_lat: float | None = None,
        bias_lng: float | None = None,
        bias_radius_m: int | None = None,
        place_type: str | None = "restaurant",
    ) -> list[LivePlaceResult]:
        merged_query = f"{query.strip()} {city}".strip()
        params: dict[str, str | int] = {
            "query": merged_query,
            "language": "tr",
            "region": "tr",
            "key": settings.google_places_api_key or "",
        }
        if place_type:
            params["type"] = place_type
        if bias_lat is not None and bias_lng is not None and bias_radius_m is not None:
            params["location"] = f"{bias_lat},{bias_lng}"
            params["radius"] = bias_radius_m
        else:
            city_bias = CITY_SEARCH_BIAS.get(city.strip().lower())
            if city_bias:
                lat, lng, radius_m = city_bias
                params["location"] = f"{lat},{lng}"
                params["radius"] = radius_m

        payload = await self._fetch_google_payload(self.TEXT_SEARCH_URL, params)
        return self._parse_results(payload, limit=limit)

    async def _search_nearby_then_text(
        self,
        query: str,
        *,
        lat: float,
        lng: float,
        city: str,
        fetch_limit: int,
        nearby_type: str,
    ) -> list[LivePlaceResult]:
        nearby_rows = await self._nearby_search(
            query,
            lat=lat,
            lng=lng,
            limit=fetch_limit,
            place_type=nearby_type,
        )
        if len(nearby_rows) >= fetch_limit:
            return nearby_rows[:fetch_limit]
        text_rows = await self._text_search(query, city=city, limit=fetch_limit, place_type=None)
        return merge_live_place_rows(nearby_rows, text_rows)[:fetch_limit]

    async def search_places(
        self,
        query: str,
        *,
        city: str = "Bursa",
        limit: int = 8,
        origin_lat: float | None = None,
        origin_lng: float | None = None,
    ) -> list[LivePlaceResult]:
        if not settings.google_places_api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY is not configured.")

        fetch_limit = min(20, max(limit, 8))
        nearby_type = resolve_google_nearby_place_type(query)

        if prefers_open_text_search(query):
            text_rows = await self._text_search(query, city=city, limit=fetch_limit, place_type=None)
            if text_rows:
                return text_rows[:fetch_limit]

        # Maliyet: tek Google istegi. Oncelik: kullanici konumu → sehir merkezi (Nearby) → Text Search.
        # Text Search az sonuc dondurur; "doner 4.5 yildiz" gibi puan filtreleri bos kalabiliyordu.
        if origin_lat is not None and origin_lng is not None:
            return await self._search_nearby_then_text(
                query,
                lat=origin_lat,
                lng=origin_lng,
                city=city,
                fetch_limit=fetch_limit,
                nearby_type=nearby_type,
            )

        city_bias = CITY_SEARCH_BIAS.get(city.strip().lower())
        if city_bias:
            lat, lng, _radius_m = city_bias
            merged_rows = await self._search_nearby_then_text(
                query,
                lat=lat,
                lng=lng,
                city=city,
                fetch_limit=fetch_limit,
                nearby_type=nearby_type,
            )
            if merged_rows:
                return merged_rows[:fetch_limit]

        return (await self._text_search(query, city=city, limit=fetch_limit, place_type=None))[:fetch_limit]

    async def get_place_details(self, place_id: str) -> dict:
        if not settings.google_places_api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY is not configured.")
        if not is_usable_google_place_id(place_id):
            raise ValueError(f"Invalid or unsupported place_id: {place_id!r}")

        params = {
            "place_id": place_id,
            "language": "tr",
            "fields": "place_id,name,formatted_address,international_phone_number,formatted_phone_number,rating,user_ratings_total,geometry,opening_hours,website,reviews,photos,url",
            "key": settings.google_places_api_key,
        }

        timeout_seconds = max(settings.places_timeout_ms, 1000) / 1000
        verify = certifi.where() if certifi is not None else True
        if settings.environment == "development":
            verify = False

        async with httpx.AsyncClient(timeout=timeout_seconds, verify=verify) as client:
            response = await client.get(self.DETAILS_URL, params=params)
            response.raise_for_status()
            payload = response.json()

        status = payload.get("status")
        if status not in {"OK", "ZERO_RESULTS"}:
            error_message = payload.get("error_message") or f"Google Places error: {status}"
            raise RuntimeError(error_message)

        result = payload.get("result", {})
        photo_reference = first_photo_reference_from_google_result(result)
        photo_urls: list[str] = []
        for photo in result.get("photos", [])[:8]:
            ref = photo.get("photo_reference")
            if ref:
                photo_urls.append(build_place_photo_url(ref, maxwidth=1200))
        reviews = []
        for review in result.get("reviews", [])[:10]:
            reviews.append(
                {
                    "author_name": review.get("author_name"),
                    "rating": review.get("rating"),
                    "relative_time_description": review.get("relative_time_description"),
                    "time": review.get("time"),
                    "text": review.get("text"),
                    "profile_photo_url": review.get("profile_photo_url"),
                }
            )

        opening_hours_raw = result.get("opening_hours")
        opening_hours = None
        if opening_hours_raw:
            opening_hours = {
                "open_now": opening_hours_raw.get("open_now"),
                "weekday_text": opening_hours_raw.get("weekday_text"),
            }

        location = result.get("geometry", {}).get("location", {})

        return {
            "place_id": result.get("place_id", place_id),
            "name": result.get("name", "") ,
            "address": result.get("formatted_address"),
            "latitude": location.get("lat"),
            "longitude": location.get("lng"),
            "rating": float(result["rating"]) if result.get("rating") is not None else None,
            "user_ratings_total": result.get("user_ratings_total"),
            "phone_number": result.get("formatted_phone_number") or result.get("international_phone_number"),
            "website": result.get("website"),
            "opening_hours": opening_hours,
            "reviews": reviews,
            "photo_urls": photo_urls,
            "photo_reference": photo_reference,
            "maps_directions_url": None,
            "maps_search_url": None,
            "analysis": None,
        }

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.delivery_address import (
    AddressNodeListResponse,
    AddressNodeRead,
    DeliveryAddressValidateRequest,
    DeliveryAddressValidateResponse,
)
from app.services.delivery_address import DeliveryAddressError, list_address_children, resolve_delivery_address

router = APIRouter(prefix="/delivery-address", tags=["delivery-address"])


@router.get("/bursa/children", response_model=AddressNodeListResponse)
def get_bursa_address_children(
    parent_id: int | None = Query(default=None, ge=1),
    level: str | None = Query(default=None, pattern="^(admin|building)$"),
    db: Session = Depends(get_db),
):
    level_filter = level
    effective_parent = parent_id
    try:
        items = list_address_children(db, parent_id=effective_parent, level_filter=level_filter)
    except DeliveryAddressError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return AddressNodeListResponse(
        parent_id=effective_parent,
        items=[AddressNodeRead(**row) for row in items],
    )


@router.post("/validate", response_model=DeliveryAddressValidateResponse)
def post_validate_delivery_address(
    payload: DeliveryAddressValidateRequest,
    db: Session = Depends(get_db),
):
    try:
        formatted, lat, lng = resolve_delivery_address(
            db,
            building_node_id=payload.building_node_id,
            address_note=payload.address_note,
            device_lat=payload.device_lat,
            device_lng=payload.device_lng,
        )
    except DeliveryAddressError as exc:
        code = exc.code
        status_code = status.HTTP_400_BAD_REQUEST
        if code == "address_provider_unavailable":
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    return DeliveryAddressValidateResponse(
        formatted_address=formatted,
        latitude=lat,
        longitude=lng,
        building_node_id=payload.building_node_id,
    )

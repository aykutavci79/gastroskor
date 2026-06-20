from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import SofraBulmacaReviewStatus
from app.schemas.sofra_kelime import SofraWheelAttemptPayload, SofraWheelAttemptResponse
from app.schemas.sofra_puzzle import (
    SofraPuzzleListItem,
    SofraPuzzleListResponse,
    SofraPuzzleResponse,
)
from app.services.sofra_kelime_learning import record_wheel_attempt
from app.services.sofra_puzzle_pool import (
    active_sofra_gun_id,
    fetch_puzzle_for_client,
    list_puzzles,
    set_review_status,
)

router = APIRouter(prefix="/eglence/kelime-sofrasi", tags=["kelime-sofrasi"])


def _panel_admin_trusted(x_panel_admin_secret: str | None) -> bool:
    expected = (settings.panel_admin_secret or "").strip()
    if not expected:
        return False
    header = (x_panel_admin_secret or "").strip()
    return bool(header) and header == expected


@router.post("/attempts", response_model=SofraWheelAttemptResponse)
def post_sofra_wheel_attempt(payload: SofraWheelAttemptPayload, db: Session = Depends(get_db)):
    logged = record_wheel_attempt(db, payload.kelime)
    if not logged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gecersiz kelime veya 3 harften kisa.",
        )
    db.commit()
    return SofraWheelAttemptResponse(logged=True)


@router.get("/puzzle", response_model=SofraPuzzleResponse)
def get_sofra_daily_puzzle(
    zorluk: str = Query(..., pattern="^(kolay|orta|zor)$"),
    tur: int = Query(0, ge=0, le=4),
    gun_id: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
):
    target_gun = gun_id or active_sofra_gun_id()
    row = fetch_puzzle_for_client(db, target_gun, zorluk, tur)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bulmaca havuzunda kayit bulunamadi.",
        )
    db.commit()
    return SofraPuzzleResponse(
        puzzle_id=row.puzzle_id,
        gun_id=row.gun_id,
        zorluk=row.zorluk,  # type: ignore[arg-type]
        tur=row.tur,
        puzzle=row.puzzle_data,
        is_fallback=row.is_fallback,
        source_gun_id=row.source_gun_id,
        review_status=row.review_status.value,
    )


@router.get("/puzzles", response_model=SofraPuzzleListResponse)
def list_sofra_daily_puzzles(
    gun_id: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
    db: Session = Depends(get_db),
):
    if not _panel_admin_trusted(x_panel_admin_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    rows, total = list_puzzles(db, gun_id=gun_id, limit=limit, offset=offset)
    items: list[SofraPuzzleListItem] = []
    for row in rows:
        puzzle = row.puzzle_data or {}
        words = puzzle.get("words") if isinstance(puzzle.get("words"), list) else []
        kelimeler = [
            str(w.get("kelime", ""))
            for w in words
            if isinstance(w, dict) and w.get("kelime")
        ]
        wheel = puzzle.get("wheel") if isinstance(puzzle.get("wheel"), list) else []
        items.append(
            SofraPuzzleListItem(
                id=row.id,
                gun_id=row.gun_id,
                zorluk=row.zorluk,  # type: ignore[arg-type]
                tur=row.tur,
                puzzle_id=row.puzzle_id,
                kelime_sayisi=len(words),
                wheel=[str(x) for x in wheel],
                kelimeler=kelimeler,
                is_fallback=row.is_fallback,
                source_gun_id=row.source_gun_id,
                generation_ms=row.generation_ms,
                review_status=row.review_status.value,
                reviewed_at=row.reviewed_at,
                created_at=row.created_at,
            )
        )
    return SofraPuzzleListResponse(items=items, total=total)


@router.post("/puzzles/{gun_id}/{zorluk}/{tur}/review")
def review_sofra_daily_puzzle(
    gun_id: str,
    zorluk: str,
    tur: int,
    action: str = Query(..., pattern="^(approve|flag)$"),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
    db: Session = Depends(get_db),
):
    if not _panel_admin_trusted(x_panel_admin_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if zorluk not in {"kolay", "orta", "zor"} or tur < 0 or tur > 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz slot")
    status_value = (
        SofraBulmacaReviewStatus.approved
        if action == "approve"
        else SofraBulmacaReviewStatus.flagged
    )
    row = set_review_status(db, gun_id, zorluk, tur, status_value)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bulmaca bulunamadi")
    db.commit()
    return {"ok": True, "puzzle_id": row.puzzle_id, "review_status": row.review_status.value}

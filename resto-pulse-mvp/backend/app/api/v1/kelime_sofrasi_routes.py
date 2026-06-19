from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sofra_kelime import SofraWheelAttemptPayload, SofraWheelAttemptResponse
from app.services.sofra_kelime_learning import record_wheel_attempt

router = APIRouter(prefix="/eglence/kelime-sofrasi", tags=["kelime-sofrasi"])


@router.post("/attempts", response_model=SofraWheelAttemptResponse)
def post_sofra_wheel_attempt(payload: SofraWheelAttemptPayload, db: Session = Depends(get_db)):
    logged = record_wheel_attempt(db, payload.kelime)
    if not logged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gecersiz kelime veya 4 harften kisa.",
        )
    db.commit()
    return SofraWheelAttemptResponse(logged=True)

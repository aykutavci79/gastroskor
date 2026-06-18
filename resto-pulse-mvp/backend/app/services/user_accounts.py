from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Review, User
from app.schemas.user import UserProfile
from app.services.display_name import normalize_author_name_display
from app.services.gourmet_profile import public_user_avatar


def serialize_user(user: User, db: Session) -> UserProfile:
    avg_rating = db.scalar(select(func.avg(Review.rating)).where(Review.author_id == user.id))
    review_count = db.scalar(select(func.count(Review.id)).where(Review.author_id == user.id)) or 0
    avatar_url, avatar_preset = public_user_avatar(user)
    return UserProfile(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=avatar_url,
        avatar_preset=avatar_preset,
        nickname=user.nickname,
        needs_nickname_setup=not bool(user.nickname),
        default_review_name_display=normalize_author_name_display(user.default_review_name_display),
        gastro_score=round(float(avg_rating), 1) if avg_rating is not None else None,
        review_count=int(review_count),
        google_sub=user.google_sub,
    )


def _is_uploaded_avatar_url(url: str | None) -> bool:
    if not url:
        return False
    lowered = url.lower()
    return "/avatars/" in lowered or "/media/avatars/" in lowered or "user_avatars/" in lowered


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.get(User, user_id)


def get_or_create_user(
    db: Session,
    email: str,
    full_name: str | None = None,
    avatar_url: str | None = None,
    google_sub: str | None = None,
    default_review_name_display: str | None = None,
) -> tuple[User, bool]:
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user and google_sub:
        user = db.scalar(select(User).where(User.google_sub == google_sub))

    if user:
        updated = False
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            updated = True
        if avatar_url and not user.avatar_preset and user.avatar_url != avatar_url:
            if _is_uploaded_avatar_url(user.avatar_url) and not _is_uploaded_avatar_url(avatar_url):
                pass
            else:
                user.avatar_url = avatar_url
                updated = True
        if google_sub and user.google_sub != google_sub:
            user.google_sub = google_sub
            updated = True
        if default_review_name_display is not None:
            normalized = normalize_author_name_display(default_review_name_display)
            if user.default_review_name_display != normalized:
                user.default_review_name_display = normalized
                updated = True
        if updated:
            db.add(user)
            db.commit()
            db.refresh(user)
        return user, False

    user = User(
        email=email,
        full_name=full_name,
        avatar_url=avatar_url,
        google_sub=google_sub,
        default_review_name_display=normalize_author_name_display(default_review_name_display),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, True

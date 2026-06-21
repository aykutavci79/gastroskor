import logging

try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.routes import router as v1_router
from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.production_guard import assert_production_secrets, is_production_environment
from app.core.rate_limit import rate_limiter
from app.core.sentry_setup import init_sentry
from app.core.security_middleware import SecurityMiddleware
from app.services.menu_image_storage import menu_images_dir
from app.services.foodcast_image_storage import foodcast_images_dir
from app.services.review_image_storage import review_images_dir
from app.services.user_avatar_storage import user_avatars_dir

logger = logging.getLogger(__name__)

assert_production_secrets(settings)
is_production = is_production_environment(settings.environment)

app = FastAPI(
    title=settings.app_name,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(SecurityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "https://gastroskor.vercel.app",
        "https://gastroskor.com.tr",
        "https://www.gastroskor.com.tr",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(v1_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def log_rate_limit_backend() -> None:
    init_sentry()
    status = rate_limiter.status()
    logger.info("Rate limit backend: %s", status)
    if status.get("redis_configured") and not status.get("redis_ok"):
        logger.warning("REDIS_URL tanimli ama Redis ping basarisiz — in-memory fallback kullanilacak")

try:
    menu_dir = menu_images_dir()
    review_dir = review_images_dir()
    foodcast_dir = foodcast_images_dir()
    avatar_dir = user_avatars_dir()
    app.mount("/media/menu", StaticFiles(directory=str(menu_dir)), name="menu-images")
    app.mount("/media/reviews", StaticFiles(directory=str(review_dir)), name="review-images")
    app.mount("/media/foodcast", StaticFiles(directory=str(foodcast_dir)), name="foodcast-images")
    app.mount("/media/avatars", StaticFiles(directory=str(avatar_dir)), name="user-avatars")
    logger.info("Media static: menu=%s reviews=%s foodcast=%s avatars=%s", menu_dir, review_dir, foodcast_dir, avatar_dir)
except OSError as exc:
    logger.warning("Media static mount skipped: %s", exc)


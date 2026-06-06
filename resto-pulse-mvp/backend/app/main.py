import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.routes import router as v1_router
from app.core.config import settings
from app.services.menu_image_storage import menu_images_dir
from app.services.review_image_storage import review_images_dir
from app.services.user_avatar_storage import user_avatars_dir

logger = logging.getLogger(__name__)

is_production = settings.environment.lower() == "production"
app = FastAPI(
    title=settings.app_name,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://gastroskor.vercel.app",
        "https://gastroskor.com.tr",
        "https://www.gastroskor.com.tr",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.api_v1_prefix)

try:
    menu_dir = menu_images_dir()
    review_dir = review_images_dir()
    avatar_dir = user_avatars_dir()
    app.mount("/media/menu", StaticFiles(directory=str(menu_dir)), name="menu-images")
    app.mount("/media/reviews", StaticFiles(directory=str(review_dir)), name="review-images")
    app.mount("/media/avatars", StaticFiles(directory=str(avatar_dir)), name="user-avatars")
    logger.info("Media static: menu=%s reviews=%s avatars=%s", menu_dir, review_dir, avatar_dir)
except OSError as exc:
    logger.warning("Media static mount skipped: %s", exc)


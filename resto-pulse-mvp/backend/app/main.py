import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.routes import router as v1_router
from app.core.config import settings
from app.services.menu_image_storage import menu_images_dir

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

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
    app.mount("/media/menu", StaticFiles(directory=str(menu_dir)), name="menu-images")
except OSError as exc:
    logger.warning("Menu image static mount skipped: %s", exc)


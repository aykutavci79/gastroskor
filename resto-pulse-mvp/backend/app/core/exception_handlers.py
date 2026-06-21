from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status

logger = logging.getLogger(__name__)

GENERIC_ERROR_DETAIL = "Beklenmeyen bir hata oluştu, lütfen tekrar deneyin."


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=(type(exc), exc, exc.__traceback__),
    )

    try:
        from app.core.sentry_setup import is_sentry_initialized

        if is_sentry_initialized():
            import sentry_sdk

            sentry_sdk.capture_exception(exc)
    except Exception:
        logger.exception("Failed to report exception to Sentry")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": GENERIC_ERROR_DETAIL},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(Exception, unhandled_exception_handler)

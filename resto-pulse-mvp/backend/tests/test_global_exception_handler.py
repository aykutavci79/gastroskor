from __future__ import annotations

from unittest.mock import patch
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette import status

from app.core.exception_handlers import GENERIC_ERROR_DETAIL, register_exception_handlers
from app.main import app as main_app

SECRET_INTERNAL_MESSAGE = "TOP_SECRET_INTERNAL_ERROR_xyz"


def _build_test_app() -> FastAPI:
    test_app = FastAPI()
    register_exception_handlers(test_app)

    @test_app.get("/crash")
    def crash() -> None:
        raise RuntimeError(SECRET_INTERNAL_MESSAGE)

    @test_app.get("/not-found")
    def not_found() -> None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kaynak bulunamadi.")

    return test_app


def test_unhandled_exception_returns_generic_json() -> None:
    client = TestClient(_build_test_app(), raise_server_exceptions=False)
    response = client.get("/crash")

    assert response.status_code == 500
    assert response.json() == {"detail": GENERIC_ERROR_DETAIL}
    assert SECRET_INTERNAL_MESSAGE not in response.text


def test_http_exception_is_not_handled_by_global_handler() -> None:
    client = TestClient(_build_test_app(), raise_server_exceptions=False)
    response = client.get("/not-found")

    assert response.status_code == 404
    assert response.json() == {"detail": "Kaynak bulunamadi."}


def test_unhandled_exception_logs_and_sends_to_sentry() -> None:
    test_app = _build_test_app()
    client = TestClient(test_app, raise_server_exceptions=False)

    with (
        patch("app.core.exception_handlers.logger") as mock_logger,
        patch("app.core.sentry_setup.is_sentry_initialized", return_value=True),
        patch("sentry_sdk.capture_exception") as capture,
    ):
        response = client.get("/crash")

    assert response.status_code == 500
    assert response.json() == {"detail": GENERIC_ERROR_DETAIL}

    mock_logger.error.assert_called_once()
    log_kwargs = mock_logger.error.call_args.kwargs
    assert log_kwargs.get("exc_info") is not None
    exc_info = log_kwargs["exc_info"]
    assert exc_info[0] is RuntimeError
    assert str(exc_info[1]) == SECRET_INTERNAL_MESSAGE

    capture.assert_called_once()
    captured_exc = capture.call_args.args[0]
    assert isinstance(captured_exc, RuntimeError)
    assert str(captured_exc) == SECRET_INTERNAL_MESSAGE


def test_main_app_registers_global_exception_handler() -> None:
    assert Exception in main_app.exception_handlers


def test_main_app_http_exception_still_works() -> None:
    client = TestClient(main_app, raise_server_exceptions=False)
    response = client.get("/api/v1/this-route-does-not-exist")

    assert response.status_code == 404
    assert response.json()["detail"] != GENERIC_ERROR_DETAIL

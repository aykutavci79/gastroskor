import httpx
from app.core.config import settings

print('API key loaded:', repr(settings.google_places_api_key))

try:
    resp = httpx.get('http://127.0.0.1:8000/api/v1/live/places/search?q=iskender&city=Bursa&limit=1', timeout=10)
    print('status:', resp.status_code)
    print('body:', resp.text)
except Exception as exc:
    print('error:', type(exc).__name__, exc)

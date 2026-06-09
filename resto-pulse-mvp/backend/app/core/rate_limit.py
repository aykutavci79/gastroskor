from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock


@dataclass(frozen=True)
class RateLimitRule:
    limit: int
    window_sec: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        now = time.monotonic()
        cutoff = now - rule.window_sec
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= rule.limit:
                return False
            bucket.append(now)
            return True


rate_limiter = InMemoryRateLimiter()


def rate_limit_key(*parts: str | None) -> str:
    return "|".join(part.strip().lower() for part in parts if part and part.strip())

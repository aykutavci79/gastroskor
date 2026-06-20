#!/usr/bin/env python3
"""Mobil Sofra puzzle-api smoke test — API baglantisi olmadan parse dogrulama."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

MOBILE_ROOT = Path(__file__).resolve().parents[2] / "mobile"
GENERATOR = MOBILE_ROOT / "scripts" / "generate-sofra-pool.ts"


def main() -> int:
    if not GENERATOR.is_file():
        print(f"Generator bulunamadi: {GENERATOR}", file=sys.stderr)
        return 1

    result = subprocess.run(
        ["npx", "tsx", str(GENERATOR), "--gun-id", "2026-06-20"],
        cwd=str(MOBILE_ROOT),
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        return 1

    puzzles = json.loads(result.stdout)
    ok = [p for p in puzzles if p.get("ok")]
    if len(ok) != 15:
        print(f"Beklenen 15/15, gelen {len(ok)}/15", file=sys.stderr)
        return 1

    sample = ok[0]["puzzle"]
    required = {"id", "zorluk", "words", "wheel", "grid", "rows", "cols", "bonusKelimeler"}
    missing = required - set(sample.keys())
    if missing:
        print(f"Eksik puzzle alanlari: {missing}", file=sys.stderr)
        return 1

    if any(w.get("id", "").startswith("fb-") for w in sample["words"]):
        print("ARSLAN fallback tespit edildi — reddedildi", file=sys.stderr)
        return 1

    print(f"Smoke OK: 15 slot, ornek={sample['id']}, kelime={len(sample['words'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Bursa icin kisa yol — sync_turkiye_geo_products.py wrapper.

Kullanim:
  python backend/scripts/sync_bursa_geo_products.py
  python backend/scripts/sync_bursa_geo_products.py --download-images
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TURKIYE_SCRIPT = ROOT / "scripts" / "sync_turkiye_geo_products.py"


def main() -> int:
    cmd = [sys.executable, str(TURKIYE_SCRIPT), "--city-id", "16", *sys.argv[1:]]
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())

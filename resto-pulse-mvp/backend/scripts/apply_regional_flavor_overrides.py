#!/usr/bin/env python3
"""Manuel yöresel lezzet inceleme JSON'unu uygular.

Kullanım:
  python scripts/apply_regional_flavor_overrides.py regional-flavor-overrides.json
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERRIDES_PATH = ROOT / "app" / "data" / "regional_flavor_overrides.json"


def main() -> int:
    if len(sys.argv) != 2:
        print("Kullanim: python scripts/apply_regional_flavor_overrides.py <json-dosyasi>", file=sys.stderr)
        return 1

    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"Dosya bulunamadi: {src}", file=sys.stderr)
        return 1

    payload = json.loads(src.read_text(encoding="utf-8"))
    out = {
        "updated_at": date.today().isoformat(),
        "note": payload.get("note") or "Manuel inceleme",
        "exclude_slugs": sorted({str(slug) for slug in payload.get("exclude_slugs") or []}),
        "include_slugs": sorted({str(slug) for slug in payload.get("include_slugs") or []}),
    }
    OVERRIDES_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"exclude: {len(out['exclude_slugs'])} | include: {len(out['include_slugs'])} -> {OVERRIDES_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

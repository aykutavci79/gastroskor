"""Mutfak banner gorsellerini WebP'ye sikistirir. Calistir: python scripts/compress-kitchen-images.py"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "kitchens"
MAX_EDGE = 960
WEBP_QUALITY = 82

def compress_one(path: Path) -> None:
    if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
        return
    out = path.with_suffix(".webp")
    with Image.open(path) as img:
        img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, MAX_EDGE / max(w, h))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        img.save(out, format="WEBP", quality=WEBP_QUALITY, method=6)
    before = path.stat().st_size
    after = out.stat().st_size
    print(f"{path.name} -> {out.name}  {before // 1024}KB -> {after // 1024}KB")


def main() -> None:
    if not ROOT.is_dir():
        raise SystemExit(f"Klasor yok: {ROOT}")
    for path in sorted(ROOT.iterdir()):
        if path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            compress_one(path)
    print("Bitti.")


if __name__ == "__main__":
    main()

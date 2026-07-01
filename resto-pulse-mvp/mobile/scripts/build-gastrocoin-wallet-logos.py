"""GastroCoin marka logolari — tek kaynak: assets/gastro-hub/gastrocoin-logo-master.png"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "gastro-hub" / "gastrocoin-logo-master.png"
OUT_DIR = ROOT / "assets" / "gastro-hub"
OUT_TRANSPARENT = OUT_DIR / "gastrocoin-wallet-transparent.png"
OUT_LOGO = OUT_DIR / "gastrocoin-logo.png"
OUT_ICON_GC = OUT_DIR / "gastrocoin-icon-gc.png"
OUT_COIN = OUT_DIR / "designs" / "gastrocoin-wallet-coin-transparent.png"

NAVY_RGB = np.array([27, 58, 87], dtype=np.float32)
NAVY_HI_RGB = np.array([118, 178, 228], dtype=np.float32)
NAVY_LO_RGB = np.array([20, 42, 68], dtype=np.float32)


def _seed_background_mask(rgb: np.ndarray) -> np.ndarray:
    """Beyaz / açık gri arka plan adayları (coin gölgesi hariç tutulacak)."""
    r = rgb[:, :, 0].astype(np.float32)
    g = rgb[:, :, 1].astype(np.float32)
    b = rgb[:, :, 2].astype(np.float32)
    brightness = (r + g + b) / 3.0
    saturation = np.max(rgb, axis=2).astype(np.float32) - np.min(rgb, axis=2).astype(np.float32)
    # Saf beyaz + anti-alias kenar
    return (brightness >= 228) & (saturation <= 36)


def _flood_from_edges(candidate: np.ndarray) -> np.ndarray:
    h, w = candidate.shape
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w:
            continue
        if visited[y, x] or not candidate[y, x]:
            continue
        visited[y, x] = True
        q.append((y - 1, x))
        q.append((y + 1, x))
        q.append((y, x - 1))
        q.append((y, x + 1))

    return visited


def _defringe(rgba: np.ndarray, bg_mask: np.ndarray) -> np.ndarray:
    """Beyaz haloya karşı alpha'yı yumuşat."""
    rgb = rgba[:, :, :3].astype(np.float32)
    brightness = rgb.mean(axis=2)
    alpha = rgba[:, :, 3].astype(np.float32)

    # Arka plana yakın pikseller: tamamen şeffaf
    near_bg = bg_mask | (brightness >= 220)
    alpha[near_bg] = 0

    # Geçiş bandı (220–245): yumuşak alpha
    transition = (brightness >= 200) & (brightness < 245) & (~bg_mask)
    t = np.clip((245 - brightness[transition]) / 45.0, 0, 1)
    alpha[transition] = np.minimum(alpha[transition], t * 255)

    rgba[:, :, 3] = alpha.astype(np.uint8)
    return rgba


def _apply_transparent_background(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3]

    candidate = _seed_background_mask(rgb)
    bg_mask = _flood_from_edges(candidate)
    rgba = _defringe(rgba.copy(), bg_mask)

    r = rgba[:, :, 0].astype(np.float32)
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    brightness = (r + g + b) / 3.0
    sat = np.max(rgba[:, :, :3], axis=2).astype(np.float32) - np.min(rgba[:, :, :3], axis=2).astype(np.float32)
    shadow = (brightness >= 150) & (brightness <= 215) & (sat <= 30) & (rgba[:, :, 3] > 0)
    shadow_alpha = np.clip((215 - brightness[shadow]) / 65.0 * 90, 12, 90)
    rgba[shadow, 0] = 40
    rgba[shadow, 1] = 20
    rgba[shadow, 2] = 10
    rgba[shadow, 3] = shadow_alpha.astype(np.uint8)

    return rgba


def make_transparent_logo(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    rgba = _apply_transparent_background(np.array(img))
    return Image.fromarray(rgba, mode="RGBA")


def make_transparent_image(img: Image.Image) -> Image.Image:
    rgba = _apply_transparent_background(np.array(img.convert("RGBA")))
    return Image.fromarray(rgba, mode="RGBA")


def remap_fork_blue_to_navy(img: Image.Image) -> Image.Image:
    """Çatal G — parlak mavi → marka laciverti (#1B3A57), 3D ton korunur."""
    rgba = np.array(img.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    is_gold = (r > 145) & (g > 115) & (b < 130) & (r > g)
    is_black_face = (r < 55) & (g < 55) & (b < 55)
    is_blue = (b > r + 10) & (b > g - 8) & (b > 65) & (~is_gold) & (~is_black_face)

    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if is_blue.any():
        lo = float(np.percentile(lum[is_blue], 2))
        hi = float(np.percentile(lum[is_blue], 99))
        t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
        target = NAVY_LO_RGB * (1 - t[:, :, None]) + NAVY_HI_RGB * (t[:, :, None] ** 0.55)
        blend = np.clip(0.55 + 0.40 * (t**0.8), 0.55, 0.92)[:, :, None]
        new_rgb = np.where(is_blue[:, :, None], target * blend + rgb * (1 - blend), rgb)
        rgba[:, :, :3] = np.clip(new_rgb, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def trim_transparent(img: Image.Image, alpha_min: int = 16) -> Image.Image:
    """Şeffaf kenar boşluğunu kes — carousel'de daha büyük görünür."""
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > alpha_min)
    if xs.size == 0:
        return img
    pad = 4
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(rgba.shape[1], int(xs.max()) + 1 + pad)
    bottom = min(rgba.shape[0], int(ys.max()) + 1 + pad)
    return Image.fromarray(rgba[top:bottom, left:right], mode="RGBA")


def pad_rgba(img: Image.Image, px: int = 5) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    h, w = rgba.shape[:2]
    out = np.zeros((h + px * 2, w + px * 2, 4), dtype=np.uint8)
    out[px : px + h, px : px + w] = rgba
    return Image.fromarray(out, mode="RGBA")


def crop_coin_only(img: Image.Image) -> Image.Image:
    """Tam logodan yalnizca ustteki coin bolgesini kes (alt yazi haric)."""
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[:, :, 3]
    h, w = rgba.shape[:2]
    ys, xs = np.where(alpha > 16)
    if ys.size == 0:
        top = int(h * 0.01)
        bottom = int(h * 0.64)
        left = int(w * 0.14)
        right = int(w * 0.86)
        return Image.fromarray(rgba[top:bottom, left:right], mode="RGBA")

    left = int(xs.min())
    right = int(xs.max())
    top = int(ys.min())

    coin_bottom = top
    in_coin = False
    for y in range(top, h):
        row_w = int((alpha[y, :] > 16).sum())
        if row_w >= 36:
            in_coin = True
            coin_bottom = y
            continue
        if in_coin and row_w <= 18:
            break

    if coin_bottom <= top:
        coin_bottom = top + int((h - top) * 0.82)

    pad = 3
    crop_top = max(0, top - pad)
    crop_bottom = min(h - 1, coin_bottom + pad)
    crop_left = max(0, left - pad)
    crop_right = min(w - 1, right + pad)
    return Image.fromarray(rgba[crop_top : crop_bottom + 1, crop_left : crop_right + 1], mode="RGBA")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "designs").mkdir(parents=True, exist_ok=True)

    transparent = make_transparent_logo(SRC)
    trimmed = trim_transparent(transparent)
    trimmed.save(OUT_TRANSPARENT, optimize=True)
    trimmed.save(OUT_LOGO, optimize=True)

    coin = trim_transparent(crop_coin_only(trimmed))
    coin = pad_rgba(coin, px=6)
    coin.save(OUT_COIN, optimize=True)
    coin.save(OUT_ICON_GC, optimize=True)

    print("Wrote:")
    print(" ", OUT_TRANSPARENT.relative_to(ROOT))
    print(" ", OUT_LOGO.relative_to(ROOT))
    print(" ", OUT_ICON_GC.relative_to(ROOT))
    print(" ", OUT_COIN.relative_to(ROOT))


if __name__ == "__main__":
    main()

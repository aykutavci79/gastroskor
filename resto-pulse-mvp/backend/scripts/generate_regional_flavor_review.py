#!/usr/bin/env python3
"""Yöresel lezzet görsel inceleme sayfası üretir.

Kullanım:
  cd resto-pulse-mvp/backend
  python scripts/generate_regional_flavor_review.py

Çıktı:
  frontend/public/regional-flavor-review.html

Tarayıcıda aç (deploy sonrası):
  https://www.gastroskor.com.tr/regional-flavor-review.html

İşaretlediklerini JSON indir → apply script ile uygula:
  python scripts/apply_regional_flavor_overrides.py path/to/export.json
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.data.gastro_regional_filter import is_gastro_regional_product  # noqa: E402
from app.data.regional_city_match import city_mismatch_reason, detect_city_mismatch  # noqa: E402
from app.data.turkiye_geo_products import _all_products  # noqa: E402

OUT_PATH = ROOT.parent / "frontend" / "public" / "regional-flavor-review.html"
SITE = "https://www.gastroskor.com.tr"


def image_url(item) -> str | None:
    raw = item.image_url or ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("/"):
        return f"{SITE}{raw}"
    return None


def build_rows() -> list[dict]:
    rows: list[dict] = []
    for item in _all_products():
        mismatch = detect_city_mismatch(name=item.name, city=item.city, aliases=item.aliases)
        auto_keep = is_gastro_regional_product(
            name=item.name,
            aliases=item.aliases,
            product_group_id=item.product_group_id,
        )
        gastro_exclude_default = not auto_keep
        city_mismatch_default = mismatch is not None
        rows.append(
            {
                "slug": item.slug,
                "name": item.name,
                "city": item.city,
                "group_id": item.product_group_id,
                "group": item.product_group,
                "image_url": image_url(item),
                "auto_keep": auto_keep,
                "gastro_exclude_default": gastro_exclude_default,
                "city_mismatch_default": city_mismatch_default,
                "city_mismatch_note": city_mismatch_reason(mismatch),
                "expected_city": mismatch["expected_city"] if mismatch else None,
                "exclude_default": gastro_exclude_default or city_mismatch_default,
            }
        )
    rows.sort(key=lambda row: (row["city"].casefold(), row["name"].casefold()))
    return rows


def render_html(rows: list[dict]) -> str:
    payload = json.dumps(rows, ensure_ascii=False)
    today = date.today().isoformat()
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GastroSkor — Yöresel lezzet inceleme</title>
  <style>
    :root {{
      color-scheme: dark;
      --bg: #0f0f0f;
      --panel: #1a1a1a;
      --text: #f5f5f5;
      --muted: #a3a3a3;
      --gold: #f59e0b;
      --danger: #ef4444;
      --ok: #22c55e;
      --border: #333;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.4;
    }}
    header {{
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(15, 15, 15, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      padding: 12px 16px;
    }}
    h1 {{ margin: 0 0 6px; font-size: 1.15rem; }}
    .sub {{ color: var(--muted); font-size: 0.85rem; margin-bottom: 10px; }}
    .toolbar {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }}
    input, select, button {{
      background: var(--panel);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      font: inherit;
    }}
    button {{ cursor: pointer; }}
    button.primary {{ border-color: var(--gold); color: var(--gold); font-weight: 700; }}
    .stats {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: 0.82rem; }}
    .stat {{ background: var(--panel); border: 1px solid var(--border); border-radius: 999px; padding: 4px 10px; }}
    main {{ padding: 16px; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .card.excluded {{ opacity: 0.55; border-color: #522; }}
    .card.auto-excluded {{ border-color: #443; }}
    .thumb-wrap {{
      aspect-ratio: 4 / 3;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }}
    .thumb-wrap img {{ width: 100%; height: 100%; object-fit: cover; }}
    .no-img {{ color: var(--muted); font-size: 0.8rem; padding: 12px; text-align: center; }}
    .body {{ padding: 10px 12px 12px; display: grid; gap: 6px; flex: 1; }}
    .city {{ color: var(--gold); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }}
    .name {{ font-weight: 700; font-size: 0.95rem; }}
    .meta {{ color: var(--muted); font-size: 0.75rem; }}
    label.row {{
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      cursor: pointer;
      user-select: none;
    }}
    label.row input {{ width: 18px; height: 18px; accent-color: var(--danger); }}
    .badge {{
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 800;
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid var(--border);
      color: var(--muted);
    }}
    .card.city-bad {{ border-color: #636; }}
    label.row.mismatch input {{ accent-color: #a855f7; }}
    .warn {{ color: #c4b5fd; font-size: 0.72rem; line-height: 1.35; }}
    footer {{
      padding: 20px 16px 40px;
      color: var(--muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
    }}
    code {{ color: #fde68a; }}
  </style>
</head>
<body>
  <header>
    <h1>Yöresel lezzet inceleme</h1>
    <p class="sub">TÜRKPATENT görselleri — <strong>1. tik:</strong> GastroSkor dışı (granit, kilim…) · <strong>2. tik:</strong> il eşleşmiyor ({today}).</p>
    <div class="toolbar">
      <input id="q" type="search" placeholder="İl veya ürün ara…" style="min-width:220px" />
      <select id="filter">
        <option value="all">Tümü</option>
        <option value="keep">Kalan (tik yok)</option>
        <option value="exclude">Çıkarılacak (tikli)</option>
        <option value="auto">Otomatik elenen</option>
        <option value="mismatch">İl eşleşmiyor</option>
      </select>
      <select id="cityFilter"><option value="">Tüm iller</option></select>
      <button type="button" id="allExclude">Tümünü çıkar</button>
      <button type="button" id="noneExclude">Tüm tikleri kaldır</button>
      <button type="button" id="resetAuto" title="Otomatik filtreye sıfırla">Otomatik filtreye dön</button>
      <button type="button" class="primary" id="exportBtn">JSON indir (exclude_slugs)</button>
    </div>
    <div class="stats">
      <span class="stat">Toplam: <strong id="statTotal">0</strong></span>
      <span class="stat">Kalacak: <strong id="statKeep" style="color:var(--ok)">0</strong></span>
      <span class="stat">Çıkar: <strong id="statExclude" style="color:var(--danger)">0</strong></span>
      <span class="stat">İl uyumsuz: <strong id="statMismatch" style="color:#c4b5fd">0</strong></span>
      <span class="stat">Görselsiz: <strong id="statNoImg">0</strong></span>
    </div>
  </header>
  <main><div class="grid" id="grid"></div></main>
  <footer>
    JSON indirdikten sonra backend'de:
    <code>python scripts/apply_regional_flavor_overrides.py indirilen-dosya.json</code>
  </footer>
  <script>
    const ITEMS = {payload};
    const grid = document.getElementById('grid');
    const q = document.getElementById('q');
    const filter = document.getElementById('filter');
    const cityFilter = document.getElementById('cityFilter');
    const gastroState = new Map(ITEMS.map(item => [item.slug, !!item.gastro_exclude_default]));
    const mismatchState = new Map(ITEMS.map(item => [item.slug, !!item.city_mismatch_default]));

    function isExcluded(slug) {{
      return gastroState.get(slug) || mismatchState.get(slug);
    }}

    const cities = [...new Set(ITEMS.map(i => i.city))].sort((a,b) => a.localeCompare(b, 'tr'));
    for (const city of cities) {{
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      cityFilter.appendChild(opt);
    }}

    function matchesFilters(item) {{
      const query = q.value.trim().toLocaleLowerCase('tr');
      const excluded = isExcluded(item.slug);
      const gastroTick = gastroState.get(item.slug);
      const mismatchTick = mismatchState.get(item.slug);
      if (cityFilter.value && item.city !== cityFilter.value) return false;
      if (query) {{
        const hay = `${{item.city}} ${{item.name}} ${{item.slug}}`.toLocaleLowerCase('tr');
        if (!hay.includes(query)) return false;
      }}
      if (filter.value === 'keep' && excluded) return false;
      if (filter.value === 'exclude' && !excluded) return false;
      if (filter.value === 'auto' && item.auto_keep) return false;
      if (filter.value === 'mismatch' && !mismatchTick) return false;
      if (filter.value === 'manual') {{
        const manual = (gastroTick !== item.gastro_exclude_default) || (mismatchTick !== item.city_mismatch_default);
        if (!manual) return false;
      }}
      return true;
    }}

    function updateStats() {{
      let keep = 0, exclude = 0, noImg = 0, mismatch = 0;
      for (const item of ITEMS) {{
        if (isExcluded(item.slug)) exclude++; else keep++;
        if (mismatchState.get(item.slug)) mismatch++;
        if (!item.image_url) noImg++;
      }}
      document.getElementById('statTotal').textContent = ITEMS.length;
      document.getElementById('statKeep').textContent = keep;
      document.getElementById('statExclude').textContent = exclude;
      document.getElementById('statMismatch').textContent = mismatch;
      document.getElementById('statNoImg').textContent = noImg;
    }}

    function render() {{
      grid.innerHTML = '';
      for (const item of ITEMS) {{
        if (!matchesFilters(item)) continue;
        const excluded = isExcluded(item.slug);
        const card = document.createElement('article');
        card.className = 'card'
          + (excluded ? ' excluded' : '')
          + (item.gastro_exclude_default ? ' auto-excluded' : '')
          + (item.city_mismatch_default ? ' city-bad' : '');
        const imgPart = item.image_url
          ? `<img src="${{item.image_url}}" alt="" loading="lazy" />`
          : '<div class="no-img">Görsel yok</div>';
        const mismatchNote = item.city_mismatch_note
          ? `<div class="warn">${{item.city_mismatch_note}}</div>`
          : '';
        card.innerHTML = `
          <div class="thumb-wrap">${{imgPart}}</div>
          <div class="body">
            <div class="city">${{item.city}}${{item.expected_city ? ' → ' + item.expected_city : ''}}</div>
            <div class="name">${{item.name}}</div>
            <div class="meta">Grup ${{item.group_id}} · ${{item.slug}}</div>
            <div>${{item.auto_keep ? '<span class="badge">yemek OK</span>' : '<span class="badge auto">gastro ELENDİ</span>'}}${{item.city_mismatch_default ? ' <span class="badge auto">il UYUMSUZ</span>' : ''}}</div>
            ${{mismatchNote}}
            <label class="row"><input type="checkbox" data-kind="gastro" data-slug="${{item.slug}}" ${{gastroState.get(item.slug) ? 'checked' : ''}} /> 1) GastroSkor dışı</label>
            <label class="row mismatch"><input type="checkbox" data-kind="mismatch" data-slug="${{item.slug}}" ${{mismatchState.get(item.slug) ? 'checked' : ''}} /> 2) İl eşleşmiyor</label>
          </div>`;
        grid.appendChild(card);
      }}
      grid.querySelectorAll('input[type=checkbox]').forEach(box => {{
        box.addEventListener('change', () => {{
          if (box.dataset.kind === 'mismatch') mismatchState.set(box.dataset.slug, box.checked);
          else gastroState.set(box.dataset.slug, box.checked);
          updateStats();
          render();
        }});
      }});
    }}

    q.addEventListener('input', render);
    filter.addEventListener('change', render);
    cityFilter.addEventListener('change', render);

    document.getElementById('allExclude').addEventListener('click', () => {{
      for (const item of ITEMS) {{ gastroState.set(item.slug, true); mismatchState.set(item.slug, true); }}
      updateStats(); render();
    }});
    document.getElementById('noneExclude').addEventListener('click', () => {{
      for (const item of ITEMS) {{ gastroState.set(item.slug, false); mismatchState.set(item.slug, false); }}
      updateStats(); render();
    }});
    document.getElementById('resetAuto').addEventListener('click', () => {{
      for (const item of ITEMS) {{
        gastroState.set(item.slug, !!item.gastro_exclude_default);
        mismatchState.set(item.slug, !!item.city_mismatch_default);
      }}
      updateStats(); render();
    }});
    document.getElementById('exportBtn').addEventListener('click', () => {{
      const exclude_slugs = ITEMS.filter(i => isExcluded(i.slug)).map(i => i.slug).sort();
      const include_slugs = ITEMS.filter(i => !isExcluded(i.slug) && (!i.auto_keep || i.city_mismatch_default)).map(i => i.slug).sort();
      const city_mismatch_slugs = ITEMS.filter(i => mismatchState.get(i.slug)).map(i => i.slug).sort();
      const payload = {{
        updated_at: new Date().toISOString().slice(0, 10),
        note: 'regional-flavor-review.html export',
        exclude_slugs,
        include_slugs,
        city_mismatch_slugs,
      }};
      const blob = new Blob([JSON.stringify(payload, null, 2)], {{ type: 'application/json' }});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'regional-flavor-overrides.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }});

    updateStats();
    render();
  </script>
</body>
</html>
"""


def main() -> int:
    rows = build_rows()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(render_html(rows), encoding="utf-8")
    auto_out = sum(1 for row in rows if row["exclude_default"])
    mismatch_out = sum(1 for row in rows if row["city_mismatch_default"])
    print(f"Wrote {len(rows)} items -> {OUT_PATH}")
    print(f"  otomatik cikar (toplam tik): {auto_out}")
    print(f"  il uyumsuz: {mismatch_out}")
    print(f"  ac: file:///{OUT_PATH.as_posix()} veya deploy sonrasi {SITE}/regional-flavor-review.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

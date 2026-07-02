"""NVI (melihozkara dump) -> address_node_cache — Bursa il/ilce/mahalle/sokak.

Kullanim (backend klasoru):
  py scripts/import_bursa_address_nodes.py
  py scripts/import_bursa_address_nodes.py --write-seed   # data/bursa_address_nodes.json

Ilk calistirmada GitHub'dan zip indirir (~18 MB), sonra Bursa satirlarini DB'ye yazar.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import SessionLocal
from app.models.entities import AddressNodeCache

BURSA_IL_ID = 16
BURSA_PROVINCE_NODE_ID = 16
ZIP_URL = (
    "https://raw.githubusercontent.com/melihozkara/il-ilce-mahalle-sokak-veritabani/"
    "main/sql/titlecase_data_12-04-2026.zip"
)
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "nvi-address"
SEED_PATH = Path(__file__).resolve().parents[1] / "data" / "bursa_address_nodes.json"

INSERT_ILCE = re.compile(
    r"INSERT INTO `ilceler` \(`id`, `name`, `kimlikNo`, `il_id`\) VALUES \((\d+), '([^']*)', (\d+), (\d+)\);"
)
INSERT_MAHALLE = re.compile(
    r"INSERT INTO `mahalleler` \(`id`, `name`, `bilesenName`, `kimlikNo`, `il_id`, `ilce_id`\) "
    r"VALUES \((\d+), '([^']*)', '([^']*)', (\d+), (\d+), (\d+)\);"
)
INSERT_CSBM = re.compile(
    r"INSERT INTO `csbms` \(`id`, `name`, `bilesenName`, `il_id`, `ilce_id`, `mahalle_id`\) "
    r"VALUES \((\d+), '([^']*)', '([^']*)', (\d+), (\d+), (\d+)\);"
)


def _ensure_sql_dump() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DATA_DIR / "titlecase.zip"
    sql_path = DATA_DIR / "titlecase_data_12-04-2026.sql"
    if sql_path.is_file():
        return sql_path
    if not zip_path.is_file():
        print(f"Indiriliyor: {ZIP_URL}")
        try:
            import certifi

            verify: bool | str = certifi.where()
        except ImportError:
            verify = True
        try:
            with httpx.Client(timeout=300, verify=verify, follow_redirects=True) as client:
                response = client.get(ZIP_URL)
                response.raise_for_status()
                zip_path.write_bytes(response.content)
        except Exception:
            with httpx.Client(timeout=300, verify=False, follow_redirects=True) as client:
                response = client.get(ZIP_URL)
                response.raise_for_status()
                zip_path.write_bytes(response.content)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(DATA_DIR)
    if not sql_path.is_file():
        raise FileNotFoundError(f"SQL cikarilamadi: {sql_path}")
    return sql_path


def _street_display(name: str, bilesen: str) -> str:
    clean = (name or "").strip()
    if clean and not clean.isdigit():
        return clean
    alt = (bilesen or "").strip()
    if alt.endswith(")"):
        alt = alt.rsplit("(", 1)[0].strip()
    return alt or clean or "Sokak"


def _node_id(prefix: int, *parts: int) -> int:
    value = prefix
    for part in parts:
        value = value * 100000 + int(part)
    return value


def parse_bursa_nodes(sql_path: Path) -> list[dict]:
    ilce_ids: set[int] = set()
    mahalle_keys: set[tuple[int, int]] = set()
    nodes: list[dict] = [
        {
            "tradres_id": BURSA_PROVINCE_NODE_ID,
            "parent_id": None,
            "level": "province",
            "name": "Bursa",
        }
    ]

    with sql_path.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if line.startswith("INSERT INTO `ilceler`"):
                match = INSERT_ILCE.search(line)
                if not match or int(match.group(4)) != BURSA_IL_ID:
                    continue
                row_id, name, kimlik_no, _il_id = match.groups()
                ilce_id = int(kimlik_no)
                ilce_ids.add(ilce_id)
                nodes.append(
                    {
                        "tradres_id": ilce_id,
                        "parent_id": BURSA_PROVINCE_NODE_ID,
                        "level": "district",
                        "name": name.replace("\\'", "'"),
                    }
                )
            elif line.startswith("INSERT INTO `mahalleler`"):
                match = INSERT_MAHALLE.search(line)
                if not match or int(match.group(5)) != BURSA_IL_ID:
                    continue
                mahalle_row_id, name, _bilesen, _kimlik, _il_id, ilce_id = match.groups()
                ilce_id_int = int(ilce_id)
                if ilce_id_int not in ilce_ids:
                    continue
                mahalle_row_id_int = int(mahalle_row_id)
                mahalle_keys.add((ilce_id_int, mahalle_row_id_int))
                nodes.append(
                    {
                        "tradres_id": _node_id(2, ilce_id_int, mahalle_row_id_int),
                        "parent_id": ilce_id_int,
                        "level": "neighborhood",
                        "name": name.replace("\\'", "'"),
                    }
                )

    with sql_path.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.startswith("INSERT INTO `csbms`"):
                continue
            match = INSERT_CSBM.search(line)
            if not match or int(match.group(4)) != BURSA_IL_ID:
                continue
            csbm_id, name, bilesen, _il_id, ilce_id, mahalle_id = match.groups()
            ilce_id_int = int(ilce_id)
            mahalle_id_int = int(mahalle_id)
            if (ilce_id_int, mahalle_id_int) not in mahalle_keys:
                continue
            parent_id = _node_id(2, ilce_id_int, mahalle_id_int)
            nodes.append(
                {
                    "tradres_id": _node_id(3, ilce_id_int, mahalle_id_int, int(csbm_id)),
                    "parent_id": parent_id,
                    "level": "street",
                    "name": _street_display(name.replace("\\'", "'"), bilesen.replace("\\'", "'")),
                }
            )
    return nodes


def upsert_nodes(nodes: list[dict], *, batch_size: int = 500) -> int:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        for offset in range(0, len(nodes), batch_size):
            chunk = nodes[offset : offset + batch_size]
            rows = [
                {
                    "tradres_id": row["tradres_id"],
                    "parent_id": row["parent_id"],
                    "level": row["level"],
                    "name": row["name"],
                    "synced_at": now,
                }
                for row in chunk
            ]
            stmt = insert(AddressNodeCache).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=[AddressNodeCache.tradres_id],
                set_={
                    "parent_id": stmt.excluded.parent_id,
                    "level": stmt.excluded.level,
                    "name": stmt.excluded.name,
                    "synced_at": stmt.excluded.synced_at,
                },
            )
            db.execute(stmt)
        db.commit()
    return len(nodes)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-seed", action="store_true", help="JSON seed dosyasi uret")
    parser.add_argument("--seed-only", action="store_true", help="Sadece mevcut seed'i DB'ye yaz")
    args = parser.parse_args()

    if args.seed_only:
        if not SEED_PATH.is_file():
            print(f"Seed yok: {SEED_PATH}")
            return 1
        nodes = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        count = upsert_nodes(nodes)
        print(f"Seed'den {count} dugum yazildi.")
        return 0

    sql_path = _ensure_sql_dump()
    print(f"SQL okunuyor: {sql_path.name}")
    nodes = parse_bursa_nodes(sql_path)
    districts = sum(1 for n in nodes if n["level"] == "district")
    neighborhoods = sum(1 for n in nodes if n["level"] == "neighborhood")
    streets = sum(1 for n in nodes if n["level"] == "street")
    print(f"Bursa: {districts} ilce, {neighborhoods} mahalle, {streets} sokak")

    if args.write_seed or not SEED_PATH.is_file():
        SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
        SEED_PATH.write_text(json.dumps(nodes, ensure_ascii=False), encoding="utf-8")
        print(f"Seed yazildi: {SEED_PATH} ({SEED_PATH.stat().st_size // 1024} KB)")

    count = upsert_nodes(nodes)
    print(f"DB'ye {count} dugum yazildi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

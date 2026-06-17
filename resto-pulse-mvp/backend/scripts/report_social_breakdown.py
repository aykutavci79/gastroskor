"""Sosyal kanit platform kirilimi — iskender sorgulari."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import text

from app.db.session import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                select query_normalized, status, payload_json, updated_at
                from social_proof_cache
                where query_normalized like '%iskender%'
                order by updated_at desc
                limit 3
                """
            )
        ).all()

        print("=== ONBELLEK (sosyal kanit / rozet) ===")
        for qn, status, payload, updated in rows:
            print(f"\nSorgu: {qn} | status: {status} | {updated}")
            results = (payload or {}).get("results") or []
            meta = (payload or {}).get("meta") or {}
            print(f"  Toplam mention (meta): {meta.get('matched')} | ham: {meta.get('raw_items')}")
            if not results:
                print("  Rozetli mekan yok")
                continue
            for r in results:
                src = r.get("sources_summary") or {}
                print(f"  - {r.get('name')}")
                print(
                    f"    rozet: {r.get('badge')} | toplam: {r.get('n_total')} | olumlu: {r.get('n_positive')}"
                )
                print(
                    f"    reddit: {src.get('reddit', 0)} | x: {src.get('x', 0)} | "
                    f"youtube: {src.get('youtube', 0)} | community: {src.get('community', 0)}"
                )

        job = db.execute(
            text(
                """
                select id, query, status, places_snapshot_json
                from social_proof_jobs
                where query ilike '%iskender kebap%'
                order by created_at desc
                limit 1
                """
            )
        ).first()

        if not job:
            return

        job_id, query, job_status, places_raw = job
        places = places_raw or []
        print("\n=== SON ISKENDER KEBAP TARAMASI ===")
        print(f"Job: {job_id} | {query} | {job_status}")
        print(f"Google listesindeki mekan: {len(places)}")
        print("Ilk 15 (listeye GOOGLE soktu; rozet ayri):")
        place_names: dict[str, str] = {}
        for i, p in enumerate(places[:15], 1):
            if not isinstance(p, dict):
                continue
            name = p.get("name") or "?"
            pid = p.get("place_id") or ""
            place_names[pid] = name
            print(f"  {i}. {name} | Google yorum: {p.get('user_ratings_total')}")

        mention_rows = db.execute(
            text(
                """
                select matched_place_id, platform, count(*) as c
                from social_mentions
                where job_id = :jid
                group by matched_place_id, platform
                order by matched_place_id, platform
                """
            ),
            {"jid": str(job_id)},
        ).all()

        print("\nPlatform mention (sadece eslesenler):")
        if not mention_rows:
            print("  Kayit yok")
            return

        by_place: dict[str, dict[str, int]] = defaultdict(dict)
        for pid, platform, count in mention_rows:
            by_place[str(pid)][str(platform)] = int(count)

        for pid, platforms in by_place.items():
            name = place_names.get(pid, pid[:24])
            parts = ", ".join(f"{k}:{v}" for k, v in sorted(platforms.items()))
            total = sum(platforms.values())
            print(f"  {name} -> toplam {total} ({parts})")

        no_mention = [place_names.get(p.get("place_id", ""), p.get("name")) for p in places[:15] if isinstance(p, dict)]
        mentioned_names = {place_names.get(pid, pid) for pid in by_place}
        silent = [n for n in no_mention if n and n not in mentioned_names]
        if silent:
            print("\nListede ama sosyal mention YOK (ilk 15 icinden):")
            for n in silent:
                print(f"  - {n}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

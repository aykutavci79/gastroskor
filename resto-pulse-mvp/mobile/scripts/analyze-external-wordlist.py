"""Harici kelime listesini Günlük Kelime havuzu ile karsilastir."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MOBILE = Path(__file__).resolve().parents[1]
BES_HARF = MOBILE / "data/gunluk-kelime/bes-harf-havuz.json"
YAZILIS = MOBILE / "data/kelime-sofrasi/kelime-yazilis.json"

TR_LETTERS = re.compile(r"^[A-ZÇĞİÖŞÜI]+$")


def fold_ascii(s: str) -> str:
    t = s.strip().upper()
    for a, b in [
        ("İ", "I"), ("Ş", "S"), ("Ğ", "G"), ("Ü", "U"), ("Ö", "O"), ("Ç", "C"),
    ]:
        t = t.replace(a, b)
    return re.sub(r"[^A-Z]", "", t)


def grapheme_len(s: str) -> int:
    return len([c for c in s.strip().upper() if TR_LETTERS.match(c) or c in "ÇĞİÖŞÜ"])


def load_bes() -> tuple[set[str], set[str]]:
    data = json.loads(BES_HARF.read_text(encoding="utf-8"))
    canon = {w.upper() for w in data["words"]}
    ascii_keys = {fold_ascii(w) for w in canon}
    return canon, ascii_keys


def extract_words(raw: str) -> list[str]:
    return re.findall(r'"([a-zA-ZçğıöşüÇĞİÖŞÜI]+)"', raw)


def main() -> None:
    raw_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not raw_path or not raw_path.is_file():
        print("Kullanim: python analyze-external-wordlist.py <paste.txt>")
        sys.exit(1)

    raw = raw_path.read_text(encoding="utf-8", errors="ignore")
    # Tekrar spamini kes (esir/eski/esmer dongusu)
    spam = raw.find('"esir", "eski", "esmer", "esnaf", "esinti", "esir"')
    if spam > 0:
        raw = raw[:spam]

    tokens = extract_words(raw)
    unique = list(dict.fromkeys(t.upper() for t in tokens))

    bes_canon, bes_ascii = load_bes()

    five: list[str] = []
    other: list[str] = []
    for w in unique:
        if grapheme_len(w) == 5:
            five.append(w)
        else:
            other.append(w)

    five_set = set(five)
    five_ascii = {fold_ascii(w) for w in five}

    overlap = five_set & bes_canon
    overlap_ascii = len(five_ascii & bes_ascii)
    new_for_us = five_set - bes_canon
    new_ascii_only = len(five_ascii - bes_ascii)

    print(f"Ham token (benzersiz): {len(unique)}")
    print(f"5 harfli: {len(five_set)}")
    print(f"5 harf degil (3-4-6+): {len(other)}")
    print(f"Mevcut bes-harf havuzunda (746): {len(overlap)} eslesme")
    print(f"ASCII anahtar kesisim: {overlap_ascii}")
    print(f"Bizde OLMAYAN 5 harfli: {len(new_for_us)}")
    print(f"ASCII ile yeni aday: {new_ascii_only}")
    print()
    print("Ornek yeni 5 harf (ilk 25):")
    for w in sorted(new_for_us)[:25]:
        print(f"  {w}")
    print()
    print("Ornek zaten bizde (ilk 15):")
    for w in sorted(overlap)[:15]:
        print(f"  {w}")


if __name__ == "__main__":
    main()

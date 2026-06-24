"""Ikinci kullanici kelime listesi analizi."""
import json
import re
import sys
from pathlib import Path

MOBILE = Path(__file__).resolve().parents[1]
BES = MOBILE / "data/gunluk-kelime/bes-harf-havuz.json"
SOFRA = MOBILE / "data/kelime-sofrasi/havuz.json"


def fold(s: str) -> str:
    t = s.strip().upper()
    for a, b in [("İ", "I"), ("Ş", "S"), ("Ğ", "G"), ("Ü", "U"), ("Ö", "O"), ("Ç", "C"), ("I", "I"), ("ı", "I")]:
        t = t.replace(a, b)
    return re.sub(r"[^A-Z]", "", t)


def grapheme_len(w: str) -> int:
    w = w.strip()
    # Turkce harfler + birlesik harf sayimi
    cleaned = re.sub(r"[^a-zA-ZçğıöşüÇĞİÖŞÜI]", "", w)
    return len(cleaned)


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else MOBILE / "data/gunluk-kelime/external-user-paste2.txt"
    raw = path.read_text(encoding="utf-8", errors="ignore")
    tokens = [t.strip() for t in re.split(r"[,;\s]+", raw) if t.strip()]
    unique = list(dict.fromkeys(tokens))

    bes = {w.upper() for w in json.loads(BES.read_text(encoding="utf-8"))["words"]}
    bes_ascii = {fold(w) for w in bes}

    sofra_rows = json.loads(SOFRA.read_text(encoding="utf-8"))
    sofra_all = {str(r.get("yazilis") or r.get("kelime", "")).upper() for r in sofra_rows}

    five = [w for w in unique if grapheme_len(w) == 5]
    five_set = {w.upper() for w in five}
    five_ascii = {fold(w) for w in five}

    in_bes = five_set & bes
    in_sofra = five_set & sofra_all
    new5 = five_set - bes
    new5_ascii = len(five_ascii - bes_ascii)

    print(f"Toplam token: {len(unique)}")
    print(f"Tam 5 harf: {len(five_set)}")
    print(f"5 harf degil: {len(unique) - len(five_set)}")
    print(f"746 bes-harf ile kesisim: {len(in_bes)}")
    print(f"Sofra havuz (2178) ile kesisim: {len(in_sofra)}")
    print(f"746 disi YENI 5 harf: {len(new5)}")
    print(f"ASCII ile yeni aday: {new5_ascii}")
    print()
    print("Ornek ortak (746):", sorted(in_bes)[:20])
    print("Ornek yeni 5 harf:", sorted(new5)[:30])


if __name__ == "__main__":
    main()

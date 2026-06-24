import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "data/gunluk-kelime"
bes = {w.upper() for w in json.loads((root / "bes-harf-havuz.json").read_text(encoding="utf-8"))["words"]}
ext = json.loads((root / "external-user-paste.json").read_text(encoding="utf-8"))


def fold(s: str) -> str:
    t = s.upper()
    for a, b in [("İ", "I"), ("Ş", "S"), ("Ğ", "G"), ("Ü", "U"), ("Ö", "O"), ("Ç", "C")]:
        t = t.replace(a, b)
    return re.sub(r"[^A-Z]", "", t)


def grapheme_len(w: str) -> int:
    return len([c for c in w.strip().upper() if c.isalpha() or c in "ÇĞİÖŞÜ"])


five = {w.upper() for w in ext if grapheme_len(w) == 5}
overlap = five & bes
new = five - bes

print("=== Yapistirdigin listenin temiz kismi (ic ice 2. blok) ===")
print(f"Toplam kelime: {len(ext)}")
print(f"Tam 5 harf: {len(five)}")
print(f"5 harf degil (Wordle tahmin icin uygun degil): {len(ext) - len(five)}")
print(f"Bizim 746 havuzda VAR: {len(overlap)}")
print(f"Bizde YOK (5 harf): {len(new)}")
print(f"Ornek ortak: {sorted(overlap)[:15]}")
print(f"Ornek yeni: {sorted(new)[:20]}")

# Ilk blok (aba... azze) - kullanicinin basi
first_chunk = """
aba abadi abali abana abani abaza abbas abdal abide abiye ablak abone abosa abrak abril absis abula abuli
acele acemi aciz acun adak adet adil adli afet aile ajan akait akar akca akil akim akin akit akka akli akma
akne akor akort akran aksa aksak aksam akse aksi akson aktar aktif akut alan alarm alay alaz albay alfa algi
alici alik alim alin alis ali alma alti altin alto amac aman amca amel amen amfi amil amin amir amit amme amor
amper ampul anal anam anan anar anca anil anit anka anket anma anne anot aort apak apar apat apex apik apit apos
apse apsi apul aput aran arba arca arda ardo arem aren ares aret arez arfe arga argo ari arin arip aris arit ariz
ark arko arli arma arpa arsi arta arti artik aruz asaf asal asap asar asay asbi asce asef asfi asil asim asis asit
asiv asiz ask aska aski asla asli asma asme asmi asot asri ast astar asur asya atak atal atam atan atar atas atay
ataz ateh aten ates atfe atfi atig atik atil atim atka atla atlas atlet atli atma atof atol atom atut atuz avar
avas avat avaz avet avlu avni avun avur avut avuz ayal ayan ayar ayas ayat ayaz ayca ayda ayde ayet aygi ayik ayil
ayin ayip ayir ayit ayka ayla ayli ayma ayna ayni ayra ayre ayri aysa ayse aysi ayso aysu ayta ayte ayto aytu ayun
ayva ayve ayza ayze azab azad azam azan azar azat azca azda azel azem azen azer azet azez azic azik azil azim azin
azip azis azit aziz azka azla azli azma azme azmi azot azra azre azri azro azru azza azze
""".split()

five_fc = {w.upper() for w in first_chunk if len(w) == 5}
merged = five | five_fc
merged_new = merged - bes

print()
print("=== + Listenin ILK blogu (aba-azze) ===")
print(f"5 harf (ilk blok): {len(five_fc)}")
print(f"746 kesisim: {len(five_fc & bes)}")
print(f"746 disi yeni: {len(five_fc - bes)}")
print()
print("=== BIRLESIK tahmin ===")
print(f"Toplam benzersiz 5 harf: {len(merged)}")
print(f"746 disi toplam yeni: {len(merged_new)}")
print(f"Hedef (TDK tahmin): ~3000-6000 | Bizde simdi: 746")

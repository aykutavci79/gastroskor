"""Gurme BilBakalim soru havuzu uretici — python scripts/generate_trivia_questions.py"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "data" / "gourmet_trivia_questions.json"

TAGS = ("doner", "ocakbasi", "tatli", "kahvalti", "gece", "kahve", "fiyat", "genel", None)


def main() -> None:
    items: list[dict] = []
    seen: set[str] = set()

    def add(text: str, answers: list[str], room_tag: str | None = "genel") -> None:
        if text in seen:
            return
        seen.add(text)
        items.append({"text": text, "answers": answers, "room_tag": room_tag})

    add("Bursa'nın meşhur döner çeşidinin adı nedir?", ["iskender", "iskender kebap", "bursa iskender"], "doner")
    add("Kemalpaşa tatlısı hangi ilin coğrafi işaretli ürünüdür?", ["bursa", "bursa ili"], "tatli")
    add("Çantık hangi şehirle özdeşleşmiştir?", ["bursa"], "genel")
    add("Menemen hangi ülkenin klasik kahvaltı yemeğidir?", ["türkiye", "turkiye"], "kahvalti")
    add("Sütlaç genelde hangi öğünde tatlı olarak yenir?", ["akşam", "aksam", "yemek sonrası"], "tatli")
    add("Lahmacunda hamurun üzerine ne yayılır?", ["kıyma", "kiyma", "et"], "genel")
    add("Baklavanın temel katmanı nedir?", ["yufka", "yufka hamuru"], "tatli")
    add("Ayran hangi ana maddeden yapılır?", ["yoğurt", "yogurt"], "genel")
    add("Türk kahvesi hangi öğütülmüş üründen yapılır?", ["kahve", "kahve çekirdeği"], "kahve")
    add("Mantı genelde hangi sosla servis edilir?", ["yoğurt", "yogurt", "sarımsaklı yoğurt"], "genel")
    add("Adana kebabı hangi şehirle özdeşleşmiştir?", ["adana"], "ocakbasi")
    add("Künefe hangi şehirle özdeşleşir?", ["hatay", "antakya"], "tatli")
    add("Çiğ köfte geleneksel olarak pişmiş et içerir mi?", ["hayır", "hayir", "et yok"], "gece")
    add("Balık ekmek hangi şehirde sokak lezzeti olarak bilinir?", ["istanbul", "eminönü", "eminonu"], "gece")
    add("Kokoreç hangi organdan yapılır?", ["bağırsak", "bagirsak", "küçükbağırsak"], "gece")
    add("Midye dolma hangi deniz ürünüyle yapılır?", ["midye"], "gece")
    add("Tavuk döner hangi etten yapılır?", ["tavuk"], "doner")
    add("Et dönerde en yaygın et hangisidir?", ["kuzu", "dana", "kuzu eti"], "doner")
    add("İnegöl köftesi hangi ilçeyle özdeşleşir?", ["inegöl", "inegol", "bursa"], "doner")
    add("İskender kebabını kim popülerleştirmiştir?", ["iskender efendi", "iskender"], "doner")
    add("Kestane şekeri Bursa'da hangi mevsimde çok satılır?", ["sonbahar", "kış", "kis"], "tatli")
    add("Cevizli lokum hangi şehirle özdeşleşir?", ["bursa"], "tatli")
    add("Pizza hangi ülkeden dünyaya yayılmıştır?", ["italya"], "genel")
    add("Sushi hangi ülkenin mutfağındandır?", ["japonya"], "genel")
    add("Taco hangi ülkenin sokak yemeğidir?", ["meksika"], "genel")
    add("Pho çorbası hangi ülkededir?", ["vietnam"], "genel")
    add("Pad thai hangi ülkenin yemeğidir?", ["tayland", "thailand"], "genel")
    add("Hamburger popülerleşmesinde hangi ülke öncülük etmiştir?", ["abd", "amerika", "usa"], "gece")
    add("Fish and chips hangi ülkenin klasik yemeğidir?", ["ingiltere", "britanya"], "genel")
    add("Humusun ana malzemesi nedir?", ["nohut"], "genel")
    add("Cacığın ana malzemesi nedir?", ["yoğurt", "yogurt"], "genel")
    add("Karnıyarık hangi sebze ile yapılır?", ["patlıcan", "patlican"], "anne-eli-ev-yemegi")
    add("İmam bayıldı hangi sebze ile yapılır?", ["patlıcan", "patlican"], "anne-eli-ev-yemegi")
    add("Mercimek çorbasının ana malzemesi nedir?", ["mercimek"], "anne-eli-ev-yemegi")
    add("Pilavın temel tahılı nedir?", ["pirinç", "pirinc"], "anne-eli-ev-yemegi")
    add("Bulgur pilavında hangi tahıl kullanılır?", ["bulgur"], "anne-eli-ev-yemegi")
    add("Lahmacun şekli genelde nasıldır?", ["uzun", "oval", "uzun servis"], "genel")
    add("Dondurma nasıl servis edilir?", ["soğuk", "soguk"], "tatli")
    add("Çorba genelde nasıl tüketilir?", ["sıcak", "sicak"], "anne-eli-ev-yemegi")

    cities_food = [
        ("Gaziantep", "baklava"),
        ("Konya", "etli ekmek"),
        ("Edirne", "tava kuzu"),
        ("İzmir", "boyoz"),
        ("Trabzon", "hamsi"),
        ("Rize", "muhlama"),
        ("Antalya", "piyaz"),
        ("Mersin", "tantuni"),
        ("Erzurum", "cağ kebap"),
        ("Van", "otlu peynir"),
        ("Bursa", "iskender"),
        ("Urfa", "çiğ köfte"),
        ("Diyarbakır", "ciğer kebabı"),
        ("Kayseri", "mantı"),
        ("Eskişehir", "met helvası"),
    ]
    for city, food in cities_food:
        add(f"{city} hangi yemekle özdeşleşir?", [food.lower(), food, city.lower()], "genel")

    ingredients = [
        ("ezme", "domates"),
        ("tarator", "ceviz"),
        ("börek", "yufka"),
        ("lahmacun", "kıyma"),
        ("iskender", "döner eti"),
        ("tantuni", "et"),
        ("piyaz", "fasulye"),
        ("hummus", "nohut"),
        ("guacamole", "avokado"),
        ("ratatouille", "sebze"),
    ]
    for dish, ing in ingredients:
        add(f"{dish} için temel malzeme hangisidir?", [ing.lower(), ing], "genel")

    drinks = [
        ("espresso", "italya"),
        ("matcha", "japonya"),
        ("salep", "türkiye"),
        ("boza", "türkiye"),
        ("şalgam", "türkiye"),
        ("rakı", "türkiye"),
        ("şerbet", "osmanlı"),
    ]
    for drink, origin in drinks:
        add(f"{drink.capitalize()} hangi kültürle özdeşleşir?", [origin.lower(), origin], "kahve")

    ocak = [
        ("Şiş kebap hangi alete takılarak pişirilir?", ["şiş", "sis", "metal şiş"]),
        ("Adana kebabı hangi şehirdendir?", ["adana"]),
        ("Urfa kebabında acı biber bulunur mu?", ["hayır", "hayir", "yok"]),
        ("Kuzu şiş hangi etten yapılır?", ["kuzu"]),
        ("Kaburga dolması hangi etle yapılır?", ["kuzu", "dana"]),
        ("Mangal ateşi için en yaygın yakıt?", ["kömür", "komur", "odun"]),
    ]
    for q, a in ocak:
        add(q, a, "ocakbasi")

    gece = [
        ("Gece sokaklarında simit yanında ne içilir?", ["çay", "cay", "ayran"]),
        ("Tost genelde hangi eşyada pişirilir?", ["tost makinesi", "tost makinesinde"]),
        ("Patates kızartması hangi yağda kızartılır?", ["ayçiçek", "aycicek", "sıvı yağ"]),
        ("Hamburgerde etin altında ne olur?", ["ekmek", "somun"]),
        ("Döner dürüm hangi hamurla sarılır?", ["lavash", "lavaş", "tortilla", "yufka"]),
    ]
    for q, a in gece:
        add(q, a, "gece")

    fiyat = [
        ("Fiyat-performans için genelde hangi öğün daha uygundur?", ["öğle", "ogle", "öğle yemeği"]),
        ("Ev yemeği lokantasında tabldot ne demektir?", ["günün yemeği", "gunun yemegi"]),
        ("Menüde 'porsiyon' neyi ifade eder?", ["kişilik", "kisilik", "tek porsiyon"]),
    ]
    for q, a in fiyat:
        add(q, a, "fiyat")

    # numbered variants for volume
    templates = [
        ("{city} ilinin meşhur tatlısı hangisidir?", "tatli"),
        ("{city} ilinde en çok bilinen sokak lezzeti?", "gece"),
        ("{city} mutfağında pilav yanında ne yenir?", "genel"),
    ]
    city_sweets = {
        "Bursa": ["kestane şekeri", "cevizli lokum", "kemalpaşa"],
        "Gaziantep": ["baklava", "katmer"],
        "Konya": ["etli ekmek", "bamya"],
        "Antalya": ["piyaz"],
        "Trabzon": ["hamsi", "kuymak"],
    }
    for city, sweets in city_sweets.items():
        for sweet in sweets:
            add(f"{city} ile özdeşleşen lezzet hangisidir: {sweet}?", [sweet.lower(), sweet], "tatli")

    # expand to ~300 with multi-choice style
    mc = [
        ("Hangisi çorba değildir: mercimek, yayla, baklava?", ["baklava"]),
        ("Hangisi tatlı değildir: sütlaç, künefe, lahmacun?", ["lahmacun"]),
        ("Hangisi kahvaltılık değildir: menemen, simit, iskender?", ["iskender"]),
        ("Hangisi döner türü değildir: tavuk, et, baklava?", ["baklava"]),
        ("Hangisi içecek değildir: ayran, rakı, pilav?", ["pilav"]),
        ("Hangisi Bursa lezzeti değildir: iskender, cantık, lahmacun?", ["lahmacun"]),
        ("Hangisi gece atıştırmalığıdır: midye, baklava, kokoreç?", ["baklava"]),
        ("Hangisi ocakbaşı etidir: şiş, lahmacun, kaburga?", ["lahmacun"]),
    ]
    for q, a in mc:
        add(q, a, "genel")

    more = [
        ("Türk mutfağında 'zeytinyağlı' ne demektir?", ["zeytinyağı ile", "zeytinyagi ile"], "genel"),
        ("Lokum hangi malzeme ile tatlandırılır?", ["şeker", "seker"], "tatli"),
        ("Pide fırında mı pişirilir?", ["evet", "firin", "fırın"], "genel"),
        ("Dürüm hangi ülke mutfağından yaygınlaşmıştır?", ["türkiye", "turkiye"], "doner"),
        ("Kısır hangi tahıldan yapılır?", ["bulgur"], "genel"),
        ("Çoban salatasında domates yanında ne olur?", ["salatalık", "salatalik", "soğan"], "genel"),
        ("Kıymalı pide hangi etle yapılır?", ["kıyma", "kiyma"], "genel"),
        ("Fırın sütlaç hangi kapta pişirilir?", ["toprak", "güveç", "guvec"], "tatli"),
        ("Tost peyniri genelde hangisidir?", ["kaşar", "kasar"], "gece"),
        ("Simit üzerine ne serpilir?", ["susam"], "kahvalti"),
        ("Poğaça içine ne konabilir?", ["peynir", "patates", "kıyma"], "kahvalti"),
        ("Börek türlerinden biri hangisidir?", ["su böreği", "su boregi", "sigara böreği"], "kahvalti"),
        ("Çay genelde hangi bitkiden yapılır?", ["çay yaprağı", "cay yapragi", "tea"], "kahve"),
        ("Türk kahvesi fincanında köpük adı nedir?", ["köpük", "kopuk", "kaimaki"], "kahve"),
        ("Granita hangi sıcaklıkta servis edilir?", ["soğuk", "soguk", "buzlu"], "tatli"),
        ("Dondurma hangi maddeden yapılır?", ["süt", "sut"], "tatli"),
        ("Waffle hangi ülkede popülerleşmiştir?", ["belçika", "belcika", "abd"], "tatli"),
        ("Crepe hangi ülkeye özdeşleşir?", ["fransa"], "tatli"),
        ("Ramen hangi ülkenin çorbasıdır?", ["japonya"], "genel"),
        ("Kimchi hangi ülkenin turşusudur?", ["kore", "güney kore"], "genel"),
    ]
    for q, a, t in more:
        add(q, a, t)

    bulk_foods = [
        "döner", "lahmacun", "pide", "mantı", "börek", "gözleme", "kumpir", "tantuni", "çiğ köfte",
        "iskender", "adana kebap", "urfa kebap", "hamsi", "pilav", "kuru fasulye", "nohut",
        "mercimek", "ezogelin", "yayla", "tarhana", "ayran", "şalgam", "boza", "salep", "lokum",
        "baklava", "künefe", "sütlaç", "aşure", "helva", "tulumba", "revani", "kadayıf",
    ]
    for i, food in enumerate(bulk_foods):
        tag = TAGS[i % len(TAGS)]
        add(f"'{food}' hangi mutfakta en çok bilinir?", ["türk", "turk", "türkiye", "turkiye"], tag)
        add(f"'{food}' tatlı mı tuzlu mu: {food}?", ["tatlı" if food in {"baklava", "künefe", "sütlaç", "lokum", "helva", "tulumba", "revani", "kadayıf", "aşure"} else "tuzlu"], tag)

    world = [
        ("Paella", "ispanya"), ("Goulash", "macaristan"), ("Schnitzel", "avusturya"),
        ("Poutine", "kanada"), ("Pavlova", "avustralya"), ("Moussaka", "yunanistan"),
        ("Falafel", "ortadogu"), ("Shawarma", "ortadogu"), ("Kebab", "ortadogu"),
        ("Curry", "hindistan"), ("Naan", "hindistan"), ("Ramen", "japonya"), ("Sushi", "japonya"),
        ("Kimchi", "kore"), ("Pho", "vietnam"), ("Tom yum", "tayland"), ("Burrito", "meksika"),
        ("Taco", "meksika"), ("Croissant", "fransa"), ("Baguette", "fransa"),
    ]
    for dish, origin in world:
        add(f"{dish} hangi mutfak/ülkeyle özdeşleşir?", [origin], "genel")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(items)} questions to {OUT}")


if __name__ == "__main__":
    main()

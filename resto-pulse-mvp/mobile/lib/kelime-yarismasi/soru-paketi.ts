import sorularRaw from '@/data/kelime-yarismasi/sorular.json';
import { cevapIpucundaTamGeciyor } from '@/lib/kelime-yarismasi/cevap-sizinti';
import { kelimePasifMi, kelimeZorlukCezasi } from '@/lib/kelime-yarismasi/kelime-istatistik';
import type { TurKayit } from '@/lib/kelime-yarismasi/oyun-motoru';
import type { Soru } from '@/lib/kelime-yarismasi/soru-tipleri';
import { kokenEtiketi } from '@/lib/kelime-yarismasi/soru-yardimci';
import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';

export type { Soru } from '@/lib/kelime-yarismasi/soru-tipleri';

let havuzCache: Soru[] | null = null;
let havuzIndeksCache: Map<number, Soru[]> | null = null;

function ensureHavuz(): { havuz: Soru[]; havuzIndeks: Map<number, Soru[]> } {
  if (havuzCache && havuzIndeksCache) {
    return { havuz: havuzCache, havuzIndeks: havuzIndeksCache };
  }
  const havuz = (sorularRaw as Soru[]).filter((s) => {
    const len = cevapNormalize(s.cevap).length;
    if (len !== s.harfSayisi || s.harfSayisi < 4 || s.harfSayisi > 13) {
      return false;
    }
    return !cevapIpucundaTamGeciyor(s.cevap, s.ipucu);
  });
  const havuzIndeks = new Map<number, Soru[]>();
  for (const s of havuz) {
    const liste = havuzIndeks.get(s.harfSayisi) ?? [];
    liste.push(s);
    havuzIndeks.set(s.harfSayisi, liste);
  }
  havuzCache = havuz;
  havuzIndeksCache = havuzIndeks;
  return { havuz, havuzIndeks };
}

function soruKolaylikBonus(s: Soru): number {
  let bonus = 0;
  if (s.gunluk) bonus += 80;
  if (s.ipucu.length <= 70) bonus += 40;
  else if (s.ipucu.length <= 88) bonus += 20;
  return bonus;
}

function agirlikliSec(liste: Soru[]): Soru {
  const agirliklar = liste.map((s) =>
    Math.max(1, 100 - kelimeZorlukCezasi(s.cevap) + soruKolaylikBonus(s)),
  );
  const toplam = agirliklar.reduce((a, b) => a + b, 0);
  let r = Math.random() * toplam;
  for (let i = 0; i < liste.length; i++) {
    r -= agirliklar[i]!;
    if (r <= 0) return liste[i]!;
  }
  return liste[liste.length - 1]!;
}

function turSorusuSec(adaylar: Soru[], kullanilan: Set<string>): Soru {
  const gunluk = adaylar.filter((s) => s.gunluk);
  const temel = gunluk.length >= 3 ? gunluk : adaylar;
  const aktif = temel.filter((s) => !kelimePasifMi(s.cevap));
  const havuzSecim =
    aktif.length > 0 ? aktif : temel.filter((s) => kelimeZorlukCezasi(s.cevap) < 70);
  const elverisli = havuzSecim.filter((s) => !kullanilan.has(cevapNormalize(s.cevap)));
  const liste = elverisli.length > 0 ? elverisli : havuzSecim.length > 0 ? havuzSecim : temel;
  return agirlikliSec(liste);
}

export function soruBankasiBosMu(): boolean {
  return ensureHavuz().havuz.length === 0;
}

export function warmSoruBankasi(): void {
  ensureHavuz();
}

function gunlukHarfPlani(tarih = new Date()): number[] {
  const gun = tarih.getDay();
  if (gun === 0) return [4, 5, 6, 7, 12, 13];
  if (gun === 2 || gun === 5) return [4, 5, 6, 7, 8, 12];
  return [4, 5, 6, 7, 8, 9];
}

export function turPaketiOlustur(): TurKayit[] {
  const { havuz, havuzIndeks } = ensureHavuz();
  if (havuz.length === 0) {
    throw new Error('Soru bankası boş.');
  }
  const kullanilan = new Set<string>();
  const turlar: TurKayit[] = [];
  const harfPlani = gunlukHarfPlani();
  for (let i = 0; i < harfPlani.length; i++) {
    const turNo = i + 1;
    const harf = harfPlani[i]!;
    const adaylar = havuzIndeks.get(harf) ?? [];
    if (adaylar.length === 0) {
      throw new Error(`${harf} harfli soru yok (tur ${turNo}).`);
    }
    const soru = turSorusuSec(adaylar, kullanilan);
    kullanilan.add(cevapNormalize(soru.cevap));
    turlar.push({
      turNo,
      soru,
      acilanIndeksler: [],
      jokerSayisi: 0,
      puan: 0,
      sonuc: null,
    });
  }
  return turlar;
}

export { kokenEtiketi };

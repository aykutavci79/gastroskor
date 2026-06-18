import {
  JOKER_MAX_TOPLAM_SURE_MS,
  JOKER_SURE_BONUS_MS,
} from '@/constants/kelime-yarismasi';
import { cevapDogruMu } from '@/lib/kelime-yarismasi/turkce-metin';
import type { Soru } from '@/lib/kelime-yarismasi/soru-tipleri';

export type TurAsama = 'oku' | 'cevap' | 'tur_sonu';

export type TurKayit = {
  turNo: number;
  soru: Soru;
  acilanIndeksler: number[];
  jokerSayisi: number;
  puan: number;
  /** dogru | yanlis | sure */
  sonuc: 'dogru' | 'yanlis' | 'sure' | null;
};

export type OyunDurumu = {
  turlar: TurKayit[];
  aktifTur: number;
  asama: TurAsama;
  toplamPuan: number;
  /** İpucu düşünme süresi (cevap modunda durur) — sıralama için */
  toplamSureMs: number;
  bitti: boolean;
};

export function bosOyun(turlar: TurKayit[]): OyunDurumu {
  return {
    turlar,
    aktifTur: 1,
    asama: 'oku',
    toplamPuan: 0,
    toplamSureMs: 0,
    bitti: false,
  };
}

export function aktifTurKaydi(o: OyunDurumu): TurKayit | null {
  return o.turlar.find((t) => t.turNo === o.aktifTur) ?? null;
}

export function maskeleKelime(cevap: string, acilan: Set<number>): string[] {
  const harfler = [...cevap];
  return harfler.map((h, i) => (acilan.has(i) ? h : '_'));
}

export function rastgeleJokerIndeks(cevap: string, acilan: Set<number>): number | null {
  const kapali: number[] = [];
  for (let i = 0; i < cevap.length; i++) {
    if (!acilan.has(i)) {
      kapali.push(i);
    }
  }
  if (kapali.length === 0) {
    return null;
  }
  return kapali[Math.floor(Math.random() * kapali.length)]!;
}

/** Joker ile eklenebilecek süre (her basış +5 sn, soru başına toplam max 15 sn) */
export function jokerSureEklenebilir(tur: TurKayit): number {
  const kazanilan = tur.jokerSayisi * JOKER_SURE_BONUS_MS;
  if (kazanilan >= JOKER_MAX_TOPLAM_SURE_MS) {
    return 0;
  }
  return Math.min(JOKER_SURE_BONUS_MS, JOKER_MAX_TOPLAM_SURE_MS - kazanilan);
}

export function jokerUygula(o: OyunDurumu): OyunDurumu {
  const tur = aktifTurKaydi(o);
  if (!tur || o.asama !== 'cevap') {
    return o;
  }
  const acik = new Set(tur.acilanIndeksler);
  const idx = rastgeleJokerIndeks(tur.soru.cevap, acik);
  if (idx == null) {
    return o;
  }
  acik.add(idx);
  const turlar = o.turlar.map((t) =>
    t.turNo === tur.turNo
      ? { ...t, acilanIndeksler: [...acik], jokerSayisi: t.jokerSayisi + 1 }
      : t,
  );
  return { ...o, turlar };
}

export function tahminDene(o: OyunDurumu, tahmin: string): OyunDurumu {
  const tur = aktifTurKaydi(o);
  if (!tur || o.asama !== 'cevap') {
    return o;
  }
  if (!cevapDogruMu(tahmin, tur.soru.cevap)) {
    return turSonuc(o, 'yanlis');
  }
  const harf = tur.soru.harfSayisi;
  const puan = Math.max(0, harf - tur.jokerSayisi);
  const turlar = o.turlar.map((t) =>
    t.turNo === tur.turNo ? { ...t, puan, sonuc: 'dogru' as const } : t,
  );
  return {
    ...o,
    turlar,
    toplamPuan: o.toplamPuan + puan,
    asama: 'tur_sonu',
  };
}

export function turSonuc(o: OyunDurumu, sonuc: 'yanlis' | 'sure'): OyunDurumu {
  const tur = aktifTurKaydi(o);
  if (!tur) {
    return o;
  }
  const turlar = o.turlar.map((t) =>
    t.turNo === tur.turNo ? { ...t, puan: 0, sonuc } : t,
  );
  return { ...o, turlar, asama: 'tur_sonu' };
}

export function sonrakiTuraGec(o: OyunDurumu): OyunDurumu {
  if (o.aktifTur >= o.turlar.length) {
    return { ...o, bitti: true, asama: 'tur_sonu' };
  }
  return {
    ...o,
    aktifTur: o.aktifTur + 1,
    asama: 'oku',
  };
}

export function asamaAyarla(o: OyunDurumu, asama: TurAsama): OyunDurumu {
  return { ...o, asama };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';
import type { TurKayit } from '@/lib/kelime-yarismasi/oyun-motoru';

const STORAGE_KEY = '@gastroskor/kelime_yarismasi/istatistik_v1';

const MIN_DENEME_PASIF = 3;
const BASARI_PASIF_ESIK = 0.4;
const ZORLUK_CEZA_MAX = 85;

export type KelimeStat = {
  deneme: number;
  dogru: number;
  yanlis: number;
  sure: number;
  jokerToplam: number;
  pasif: boolean;
  sonGuncelleme: number;
};

type Depo = Record<string, KelimeStat>;

let depo: Depo = {};
let yuklendi = false;

function bosStat(): KelimeStat {
  return {
    deneme: 0,
    dogru: 0,
    yanlis: 0,
    sure: 0,
    jokerToplam: 0,
    pasif: false,
    sonGuncelleme: 0,
  };
}

export async function kelimeIstatistikYukle(): Promise<void> {
  if (yuklendi) return;
  try {
    const ham = await AsyncStorage.getItem(STORAGE_KEY);
    if (ham) depo = JSON.parse(ham) as Depo;
  } catch {
    depo = {};
  }
  yuklendi = true;
}

async function kaydet(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(depo));
  } catch {
    /* sessiz */
  }
}

function kelimeStatGetir(cevap: string): KelimeStat | undefined {
  return depo[cevapNormalize(cevap)];
}

function pasifMi(stat: KelimeStat): boolean {
  if (stat.deneme < MIN_DENEME_PASIF) return false;
  const basari = stat.dogru / stat.deneme;
  if (basari < BASARI_PASIF_ESIK) return true;
  if (stat.dogru === 0 && stat.deneme >= 3 && stat.jokerToplam >= 2) return true;
  if (stat.dogru === 0 && stat.yanlis + stat.sure >= 3) return true;
  return false;
}

export function kelimeZorlukCezasi(cevap: string): number {
  const stat = kelimeStatGetir(cevap);
  if (!stat || stat.deneme === 0) return 0;
  if (stat.pasif) return ZORLUK_CEZA_MAX;
  const basari = stat.dogru / stat.deneme;
  const jokerOrt = stat.jokerToplam / stat.deneme;
  let ceza = 0;
  if (stat.deneme >= 2) ceza += Math.round((1 - basari) * 50);
  ceza += Math.round(jokerOrt * 18);
  ceza += Math.min(20, (stat.yanlis + stat.sure) * 4);
  return Math.min(ZORLUK_CEZA_MAX, ceza);
}

export function kelimePasifMi(cevap: string): boolean {
  return kelimeStatGetir(cevap)?.pasif === true;
}

export async function turSonucuKaydet(tur: TurKayit): Promise<void> {
  if (!tur.sonuc) return;
  await kelimeIstatistikYukle();
  const anahtar = cevapNormalize(tur.soru.cevap);
  const stat = depo[anahtar] ?? bosStat();
  stat.deneme += 1;
  if (tur.sonuc === 'dogru') stat.dogru += 1;
  else if (tur.sonuc === 'yanlis') stat.yanlis += 1;
  else stat.sure += 1;
  stat.jokerToplam += tur.jokerSayisi;
  stat.sonGuncelleme = Date.now();
  stat.pasif = pasifMi(stat);
  depo[anahtar] = stat;
  await kaydet();
}

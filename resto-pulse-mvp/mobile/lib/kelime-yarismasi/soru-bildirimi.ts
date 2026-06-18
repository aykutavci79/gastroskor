import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Soru } from '@/lib/kelime-yarismasi/soru-tipleri';

const BILDIRILEN_KEY = '@gastroskor/kelime_yarismasi/soru_bildirildi_v1';
const KUYRUK_KEY = '@gastroskor/kelime_yarismasi/soru_bildirim_kuyruk_v1';

export type SoruBildirNeden = 'ipucu_garip' | 'cevap_supheli' | 'cok_zor' | 'genel';

export type SoruBildirimi = {
  id: string;
  soruId: string;
  cevap: string;
  ipucu: string;
  harfSayisi: number;
  neden: SoruBildirNeden;
  zaman: number;
  platform: string;
  turNo?: number;
};

function bildirimId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function bildirilenleriOku(): Promise<Set<string>> {
  try {
    const ham = await AsyncStorage.getItem(BILDIRILEN_KEY);
    if (!ham) return new Set();
    return new Set(JSON.parse(ham) as string[]);
  } catch {
    return new Set();
  }
}

async function bildirilenKaydet(soruId: string): Promise<void> {
  const set = await bildirilenleriOku();
  set.add(soruId);
  await AsyncStorage.setItem(BILDIRILEN_KEY, JSON.stringify([...set]));
}

async function kuyrugaEkle(kayit: SoruBildirimi): Promise<void> {
  try {
    const ham = await AsyncStorage.getItem(KUYRUK_KEY);
    const liste: SoruBildirimi[] = ham ? (JSON.parse(ham) as SoruBildirimi[]) : [];
    liste.push(kayit);
    await AsyncStorage.setItem(KUYRUK_KEY, JSON.stringify(liste.slice(-50)));
  } catch {
    /* sessiz */
  }
}

async function uzakGonder(kayit: SoruBildirimi): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SORU_BILDIR_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kayit),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function soruBildirildiMi(soruId: string): Promise<boolean> {
  const set = await bildirilenleriOku();
  return set.has(soruId);
}

export async function soruBildir(
  soru: Soru,
  neden: SoruBildirNeden,
  turNo?: number,
): Promise<{ ok: true; uzak: boolean } | { ok: false; neden: 'zaten_bildirildi' }> {
  if (await soruBildirildiMi(soru.id)) {
    return { ok: false, neden: 'zaten_bildirildi' };
  }
  const kayit: SoruBildirimi = {
    id: bildirimId(),
    soruId: soru.id,
    cevap: soru.cevap,
    ipucu: soru.ipucu,
    harfSayisi: soru.harfSayisi,
    neden,
    zaman: Date.now(),
    platform: Platform.OS,
    ...(turNo != null ? { turNo } : {}),
  };
  await bildirilenKaydet(soru.id);
  await kuyrugaEkle(kayit);
  const uzak = await uzakGonder(kayit);
  return { ok: true, uzak };
}

export async function soruBildirimKuyrugunuSenkronla(): Promise<number> {
  const url = process.env.EXPO_PUBLIC_SORU_BILDIR_URL?.trim();
  if (!url) return 0;
  try {
    const ham = await AsyncStorage.getItem(KUYRUK_KEY);
    if (!ham) return 0;
    const liste = JSON.parse(ham) as SoruBildirimi[];
    const kalan: SoruBildirimi[] = [];
    let gonderilen = 0;
    for (const kayit of liste) {
      if (await uzakGonder(kayit)) gonderilen += 1;
      else kalan.push(kayit);
    }
    if (kalan.length === 0) await AsyncStorage.removeItem(KUYRUK_KEY);
    else await AsyncStorage.setItem(KUYRUK_KEY, JSON.stringify(kalan));
    return gonderilen;
  } catch {
    return 0;
  }
}

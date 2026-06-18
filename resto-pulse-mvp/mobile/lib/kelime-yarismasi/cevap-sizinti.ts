import { cevapNormalize } from '@/lib/kelime-yarismasi/turkce-metin';

const SON_EKLER = [
  'SIZLIK',
  'SIZLIGI',
  'LILIK',
  'LILIGI',
  'LATMAK',
  'LANMAK',
  'LATMA',
  'LANMA',
  'ANMAK',
  'INMAK',
  'UNMAK',
  'ETMEK',
  'ATMAK',
  'ITMEK',
  'OLMAK',
  'URMEK',
  'INMEK',
  'UNMEK',
  'MEK',
  'MAK',
  'LIK',
  'LUK',
  'LIGI',
  'SIZ',
  'SUZ',
  'MIS',
  'MUS',
  'MEMIS',
  'MAMIS',
  'ICI',
  'LI',
  'SI',
  'CI',
  'CU',
];

const MIN_KOK = 4;
const MAX_KOK_PARCA = 10;

function cevapKokleri(cevap: string): string[] {
  const c = cevapNormalize(cevap);
  if (c.length < MIN_KOK) {
    return [];
  }
  const bulunan = new Set<string>([c]);
  let k = c;
  for (let round = 0; round < 8; round++) {
    const onceki = k;
    for (const ek of [...SON_EKLER].sort((a, b) => b.length - a.length)) {
      if (k.endsWith(ek) && k.length - ek.length >= MIN_KOK) {
        k = k.slice(0, -ek.length);
        bulunan.add(k);
        break;
      }
    }
    if (k === onceki) {
      break;
    }
  }
  return [...bulunan].filter((x) => x.length >= MIN_KOK).sort((a, b) => b.length - a.length);
}

/** Cevap veya kökü ipucuda geçiyorsa true */
export function cevapIpucundaGeciyor(cevap: string, ipucu: string): boolean {
  const c = cevapNormalize(cevap);
  const s = cevapNormalize(ipucu);
  if (!c || !s || c.length < MIN_KOK) {
    return false;
  }
  if (s.includes(c)) {
    return true;
  }
  for (const kok of cevapKokleri(cevap)) {
    if (s.includes(kok)) {
      return true;
    }
  }

  const maxKok = Math.min(c.length, MAX_KOK_PARCA);
  for (let uzunluk = MIN_KOK; uzunluk <= maxKok; uzunluk++) {
    if (s.includes(c.slice(0, uzunluk))) {
      return true;
    }
  }
  for (let uzunluk = MIN_KOK; uzunluk <= maxKok; uzunluk++) {
    for (let bas = 0; bas <= c.length - uzunluk; bas++) {
      if (s.includes(c.slice(bas, bas + uzunluk))) {
        return true;
      }
    }
  }

  const kelimeler = ipucu.match(/[\p{L}]{4,}/gu) ?? [];
  for (const ham of kelimeler) {
    const parca = cevapNormalize(ham);
    if (parca.length < MIN_KOK) {
      continue;
    }
    for (let uzunluk = MIN_KOK; uzunluk <= Math.min(parca.length, maxKok); uzunluk++) {
      if (c.startsWith(parca.slice(0, uzunluk))) {
        return true;
      }
    }
  }

  return false;
}

const MORF_DEVAM_EKLERI = [
  'MAK',
  'MEK',
  'MIS',
  'MUS',
  'MISIN',
  'MUSUN',
  'DI',
  'DU',
  'TU',
  'YOR',
  'AR',
  'ER',
  'IR',
  'UR',
  'MA',
  'ME',
  'IK',
  'IM',
  'IN',
  'IS',
  'ICI',
  'LIK',
  'LUK',
  'LIGI',
  'LIG',
  'SIZ',
  'SUZ',
  'LER',
  'LAR',
  'K',
  'M',
  'N',
  'R',
  'L',
  'S',
  'T',
  'Y',
];

function morfolojikDevam(cevap: string, ipucuNorm: string, bas: number): boolean {
  const c = cevapNormalize(cevap);
  const end = bas + c.length;
  if (end >= ipucuNorm.length) {
    return false;
  }
  const tail = ipucuNorm.slice(end);
  for (const ek of [...MORF_DEVAM_EKLERI].sort((a, b) => b.length - a.length)) {
    if (tail.startsWith(ek)) {
      return true;
    }
  }
  return /^[A-Z]/.test(tail.charAt(0));
}

/** Tam cevap ipucuda bağımsız kelime olarak geçiyorsa true (kök eşleşmesi sayılmaz) */
export function cevapIpucundaTamGeciyor(cevap: string, ipucu: string): boolean {
  const c = cevapNormalize(cevap);
  const s = cevapNormalize(ipucu);
  if (!c || !s || c.length < MIN_KOK) {
    return false;
  }
  if (c === s) {
    return true;
  }
  if (!s.includes(c)) {
    return false;
  }

  let idx = 0;
  while (idx < s.length) {
    const bas = s.indexOf(c, idx);
    if (bas === -1) {
      return false;
    }
    const end = bas + c.length;
    if (end === s.length) {
      return true;
    }
    if (morfolojikDevam(cevap, s, bas)) {
      idx = bas + 1;
      continue;
    }
    return true;
  }
  return false;
}

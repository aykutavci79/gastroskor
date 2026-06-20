#!/usr/bin/env node
/**
 * GastroSkor lexicon — tüm kelime oyunları için tek build pipeline.
 *
 *   node scripts/build-gastro-lexicon.mjs
 *   node scripts/build-gastro-lexicon.mjs --dry-run
 *
 * Oyunlar: Kelime Sofrası · Günlük Kelime · Kelime Yarışması (+ backend bulmaca doğrulama)
 *
 * İnternet kaynakları: Resinder TDK 5harf gist, burakgarci gist
 * Yerel kaynaklar: sofra havuz, yarışma soruları, bes-harf-havuz, kelime-yazilis
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(__dirname, '..');
const OUT_DIR = path.join(MOBILE, 'data', 'gastro-lexicon');

/** manifest.json — runtime cache bust */
export const GASTRO_LEXICON_FORMAT_VERSION = 1;

const SOURCES = {
  tdk5Resinder:
    'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/tdk-5-harfli-kelimeler.json',
  tdk5Burak:
    'https://gist.githubusercontent.com/burakgarci/307dcd4d857ca32957d020536b9a982b/raw/turkish-5-letter-words',
};

const TR_UPPER = /^[A-ZÇĞİÖŞÜI]+$/u;
const BLOCK_ASCII = new Set(['ALLAH', 'ANAM']);

function sofraBuyuk(raw) {
  return String(raw)
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-ZÇĞİÖŞÜI]/gu, '')
    .normalize('NFC');
}

function asciiKey(raw) {
  return sofraBuyuk(raw)
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z]/g, '');
}

function graphemeLen(word) {
  return [...word].length;
}

function turkishCharScore(word) {
  return (word.match(/[ÇĞİÖŞÜ]/gu) ?? []).length;
}

async function fetchJson(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fetchLines(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const text = await res.text();
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function wordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload.map(String);
  if (payload && Array.isArray(payload.words)) return payload.words.map(String);
  throw new Error('Beklenmeyen JSON şekli');
}

/** Tam lexicon (2–15 harf) — oyunlar arası doğrulama */
function ingestFull(fullMap, raw, source, { minLen = 2, maxLen = 15 } = {}) {
  const canon = sofraBuyuk(raw);
  const len = graphemeLen(canon);
  if (len < minLen || len > maxLen || !TR_UPPER.test(canon)) return false;
  const key = asciiKey(canon);
  if (!key || BLOCK_ASCII.has(key)) return false;

  const prev = fullMap.get(key);
  if (!prev) {
    fullMap.set(key, { word: canon, sources: new Set([source]) });
    return true;
  }
  prev.sources.add(source);
  if (turkishCharScore(canon) > turkishCharScore(prev.word)) {
    prev.word = canon;
  }
  return false;
}

/** Günlük Kelime tahmin — yalnızca 5 harf */
function ingestTahmin5(tahminMap, raw, source) {
  const canon = sofraBuyuk(raw);
  if (graphemeLen(canon) !== 5 || !TR_UPPER.test(canon)) return false;
  const key = asciiKey(canon);
  if (!key || key.length !== 5 || BLOCK_ASCII.has(key)) return false;

  const prev = tahminMap.get(key);
  if (!prev) {
    tahminMap.set(key, { word: canon, sources: new Set([source]) });
    return true;
  }
  prev.sources.add(source);
  if (turkishCharScore(canon) > turkishCharScore(prev.word)) {
    prev.word = canon;
  }
  return false;
}

async function readJson(relPath) {
  const p = path.join(MOBILE, relPath);
  return JSON.parse(await readFile(p, 'utf8'));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('GastroSkor lexicon build — kaynaklar birleştiriliyor…');

  const tahminMap = new Map();
  const fullMap = new Map();
  const stats = { fetched: {}, added: { tahmin5: {}, full: {} } };

  const addTahmin = (name, words, source) => {
    stats.fetched[name] = words.length;
    let added = 0;
    for (const w of words) {
      if (ingestTahmin5(tahminMap, w, source)) added++;
      ingestFull(fullMap, w, source);
    }
    stats.added.tahmin5[name] = added;
    console.log(`  [5harf] ${name}: ${words.length} satır, +${added} tahmin`);
  };

  const addFull = (name, words, source) => {
    stats.fetched[name] = words.length;
    let added = 0;
    for (const w of words) {
      if (ingestFull(fullMap, w, source)) added++;
    }
    stats.added.full[name] = added;
    console.log(`  [full] ${name}: ${words.length} satır, +${added} lexicon`);
  };

  // —— İnternet: 5 harf TDK listeleri ——
  for (const [name, url] of Object.entries(SOURCES)) {
    if (url.includes('tdk-5-harfli')) {
      const words = wordsFromPayload(await fetchJson(url));
      addTahmin(name, words, name);
    }
  }

  const burakLines = await fetchLines(SOURCES.tdk5Burak);
  addTahmin('tdk5BurakLines', burakLines, 'tdk5Burak');

  // —— Yerel: Günlük Kelime legacy cevap seed ——
  const bes = await readJson('data/gunluk-kelime/bes-harf-havuz.json');
  addTahmin('besHarfHavuz', bes.words ?? [], 'besHarfHavuz');

  // —— Yerel: Kelime Sofrası havuzu ——
  const sofraMain = await readJson('data/kelime-sofrasi/havuz.json');
  const sofraUc = await readJson('data/kelime-sofrasi/uc-harf-havuz.json');
  const sofraRows = [...sofraMain, ...sofraUc];
  addFull(
    'sofraHavuz',
    sofraRows.map((r) => r.yazilis || r.kelime),
    'sofraHavuz',
  );

  // —— Yerel: Kelime Yarışması cevapları ——
  const yarismasi = await readJson('data/kelime-yarismasi/sorular.json');
  addFull(
    'kelimeYarismasi',
    yarismasi.map((s) => s.cevap),
    'kelimeYarismasi',
  );

  // —— Yazılış haritası (sofra + TDK kanonik) ——
  const yazilisSofra = await readJson('data/kelime-sofrasi/kelime-yazilis.json');
  const yazilisByAscii = { ...yazilisSofra };
  for (const { word } of fullMap.values()) {
    const key = asciiKey(word);
    const prev = yazilisByAscii[key];
    if (!prev || turkishCharScore(word) > turkishCharScore(sofraBuyuk(prev))) {
      yazilisByAscii[key] = word;
    }
  }
  for (const { word } of tahminMap.values()) {
    const key = asciiKey(word);
    const prev = yazilisByAscii[key];
    if (!prev || turkishCharScore(word) > turkishCharScore(sofraBuyuk(prev))) {
      yazilisByAscii[key] = word;
    }
  }

  const tahmin5 = [...tahminMap.values()]
    .map(({ word }) => word)
    .sort((a, b) => a.localeCompare(b, 'tr'));

  const besKeys = new Set((bes.words ?? []).map((w) => asciiKey(w)));
  const cevap5 = [];
  const cevapKeys = new Set();
  for (const word of tahmin5) {
    const key = asciiKey(word);
    if (cevapKeys.has(key)) continue;
    const meta = tahminMap.get(key);
    const verbInf = /(?:MAK|MEK)$/.test(key);
    const inBes = besKeys.has(key);
    const fromResinder = meta?.sources.has('tdk5Resinder');
    if (inBes || (fromResinder && !verbInf)) {
      cevapKeys.add(key);
      cevap5.push(word);
    }
  }

  const lexiconFull = [...fullMap.values()]
    .map(({ word }) => word)
    .sort((a, b) => a.localeCompare(b, 'tr'));

  // 5 harf kelimeleri full lexicon'a da ekle (tahmin havuzu ⊂ full)
  for (const word of tahmin5) {
    ingestFull(fullMap, word, 'tahmin5');
  }
  const lexiconFullFinal = [...fullMap.values()]
    .map(({ word }) => word)
    .sort((a, b) => a.localeCompare(b, 'tr'));

  const yarismasiInLexicon = yarismasi.filter((s) => fullMap.has(asciiKey(s.cevap))).length;

  const manifest = {
    formatVersion: GASTRO_LEXICON_FORMAT_VERSION,
    builtAt: new Date().toISOString(),
    games: ['kelime-sofrasi', 'gunluk-kelime', 'kelime-yarismasi'],
    sources: SOURCES,
    counts: {
      tahmin5: tahmin5.length,
      cevap5: cevap5.length,
      lexiconFull: lexiconFullFinal.length,
      yazilisByAscii: Object.keys(yazilisByAscii).length,
      yarismasiCevapTotal: yarismasi.length,
      yarismasiCevapInLexicon: yarismasiInLexicon,
    },
    stats,
  };

  const contentHash = createHash('sha256')
    .update(JSON.stringify({ tahmin5, cevap5, lexiconFull: lexiconFullFinal }))
    .digest('hex')
    .slice(0, 12);
  manifest.contentHash = contentHash;

  console.log('');
  console.log(`Tahmin (5 harf):     ${tahmin5.length}`);
  console.log(`Cevap (5 harf):      ${cevap5.length}`);
  console.log(`Tam lexicon:         ${lexiconFullFinal.length}`);
  console.log(`Yazılış haritası:    ${Object.keys(yazilisByAscii).length}`);
  console.log(`Yarışma cevap kapsam: ${yarismasiInLexicon}/${yarismasi.length}`);

  if (dryRun) {
    console.log('(dry-run — dosya yazılmadı)');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const write = (name, data) => writeFile(path.join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8');

  await write('manifest.json', manifest);
  await write('tahmin-5harf.json', { count: tahmin5.length, words: tahmin5 });
  await write('cevap-5harf.json', { count: cevap5.length, words: cevap5 });
  await write('lexicon-full.json', { count: lexiconFullFinal.length, words: lexiconFullFinal });
  await write('yazilis-by-ascii.json', yazilisByAscii);

  // Geriye dönük isimler (eski script çıktıları)
  await write('tdk-5harf-tahmin.json', { count: tahmin5.length, words: tahmin5 });
  await write('tdk-5harf-cevap-oneri.json', { count: cevap5.length, words: cevap5 });
  await write('build-report.json', manifest);

  console.log(`Yazıldı: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

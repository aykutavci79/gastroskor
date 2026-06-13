/**
 * Build oncesi sesli arama STT duzeltme kontrolu.
 * Calistir: node scripts/verify-voice-stt-fixes.mjs
 */

const junkCases = ['m.k', 'm k', 'mk', 'ab', 'dinliyorum', ''];
const validCases = ['150 tl lahmacun', '3 lahmacun 1 ayran', 'en yakin kebapci'];

function fold(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function isJunk(raw) {
  const text = fold(raw);
  if (!text || text.length <= 2) return true;
  if (/^m\.?\s*k\.?$/.test(text)) return true;
  if (/^[\p{L}]\.[\p{L}]\.?$/u.test(text)) return true;
  if (/^(dinliyorum|dinlerim)$/.test(text)) return true;
  return false;
}

let failed = 0;

for (const sample of junkCases) {
  if (!isJunk(sample)) {
    console.error(`FAIL junk expected: "${sample}"`);
    failed += 1;
  }
}

for (const sample of validCases) {
  if (isJunk(sample)) {
    console.error(`FAIL valid rejected: "${sample}"`);
    failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} voice STT verify check(s) failed.`);
  process.exit(1);
}

console.log('voice STT verify checks passed.');

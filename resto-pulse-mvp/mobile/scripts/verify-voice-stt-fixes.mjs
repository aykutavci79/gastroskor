/**
 * Build oncesi sesli arama STT duzeltme kontrolu.
 * Calistir: node scripts/verify-voice-stt-fixes.mjs
 */

const junkCases = ['m.k', 'm k', 'mk', 'ab', 'dinliyorum', ''];
const validCases = ['150 tl lahmacun', '3 lahmacun 1 ayran', 'en yakin kebapci'];

const PRODUCT_FIXES = [
  [/\bjant[ıi]\s*kara\b/gi, 'cantık'],
  [/\bjant[ıi]kara\b/gi, 'cantık'],
  [/\bcant[ıi]\s*kara\b/gi, 'cantık'],
  [/\bcant[ıi]kara\b/gi, 'cantık'],
  [/\bcantikara\b/gi, 'cantık'],
  [/\blahma\s*cun\b/gi, 'lahmacun'],
  [/\bkune\s*fe\b/gi, 'künefe'],
  [/\bsut\s*lac\b/gi, 'sütlaç'],
];

const ORDER_BOILERPLATE = [/\s+ara(r\s+m[ıi]s[ıi]n)?\.?\s*$/gi];

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

function applyProductFixes(text) {
  let out = text;
  for (const [pattern, replacement] of PRODUCT_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function polishOrderQuery(raw) {
  let text = raw.trim();
  if (!text || isJunk(text)) return '';
  text = applyProductFixes(text);
  for (const pattern of ORDER_BOILERPLATE) {
    text = text.replace(pattern, '').trim();
  }
  return text;
}

const phraseCases = [
  { in: 'cantı kara', out: 'cantık' },
  { in: 'cantıkara', out: 'cantık' },
  { in: 'jantı kara', out: 'cantık' },
  { in: 'cantık ara', out: 'cantık' },
  { in: 'cantı kara arar mısın', out: 'cantık' },
  { in: 'lahma cun', out: 'lahmacun' },
  { in: 'sut lac', out: 'sütlaç' },
];

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

for (const { in: input, out: expected } of phraseCases) {
  const got = polishOrderQuery(input);
  if (got !== expected) {
    console.error(`FAIL phrase "${input}" -> "${got}" (expected "${expected}")`);
    failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} voice STT verify check(s) failed.`);
  process.exit(1);
}

console.log('voice STT verify checks passed.');

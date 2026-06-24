/**
 * Yerel generator → prod havuz import (deneme / hotfix).
 * Kullanım: node scripts/import-sofra-pool-to-prod.mjs 2026-06-20
 * Gerekli: backend/.env içinde CRON_SECRET veya ortam değişkeni
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const gunId = process.argv[2];
if (!gunId || !/^\d{4}-\d{2}-\d{2}$/.test(gunId)) {
  console.error('Kullanım: node scripts/import-sofra-pool-to-prod.mjs YYYY-MM-DD');
  process.exit(1);
}

function loadCronSecret() {
  if (process.env.CRON_SECRET?.trim()) return process.env.CRON_SECRET.trim();
  const envPath = path.resolve(mobileRoot, '../backend/.env');
  if (!fs.existsSync(envPath)) return '';
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^CRON_SECRET=(.+)$/);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  return '';
}

const secret = loadCronSecret();
if (!secret) {
  console.error('CRON_SECRET bulunamadi (backend/.env veya ortam)');
  process.exit(1);
}

console.log(`Uretiliyor: gun_id=${gunId} ...`);
const generated = execSync(`npx tsx scripts/generate-sofra-pool.ts --gun-id ${gunId}`, {
  cwd: mobileRoot,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--use-system-ca' },
});

const puzzles = JSON.parse(generated);
const ok = puzzles.filter((p) => p.ok).length;
console.log(`Generator: ${ok}/${puzzles.length} ok`);
for (const row of puzzles.filter((p) => !p.ok)) {
  console.log(`  FAIL ${row.zorluk} tur ${row.tur}`);
}

const body = JSON.stringify({ gun_id: gunId, puzzles });
const apiBase = (process.env.SOFRA_API_BASE_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const url = `${apiBase}/api/v1/internal/cron/sofra-bulmaca-import`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Cron-Secret': secret,
  },
  body,
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text.slice(0, 800));
if (!res.ok) process.exit(1);

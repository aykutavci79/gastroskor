/**
 * Build oncesi Expo Router / tab yapilandirma kontrolleri.
 * Ornek: href + tabBarButton ayni sekmede → runtime crash.
 *
 * Calistir: node scripts/verify-router-config.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '../app');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('_layout.tsx') || entry.name.endsWith('_layout.ts')) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
}

function checkScreenBlocks(file, content, tagName) {
  const issues = [];
  const re = new RegExp(`<${tagName}\\.Screen\\b`, 'g');
  const blocks = content.split(re);
  blocks.shift();

  for (const block of blocks) {
    const nameMatch = block.match(/^\s*name=(?:"([^"]+)"|'([^']+)')/);
    const screenName = nameMatch?.[1] ?? nameMatch?.[2] ?? '?';
    const hasHref = /\bhref\s*:/.test(block);
    const hasTabBarButton = /\btabBarButton\s*:/.test(block);
    if (hasHref && hasTabBarButton) {
      issues.push(
        `${rel(file)} → ${tagName} "${screenName}": href ve tabBarButton birlikte kullanilamaz (iOS + Android runtime crash).`,
      );
    }
  }
  return issues;
}

function checkTabsScreenBlocks(file, content) {
  return [
    ...checkScreenBlocks(file, content, 'Tabs'),
    ...checkScreenBlocks(file, content, 'Drawer'),
  ];
}

const layoutFiles = walk(appDir);
const allIssues = [];

for (const file of layoutFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('from \'expo-router\'') && !content.includes('from "expo-router"')) continue;
  if (!content.includes('<Tabs') && !content.includes('<Drawer')) continue;
  allIssues.push(...checkTabsScreenBlocks(file, content));
}

if (allIssues.length) {
  console.error('\nRouter config verify FAILED:\n');
  for (const issue of allIssues) console.error(`  - ${issue}`);
  console.error('\nBuild iptal. Once duzelt, Metro ile acip tabs ekranini dene.\n');
  process.exit(1);
}

console.log('Router config verify OK');

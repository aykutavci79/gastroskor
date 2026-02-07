const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function isoStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function backupIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const bak = path.join(dir, `${base}.bak_${isoStamp()}`);
    fs.copyFileSync(filePath, bak);
    console.log(`Backup created: ${bak}`);
  }
}

function writeJsonPretty(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote: ${filePath} (${data.length} items)`);
}

function main() {
  const root = path.join(__dirname, "..");
  const dbPath = process.env.SQLITE_PATH;
  if (!dbPath) {
    console.error('SQLITE_PATH set değil. Örn: $env:SQLITE_PATH="D:\\nextjs_space\\prisma\\dev.db"');
    process.exit(1);
  }

  const seedsDir = process.env.SEEDS_DIR || path.join(root, "seeds");
  const outTr = path.join(seedsDir, "stories_seed_tr.json");
  const outEn = path.join(seedsDir, "stories_seed_en.json");
  const outFr = path.join(seedsDir, "stories_seed_fr.json");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // TR seed
  const tr = db.prepare(`
    SELECT slug, title, content, excerpt, author, illustrationUrl, publishedAt
    FROM Story
    WHERE language='tr'
    ORDER BY datetime(publishedAt) ASC, datetime(createdAt) ASC
  `).all().map(r => ({
    slug: r.slug,
    title: r.title,
    content: r.content,
    excerpt: r.excerpt,
    author: r.author,
    illustrationUrl: r.illustrationUrl,
    publishedAt: r.publishedAt
  }));

  // EN seed: kendi slug'ı kalır + originalSlug(TR.slug) eklenir
  const en = db.prepare(`
    SELECT s.slug, s.title, s.content, s.excerpt, s.author, s.illustrationUrl, s.publishedAt,
           tr.slug AS originalSlug
    FROM Story s
    LEFT JOIN Story tr ON tr.id = s.originalStoryId
    WHERE s.language='en'
    ORDER BY datetime(s.publishedAt) ASC, datetime(s.createdAt) ASC
  `).all().map(r => ({
    slug: r.slug,
    originalSlug: r.originalSlug || null,
    title: r.title,
    content: r.content,
    excerpt: r.excerpt,
    author: r.author,
    illustrationUrl: r.illustrationUrl,
    publishedAt: r.publishedAt
  }));

  // FR seed
  const fr = db.prepare(`
    SELECT s.slug, s.title, s.content, s.excerpt, s.author, s.illustrationUrl, s.publishedAt,
           tr.slug AS originalSlug
    FROM Story s
    LEFT JOIN Story tr ON tr.id = s.originalStoryId
    WHERE s.language='fr'
    ORDER BY datetime(s.publishedAt) ASC, datetime(s.createdAt) ASC
  `).all().map(r => ({
    slug: r.slug,
    originalSlug: r.originalSlug || null,
    title: r.title,
    content: r.content,
    excerpt: r.excerpt,
    author: r.author,
    illustrationUrl: r.illustrationUrl,
    publishedAt: r.publishedAt
  }));

  const missingEn = en.filter(x => !x.originalSlug).length;
  const missingFr = fr.filter(x => !x.originalSlug).length;

  console.log("\nMissing originalSlug counts:", { en: missingEn, fr: missingFr });

  console.log("\nExporting seeds to:", seedsDir);
  backupIfExists(outTr); backupIfExists(outEn); backupIfExists(outFr);
  writeJsonPretty(outTr, tr);
  writeJsonPretty(outEn, en);
  writeJsonPretty(outFr, fr);

  db.close();
  console.log("\nDONE  Seeds exported. (slug unique, EN/FR has originalSlug)");
}

main();

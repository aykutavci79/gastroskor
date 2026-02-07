const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function isoStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
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

  const cols = db.prepare("PRAGMA table_info('Story')").all().map((c) => c.name);
  const need = ["id", "title", "slug", "content", "excerpt", "author", "illustrationUrl", "publishedAt", "language", "originalStoryId"];
  const missing = need.filter((n) => !cols.includes(n));
  if (missing.length) {
    console.error("Story tablosunda beklenen kolonlar eksik:", missing);
    db.close();
    process.exit(1);
  }

  // EN/FR slug -> TR slug (originalStoryId üzerinden)
  const changed = db.transaction(() => {
    const res = db
      .prepare(`
        UPDATE Story
        SET slug = (SELECT tr.slug FROM Story tr WHERE tr.id = Story.originalStoryId)
        WHERE language IN ('en','fr')
          AND originalStoryId IS NOT NULL
      `)
      .run();
    return res.changes;
  })();

  console.log("\nSlug normalization done. Rows updated:", changed);

  // Kontrol: artık 3 dilde aynı slug var mı?
  const groups = db
    .prepare(`
      SELECT slug,
             SUM(CASE WHEN language='tr' THEN 1 ELSE 0 END) tr,
             SUM(CASE WHEN language='en' THEN 1 ELSE 0 END) en,
             SUM(CASE WHEN language='fr' THEN 1 ELSE 0 END) fr,
             COUNT(*) c
      FROM Story
      GROUP BY slug
      ORDER BY c DESC, slug
    `)
    .all();

  const perfect = groups.filter((g) => g.tr === 1 && g.en === 1 && g.fr === 1);
  console.log("\nSlug groups:", groups.length);
  console.log("Perfect 3-lang matches (tr+en+fr):", perfect.length);
  if (perfect.length) console.table(perfect);

  // DB -> seed export
  function exportLang(lang) {
    return db
      .prepare(`
        SELECT slug, title, content, excerpt, author, illustrationUrl, publishedAt
        FROM Story
        WHERE language = ?
        ORDER BY datetime(publishedAt) ASC, datetime(createdAt) ASC
      `)
      .all(lang)
      .map((r) => ({
        slug: r.slug,
        title: r.title,
        content: r.content,
        excerpt: r.excerpt,
        author: r.author,
        illustrationUrl: r.illustrationUrl,
        publishedAt: r.publishedAt,
      }));
  }

  const tr = exportLang("tr");
  const en = exportLang("en");
  const fr = exportLang("fr");

  console.log("\nExporting seeds to:", seedsDir);
  backupIfExists(outTr);
  backupIfExists(outEn);
  backupIfExists(outFr);

  writeJsonPretty(outTr, tr);
  writeJsonPretty(outEn, en);
  writeJsonPretty(outFr, fr);

  db.close();
  console.log("\nDONE ✅ Seeds exported with aligned slugs.");
}

main();

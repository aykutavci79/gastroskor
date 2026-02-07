const Database = require("better-sqlite3");

const dbPath = process.env.SQLITE_PATH;
if (!dbPath) {
  console.error('SQLITE_PATH set değil. Örn: $env:SQLITE_PATH="D:\\nextjs_space\\prisma\\dev.db"');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function getLangRows(lang) {
  // createdAt aynı olursa SQLite rowid ile stabil sırala
  return db.prepare(`
    SELECT rowid, id, title, slug, language, createdAt
    FROM Story
    WHERE language = ?
    ORDER BY datetime(createdAt) ASC, rowid ASC
  `).all(lang);
}

const tr = getLangRows("tr");
const en = getLangRows("en");
const fr = getLangRows("fr");

console.log("TR:", tr.length, "EN:", en.length, "FR:", fr.length);
if (tr.length !== en.length || tr.length !== fr.length) {
  console.error("Dil sayıları eşit değil. Sıra bazlı eşleştirme riskli.");
  process.exit(1);
}

console.log("\n=== Preview first 10 alignment ===");
const preview = [];
for (let i = 0; i < Math.min(10, tr.length); i++) {
  preview.push({
    i,
    tr_title: tr[i].title,
    en_title: en[i].title,
    fr_title: fr[i].title,
  });
}
console.table(preview);

const apply = process.env.APPLY === "1";
if (!apply) {
  console.log('\nUygulama yapılmadı. Bağlamak için şunu çalıştır: $env:APPLY="1"; node .\\scripts\\link_stories_by_order.js');
  db.close();
  process.exit(0);
}

const upd = db.prepare(`UPDATE Story SET originalStoryId = ? WHERE id = ?`);

const tx = db.transaction(() => {
  for (let i = 0; i < tr.length; i++) {
    const trId = tr[i].id;
    upd.run(trId, en[i].id);
    upd.run(trId, fr[i].id);
  }
});

tx();

const check = db.prepare(`
  SELECT
    tr.id as tr_id,
    tr.title as tr_title,
    SUM(CASE WHEN s.language='en' THEN 1 ELSE 0 END) as en_count,
    SUM(CASE WHEN s.language='fr' THEN 1 ELSE 0 END) as fr_count
  FROM Story tr
  LEFT JOIN Story s ON s.originalStoryId = tr.id
  WHERE tr.language='tr'
  GROUP BY tr.id
  ORDER BY tr_title
`).all();

console.log("\n=== Link check (each TR should have en=1, fr=1) ===");
console.table(check);

db.close();
console.log("\nDONE: originalStoryId set for EN & FR by order.");

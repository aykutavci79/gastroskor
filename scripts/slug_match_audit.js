const Database = require("better-sqlite3");

const dbPath = process.env.SQLITE_PATH;
if (!dbPath) { console.error("SQLITE_PATH set değil"); process.exit(1); }
const db = new Database(dbPath);

const rows = db.prepare(`
  SELECT slug, COUNT(*) c,
         SUM(CASE WHEN language='tr' THEN 1 ELSE 0 END) tr,
         SUM(CASE WHEN language='en' THEN 1 ELSE 0 END) en,
         SUM(CASE WHEN language='fr' THEN 1 ELSE 0 END) fr
  FROM Story
  GROUP BY slug
  ORDER BY c DESC, slug
`).all();

const perfect = rows.filter(r => r.tr===1 && r.en===1 && r.fr===1);
console.log("\n=== Slug groups ===");
console.log("Total distinct slugs:", rows.length);
console.log("Perfect 3-lang matches (tr+en+fr):", perfect.length);
console.table(perfect);

db.close();

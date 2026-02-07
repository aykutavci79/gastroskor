const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function readJson(p){
  const d = JSON.parse(fs.readFileSync(p,"utf8"));
  if(!Array.isArray(d)) throw new Error("Seed must be array: " + p);
  return d;
}

function main(){
  const root = path.join(__dirname,"..");
  const dbPath = process.env.SQLITE_PATH || path.join(root,"dev.db");
  const seedsDir = process.env.SEEDS_DIR || path.join(root,"seeds");

  const enFile = path.join(seedsDir,"stories_seed_en.json");
  const frFile = path.join(seedsDir,"stories_seed_fr.json");

  if(!fs.existsSync(dbPath)) throw new Error("DB not found: " + dbPath);
  if(!fs.existsSync(enFile)) throw new Error("Seed missing: " + enFile);
  if(!fs.existsSync(frFile)) throw new Error("Seed missing: " + frFile);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // Check columns
  const cols = db.prepare("PRAGMA table_info('Story')").all().map(c=>c.name);
  const requiredCols = ["id","slug","language","originalStoryId"];
  const missing = requiredCols.filter(c=>!cols.includes(c));
  if(missing.length) throw new Error("Story table missing columns: " + missing.join(", "));

  const findTr = db.prepare("SELECT id FROM Story WHERE language='tr' AND slug=?").get.bind(db.prepare("SELECT id FROM Story WHERE language='tr' AND slug=?"));
  const findTrStmt = db.prepare("SELECT id FROM Story WHERE language='tr' AND slug=?");
  const findChild = db.prepare("SELECT id FROM Story WHERE language=? AND slug=?");
  const upd = db.prepare("UPDATE Story SET originalStoryId=? WHERE id=?");

  function linkFromSeed(lang, file){
    const items = readJson(file);
    let linked=0, missingTr=0, missingChild=0;

    for(const it of items){
      const originalSlug = it.originalSlug;
      const childSlug = it.slug;

      if(!originalSlug){ missingTr++; continue; }

      const tr = findTrStmt.get(originalSlug);
      if(!tr){ missingTr++; continue; }

      const child = findChild.get(lang, childSlug);
      if(!child){ missingChild++; continue; }

      upd.run(tr.id, child.id);
      linked++;
    }

    return { lang, linked, missingTr, missingChild, total: items.length };
  }

  const tx = db.transaction(()=>{
    const r1 = linkFromSeed("en", enFile);
    const r2 = linkFromSeed("fr", frFile);
    return [r1,r2];
  });

  const results = tx();
  console.log("\n=== Link results ===");
  console.table(results);

  // verify: each TR should have en/fr counts
  const check = db.prepare(`
    SELECT
      tr.title as tr_title,
      SUM(CASE WHEN s.language='en' THEN 1 ELSE 0 END) as en_count,
      SUM(CASE WHEN s.language='fr' THEN 1 ELSE 0 END) as fr_count
    FROM Story tr
    LEFT JOIN Story s ON s.originalStoryId = tr.id
    WHERE tr.language='tr'
    GROUP BY tr.id
    ORDER BY tr_title
  `).all();

  console.log("\n=== Verify (each TR should have en=1, fr=1) ===");
  console.table(check);

  db.close();
  console.log("\nDONE  Linked by originalSlug.");
}

main();

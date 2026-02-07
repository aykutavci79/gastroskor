const Database = require("better-sqlite3");

const dbPath = process.env.SQLITE_PATH;
if (!dbPath) {
  console.error("SQLITE_PATH env set değil. Örn: $env:SQLITE_PATH=\"D:\\nextjs_space\\prisma\\dev.db\"");
  process.exit(1);
}

const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info('Story')").all();
console.log("\n=== Story Columns ===");
console.table(cols.map(c => ({
  name: c.name,
  type: c.type,
  notnull: c.notnull,
  default: c.dflt_value
})));

const colNames = cols.map(c => c.name);

// Dil kolonu otomatik bul
const langCol = ["lang", "language", "locale"].find(c => colNames.includes(c));
console.log("\nLanguage column detected:", langCol || "(none)");

// Key kolonu otomatik bul
const keyCol = ["key", "storyKey", "code", "uid"].find(c => colNames.includes(c));
console.log("Key column detected:", keyCol || "(none)");

// Dil bazında sayım
if (langCol) {
  console.log("\n=== Count by language ===");
  const q = `SELECT ${langCol} as lang, COUNT(*) as c FROM Story GROUP BY ${langCol} ORDER BY ${langCol}`;
  console.table(db.prepare(q).all());
} else {
  console.log("\n Dil kolonu (lang/language/locale) bulunamadı. Kolon listesinde farklı isim olabilir.");
}

// 3 dilde eşleşen key sayımı
if (langCol && keyCol) {
  console.log("\n=== Keys present in all 3 languages ===");
  const q = `SELECT ${keyCol} as k, COUNT(*) as c FROM Story GROUP BY ${keyCol} HAVING c=3 ORDER BY ${keyCol}`;
  const rows = db.prepare(q).all();
  console.log("Keys with 3 languages:", rows.length);
  console.table(rows);
} else {
  console.log("\n 3 dil eşleşmesi için hem dil kolonu hem key kolonu lazım.");
}

db.close();

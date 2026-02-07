const Database = require("better-sqlite3");

const dbPath = process.env.SQLITE_PATH;
if (!dbPath) {
  console.error("SQLITE_PATH is not set.");
  process.exit(1);
}

const db = new Database(dbPath);

console.log("DB:", dbPath);

const rows = db
  .prepare(
    "SELECT author, language, COUNT(1) AS c FROM Story GROUP BY author, language ORDER BY author, language"
  )
  .all();

console.table(rows);

db.close();

const Database = require("better-sqlite3");

const dbPath = process.env.SQLITE_PATH;
if (!dbPath) process.exit(1);

const db = new Database(dbPath);

const before = db.prepare("SELECT author, language, COUNT(1) c FROM Story GROUP BY author, language ORDER BY author, language").all();
console.log("BEFORE:");
console.table(before);

const wouldChange = db.prepare("SELECT COUNT(1) AS n FROM Story WHERE author='DeriveKemik'").get().n;
console.log("\nRows that would change DeriveKemik -> deri:", wouldChange);

db.close();

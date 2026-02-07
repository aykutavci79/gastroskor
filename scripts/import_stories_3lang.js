const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

function readJson(p) {
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(d)) throw new Error("Seed must be array: " + p);
  return d;
}
function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function nowIso() {
  return new Date().toISOString();
}
function envKey(col) {
  return "DEFAULT_" + String(col).replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}
function pick(cols, arr) {
  return arr.find((c) => cols.has(c)) || null;
}

function main() {
  const root = path.join(__dirname, "..");
  const dbPath = process.env.SQLITE_PATH || path.join(root, "dev.db");
  const seedsDir = process.env.SEEDS_DIR || path.join(root, "seeds");

  const seedFiles = [
    { lang: "tr", file: path.join(seedsDir, "stories_seed_tr.json") },
    { lang: "en", file: path.join(seedsDir, "stories_seed_en.json") },
    { lang: "fr", file: path.join(seedsDir, "stories_seed_fr.json") },
  ];

  if (!fs.existsSync(dbPath)) throw new Error("DB not found: " + dbPath);
  for (const f of seedFiles) if (!fs.existsSync(f.file)) throw new Error("Seed missing: " + f.file);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const info = db.prepare(`PRAGMA table_info('Story')`).all();
  if (!info || info.length === 0) throw new Error("Table 'Story' not found (or has no columns).");

  const cols = new Set(info.map((c) => c.name));
  const required = info
    .filter((c) => c.notnull === 1 && (c.dflt_value === null || c.dflt_value === undefined))
    .map((c) => c.name);

  const colId = cols.has("id") ? "id" : null;
  const colKey = pick(cols, ["key", "storyKey", "code", "uid"]);
  const colLang = pick(cols, ["lang", "language", "locale"]);
  const colSlug = pick(cols, ["slug", "permalink"]);
  const colTitle = pick(cols, ["title", "name", "headline"]);
  const colContent = pick(cols, ["content", "body", "text", "story"]);
  const colExcerpt = pick(cols, ["excerpt", "summary", "short"]);
  const colTags = pick(cols, ["tags", "tags_json"]);
  const colOrder = pick(cols, ["order", "sort", "rank", "order_index"]);
  const colPublishedAt = pick(cols, ["publishedAt", "published_at"]);
  const colCreatedAt = pick(cols, ["createdAt", "created_at"]);
  const colUpdatedAt = pick(cols, ["updatedAt", "updated_at"]);
  const colAuthor = pick(cols, ["author", "authorName", "writer"]);
  const colIllustrationUrl = pick(cols, [
    "illustrationUrl",
    "illustration_url",
    "imageUrl",
    "image_url",
    "coverUrl",
    "cover_url",
  ]);

  let conflictCols = [];
  if (colKey && colLang) conflictCols = [colKey, colLang];
  else if (colSlug && colLang) conflictCols = [colSlug, colLang];
  else if (colKey) conflictCols = [colKey];
  else if (colSlug) conflictCols = [colSlug];

  try {
    if (conflictCols.length === 2) {
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_story_${conflictCols[0]}_${conflictCols[1]} ON Story("${conflictCols[0]}", "${conflictCols[1]}")`
      );
    } else if (conflictCols.length === 1) {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_story_${conflictCols[0]} ON Story("${conflictCols[0]}")`);
    }
  } catch (e) {
    console.warn("Index warning:", e.message);
  }

  const insertColsSet = new Set(required);
  [
    colId,
    colKey,
    colLang,
    colSlug,
    colTitle,
    colContent,
    colExcerpt,
    colTags,
    colOrder,
    colPublishedAt,
    colAuthor,
    colIllustrationUrl,
    colCreatedAt,
    colUpdatedAt,
  ]
    .filter(Boolean)
    .forEach((c) => insertColsSet.add(c));

  const insertCols = Array.from(insertColsSet);
  const updateCols = insertCols.filter((c) => !conflictCols.includes(c) && c !== colId);

  const known = new Set(
    [
      colId,
      colKey,
      colLang,
      colSlug,
      colTitle,
      colContent,
      colExcerpt,
      colTags,
      colOrder,
      colPublishedAt,
      colAuthor,
      colIllustrationUrl,
      colCreatedAt,
      colUpdatedAt,
    ].filter(Boolean)
  );
  const unknownReq = required.filter((c) => !known.has(c));
  if (unknownReq.length) {
    console.log("\n❌ Story tablosunda zorunlu ama scriptin otomatik dolduramadığı kolonlar var:");
    unknownReq.forEach((c) => console.log(`- ${c}   (set env: $env:${envKey(c)}="..." )`));
    console.log("\nBu env'leri set edip tekrar çalıştır.");
    process.exit(1);
  }

  const colsSql = insertCols.map((c) => `"${c}"`).join(", ");
  const valsSql = insertCols.map((c) => `@${c}`).join(", ");
  const conflictSql = conflictCols.length
    ? ` ON CONFLICT (${conflictCols.map((c) => `"${c}"`).join(", ")}) DO UPDATE SET ${updateCols
        .map((c) => `"${c}"=excluded."${c}"`)
        .join(", ")}`
    : "";
  const sql = `INSERT INTO "Story" (${colsSql}) VALUES (${valsSql})${conflictSql}`;
  const stmt = db.prepare(sql);

  const tx = db.transaction(() => {
    let count = 0;

    for (const { lang, file } of seedFiles) {
      const stories = readJson(file);

      for (const s of stories) {
        const keyVal = s.key || s.storyKey || s.code || null;
        const titleVal = s.title || s.name || "";
        const contentVal = s.content || s.body || s.text || "";
        const slugVal = s.slug ? String(s.slug) : slugify(titleVal || keyVal || "");

        const row = {};

        if (colId) row[colId] = crypto.randomUUID();
        if (colKey) row[colKey] = keyVal ? String(keyVal) : "";
        if (colLang) row[colLang] = lang;
        if (colSlug) row[colSlug] = slugVal;
        if (colTitle) row[colTitle] = String(titleVal || "");
        if (colContent) row[colContent] = String(contentVal || "");

        if (colExcerpt) row[colExcerpt] = s.excerpt != null ? String(s.excerpt) : "";
        if (colTags) row[colTags] = s.tags != null ? (Array.isArray(s.tags) ? JSON.stringify(s.tags) : String(s.tags)) : null;
        if (colOrder) row[colOrder] = s.order != null ? Number(s.order) : null;

        // ✅ FIX: publishedAt NOT NULL ise null bırakmıyoruz
        if (colPublishedAt) {
          row[colPublishedAt] =
            s.publishedAt != null
              ? String(s.publishedAt)
              : (process.env.DEFAULT_PUBLISHEDAT || nowIso());
        }

        if (colAuthor) row[colAuthor] = s.author != null ? String(s.author) : (process.env.DEFAULT_AUTHOR || "DeriveKemik");
        if (colIllustrationUrl) {
          row[colIllustrationUrl] =
            s.illustrationUrl != null
              ? String(s.illustrationUrl)
              : (process.env.DEFAULT_ILLUSTRATION_URL || "/images/placeholder.png");
        }

        if (colCreatedAt) row[colCreatedAt] = s.createdAt ? String(s.createdAt) : nowIso();
        if (colUpdatedAt) row[colUpdatedAt] = nowIso();

        // fill every named parameter
        for (const c of insertCols) {
          if (!(c in row)) {
            const k = envKey(c);
            row[c] = process.env[k] != null ? process.env[k] : null;
          }
        }

        // ensure required not null
        for (const c of required) {
          if (row[c] === null || row[c] === undefined) {
            throw new Error(`Required column '${c}' is NULL. Set env ${envKey(c)}.`);
          }
        }

        stmt.run(row);
        count++;
      }

      console.log(`✓ ${lang.toUpperCase()} imported: ${stories.length} items`);
    }

    return count;
  });

  const affected = tx();
  const total = db.prepare(`SELECT COUNT(*) as c FROM Story`).get().c;

  console.log(`\nDONE. rows upserted/inserted: ${affected}`);
  console.log(`Story TOTAL in DB: ${total}\n`);

  db.close();
}

main();

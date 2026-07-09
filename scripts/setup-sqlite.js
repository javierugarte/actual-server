require("dotenv/config");

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const schemaPath = path.resolve(__dirname, "../db/schema.sql");
const databasePath = resolveSqlitePath(process.env.SQLITE_PATH ?? "./data/actual-server.db");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(schemaPath, "utf8"));
db.close();

console.log(`SQLite database ready at ${databasePath}`);

function resolveSqlitePath(url) {
  if (path.isAbsolute(url)) {
    return url;
  }

  return path.resolve(process.cwd(), url);
}

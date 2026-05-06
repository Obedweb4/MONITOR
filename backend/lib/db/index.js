const config = require("../../config");

function detectDbType(url) {
  if (!url) throw new Error("DATABASE_URL is required. Set it in your .env file.");
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "postgres";
  if (url.startsWith("mongodb://") || url.startsWith("mongodb+srv://")) return "mongo";
  if (url.startsWith("mysql://")) return "mysql";
  throw new Error("Unsupported DATABASE_URL. Use postgresql://, mongodb://, or mysql://");
}

let _db = null;

async function initDB() {
  const url = config.DATABASE_URL;
  const type = detectDbType(url);
  const label = { postgres: "Postgres", mongo: "MongoDB", mysql: "MySQL" }[type];
  console.log(`🗄️  Connecting to ${label} Database...`);

  if (type === "postgres") {
    const { createPostgresAdapter } = require("./adapters/postgres");
    _db = await createPostgresAdapter(url);
  } else if (type === "mongo") {
    const { createMongoAdapter } = require("./adapters/mongo");
    _db = await createMongoAdapter(url);
  } else {
    const { createMysqlAdapter } = require("./adapters/mysql");
    _db = await createMysqlAdapter(url);
  }

  console.log(`✅ ${label} Database Ready`);
}

function getDB() {
  if (!_db) throw new Error("Database not initialized. Call initDB() first.");
  return _db;
}

module.exports = { initDB, getDB };

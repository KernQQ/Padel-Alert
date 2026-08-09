const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "community.json");

const DEFAULT_DATA = {
  profiles: {},
  posts: [],
  requests: [],
  notifications: [],
  matches: [],
  nowPlayers: [],
  matchInvitations: [],
  users: {},
  sessions: {}
};

const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
let pool = null;
let dbReady = null;

function cloneDefault() {
  return structuredClone(DEFAULT_DATA);
}

function ensureJsonStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(DEFAULT_DATA, null, 2),
      "utf8"
    );
  }
}

function readJsonStore() {
  ensureJsonStore();

  try {
    const parsed = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    return {
      ...cloneDefault(),
      ...parsed
    };
  } catch {
    return cloneDefault();
  }
}

function writeJsonStore(data) {
  ensureJsonStore();

  const temp = `${DATA_FILE}.tmp`;

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  fs.renameSync(temp, DATA_FILE);
}

function databaseEnabled() {
  return Boolean(DATABASE_URL);
}

function getPool() {
  if (!databaseEnabled()) {
    return null;
  }

  if (!pool) {
    let Pool;

    try {
      ({ Pool } = require("pg"));
    } catch {
      throw new Error(
        'Brakuje pakietu "pg". W folderze backend uruchom: npm install pg'
      );
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        String(process.env.PG_SSL || "").toLowerCase() === "true"
          ? { rejectUnauthorized: false }
          : false
    });

    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }

  return pool;
}

async function ensureDatabase() {
  if (!databaseEnabled()) {
    return false;
  }

  if (!dbReady) {
    dbReady = (async () => {
      const client = await getPool().connect();

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS padelalert_state (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        const existing = await client.query(
          "SELECT id FROM padelalert_state WHERE id = 1"
        );

        if (existing.rowCount === 0) {
          const seed = readJsonStore();

          await client.query(
            `INSERT INTO padelalert_state (id, data)
             VALUES (1, $1::jsonb)`,
            [JSON.stringify(seed)]
          );

          console.log(
            "🐘 PostgreSQL: utworzono bazę i zaimportowano community.json"
          );
        }
      } finally {
        client.release();
      }

      return true;
    })().catch((error) => {
      dbReady = null;
      throw error;
    });
  }

  return dbReady;
}

async function readStore() {
  if (!databaseEnabled()) {
    return readJsonStore();
  }

  await ensureDatabase();

  const result = await getPool().query(
    "SELECT data FROM padelalert_state WHERE id = 1"
  );

  const data = result.rows[0]?.data || {};

  return {
    ...cloneDefault(),
    ...data
  };
}

async function writeStore(data) {
  if (!databaseEnabled()) {
    writeJsonStore(data);
    return;
  }

  await ensureDatabase();

  await getPool().query(
    `UPDATE padelalert_state
     SET data = $1::jsonb,
         updated_at = NOW()
     WHERE id = 1`,
    [JSON.stringify(data)]
  );
}

async function updateStore(mutator) {
  if (!databaseEnabled()) {
    const data = readJsonStore();
    const result = mutator(data);
    writeJsonStore(data);
    return result;
  }

  await ensureDatabase();

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const selected = await client.query(
      `SELECT data
       FROM padelalert_state
       WHERE id = 1
       FOR UPDATE`
    );

    const data = {
      ...cloneDefault(),
      ...(selected.rows[0]?.data || {})
    };

    const result = mutator(data);

    await client.query(
      `UPDATE padelalert_state
       SET data = $1::jsonb,
           updated_at = NOW()
       WHERE id = 1`,
      [JSON.stringify(data)]
    );

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getDatabaseStatus() {
  if (!databaseEnabled()) {
    return {
      enabled: false,
      provider: "json",
      message: "DATABASE_URL nie jest ustawiony. Używany jest community.json."
    };
  }

  try {
    await ensureDatabase();

    const result = await getPool().query(`
      SELECT
        NOW() AS database_time,
        pg_database_size(current_database()) AS database_size
    `);

    return {
      enabled: true,
      provider: "postgresql",
      connected: true,
      databaseTime: result.rows[0].database_time,
      databaseSize: Number(result.rows[0].database_size)
    };
  } catch (error) {
    return {
      enabled: true,
      provider: "postgresql",
      connected: false,
      error: error.message
    };
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    dbReady = null;
  }
}

module.exports = {
  readStore,
  writeStore,
  updateStore,
  getDatabaseStatus,
  closeDatabase,
  databaseEnabled,
  DATA_FILE
};

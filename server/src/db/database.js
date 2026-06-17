import pg from 'pg';
import { mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
const useDesktopLocalDb = process.env.DESKTOP_LOCAL_DB === '1' || process.env.DESKTOP_LOCAL_DB === 'true';

let desktopDbInitPromise = null;
let desktopDb = null;

function normalizeQueryResult(result) {
  if (!result || typeof result !== 'object') {
    return result;
  }
  if ('rowCount' in result) {
    return result;
  }
  return {
    ...result,
    rowCount: result.affectedRows ?? 0,
  };
}

async function getDesktopDb() {
  if (!desktopDbInitPromise) {
    desktopDbInitPromise = (async () => {
      const [{ PGlite }, { pgcrypto }] = await Promise.all([
        import('@electric-sql/pglite'),
        import('@electric-sql/pglite/contrib/pgcrypto'),
      ]);

      const dataDir = resolve(
        process.env.PGLITE_DATA_DIR || join(process.cwd(), '.anatolia-sim', 'pgdata')
      );

      mkdirSync(dataDir, { recursive: true });

      const db = await PGlite.create(dataDir, {
        extensions: { pgcrypto },
        relaxedDurability: true,
      });

      desktopDb = db;
      return db;
    })();
  }

  return desktopDbInitPromise;
}

function createDesktopPoolAdapter() {
  return {
    async query(text, params) {
      const db = await getDesktopDb();
      return normalizeQueryResult(await db.query(text, params));
    },
    async connect() {
      const db = await getDesktopDb();
      return {
        query: async (text, params) => normalizeQueryResult(await db.query(text, params)),
        release: () => {},
      };
    },
    async end(callback) {
      try {
        const db = await getDesktopDb();
        if (db && !db.closed) await db.close();
      } finally {
        if (typeof callback === 'function') callback();
      }
    },
    on() {},
  };
}

let pool;

if (useDesktopLocalDb) {
  pool = createDesktopPoolAdapter();
} else {
  // Use SSL for any non-localhost connection (Render, cloud databases, etc.)
  const isRemoteDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    // Set search_path at connection level so it's always active
    options: '-c search_path=antsim,public',
  });

  pool.on('error', (err) => console.error('Unexpected error on idle client', err));
}

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export async function migrate() {
  if (useDesktopLocalDb) {
    const db = await getDesktopDb();
    await db.exec(schemaSql);
  } else {
    await pool.query(schemaSql);
  }

  console.log('✅ Database schema migrated');
}

export default pool;

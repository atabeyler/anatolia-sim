import pg from 'pg';
import { mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const fullSchemaSql   = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
const cloudSchemaSql  = readFileSync(join(__dirname, 'schema-cloud.sql'), 'utf8');
const localSchemaSql  = readFileSync(join(__dirname, 'schema-local.sql'), 'utf8');

// DESKTOP_LOCAL_DB=1  → full offline (PGlite for everything)
// DESKTOP_SIM_LOCAL=1 → hybrid (Render for users, PGlite for sim data)
// neither              → web mode (Render for everything)
const useLocalDb  = process.env.DESKTOP_LOCAL_DB  === '1' || process.env.DESKTOP_LOCAL_DB  === 'true';
const useSimLocal = process.env.DESKTOP_SIM_LOCAL === '1' || process.env.DESKTOP_SIM_LOCAL === 'true';

// ─── PGlite (local sim storage) ────────────────────────────────────────────────

let pgliteInitPromise = null;

function normalizeQueryResult(result) {
  if (!result || typeof result !== 'object') return result;
  if ('rowCount' in result) return result;
  return { ...result, rowCount: result.affectedRows ?? 0 };
}

async function getPgliteDb() {
  if (!pgliteInitPromise) {
    pgliteInitPromise = (async () => {
      const [{ PGlite }, { pgcrypto }] = await Promise.all([
        import('@electric-sql/pglite'),
        import('@electric-sql/pglite/contrib/pgcrypto'),
      ]);
      const dataDir = resolve(
        process.env.PGLITE_DATA_DIR || join(process.cwd(), '.anatolia-sim', 'pgdata')
      );
      mkdirSync(dataDir, { recursive: true });
      return PGlite.create(dataDir, { extensions: { pgcrypto }, relaxedDurability: true });
    })();
  }
  return pgliteInitPromise;
}

function createPgliteAdapter() {
  let queue = Promise.resolve();
  function serial(db, text, params) {
    const r = queue.then(() => db.query(text, params));
    queue = r.catch(() => {});
    return r;
  }
  return {
    async query(text, params) {
      const db = await getPgliteDb();
      return normalizeQueryResult(await serial(db, text, params));
    },
    async connect() {
      const db = await getPgliteDb();
      return {
        query: async (t, p) => normalizeQueryResult(await serial(db, t, p)),
        release: () => {},
      };
    },
    async end(cb) {
      try { const db = await getPgliteDb(); if (db && !db.closed) await db.close(); } finally { cb?.(); }
    },
    on() {},
  };
}

// ─── PostgreSQL pool ────────────────────────────────────────────────────────────

function createPgPool() {
  const isRemote = process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    options: '-c search_path=antsim,public',
  });
  pool.on('error', (err) => console.error('Unexpected error on idle client', err));
  return pool;
}

// ─── Pool selection ─────────────────────────────────────────────────────────────

let cloudPool; // users/auth → always pg (Render)
let simPool;   // simulation data → PGlite in hybrid/offline, pg in web

if (useLocalDb) {
  // Full offline: PGlite for everything
  const pglite = createPgliteAdapter();
  cloudPool = pglite;
  simPool   = pglite;
} else if (useSimLocal) {
  // Desktop hybrid: Render for auth, PGlite for sim data
  cloudPool = createPgPool();
  simPool   = createPgliteAdapter();
} else {
  // Web: Render PostgreSQL for everything
  cloudPool = createPgPool();
  simPool   = cloudPool;
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export const cloudQuery = (text, params) => cloudPool.query(text, params);
export const simQuery   = (text, params) => simPool.query(text, params);
export const query      = cloudQuery; // backward compat (auth routes)
export const getClient  = () => cloudPool.connect();

export async function migrate() {
  if (useLocalDb) {
    const db = await getPgliteDb();
    await db.exec(fullSchemaSql);
  } else if (useSimLocal) {
    await cloudPool.query(cloudSchemaSql);
    const db = await getPgliteDb();
    await db.exec(localSchemaSql);
  } else {
    await cloudPool.query(fullSchemaSql);
  }
  console.log('✅ Database schema migrated');
}

export default cloudPool;

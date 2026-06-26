import pg from 'pg';
import dns from 'dns';
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
  if (!result || typeof result !== 'object') return result;
  if ('rowCount' in result) return result;
  return { ...result, rowCount: result.affectedRows ?? 0 };
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
  // PGlite is single-connection — serialize all queries to prevent concurrent access errors
  let queryQueue = Promise.resolve();
  function serialQuery(db, text, params) {
    const result = queryQueue.then(() => db.query(text, params));
    queryQueue = result.catch(() => {});
    return result;
  }

  return {
    async query(text, params) {
      const db = await getDesktopDb();
      return normalizeQueryResult(await serialQuery(db, text, params));
    },
    async connect() {
      const db = await getDesktopDb();
      return {
        query: async (text, params) => normalizeQueryResult(await serialQuery(db, text, params)),
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

// Resolve remote hostname to IPv4 — Render free tier has no IPv6 outbound support
async function resolveIPv4(connStr) {
  try {
    const url = new URL(connStr);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return connStr;
    const ipv4 = await new Promise((res, rej) =>
      dns.lookup(url.hostname, { family: 4 }, (err, addr) => err ? rej(err) : res(addr))
    );
    url.hostname = ipv4;
    return url.toString();
  } catch {
    return connStr;
  }
}

let _pool = null;
let _poolPromise = null;

async function getPool() {
  if (_pool) return _pool;
  if (_poolPromise) return _poolPromise;
  _poolPromise = (async () => {
    if (useDesktopLocalDb) {
      _pool = createDesktopPoolAdapter();
      return _pool;
    }
    const rawUrl = process.env.DATABASE_URL ?? '';
    const isRemote = rawUrl && !rawUrl.includes('localhost') && !rawUrl.includes('127.0.0.1');
    const connStr = isRemote ? await resolveIPv4(rawUrl) : rawUrl;
    _pool = new Pool({
      connectionString: connStr,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000,
      options: '-c search_path=antsim,public',
    });
    _pool.on('error', (err) => console.error('Unexpected error on idle client', err));
    return _pool;
  })();
  return _poolPromise;
}

export const query = async (text, params) => (await getPool()).query(text, params);
export const getClient = async () => (await getPool()).connect();

export async function migrate() {
  const p = await getPool();
  if (useDesktopLocalDb) {
    const db = await getDesktopDb();
    await db.exec(schemaSql);
  } else {
    await p.query(schemaSql);
  }
  console.log('✅ Database schema migrated');
}

export default { query, end: async (cb) => { if (_pool) await _pool.end(cb); else if (cb) cb(); } };

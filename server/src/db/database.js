import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Use SSL for any non-localhost connection (Render, cloud databases, etc.)
const isRemoteDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  // Set search_path at connection level so it's always active
  options: '-c search_path=antsim,public',
});

pool.on('error', (err) => console.error('Unexpected error on idle client', err));

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Database schema migrated');
}

export default pool;

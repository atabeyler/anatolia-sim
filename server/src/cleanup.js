import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const isRemote = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 20000,
  options: '-c search_path=antsim,public',
});

async function cleanup() {
  console.log('🧹 Disk cleanup starting...');
  const client = await pool.connect();
  try {
    // Delete all checkpoints (largest data)
    const cp = await client.query('DELETE FROM checkpoints');
    console.log(`✅ Checkpoints deleted: ${cp.rowCount}`);

    // Keep only last 200 events per simulation
    const ev = await client.query(`
      DELETE FROM simulation_events
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY simulation_id ORDER BY sim_day DESC) AS rn
          FROM simulation_events
        ) t WHERE rn > 200
      )
    `);
    console.log(`✅ Old events deleted: ${ev.rowCount}`);

    // Delete dead individuals
    const ind = await client.query(`DELETE FROM individuals WHERE alive = false`);
    console.log(`✅ Dead individuals deleted: ${ind.rowCount}`);

    console.log('✅ Cleanup complete.');
  } catch (err) {
    console.error('⚠️  Cleanup error (continuing anyway):', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();

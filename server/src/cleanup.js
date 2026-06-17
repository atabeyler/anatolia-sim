import 'dotenv/config';
import pool, { query } from './db/database.js';

async function cleanup() {
  console.log('🧹 Disk cleanup starting...');

  try {
    // Delete all checkpoints (largest data)
    const cp = await query('DELETE FROM checkpoints');
    console.log(`✅ Checkpoints deleted: ${cp.rowCount}`);

    // Keep only last 200 events per simulation
    const ev = await query(`
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
    const ind = await query(`DELETE FROM individuals WHERE alive = false`);
    console.log(`✅ Dead individuals deleted: ${ind.rowCount}`);

    console.log('✅ Cleanup complete.');
  } catch (err) {
    console.error('⚠️  Cleanup error (continuing anyway):', err.message);
  } finally {
    await pool.end();
  }
}

cleanup();

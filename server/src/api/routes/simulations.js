import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { createWorldState } from '../../engines/environment/environmentEngine.js';
import { createFounder } from '../../engines/biology/individual.js';
import { simulationManager } from '../simulationManager.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT id, name, status, current_day, current_year, start_latitude, start_longitude, created_at FROM simulations WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch simulations' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, latitude, longitude, founder1_params, founder2_params } = req.body;
    if (!name || latitude === undefined || longitude === undefined) return res.status(400).json({ error: 'name, latitude, longitude required' });
    const worldState = createWorldState(parseFloat(latitude), parseFloat(longitude));
    const f1 = createFounder({ ...founder1_params, sex: 'male', x: parseFloat(longitude), y: parseFloat(latitude) });
    const f2 = createFounder({ ...founder2_params, sex: 'female', x: parseFloat(longitude) + 0.1, y: parseFloat(latitude) });
    const { rows } = await query(`INSERT INTO simulations (user_id, name, status, start_latitude, start_longitude, founder_1, founder_2, world_state) VALUES ($1,$2,'paused',$3,$4,$5,$6,$7) RETURNING *`, [req.user.id, name, parseFloat(latitude), parseFloat(longitude), JSON.stringify(f1), JSON.stringify(f2), JSON.stringify(worldState)]);
    const sim = rows[0];
    await query(`INSERT INTO individuals (id,simulation_id,birth_day,sex,x,y,genome,phenotype,health,mind,social,skills,beliefs,language,memory) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15),($16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
      [f1.id,sim.id,f1.birth_day,f1.sex,f1.x,f1.y,JSON.stringify(f1.genome),JSON.stringify(f1.phenotype),JSON.stringify(f1.health),JSON.stringify(f1.mind),JSON.stringify(f1.social),JSON.stringify(f1.skills),JSON.stringify(f1.beliefs),JSON.stringify(f1.language),JSON.stringify(f1.memory),
       f2.id,sim.id,f2.birth_day,f2.sex,f2.x,f2.y,JSON.stringify(f2.genome),JSON.stringify(f2.phenotype),JSON.stringify(f2.health),JSON.stringify(f2.mind),JSON.stringify(f2.social),JSON.stringify(f2.skills),JSON.stringify(f2.beliefs),JSON.stringify(f2.language),JSON.stringify(f2.memory)]);
    res.status(201).json(sim);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create simulation' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM simulations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to fetch simulation' }); }
});

router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM simulations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    await simulationManager.start(rows[0]);
    await query("UPDATE simulations SET status = 'running' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Simulation started' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to start simulation' }); }
});

router.post('/:id/pause', authenticate, async (req, res) => {
  simulationManager.pause(req.params.id);
  await query("UPDATE simulations SET status = 'paused' WHERE id = $1", [req.params.id]);
  res.json({ message: 'Simulation paused' });
});

router.get('/:id/population', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT id, sex, birth_day, death_day, alive, x, y, phenotype, language FROM individuals WHERE simulation_id = $1';
    if (req.query.alive === 'true') sql += ' AND alive = true';
    sql += ' LIMIT 5000';
    const { rows } = await query(sql, [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch population' }); }
});

router.get('/:id/events', authenticate, async (req, res) => {
  try {
    const { limit = 50, importance } = req.query;
    let sql = 'SELECT * FROM simulation_events WHERE simulation_id = $1';
    const params = [req.params.id];
    if (importance) { sql += ` AND importance >= $2`; params.push(parseInt(importance)); }
    sql += ` ORDER BY sim_day DESC LIMIT ${parseInt(limit)}`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id/checkpoints', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, sim_day, sim_year, population_count, stats, created_at FROM checkpoints WHERE simulation_id = $1 ORDER BY sim_day DESC', [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch checkpoints' }); }
});

export default router;

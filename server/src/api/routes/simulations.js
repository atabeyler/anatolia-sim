import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { createWorldState } from '../../engines/environment/environmentEngine.js';
import { createFounder } from '../../engines/biology/individual.js';
import { simulationManager } from '../simulationManager.js';

const router = Router();

const TRAIT_LOCI = {
  fluid_intelligence: ['BDNF_01', 'COMT_01', 'DTNBP1_01', 'NRG1_01', 'DISC1_01'],
  empathy: ['OXTR_01', 'RELN_01'],
  curiosity: ['DRD4_01'],
  aggression: ['MAOA_01'],
  conscientiousness: ['DISC1_01', 'COMT_01'],
  artistic_sense: ['NRG1_01', 'DRD4_01'],
  language_capacity: ['FOXP2_01', 'CNTNAP2_01'],
  immune_strength: ['IMMUNE_01', 'IMMUNE_02'],
  fertility: ['FSHR_01'],
  longevity: ['TERT_01', 'APOE_01'],
  height: ['HEIGHT_01', 'HEIGHT_02', 'HEIGHT_03'],
  metabolism: ['METABOLISM_01'],
};

function allele(value) {
  const v = Math.max(0.05, Math.min(0.95, Number(value) || 0.5));
  return { a1: v, a2: v };
}

function buildFounderParams(params = {}, defaults = {}) {
  const genome = {};
  for (const [trait, loci] of Object.entries(TRAIT_LOCI)) {
    if (params[trait] === undefined) continue;
    for (const locus of loci) genome[locus] = allele(params[trait]);
  }

  const appearance = {
    eye_color: params.eye_color ?? defaults.eye_color,
    hair_color: params.hair_color ?? defaults.hair_color,
    skin_tone: params.skin_tone ?? defaults.skin_tone,
    skin_color: params.skin_color ?? defaults.skin_color,
  };

  const eyeValue = { blue: 0.25, green: 0.42, hazel: 0.55, brown: 0.78 }[appearance.eye_color];
  const hairValue = { blond: 0.2, light: 0.28, brown: 0.5, dark: 0.72, black: 0.86, red: 0.12 }[appearance.hair_color];
  const skinValue = { fair: 0.2, light: 0.35, olive: 0.52, tan: 0.68, brown: 0.82, dark: 0.92 }[appearance.skin_tone];
  if (eyeValue !== undefined) genome.HERC2_01 = allele(eyeValue);
  if (hairValue !== undefined) genome.MC1R_01 = allele(hairValue);
  if (skinValue !== undefined) genome.SLC24A5_01 = allele(skinValue);

  return {
    ...params,
    name: params.name ?? defaults.name,
    ageYears: Number(params.ageYears ?? defaults.ageYears ?? 20),
    appearance,
    genome: { ...genome, ...(params.genome ?? {}) },
  };
}

function serializeIndividual(ind, currentDay) {
  const age = Math.max(0, (currentDay - (ind.birth_day ?? 0)) / 365);
  return {
    id: ind.id,
    name: ind.phenotype?.name ?? ind.name ?? 'Unnamed',
    sex: ind.sex,
    birth_day: ind.birth_day,
    death_day: ind.death_day,
    alive: !ind.is_dead,
    age_years: Math.round(age * 10) / 10,
    x: ind.x,
    y: ind.y,
    genome: ind.genome,
    phenotype: ind.phenotype,
    health: ind.health,
    mind: ind.mind,
    social: ind.social,
    skills: ind.skills,
    beliefs: ind.beliefs,
    language: ind.language,
  };
}

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
    const f1Params = buildFounderParams(founder1_params, { name: 'Kurucu Erkek', ageYears: 22, eye_color: 'brown', hair_color: 'dark', skin_tone: 'olive' });
    const f2Params = buildFounderParams(founder2_params, { name: 'Kurucu Kadın', ageYears: 20, eye_color: 'brown', hair_color: 'brown', skin_tone: 'olive' });
    const f1 = createFounder({ ...f1Params, sex: 'male', x: parseFloat(longitude), y: parseFloat(latitude) });
    const f2 = createFounder({ ...f2Params, sex: 'female', x: parseFloat(longitude) + 0.1, y: parseFloat(latitude) });
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

router.post('/:id/start', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    await simulationManager.start(req.simulation);
    await query("UPDATE simulations SET status = 'running' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Simulation started' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to start simulation' }); }
});

router.post('/:id/pause', authenticate, requireSimulationOwner, async (req, res) => {
  simulationManager.pause(req.params.id);
  const engine = simulationManager.getEngine(req.params.id);
  await simulationManager.persistState(req.params.id, engine);
  if (engine) await simulationManager.persistPopulation(req.params.id, engine);
  await query("UPDATE simulations SET status = 'paused' WHERE id = $1", [req.params.id]);
  res.json({ message: 'Simulation paused' });
});

router.post('/:id/complete', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const engine = simulationManager.getEngine(req.params.id);
    simulationManager.pause(req.params.id);
    await simulationManager.persistState(req.params.id, engine);
    if (engine) await simulationManager.persistPopulation(req.params.id, engine);
    await query("UPDATE simulations SET status = 'completed', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ message: 'Simulation completed' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to complete simulation' }); }
});

router.post('/:id/speed', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const speed = Number(req.body.speed_multiplier);
    const allowed = new Set([1, 10, 100, 1000]);
    if (!allowed.has(speed)) return res.status(400).json({ error: 'Invalid speed multiplier' });
    simulationManager.setSpeed(req.params.id, speed);
    const { rows } = await query(
      'UPDATE simulations SET speed_multiplier = $1, updated_at = NOW() WHERE id = $2 RETURNING speed_multiplier',
      [speed, req.params.id]
    );
    res.json({ speed_multiplier: rows[0].speed_multiplier });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update speed' }); }
});

router.get('/:id/population', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const engine = simulationManager.getEngine(req.params.id);
    if (engine) {
      const individuals = [...engine.population.values()]
        .filter(ind => req.query.alive !== 'true' || !ind.is_dead)
        .slice(0, 5000)
        .map(ind => serializeIndividual(ind, engine.currentDay));
      return res.json(individuals);
    }

    let sql = 'SELECT id, sex, birth_day, death_day, alive, x, y, genome, phenotype, health, mind, social, skills, beliefs, language FROM individuals WHERE simulation_id = $1';
    if (req.query.alive === 'true') sql += ' AND alive = true';
    sql += ' LIMIT 5000';
    const { rows } = await query(sql, [req.params.id]);
    res.json(rows.map(row => serializeIndividual({ ...row, is_dead: row.alive === false }, req.simulation.current_day ?? 0)));
  } catch { res.status(500).json({ error: 'Failed to fetch population' }); }
});

router.get('/:id/events', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { limit = 50, importance } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let sql = 'SELECT * FROM simulation_events WHERE simulation_id = $1';
    const params = [req.params.id];
    if (importance) { sql += ` AND importance >= $2`; params.push(parseInt(importance, 10) || 1); }
    sql += ` ORDER BY sim_day DESC LIMIT ${safeLimit}`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id/checkpoints', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, sim_day, sim_year, population_count, stats, created_at FROM checkpoints WHERE simulation_id = $1 ORDER BY sim_day DESC', [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch checkpoints' }); }
});

router.post('/:id/restore/:checkpointId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows: cpRows } = await query('SELECT * FROM checkpoints WHERE id = $1 AND simulation_id = $2', [req.params.checkpointId, req.params.id]);
    if (!cpRows[0]) return res.status(404).json({ error: 'Checkpoint not found' });
    const cp = cpRows[0];
    // Pause running engine
    simulationManager.pause(req.params.id);
    await query("UPDATE simulations SET status='paused', current_day=$1, current_year=$2, world_state=$3 WHERE id=$4",
      [cp.sim_day, cp.sim_year, JSON.stringify(cp.world_state), req.params.id]);
    // Restore population snapshot
    if (cp.population_snapshot) {
      const snapshot = Array.isArray(cp.population_snapshot) ? cp.population_snapshot : JSON.parse(cp.population_snapshot);
      await query('DELETE FROM individuals WHERE simulation_id = $1', [req.params.id]);
      for (const ind of snapshot) {
        await query(`INSERT INTO individuals (id,simulation_id,birth_day,death_day,alive,sex,x,y,genome,phenotype,language,parent_1_id,parent_2_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (id) DO NOTHING`,
          [ind.id, req.params.id, ind.birth_day, ind.death_day, !ind.is_dead, ind.sex, ind.x, ind.y,
           JSON.stringify(ind.genome ?? {}), JSON.stringify(ind.phenotype ?? {}), JSON.stringify({ stage: ind.language_stage ?? 0 }), ind.parent_1_id, ind.parent_2_id]);
      }
    }
    res.json({ message: 'Checkpoint restored', sim_day: cp.sim_day, sim_year: cp.sim_year });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Restore failed' }); }
});

export default router;

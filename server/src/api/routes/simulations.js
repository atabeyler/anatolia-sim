import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { createWorldState } from '../../engines/environment/environmentEngine.js';
import { createFounder } from '../../engines/biology/individual.js';
import { simulationManager } from '../simulationManager.js';

const router = Router();

const TRAIT_LOCI = {
  // ── Zihin / Mind ──────────────────────────────────────────────────────────
  fluid_intelligence: ['BDNF_01', 'COMT_01', 'DTNBP1_01', 'NRG1_01', 'DISC1_01'],
  curiosity:          ['DRD4_01'],
  conscientiousness:  ['DISC1_01', 'COMT_01'],
  language_capacity:  ['FOXP2_01', 'CNTNAP2_01'],
  artistic_sense:     ['NRG1_01', 'DRD4_01'],
  self_awareness:     ['NRXN1_01', 'SHANK3_01'],
  stress_resilience:  ['SLC6A4_01'],
  learning_rate:      ['ADRA2B_01', 'BDNF_01', 'COMT_01'],
  risk_tolerance:     ['CACNA1C_01', 'DRD4_01'],
  innovation:         ['CACNA1C_01', 'NRG1_01', 'BDNF_01'],
  // ── Sosyal / Social ───────────────────────────────────────────────────────
  empathy:            ['OXTR_01', 'RELN_01'],
  social_bonding:     ['OXTR_01'],
  aggression:         ['MAOA_01'],
  cooperation:        ['AVPR1A_01', 'OXTR_01'],
  dominance:          ['DRD2_01', 'MAOA_01', 'DISC1_01'],
  // ── Beden / Body ──────────────────────────────────────────────────────────
  height:             ['HEIGHT_01', 'HEIGHT_02', 'HEIGHT_03'],
  metabolism:         ['METABOLISM_01'],
  physical_strength:  ['STRENGTH_01'],
  endurance:          ['ACTN3_01', 'METABOLISM_01', 'STRENGTH_01'],
  immune_strength:    ['IMMUNE_01', 'IMMUNE_02'],
  fertility:          ['FSHR_01'],
  longevity:          ['TERT_01', 'APOE_01'],
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
    skin_color: params.skin_color ?? params.skin_tone ?? defaults.skin_tone,
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

function agePhysique(age, sex, heightFactor, metabolism) {
  // Adult genetic height: males 155-200cm, females 145-185cm
  const adultH = sex === 'male'
    ? Math.round(155 + heightFactor * 45)
    : Math.round(145 + heightFactor * 40);

  let h, w;
  if (age < 0.08) {          // newborn
    h = Math.round(48 + heightFactor * 6);
    w = parseFloat((2.8 + heightFactor * 1.2).toFixed(1));
  } else if (age < 2) {      // infant
    const t = age / 2;
    h = Math.round(54 + t * 31);                   // 54→85 cm
    w = parseFloat((4 + t * 8).toFixed(1));        // 4→12 kg
  } else if (age < 12) {     // child
    const t = (age - 2) / 10;
    h = Math.round(85 + t * (adultH * 0.83 - 85));
    w = Math.round(12 + t * 23);                   // 12→35 kg
  } else if (age < 18) {     // adolescent
    const t = (age - 12) / 6;
    h = Math.round(adultH * 0.83 + t * adultH * 0.17);
    const adultW = Math.round((adultH / 100) ** 2 * (18 + metabolism * 8));
    w = Math.round(35 + t * (adultW - 35));
  } else {                   // adult / elder
    h = adultH;
    w = Math.round((adultH / 100) ** 2 * (18 + metabolism * 8));
  }
  return { h, w };
}

function serializeIndividual(ind, currentDay) {
  const age = Math.max(0, (currentDay - (ind.birth_day ?? 0)) / 365);
  const heightFactor = ind.phenotype?.height_factor ?? 0.5;
  const metabolism   = ind.phenotype?.metabolism   ?? 0.5;
  const beliefs = ind.beliefs instanceof Set
    ? [...ind.beliefs]
    : (Array.isArray(ind.beliefs) ? ind.beliefs : []);
  const { h: heightCm, w: weightKg } = agePhysique(age, ind.sex ?? 'male', heightFactor, metabolism);
  return {
    id: ind.id,
    name: ind.phenotype?.name ?? ind.name ?? null,
    sex: ind.sex,
    birth_day: ind.birth_day,
    death_day: ind.death_day,
    alive: !ind.is_dead,
    age_years: Math.round(age * 10) / 10,
    x: ind.x,
    y: ind.y,
    height_cm: heightCm,
    weight_kg: weightKg,
    parent_1_id: ind.parent_1_id ?? null,
    parent_2_id: ind.parent_2_id ?? null,
    death_cause: ind.death_cause ?? null,
    genome: ind.genome,
    phenotype: ind.phenotype,
    epigenome: ind.epigenome ?? null,
    health: ind.health,
    mind: ind.mind,
    psychology: ind.psychology ?? null,
    social: ind.social,
    skills: ind.skills,
    beliefs,
    language: ind.language,
    microbiome: ind.microbiome ?? null,
    inventory: ind.inventory ?? null,
    inbreeding_coeff: ind.inbreeding_coeff ?? 0,
    is_founder: ind.is_founder ?? false,
    group_role: ind.group_role ?? null,
    life_stage: ind.life_stage ?? getLifeStage(age),
  };
}

function getLifeStage(age) {
  if (age < 2)  return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'adolescent';
  if (age < 45) return 'adult';
  return 'elder';
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT s.id, s.name, s.status, s.current_day, s.current_year, s.start_latitude, s.start_longitude, s.created_at,
      COUNT(i.id)::int AS total_ever,
      COUNT(i.id) FILTER (WHERE i.alive = true)::int AS population
      FROM simulations s
      LEFT JOIN individuals i ON i.simulation_id = s.id
      WHERE s.user_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch simulations' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, latitude, longitude, founder1_params, founder2_params } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Simülasyon adı gerekli' });
    const lat = parseFloat(latitude), lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'Geçersiz koordinat' });
    if (lat < -90 || lat > 90)    return res.status(400).json({ error: 'Enlem -90 ile 90 arasında olmalı' });
    if (lon < -180 || lon > 180)  return res.status(400).json({ error: 'Boylam -180 ile 180 arasında olmalı' });
    if (!founder1_params || !founder2_params) return res.status(400).json({ error: 'İki kurucu gerekli' });
    const worldState = createWorldState(lat, lon);
    const f1Params = buildFounderParams(founder1_params, { name: 'Kurucu Erkek', ageYears: 22, eye_color: 'brown', hair_color: 'dark', skin_tone: 'olive' });
    const f2Params = buildFounderParams(founder2_params, { name: 'Kurucu Kadın', ageYears: 20, eye_color: 'brown', hair_color: 'brown', skin_tone: 'olive' });
    const f1 = createFounder({ ...f1Params, sex: f1Params.sex ?? 'male',   x: lon,       y: lat });
    const f2 = createFounder({ ...f2Params, sex: f2Params.sex ?? 'female', x: lon + 0.1, y: lat });
    // Mark as founders: immune to random death/disease until age 60, anchored to home
    f1.is_founder = true; f1.home_x = f1.x; f1.home_y = f1.y;
    f2.is_founder = true; f2.home_x = f2.x; f2.home_y = f2.y;
    // Kurucular yüzmeyi bilir — diğerleri gözlemsel öğrenmeyle edinir
    if (!f1.known_techs) f1.known_techs = new Set();
    if (!f2.known_techs) f2.known_techs = new Set();
    f1.known_techs.add('swimming');
    f2.known_techs.add('swimming');
    // Pre-mate founders so they stay together and parent children from day 1
    if (!f1.social) f1.social = {};
    if (!f2.social) f2.social = {};
    f1.social.has_mate = true;  f1.social.mate_id = f2.id;
    f2.social.has_mate = true;  f2.social.mate_id = f1.id;
    const f1Beliefs = f1.beliefs instanceof Set ? [...f1.beliefs] : [];
    const f2Beliefs = f2.beliefs instanceof Set ? [...f2.beliefs] : [];
    const f1Db = { ...f1, beliefs: f1Beliefs };
    const f2Db = { ...f2, beliefs: f2Beliefs };
    const { rows } = await query(`INSERT INTO simulations (user_id, name, status, start_latitude, start_longitude, founder_1, founder_2, world_state) VALUES ($1,$2,'paused',$3,$4,$5,$6,$7) RETURNING *`, [req.user.id, name, parseFloat(latitude), parseFloat(longitude), JSON.stringify(f1Db), JSON.stringify(f2Db), JSON.stringify(worldState)]);
    const sim = rows[0];
    await query(`INSERT INTO individuals (id,simulation_id,birth_day,sex,x,y,genome,phenotype,health,mind,social,skills,beliefs,language,memory,is_founder,home_x,home_y,inbreeding_coeff,psychology,inventory) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21),($22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)`,
      [f1.id,sim.id,f1.birth_day,f1.sex,f1.x,f1.y,JSON.stringify(f1.genome),JSON.stringify(f1.phenotype),JSON.stringify(f1.health),JSON.stringify(f1.mind),JSON.stringify(f1.social),JSON.stringify(f1.skills),JSON.stringify(f1Beliefs),JSON.stringify(f1.language),JSON.stringify(f1.memory),true,f1.x,f1.y,0,'{}','{}',
       f2.id,sim.id,f2.birth_day,f2.sex,f2.x,f2.y,JSON.stringify(f2.genome),JSON.stringify(f2.phenotype),JSON.stringify(f2.health),JSON.stringify(f2.mind),JSON.stringify(f2.social),JSON.stringify(f2.skills),JSON.stringify(f2Beliefs),JSON.stringify(f2.language),JSON.stringify(f2.memory),true,f2.x,f2.y,0,'{}','{}']);
    res.status(201).json(sim);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create simulation' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`SELECT s.*,
      COUNT(i.id)::int AS total_ever,
      COUNT(i.id) FILTER (WHERE i.alive = true)::int AS population
      FROM simulations s
      LEFT JOIN individuals i ON i.simulation_id = s.id
      WHERE s.id = $1 AND s.user_id = $2
      GROUP BY s.id`, [req.params.id, req.user.id]);
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
  try {
    simulationManager.pause(req.params.id);
    const engine = simulationManager.getEngine(req.params.id);
    await simulationManager.persistState(req.params.id, engine);
    if (engine) await simulationManager.persistPopulation(req.params.id, engine);
    await query("UPDATE simulations SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Simulation paused' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to pause simulation' }); }
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
    if (!Number.isInteger(speed) || speed < 1 || speed > 1000) return res.status(400).json({ error: 'Hız 1-1000 arasında tam sayı olmalı' });
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
        .filter(ind => {
          if (req.query.alive === 'true') return !ind.is_dead;
          if (req.query.alive === 'false') return ind.is_dead;
          return true;
        })
        .slice(0, 5000)
        .map(ind => serializeIndividual(ind, engine.currentDay));
      return res.json(individuals);
    }

    let sql = 'SELECT id, sex, birth_day, death_day, alive, x, y, genome, phenotype, health, mind, social, skills, beliefs, language, parent_1_id, parent_2_id, death_cause FROM individuals WHERE simulation_id = $1';
    if (req.query.alive === 'true') sql += ' AND alive = true';
    else if (req.query.alive === 'false') sql += ' AND alive = false';
    sql += ' LIMIT 5000';
    const { rows } = await query(sql, [req.params.id]);
    res.json(rows.map(row => serializeIndividual({ ...row, is_dead: row.alive === false }, req.simulation.current_day ?? 0)));
  } catch { res.status(500).json({ error: 'Failed to fetch population' }); }
});

router.get('/:id/events', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { limit = 50, importance, types, offset = 0 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit,  10) || 50,  1), 1000);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const params = [req.params.id];
    let sql = 'SELECT * FROM simulation_events WHERE simulation_id = $1';
    if (importance) { sql += ` AND importance >= $${params.length + 1}`; params.push(parseInt(importance, 10) || 1); }
    if (types) {
      const typeList = String(types).split(',').map(t => t.trim()).filter(Boolean);
      if (typeList.length > 0) {
        const placeholders = typeList.map((_, i) => `$${params.length + i + 1}`).join(', ');
        sql += ` AND event_type IN (${placeholders})`;
        params.push(...typeList);
      }
    }
    sql += ` ORDER BY sim_day DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id/events/summary', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM simulation_events
       WHERE simulation_id = $1
       GROUP BY event_type`,
      [req.params.id]
    );
    const countsByType = Object.fromEntries(rows.map(row => [row.event_type, row.count]));

    // Override birth/death counts with engine memory (authoritative — event log undercounts disaster victims)
    const engine = simulationManager.getEngine(req.params.id);
    if (engine) {
      countsByType['birth'] = engine.totalBirths;
      countsByType['death'] = [...engine.population.values()].filter(i => i.is_dead).length;
    }

    const total = Object.values(countsByType).reduce((s, c) => s + c, 0);
    res.json({ total, countsByType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event summary' });
  }
});

router.get('/:id/checkpoints', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, sim_day, sim_year, population_count, stats, created_at FROM checkpoints WHERE simulation_id = $1 ORDER BY sim_day DESC', [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch checkpoints' }); }
});

router.post('/:id/checkpoint', authenticate, requireSimulationOwner, async (req, res) => {
  const engine = simulationManager.getEngine(req.params.id);
  if (!engine) return res.status(400).json({ error: 'Simulation not running' });
  try {
    const alive = [...engine.population.values()].filter(i => !i.is_dead);
    const snapshot = alive.map(i => ({
      id: i.id, sex: i.sex, birth_day: i.birth_day, death_day: i.death_day,
      is_dead: i.is_dead, x: i.x, y: i.y, genome: i.genome, phenotype: i.phenotype,
      language_stage: i.language?.stage ?? 0, group_id: i.group_id,
      parent_1_id: i.parent_1_id, parent_2_id: i.parent_2_id,
    }));
    const stats = engine.computeStats(engine.currentDay, alive);
    const { rows } = await query(
      `INSERT INTO checkpoints (simulation_id, sim_day, sim_year, population_count, population_snapshot, world_state, cultural_state, tech_state, stats, belief_state, art_state, groups)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, sim_day, sim_year, population_count, created_at`,
      [req.params.id, engine.currentDay, stats.year, alive.length,
       JSON.stringify(snapshot), JSON.stringify(engine.worldState),
       JSON.stringify(engine.getCulturalState(alive)), JSON.stringify([...engine.discoveredTechs]), JSON.stringify(stats),
       JSON.stringify([...engine.discoveredBeliefs]), JSON.stringify([...engine.discoveredArts]),
       JSON.stringify(engine.groups.map(g => ({ ...g, culture: g.culture ? [...g.culture] : [], norms: g.norms ? [...g.norms] : [] })))]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Checkpoint creation failed' }); }
});

router.post('/:id/restore/:checkpointId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows: cpRows } = await query('SELECT * FROM checkpoints WHERE id = $1 AND simulation_id = $2', [req.params.checkpointId, req.params.id]);
    if (!cpRows[0]) return res.status(404).json({ error: 'Checkpoint not found' });
    const cp = cpRows[0];
    const checkpointTechs = Array.isArray(cp.tech_state)
      ? cp.tech_state
      : Array.isArray(cp.tech_state?.technologies)
        ? cp.tech_state.technologies
        : [];
    const checkpointBeliefs = Array.isArray(cp.belief_state) ? cp.belief_state : [];
    const checkpointArts = Array.isArray(cp.art_state) ? cp.art_state : [];
    const checkpointGroups = Array.isArray(cp.groups) ? cp.groups : [];
    // Pause running engine
    simulationManager.pause(req.params.id);
    await query("UPDATE simulations SET status='paused', current_day=$1, current_year=$2, world_state=$3 WHERE id=$4",
      [cp.sim_day, cp.sim_year, JSON.stringify(cp.world_state), req.params.id]);
    // Restore population snapshot
    if (cp.population_snapshot) {
      const snapshot = Array.isArray(cp.population_snapshot) ? cp.population_snapshot : JSON.parse(cp.population_snapshot);
      await query('DELETE FROM individuals WHERE simulation_id = $1', [req.params.id]);
      for (const ind of snapshot) {
        // Restore language: prefer full object, fall back to stage-only
        const langObj = ind.language && typeof ind.language === 'object' && !Array.isArray(ind.language)
          ? ind.language : { stage: ind.language_stage ?? 0 };
        // Mirror group_id into social so engine can reconstruct groups on load
        const socialObj = { ...(ind.social ?? {}), group_id: ind.group_id ?? ind.social?.group_id ?? null };
        // mind holds consciousness and other in-memory cognition state
        const mindObj = ind.mind ?? {};
        // Volatile fields (satiation, mating_urge, etc.) are stored in mind._volatile
        // so they survive the DB round-trip without requiring new schema columns
        mindObj._volatile = {
          satiation: ind.satiation ?? 1,
          mating_urge: ind.mating_urge ?? 0,
          inbreeding_coeff: ind.inbreeding_coeff ?? 0,
          age: ind.age ?? 0,
          _waterFear: ind._waterFear ?? null,
          _fears: ind._fears ?? null,
          _waterExperience: ind._waterExperience ?? null,
          inventory: ind.inventory ?? null,
          psychology: ind.psychology ?? null,
        };
        await query(
          `INSERT INTO individuals
            (id,simulation_id,birth_day,death_day,alive,sex,x,y,
             genome,phenotype,epigenome,health,mind,social,
             skills,beliefs,language,memory,
             parent_1_id,parent_2_id,death_cause)
           VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,
             $9,$10,$11,$12,$13,$14,
             $15,$16,$17,$18,
             $19,$20,$21)
           ON CONFLICT (id) DO NOTHING`,
          [
            ind.id, req.params.id, ind.birth_day, ind.death_day ?? null, !ind.is_dead, ind.sex, ind.x ?? 0, ind.y ?? 0,
            JSON.stringify(ind.genome ?? {}), JSON.stringify(ind.phenotype ?? {}),
            JSON.stringify(ind.epigenome ?? {}), JSON.stringify(ind.health ?? {}),
            JSON.stringify(mindObj), JSON.stringify(socialObj),
            JSON.stringify(ind.skills ?? []),
            JSON.stringify(Array.isArray(ind.beliefs) ? ind.beliefs : (ind.beliefs instanceof Set ? [...ind.beliefs] : [])),
            JSON.stringify(langObj), JSON.stringify(ind.memory ?? {}),
            ind.parent_1_id ?? null, ind.parent_2_id ?? null, ind.death_cause ?? null,
          ]
        );
      }
      // If engine is still in memory, reload it from the restored snapshot directly
      // so the live state is immediately consistent without a full restart
      const liveEngine = simulationManager.getEngine(req.params.id);
      if (liveEngine) {
        liveEngine.currentDay = cp.sim_day;
        liveEngine.worldState = cp.world_state ?? liveEngine.worldState;
        liveEngine.discoveredTechs = new Set(checkpointTechs);
        liveEngine.discoveredBeliefs = new Set(checkpointBeliefs);
        liveEngine.discoveredArts = new Set(checkpointArts);
        liveEngine.population.clear();
        const groupMap = new Map();
        for (const ind of snapshot) {
          const restored = { ...ind };
          restored.is_dead = ind.is_dead ?? false;
          restored.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : (ind.beliefs instanceof Set ? [...ind.beliefs] : []));
          // Restore volatile fields
          if (ind.satiation !== undefined) restored.satiation = ind.satiation;
          if (ind.mating_urge !== undefined) restored.mating_urge = ind.mating_urge;
          if (ind.inbreeding_coeff !== undefined) restored.inbreeding_coeff = ind.inbreeding_coeff;
          if (ind.age !== undefined) restored.age = ind.age;
          if (ind._waterFear !== undefined) restored._waterFear = ind._waterFear;
          if (ind._fears !== undefined) restored._fears = ind._fears;
          if (ind._waterExperience !== undefined) restored._waterExperience = ind._waterExperience;
          if (ind.inventory) restored.inventory = ind.inventory;
          if (ind.psychology) restored.psychology = ind.psychology;
          liveEngine.population.set(restored.id, restored);
          if (restored.group_id && !restored.is_dead) {
            if (!groupMap.has(restored.group_id)) {
              const savedGroup = checkpointGroups.find(g => g.id === restored.group_id) ?? {};
              groupMap.set(restored.group_id, {
                id: restored.group_id,
                name: savedGroup.name ?? null,
                founder_id: savedGroup.founder_id ?? null,
                leader_id: savedGroup.leader_id ?? null,
                member_ids: [],
                territory: savedGroup.territory ?? { x: restored.x ?? 0, y: restored.y ?? 0, radius: 0.3 },
                alliances: savedGroup.alliances ?? [],
                rival_ids: savedGroup.rival_ids ?? [],
                internal_tension: savedGroup.internal_tension ?? 0,
                prestige: savedGroup.prestige ?? 0.1,
                founded_day: savedGroup.founded_day ?? 0,
                culture: new Set(Array.isArray(savedGroup.culture) ? savedGroup.culture : []),
                norms: new Set(Array.isArray(savedGroup.norms) ? savedGroup.norms : []),
              });
            }
            groupMap.get(restored.group_id).member_ids.push(restored.id);
          }
        }
        liveEngine.groups = [...groupMap.values()];
      }
    }
    res.json({ message: 'Checkpoint restored', sim_day: cp.sim_day, sim_year: cp.sim_year });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Restore failed' }); }
});

router.post('/:id/terminate', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    simulationManager.pause(req.params.id);
    // Yield so any in-progress tick can finish before we delete
    await new Promise(resolve => setImmediate(resolve));
    simulationManager.removeEngine(req.params.id);
    await query('DELETE FROM simulation_events WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM checkpoints WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM individuals WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM simulations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Simulation terminated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to terminate simulation' }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT id FROM simulations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    simulationManager.pause(req.params.id);
    await query('DELETE FROM simulation_events WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM checkpoints WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM individuals WHERE simulation_id = $1', [req.params.id]);
    await query('DELETE FROM simulations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Simulation deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete simulation' }); }
});

router.get('/:id/report', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { rows: simRows } = await query('SELECT * FROM simulations WHERE id = $1', [req.params.id]);
    if (!simRows[0]) return res.status(404).json({ error: 'Simulation not found' });
    const sim = simRows[0];

    const [eventsRes, checkpointsRes, techRes, beliefsRes] = await Promise.all([
      query('SELECT sim_year, sim_day, event_type, description FROM simulation_events WHERE simulation_id=$1 ORDER BY sim_day DESC LIMIT 200', [req.params.id]),
      query('SELECT sim_day, sim_year, population_count, stats FROM checkpoints WHERE simulation_id=$1 ORDER BY sim_day DESC', [req.params.id]),
      query("SELECT data FROM simulation_events WHERE simulation_id=$1 AND event_type='discovery' ORDER BY sim_day", [req.params.id]),
      query("SELECT data FROM simulation_events WHERE simulation_id=$1 AND event_type='belief' ORDER BY sim_day", [req.params.id]),
    ]);

    const engine = simulationManager.getEngine(req.params.id);
    const liveStats = engine ? (() => {
      const alive = [...engine.population.values()].filter(i => !i.is_dead);
      return engine.computeStats(engine.currentDay, alive);
    })() : null;
    const latestCheckpointStats = checkpointsRes.rows[0]?.stats ?? null;

    res.json({
      simulation: {
        id: sim.id, name: sim.name, status: sim.status,
        start_latitude: sim.start_latitude, start_longitude: sim.start_longitude,
        current_year: sim.current_year, current_day: sim.current_day,
        created_at: sim.created_at,
      },
      stats: liveStats ?? latestCheckpointStats ?? sim.world_state,
      events: eventsRes.rows,
      checkpoints: checkpointsRes.rows.map(c => ({ sim_day: c.sim_day, sim_year: c.sim_year, population_count: c.population_count })),
      technologies: techRes.rows.map(r => r.data?.name).filter(Boolean),
      beliefs: beliefsRes.rows.map(r => r.data?.belief_type ?? r.data?.name).filter(Boolean),
      generated_at: new Date().toISOString(),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Report generation failed' }); }
});

export default router;

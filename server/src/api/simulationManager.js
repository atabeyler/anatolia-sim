import { SimulationEngine } from '../engines/simulationLoop.js';
import { query } from '../db/database.js';

const BATCH_SIZE = 200; // max individuals per bulk upsert

async function withRetry(fn, retries = 3, baseDelayMs = 2000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
}

class SimulationManager {
  constructor() {
    this.engines = new Map();
    this.wsClients = new Map();
    this._checkpointLocks = new Map(); // per-sim lock to prevent overlapping checkpoints
  }

  async start(simulation) {
    if (this.engines.has(simulation.id)) {
      this.runEngine(simulation.id, this.engines.get(simulation.id));
      return;
    }
    const { rows: individuals } = await query('SELECT * FROM individuals WHERE simulation_id = $1', [simulation.id]);
    const engine = new SimulationEngine(simulation);
    engine.load(individuals.map(parseIndividual));
    engine.onTick = (data) => this.broadcast(simulation.id, { type: 'tick', ...data });
    engine.onEvent = (event) => withRetry(() => query(
      `INSERT INTO simulation_events (
        simulation_id, sim_day, sim_year, event_type, description, data, importance, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        event.simulation_id,
        event.sim_day,
        event.sim_year,
        event.event_type,
        event.description,
        JSON.stringify(event.data ?? {}),
        event.importance ?? 1,
        event.created_at ?? new Date().toISOString(),
      ]
    ));

    engine.onCheckpoint = async (cp) => {
      // Skip if a checkpoint is already in progress for this simulation
      if (this._checkpointLocks.get(simulation.id)) return;
      this._checkpointLocks.set(simulation.id, true);
      try {
        await withRetry(() => query(
          `INSERT INTO checkpoints (simulation_id, sim_day, sim_year, population_count, population_snapshot, world_state, cultural_state, tech_state, stats)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [simulation.id, cp.sim_day, cp.sim_year, cp.population_count,
           JSON.stringify(cp.population_snapshot), JSON.stringify(cp.world_state),
           JSON.stringify(cp.cultural_state), JSON.stringify(cp.tech_state), JSON.stringify(cp.stats)]
        ));
        await withRetry(() => this.persistState(simulation.id, engine));
        await withRetry(() => this.persistPopulation(simulation.id, engine));
      } catch (err) {
        console.error(`[SimulationEngine] checkpoint error: ${err.message}`);
      } finally {
        this._checkpointLocks.set(simulation.id, false);
      }
    };

    this.engines.set(simulation.id, engine);
    this.runEngine(simulation.id, engine);
  }

  runEngine(simId, engine) {
    engine.start().catch(async (err) => {
      console.error(`[SIM ${simId}] Engine stopped after error:`, err);
      engine.pause();
      await this.persistState(simId, engine).catch(console.error);
      await query("UPDATE simulations SET status = 'paused' WHERE id = $1", [simId]).catch(console.error);
      this.broadcast(simId, { type: 'error', error: 'Simulation engine paused after an internal error.' });
    });
  }

  pause(simId) { this.engines.get(simId)?.pause(); }
  getEngine(simId) { return this.engines.get(simId); }
  setSpeed(simId, speed) { const engine = this.engines.get(simId); if (engine) engine.speedMultiplier = speed; }

  async persistState(simId, engine = this.engines.get(simId)) {
    if (!engine) return;
    await query(
      'UPDATE simulations SET current_day=$1, current_year=$2, world_state=$3, updated_at=NOW() WHERE id=$4',
      [engine.currentDay, Math.floor(engine.currentDay / 365), JSON.stringify(engine.worldState), simId]
    );
  }

  // Bulk UPSERT — one query per BATCH_SIZE individuals instead of N sequential queries
  async persistPopulation(simId, engine) {
    const all = [...engine.population.values()];
    if (all.length === 0) return;

    for (let start = 0; start < all.length; start += BATCH_SIZE) {
      const chunk = all.slice(start, start + BATCH_SIZE);
      const placeholders = [];
      const params = [];
      let p = 1;

      for (const ind of chunk) {
        placeholders.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7},$${p+8},$${p+9},$${p+10},$${p+11},$${p+12},$${p+13},$${p+14},$${p+15},$${p+16},$${p+17},$${p+18},$${p+19},$${p+20})`);
        params.push(
          ind.id, simId, ind.birth_day, ind.death_day, !ind.is_dead, ind.sex,
          ind.x, ind.y,
          JSON.stringify(ind.genome),
          JSON.stringify(ind.phenotype),
          JSON.stringify(ind.epigenome ?? {}),
          JSON.stringify(ind.health),
          JSON.stringify(ind.mind),
          JSON.stringify(ind.social),
          JSON.stringify(ind.skills ?? []),
          JSON.stringify(ind.beliefs instanceof Set ? [...ind.beliefs] : (Array.isArray(ind.beliefs) ? ind.beliefs : [])),
          JSON.stringify(ind.language),
          JSON.stringify(ind.memory ?? {}),
          ind.parent_1_id ?? null,
          ind.parent_2_id ?? null,
          ind.death_cause ?? null
        );
        p += 21;
      }

      await query(
        `INSERT INTO individuals
           (id,simulation_id,birth_day,death_day,alive,sex,x,y,genome,phenotype,epigenome,health,mind,social,skills,beliefs,language,memory,parent_1_id,parent_2_id,death_cause)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (id) DO UPDATE SET
           death_day=EXCLUDED.death_day, alive=EXCLUDED.alive,
           x=EXCLUDED.x, y=EXCLUDED.y,
           phenotype=EXCLUDED.phenotype, epigenome=EXCLUDED.epigenome,
           health=EXCLUDED.health, mind=EXCLUDED.mind, social=EXCLUDED.social,
           skills=EXCLUDED.skills, beliefs=EXCLUDED.beliefs,
           language=EXCLUDED.language, memory=EXCLUDED.memory,
           death_cause=EXCLUDED.death_cause`,
        params
      );
    }
  }

  registerWs(simId, ws) {
    if (!this.wsClients.has(simId)) this.wsClients.set(simId, new Set());
    this.wsClients.get(simId).add(ws);
    ws.on('close', () => this.wsClients.get(simId)?.delete(ws));
  }

  broadcast(simId, data) {
    const clients = this.wsClients.get(simId);
    if (!clients) return;
    const msg = JSON.stringify(data);
    for (const ws of clients) if (ws.readyState === 1) ws.send(msg);
  }
}

function parseIndividual(row) {
  const isDead = row.is_dead ?? row.alive === false;
  // Founders always have birth_day < 0 (born before simulation day 0).
  // is_founder / home_x / home_y are never DB columns, so reconstruct here.
  const isFounder = (row.birth_day ?? 0) < 0;
  const social = row.social ?? {};
  return {
    ...row,
    is_dead: isDead,
    alive: !isDead,
    is_founder: isFounder,
    home_x: isFounder ? (row.x ?? 0) : undefined,
    home_y: isFounder ? (row.y ?? 0) : undefined,
    // group_id is set directly on the individual by processGroupDynamics;
    // it is also mirrored into social.group_id so it survives persistence.
    group_id: social.group_id ?? undefined,
    epigenome: row.epigenome ?? {},
    skills: row.skills ?? [],
    beliefs: Array.isArray(row.beliefs) ? row.beliefs : [],
    memory: row.memory ?? { social: [], events: [], knowledge: [] },
  };
}

export const simulationManager = new SimulationManager();

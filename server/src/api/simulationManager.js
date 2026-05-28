import { SimulationEngine } from '../engines/simulationLoop.js';
import { query } from '../db/database.js';

class SimulationManager {
  constructor() { this.engines = new Map(); this.wsClients = new Map(); }

  async start(simulation) {
    if (this.engines.has(simulation.id)) { this.runEngine(simulation.id, this.engines.get(simulation.id)); return; }
    const { rows: individuals } = await query('SELECT * FROM individuals WHERE simulation_id = $1', [simulation.id]);
    const engine = new SimulationEngine(simulation);
    engine.load(individuals.map(parseIndividual));
    engine.onTick = (data) => this.broadcast(simulation.id, { type: 'tick', ...data });
    engine.onCheckpoint = async (cp) => {
      await query(`INSERT INTO checkpoints (simulation_id, sim_day, sim_year, population_count, population_snapshot, world_state, cultural_state, tech_state, stats) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [simulation.id, cp.sim_day, cp.sim_year, cp.population_count, JSON.stringify(cp.population_snapshot), JSON.stringify(cp.world_state), JSON.stringify(cp.cultural_state), JSON.stringify(cp.tech_state), JSON.stringify(cp.stats)]);
      await this.persistState(simulation.id, engine);
      await this.persistPopulation(simulation.id, engine);
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
      'UPDATE simulations SET current_day = $1, current_year = $2, world_state = $3, updated_at = NOW() WHERE id = $4',
      [engine.currentDay, Math.floor(engine.currentDay / 365), JSON.stringify(engine.worldState), simId]
    );
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

  async persistPopulation(simId, engine) {
    for (const ind of engine.population.values()) {
      await query(`INSERT INTO individuals (id,simulation_id,birth_day,death_day,alive,sex,x,y,genome,phenotype,epigenome,health,mind,social,skills,beliefs,language,memory,parent_1_id,parent_2_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT (id) DO UPDATE SET death_day=EXCLUDED.death_day,alive=EXCLUDED.alive,x=EXCLUDED.x,y=EXCLUDED.y,phenotype=EXCLUDED.phenotype,epigenome=EXCLUDED.epigenome,health=EXCLUDED.health,mind=EXCLUDED.mind,social=EXCLUDED.social,skills=EXCLUDED.skills,beliefs=EXCLUDED.beliefs,language=EXCLUDED.language,memory=EXCLUDED.memory`,
        [ind.id,simId,ind.birth_day,ind.death_day,!ind.is_dead,ind.sex,ind.x,ind.y,JSON.stringify(ind.genome),JSON.stringify(ind.phenotype),JSON.stringify(ind.epigenome),JSON.stringify(ind.health),JSON.stringify(ind.mind),JSON.stringify(ind.social),JSON.stringify(ind.skills),JSON.stringify(ind.beliefs instanceof Set?[...ind.beliefs]:(Array.isArray(ind.beliefs)?ind.beliefs:[])),JSON.stringify(ind.language),JSON.stringify(ind.memory),ind.parent_1_id,ind.parent_2_id]);
    }
  }
}

function parseIndividual(row) {
  const isDead = row.is_dead ?? row.alive === false;
  return {
    ...row,
    is_dead: isDead,
    alive: !isDead,
    epigenome: row.epigenome ?? {},
    skills: row.skills ?? [],
    beliefs: Array.isArray(row.beliefs) ? row.beliefs : [],
    memory: row.memory ?? { social: [], events: [], knowledge: [] },
  };
}

export const simulationManager = new SimulationManager();

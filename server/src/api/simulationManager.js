import { SimulationEngine } from '../engines/simulationLoop.js';
import { query } from '../db/database.js';

class SimulationManager {
  constructor() { this.engines = new Map(); this.wsClients = new Map(); }

  async start(simulation) {
    if (this.engines.has(simulation.id)) { this.engines.get(simulation.id).resume(); return; }
    const { rows: individuals } = await query('SELECT * FROM individuals WHERE simulation_id = $1', [simulation.id]);
    const engine = new SimulationEngine(simulation);
    engine.load(individuals.map(parseIndividual));
    engine.onTick = (data) => this.broadcast(simulation.id, { type: 'tick', ...data });
    engine.onCheckpoint = async (cp) => {
      await query(`INSERT INTO checkpoints (simulation_id, sim_day, sim_year, population_count, population_snapshot, world_state, cultural_state, tech_state, stats) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [simulation.id, cp.sim_day, cp.sim_year, cp.population_count, JSON.stringify(cp.population_snapshot), JSON.stringify(cp.world_state), JSON.stringify(cp.cultural_state), JSON.stringify(cp.tech_state), JSON.stringify(cp.stats)]);
      await this.persistPopulation(simulation.id, engine);
    };
    this.engines.set(simulation.id, engine);
    engine.start();
  }

  pause(simId) { this.engines.get(simId)?.pause(); }
  getEngine(simId) { return this.engines.get(simId); }

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
        [ind.id,simId,ind.birth_day,ind.death_day,ind.alive,ind.sex,ind.x,ind.y,JSON.stringify(ind.genome),JSON.stringify(ind.phenotype),JSON.stringify(ind.epigenome),JSON.stringify(ind.health),JSON.stringify(ind.mind),JSON.stringify(ind.social),JSON.stringify(ind.skills),JSON.stringify(ind.beliefs),JSON.stringify(ind.language),JSON.stringify(ind.memory),ind.parent_1_id,ind.parent_2_id]);
    }
  }
}

function parseIndividual(row) {
  return { ...row, epigenome: row.epigenome ?? {}, skills: row.skills ?? [], beliefs: row.beliefs ?? {}, memory: row.memory ?? { social: [], events: [], knowledge: [] } };
}

export const simulationManager = new SimulationManager();

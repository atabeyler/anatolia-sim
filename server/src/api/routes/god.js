import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { query } from '../../db/database.js';
import { simulationManager } from '../simulationManager.js';
import { geminiChat } from '../../utils/gemini.js';


const router = Router();

function markDead(individual, day, cause) {
  individual.is_dead = true;
  individual.alive = false;
  individual.death_day = day;
  individual.death_cause = cause;
}

router.post('/:simId/intervene', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { simId } = req.params;
    const { type, params, user_note } = req.body;
    const engine = simulationManager.getEngine(simId);
    if (!engine) return res.status(400).json({ error: 'Simulation not running' });
    const alive = [...engine.population.values()].filter(i => !i.is_dead);
    let affected = 0, deaths = 0;
    switch (type) {
      case 'earthquake': {
        const { magnitude = 7, lat = 0, lon = 0, radius = 250 } = params;
        const radiusDeg = radius / 111; // km → derece (1° ≈ 111 km)
        for (const ind of alive) {
          const dist = Math.hypot(ind.x - lon, ind.y - lat);
          if (dist < radiusDeg) {
            const risk = (magnitude - 4) / 5 * (1 - dist / radiusDeg);
            if (Math.random() < risk) { markDead(ind, engine.currentDay, 'earthquake'); deaths++; }
            else { if (!ind.health) ind.health = { hp: 1.0, calories: 1.0, hydration: 1.0, disease: null, injuries: [] }; ind.health.hp = Math.max(0.1, (ind.health.hp ?? 1) - risk * 0.5); }
            affected++;
          }
        }
        break;
      }
      case 'flood': {
        const { severity = 0.7, lat = 0, lon = 0, radius = 250 } = params;
        const floodRadiusDeg = radius / 111;
        for (const ind of alive) {
          if (Math.hypot(ind.x - lon, ind.y - lat) < floodRadiusDeg) {
            if (Math.random() < severity * 0.15) { markDead(ind, engine.currentDay, 'flood'); deaths++; }
            affected++;
          }
        }
        break;
      }
      case 'epidemic': {
        const { mortality_rate = 0.2, spread_rate = 0.5 } = params;
        for (const ind of alive) {
          if (Math.random() < spread_rate) {
            if (Math.random() < mortality_rate * (1 - (ind.phenotype.immune_strength ?? 0.5))) { markDead(ind, engine.currentDay, 'epidemic'); deaths++; }
            else {
              if (!ind.infections) ind.infections = [];
              if (!ind.infections.some(x => x.pathogen_id === 'epidemic')) {
                ind.infections.push({ pathogen_id: 'epidemic', days_remaining: 21, infected_day: engine.currentDay, severity: mortality_rate });
              }
            }
            affected++;
          }
        }
        break;
      }
      case 'genetic_boost': {
        const ind = engine.population.get(params.individual_id);
        if (ind && !ind.is_dead) {
          if (!ind.is_founder) return res.status(400).json({ error: 'Genetic boost only applies to founders — simulation integrity rule' });
          ind.phenotype[params.trait] = Math.min(1, (ind.phenotype[params.trait] ?? 0.5) + params.amount);
          affected = 1;
        }
        break;
      }
      case 'instant_death': {
        const ind = engine.population.get(params.individual_id);
        if (ind && !ind.is_dead) { markDead(ind, engine.currentDay, 'god_intervention'); deaths = 1; affected = 1; }
        break;
      }
      case 'drought': {
        engine.worldState.food_abundance = Math.max(0.05, engine.worldState.food_abundance * 0.3);
        engine.worldState.water_abundance = Math.max(0.05, engine.worldState.water_abundance * 0.2);
        affected = alive.length;
        break;
      }
      case 'volcano': {
        const { power = 7, lat = 0, lon = 0, radius = 200 } = params;
        const volcanoRadiusDeg = radius / 111;
        for (const ind of alive) {
          const dist = Math.hypot(ind.x - lon, ind.y - lat);
          if (dist < volcanoRadiusDeg) {
            const risk = (power / 10) * Math.exp(-dist / (volcanoRadiusDeg * 0.4));
            if (Math.random() < risk * 0.5) { markDead(ind, engine.currentDay, 'volcano'); deaths++; }
            else { if (!ind.health) ind.health = { hp: 1.0, calories: 1.0, hydration: 1.0, disease: null, injuries: [] }; ind.health.hp = Math.max(0.1, (ind.health.hp ?? 1) - risk * 0.4); }
            affected++;
          }
        }
        engine.worldState.food_abundance = Math.max(0.05, engine.worldState.food_abundance * (1 - power / 25));
        engine.worldState.temperature = (engine.worldState.temperature ?? 20) - power * 0.4;
        break;
      }
      case 'meteor': {
        const { size = 3, lat = 0, lon = 0 } = params;
        const meteorRadiusDeg = (size * 40) / 111;
        for (const ind of alive) {
          const dist = Math.hypot(ind.x - lon, ind.y - lat);
          if (dist < meteorRadiusDeg) {
            const killProb = Math.exp(-dist / (meteorRadiusDeg * 0.3)) * 0.95;
            if (Math.random() < killProb) { markDead(ind, engine.currentDay, 'meteor'); deaths++; }
            affected++;
          }
        }
        engine.worldState.food_abundance = Math.max(0.02, engine.worldState.food_abundance * (0.6 - size * 0.1));
        engine.worldState.temperature = (engine.worldState.temperature ?? 20) - size * 1.5;
        break;
      }
      case 'longevity': {
        const ind = engine.population.get(params.individual_id);
        if (ind && !ind.is_dead) {
          if (!ind.is_founder) return res.status(400).json({ error: 'Longevity boost only applies to founders — Cardinal Rule: non-founder phenotypes may not be directly modified' });
          ind.phenotype.max_lifespan = Math.min(200, ind.phenotype.max_lifespan + (params.extra_years ?? 50));
          affected = 1;
        }
        break;
      }
    }
    await query(`INSERT INTO god_interventions (simulation_id,sim_day,sim_year,type,params,affected_individuals,deaths,user_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [simId, engine.currentDay, Math.floor(engine.currentDay/365), type, JSON.stringify(params), affected, deaths, user_note]);
    res.json({ message: 'Intervention applied', affected, deaths });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Intervention failed' }); }
});

router.post('/:simId/talk/:individualId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { simId, individualId } = req.params;
    const { message } = req.body;
    const engine = simulationManager.getEngine(simId);
    if (!engine) return res.status(400).json({ error: 'Simulation not running' });
    const individual = engine.population.get(individualId);
    if (!individual) return res.status(404).json({ error: 'Individual not found' });
    const age = Math.floor((engine.currentDay - individual.birth_day) / 365);
    const langStage = individual.language?.stage ?? 0;
    const individualResponse = await geminiChat({
      model: process.env.GEMINI_TALK_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 500,
      system: `You are roleplaying as a simulated human in a civilization simulation. Age: ${age}, Sex: ${individual.sex}, Language stage: ${langStage} (${individual.language?.stage_name ?? 'pre-linguistic'}), Intelligence: ${individual.phenotype?.fluid_intelligence?.toFixed(2)}/1.0. If stage 0-1: only grunts/gestures. If stage 2: proto-sounds. If stage 3: max 10 simple words. If stage 4+: simple sentences. Never break character.`,
      user: message,
    });
    await query(`INSERT INTO individual_conversations (simulation_id,individual_id,sim_day,user_message,individual_response,language_stage) VALUES ($1,$2,$3,$4,$5,$6)`,
      [simId, individualId, engine.currentDay, message, individualResponse, individual.language.stage_name ?? 'pre-linguistic']);
    res.json({ response: individualResponse });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Conversation failed' }); }
});

router.post('/:simId/quarantine', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { simId } = req.params;
    const { enabled } = req.body;
    const engine = simulationManager.getEngine(simId);
    if (!engine) return res.status(400).json({ error: 'Simulation not running' });
    engine.worldState.quarantine_mode = !!enabled;
    res.json({ quarantine_mode: engine.worldState.quarantine_mode });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Quarantine failed' }); }
});

export default router;

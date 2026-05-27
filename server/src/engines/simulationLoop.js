import { rollDeath } from './biology/mortality.js';
import { checkReproduction, attemptMating } from './biology/reproduction.js';
import { updateWorldState, computeResourcePressure } from './environment/environmentEngine.js';
import { updateLanguageStage, learnFromTeacher } from './language/languageEngine.js';
import { tryDiscoverTech } from './technology/technologyEngine.js';
import { getAge } from './biology/individual.js';

const SOCIAL_RADIUS = 50;
const CHECKPOINT_INTERVAL = 100;

export class SimulationEngine {
  constructor(simulation) {
    this.simId = simulation.id;
    this.currentDay = simulation.current_day ?? 0;
    this.population = new Map();
    this.worldState = simulation.world_state;
    this.discoveredTechs = new Set();
    this.events = [];
    this.running = false;
    this.speedMultiplier = simulation.speed_multiplier ?? 1;
    this.onTick = null;
    this.onCheckpoint = null;
  }

  load(individuals) { for (const ind of individuals) this.population.set(ind.id, ind); }
  pause() { this.running = false; }
  resume() { this.start(); }

  async start() {
    this.running = true;
    while (this.running && this.population.size > 0) {
      await this.tick();
      if (this.speedMultiplier < 100) await sleep(1000 / this.speedMultiplier);
    }
  }

  async tick() {
    const day = this.currentDay;
    const alive = [...this.population.values()].filter(i => i.alive);
    updateWorldState(this.worldState, day);
    const resourcePressure = computeResourcePressure(this.worldState, alive.length);
    for (const ind of alive) this.updatePhysiology(ind, resourcePressure);
    this.processSocialInteractions(alive, day);
    const newborns = checkReproduction(this.population, day, this.simId);
    for (const nb of newborns) { this.population.set(nb.id, nb); this.logEvent(day, 'birth', 'New individual born', { individual_id: nb.id }, 1); }
    for (const ind of alive) {
      const cause = rollDeath(ind, day, this.worldState);
      if (cause) { ind.alive = false; ind.death_day = day; ind.death_cause = cause; this.logEvent(day, 'death', `Individual died: ${cause}`, { individual_id: ind.id, cause }, 1); }
    }
    if (this.worldState.natural_disaster) this.processDisaster(this.worldState.natural_disaster, alive, day);
    const genCount = this.estimateGenerations();
    for (const ind of alive) updateLanguageStage(ind, alive.length, genCount);
    this.processLanguageLearning(alive);
    for (const ind of alive) { const d = tryDiscoverTech(ind, this.discoveredTechs, this.worldState, day); for (const t of d) this.logEvent(day, 'technology', `Technology discovered: ${t.tech_id}`, t, 4); }
    this.worldState.human_impact = Math.min(1, alive.length / 1000);
    const stats = this.computeStats(day, alive);
    if (day % CHECKPOINT_INTERVAL === 0 && this.onCheckpoint) {
      await this.onCheckpoint({ sim_day: day, sim_year: Math.floor(day/365), population_count: alive.length, population_snapshot: [...this.population.values()].map(compactIndividual), world_state: this.worldState, cultural_state: this.getCulturalState(alive), tech_state: [...this.discoveredTechs], stats });
    }
    if (this.onTick) this.onTick({ day, stats, events: this.events.slice(-20) });
    this.currentDay++;
  }

  updatePhysiology(individual, resourcePressure) {
    const { health } = individual;
    health.calories = Math.max(0, health.calories - 0.005);
    health.hydration = Math.max(0, health.hydration - 0.008 - Math.max(0, (this.worldState.temperature - 20) / 30) * 0.01);
    const foragingSkill = individual.skills?.find(s => s.id === 'foraging')?.level ?? 0.2;
    health.calories = Math.min(1, health.calories + (1 - resourcePressure.food_pressure) * foragingSkill * 0.02);
    health.hydration = Math.min(1, health.hydration + (1 - resourcePressure.water_pressure) * 0.015);
    if (health.calories > 0.5 && health.hydration > 0.5) health.hp = Math.min(1, health.hp + 0.001);
    else health.hp = Math.max(0, health.hp - 0.002);
    if (health.disease) { health.disease.duration--; if (health.disease.duration <= 0) health.disease = null; }
  }

  processSocialInteractions(alive, day) {
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const [a, b] = [alive[i], alive[j]];
        if (Math.hypot(a.x - b.x, a.y - b.y) > SOCIAL_RADIUS) continue;
        if (!a.social.has_mate && !b.social.has_mate) attemptMating(a, b, day);
        const rel = b.id;
        if (!a.social.relationships[rel]) a.social.relationships[rel] = { type: 'acquaintance', strength: 0.1, trust: 0.5 };
        else a.social.relationships[rel].strength = Math.min(1, a.social.relationships[rel].strength + 0.001);
      }
    }
  }

  processLanguageLearning(alive) {
    for (const ind of alive) {
      if (ind.language.stage < 2) continue;
      const nearby = alive.filter(o => o.id !== ind.id && o.language.stage > ind.language.stage && Math.hypot(ind.x - o.x, ind.y - o.y) < SOCIAL_RADIUS);
      if (nearby.length > 0) learnFromTeacher(ind, nearby[Math.floor(Math.random() * nearby.length)]);
    }
  }

  processDisaster(disasters, alive, day) {
    for (const { type, mortality_factor } of disasters) {
      let deaths = 0;
      for (const ind of alive) { if (Math.random() < mortality_factor) { ind.alive = false; ind.death_day = day; ind.death_cause = type; deaths++; } }
      if (deaths > 0) this.logEvent(day, 'disaster', `${type} killed ${deaths} individuals`, { type, deaths }, 5);
    }
  }

  estimateGenerations() {
    const oldest = Math.max(...[...this.population.values()].map(i => this.currentDay - i.birth_day), 0);
    return Math.floor(oldest / (25 * 365));
  }

  getCulturalState(alive) {
    const s = {};
    for (const ind of alive) { const n = ind.language.stage_name ?? 'pre-linguistic'; s[n] = (s[n] ?? 0) + 1; }
    return { language_distribution: s };
  }

  computeStats(day, alive) {
    const ages = alive.map(i => getAge(i, day));
    return {
      day, year: Math.floor(day / 365), population: alive.length, total_ever: this.population.size,
      avg_age: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
      sex_ratio: alive.filter(i => i.sex === 'male').length / Math.max(1, alive.length),
      avg_intelligence: alive.reduce((s, i) => s + (i.phenotype?.fluid_intelligence ?? 0), 0) / Math.max(1, alive.length),
      technologies: this.discoveredTechs.size, season: this.worldState.season,
      temperature: Math.round(this.worldState.temperature), food_abundance: Math.round(this.worldState.food_abundance * 100) / 100,
    };
  }

  logEvent(day, type, description, data = {}, importance = 1) {
    this.events.push({ simulation_id: this.simId, sim_day: day, sim_year: Math.floor(day/365), event_type: type, description, data, importance, created_at: new Date().toISOString() });
    if (this.events.length > 1000) this.events.shift();
  }
}

function compactIndividual(ind) {
  return { id: ind.id, alive: ind.alive, sex: ind.sex, birth_day: ind.birth_day, death_day: ind.death_day, x: ind.x, y: ind.y, phenotype: ind.phenotype, language_stage: ind.language?.stage, parent_1_id: ind.parent_1_id, parent_2_id: ind.parent_2_id };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Integration tests for SimulationEngine core behaviours.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimulationEngine } from '../src/engines/simulationLoop.js';
import { v4 as uuidv4 } from 'uuid';

function makeSim(overrides = {}) {
  return {
    id: uuidv4(),
    current_day: 0,
    world_state: {
      biome: 'mediterranean',
      season: 'summer',
      temperature: 22,
      food_abundance: 0.7,
      water_abundance: 0.6,
      natural_disaster: null,
      current_weather: 'clear',
      longitude: 32,
      latitude: 38,
      alive_count: 2,
    },
    speed_multiplier: 1,
    ...overrides,
  };
}

function makeInd(overrides = {}) {
  const id = overrides.id ?? uuidv4();
  return {
    id,
    is_dead: false,
    alive: true,
    sex: overrides.sex ?? 'male',
    age: 25 * 365,
    birth_day: -25 * 365,
    x: 32, y: 38,
    group_id: null,
    is_founder: overrides.is_founder ?? false,
    phenotype: {
      fluid_intelligence: 0.7,
      curiosity: 0.7,
      consciousness_potential: 0.6,
      physical_strength: 0.6,
      conscientiousness: 0.6,
      social_bonding: 0.7,
      aggression: 0.3,
      fertility: 0.7,
      immune_strength: 0.7,
      health_resilience: 0.7,
      max_lifespan: 80,
      ...overrides.phenotype,
    },
    genome: {},
    language: { stage: 0, stage_name: 'pre-linguistic', foxp2_expression: 0.5, vocabulary: {} },
    health: { hp: 1.0, calories: 0.8, hydration: 0.8, injuries: [] },
    mind: { consciousness: 0.01 },
    psychology: { stress_level: 0.2, wellbeing: 0.6, theory_of_mind: 0, attachment_style: 'secure' },
    social: { reputation: 0.5, group_id: null, children_ids: [], relationships: {}, has_mate: false },
    epigenome: {},
    inventory: { food: 30, water: 15, stone: 2, wood: 3 },
    beliefs: new Set(),
    known_techs: new Set(),
    infections: [],
    microbiome: { diversity: 0.5 },
    inbreeding_coeff: 0,
    ...overrides,
  };
}

function makeEngine(simOverrides = {}) {
  const engine = new SimulationEngine(makeSim(simOverrides));
  engine._pool?.terminate();
  engine._pool = null;
  return engine;
}

describe('SimulationEngine — constructor', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('initialises with currentDay 0', () => {
    engine = makeEngine();
    expect(engine.currentDay).toBe(0);
  });

  it('starts with foraging and stone_tools in discoveredTechs', () => {
    engine = makeEngine();
    expect(engine.discoveredTechs.has('foraging')).toBe(true);
    expect(engine.discoveredTechs.has('stone_tools')).toBe(true);
  });

  it('starts not running', () => {
    engine = makeEngine();
    expect(engine.running).toBe(false);
  });

  it('population and groups start empty', () => {
    engine = makeEngine();
    expect(engine.population.size).toBe(0);
    expect(engine.groups).toHaveLength(0);
  });
});

describe('SimulationEngine.load()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('populates population map from array', () => {
    engine = makeEngine();
    engine.load([makeInd(), makeInd()]);
    expect(engine.population.size).toBe(2);
  });

  it('adds alive individuals to _aliveIds', () => {
    engine = makeEngine();
    const a = makeInd({ is_dead: false });
    const d = makeInd({ is_dead: true });
    engine.load([a, d]);
    expect(engine._aliveIds.has(a.id)).toBe(true);
    expect(engine._aliveIds.has(d.id)).toBe(false);
  });

  it('restores totalDeaths from dead individuals', () => {
    engine = makeEngine();
    engine.load([makeInd({ is_dead: true, death_day: 100, birth_day: 0 })]);
    expect(engine.totalDeaths).toBe(1);
  });

  it('converts beliefs array to Set', () => {
    engine = makeEngine();
    const ind = makeInd({ beliefs: ['animism'] });
    engine.load([ind]);
    expect(engine.population.get(ind.id).beliefs).toBeInstanceOf(Set);
    expect(engine.population.get(ind.id).beliefs.has('animism')).toBe(true);
  });

  it('converts known_techs array to Set', () => {
    engine = makeEngine();
    const ind = makeInd({ known_techs: ['fire_making'] });
    engine.load([ind]);
    expect(engine.population.get(ind.id).known_techs).toBeInstanceOf(Set);
  });

  it('reconstructs groups from group_id fields', () => {
    engine = makeEngine();
    const i1 = makeInd({ group_id: 'grp-1' });
    const i2 = makeInd({ group_id: 'grp-1' });
    engine.load([i1, i2]);
    expect(engine.groups).toHaveLength(1);
    expect(engine.groups[0].id).toBe('grp-1');
    expect(engine.groups[0].member_ids).toContain(i1.id);
    expect(engine.groups[0].member_ids).toContain(i2.id);
  });
});

describe('SimulationEngine — pause / resume', () => {
  it('pause sets running to false', () => {
    const engine = makeEngine();
    engine.running = true;
    engine.pause();
    expect(engine.running).toBe(false);
    engine.destroy?.();
  });
});

describe('SimulationEngine.computeStats()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('returns correct population count', () => {
    engine = makeEngine();
    const alive = [makeInd(), makeInd(), makeInd()];
    engine.load(alive);
    const stats = engine.computeStats(0, alive);
    expect(stats.population).toBe(3);
  });

  it('avg_consciousness is between 0 and 1', () => {
    engine = makeEngine();
    const alive = [
      makeInd({ mind: { consciousness: 0.1 } }),
      makeInd({ mind: { consciousness: 0.3 } }),
    ];
    engine.load(alive);
    const stats = engine.computeStats(0, alive);
    expect(stats.avg_consciousness).toBeGreaterThanOrEqual(0);
    expect(stats.avg_consciousness).toBeLessThanOrEqual(1);
  });

  it('qol_index is between 0 and 1', () => {
    engine = makeEngine();
    const alive = [makeInd()];
    engine.load(alive);
    const stats = engine.computeStats(0, alive);
    expect(stats.qol_index).toBeGreaterThanOrEqual(0);
    expect(stats.qol_index).toBeLessThanOrEqual(1);
  });

  it('age_pyramid returns 14 bands', () => {
    engine = makeEngine();
    const alive = [makeInd()];
    engine.load(alive);
    const stats = engine.computeStats(0, alive);
    expect(stats.age_pyramid).toHaveLength(14);
  });

  it('epigenetics returns 8 loci averages', () => {
    engine = makeEngine();
    const alive = [makeInd()];
    engine.load(alive);
    const stats = engine.computeStats(0, alive);
    expect(Object.keys(stats.epigenetics)).toHaveLength(8);
  });

  it('birth and death totals match engine counters', () => {
    engine = makeEngine();
    const alive = [makeInd()];
    engine.load([]);
    engine.totalBirths = 5;
    engine.totalDeaths = 2;
    engine._newDeadThisTick = [];
    engine._deathStats = { count: 2, ageSum: 50, infant_deaths: 0, child_deaths: 0, causes: {} };
    const stats = engine.computeStats(0, alive);
    expect(stats.births).toBe(5);
    expect(stats.deaths).toBe(2);
  });
});

describe('SimulationEngine.getMetrics()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('returns metrics object with required keys', () => {
    engine = makeEngine();
    engine._runtimeDiagnostics = {};
    const m = engine.getMetrics();
    expect(m).toHaveProperty('population');
    expect(m).toHaveProperty('current_day');
    expect(m).toHaveProperty('memory');
    expect(m).toHaveProperty('ticks_per_second');
  });

  it('workers_disabled true when pool is null', () => {
    engine = makeEngine();
    engine._pool = null;
    engine._runtimeDiagnostics = {};
    expect(engine.getMetrics().workers_disabled).toBe(true);
  });

  it('is_warping false when no fast-forward target', () => {
    engine = makeEngine();
    engine._runtimeDiagnostics = {};
    expect(engine.getMetrics().is_warping).toBe(false);
  });

  it('is_warping true when fast-forward target set', () => {
    engine = makeEngine();
    engine._fastForwardTarget = 500;
    engine._runtimeDiagnostics = {};
    expect(engine.getMetrics().is_warping).toBe(true);
  });
});

describe('SimulationEngine.estimateGenerations()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('returns 0 for a fresh sim with no individuals', () => {
    engine = makeEngine();
    engine.currentDay = 0;
    expect(engine.estimateGenerations()).toBe(0);
  });

  it('returns max generation across alive individuals', () => {
    engine = makeEngine();
    const g2 = makeInd({ generation: 2 });
    const g5 = makeInd({ generation: 5 });
    engine.population.set(g2.id, g2);
    engine.population.set(g5.id, g5);
    engine._aliveIds.add(g2.id);
    engine._aliveIds.add(g5.id);
    engine.currentDay = 0;
    expect(engine.estimateGenerations()).toBe(5);
  });

  it('ignores dead individuals', () => {
    engine = makeEngine();
    const dead = makeInd({ generation: 10, is_dead: true });
    const alive = makeInd({ generation: 1 });
    engine.population.set(dead.id, dead);
    engine.population.set(alive.id, alive);
    engine._aliveIds.add(alive.id);
    engine.currentDay = 0;
    expect(engine.estimateGenerations()).toBe(1);
  });
});

describe('SimulationEngine._checkMilestones()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('fires pop_10 milestone when population reaches 10', () => {
    engine = makeEngine();
    engine._milestones = new Set();
    const alive = Array.from({ length: 10 }, () => makeInd());
    const events = [];
    engine._checkMilestones(alive, 1, events);
    expect(events.find(e => e.key === 'pop_10')).toBeDefined();
  });

  it('does not re-fire already-triggered milestone', () => {
    engine = makeEngine();
    engine._milestones = new Set(['pop_10']);
    const alive = Array.from({ length: 10 }, () => makeInd());
    const events = [];
    engine._checkMilestones(alive, 1, events);
    expect(events.filter(e => e.key === 'pop_10')).toHaveLength(0);
  });

  it('fires year_10 milestone at day 3650', () => {
    engine = makeEngine();
    engine._milestones = new Set();
    const events = [];
    engine._checkMilestones([], 10 * 365, events);
    expect(events.find(e => e.key === 'year_10')).toBeDefined();
  });

  it('milestone event has type milestone and importance high', () => {
    engine = makeEngine();
    engine._milestones = new Set();
    const alive = Array.from({ length: 10 }, () => makeInd());
    const events = [];
    engine._checkMilestones(alive, 1, events);
    const ev = events.find(e => e.type === 'milestone');
    expect(ev).toBeDefined();
    expect(ev.importance).toBe('high');
    expect(typeof ev.description).toBe('string');
  });
});

describe('SimulationEngine.logEvent()', () => {
  let engine;
  afterEach(() => engine.destroy?.());

  it('adds event to internal events array', () => {
    engine = makeEngine();
    engine.logEvent(1, 'birth', 'A child was born', {}, 1);
    expect(engine.events.length).toBeGreaterThan(0);
    expect(engine.events[0].event_type).toBe('birth');
  });

  it('trims buffer to 1000 events', () => {
    engine = makeEngine();
    for (let i = 0; i < 1200; i++) {
      engine.logEvent(i, 'test', 'x', {}, 1);
    }
    expect(engine.events.length).toBeLessThanOrEqual(1000);
  });

  it('event includes sim_day and sim_year', () => {
    engine = makeEngine();
    engine.logEvent(730, 'death', 'Someone died', {}, 1);
    const ev = engine.events[engine.events.length - 1];
    expect(ev.sim_day).toBe(730);
    expect(ev.sim_year).toBe(2);
  });
});

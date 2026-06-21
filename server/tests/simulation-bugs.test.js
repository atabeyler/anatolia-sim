/**
 * Regression tests for bugs fixed in simulationLoop.js.
 * Each test corresponds to a named bug (H-xx) and should fail on the original
 * code and pass with the fix applied.
 *
 * We instantiate SimulationEngine directly so we can call internal methods
 * without running a full tick (which would require DB + worker pool).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimulationEngine } from '../src/engines/simulationLoop.js';
import { v4 as uuidv4 } from 'uuid';

// ── Minimal helpers ───────────────────────────────────────────────────────────

function makeSim(overrides = {}) {
  return {
    id: uuidv4(),
    current_day: 0,
    world_state: {
      biome: 'mediterranean', season: 'summer', temperature: 22,
      water_abundance: 0.4, natural_disaster: null, current_weather: 'clear',
      longitude: 32, latitude: 38,
    },
    ...overrides,
  };
}

function makeInd(overrides = {}) {
  return {
    id: uuidv4(),
    is_dead: false, alive: true,
    sex: 'male', age: 25 * 365, birth_day: -25 * 365,
    x: 30, y: 38, group_id: null,
    phenotype: { fluid_intelligence: 0.7, curiosity: 0.7 },
    language: { stage: 0, stage_name: 'pre-linguistic', foxp2_expression: 0.3, vocabulary: {} },
    health: { hp: 1.0, calories: 0.8, hydration: 0.8, injuries: [] },
    mind: {}, social: { relationships: {}, reputation: 0.5, children_ids: [], has_mate: false },
    memory: { social: [], events: [], knowledge: [] },
    skills: [], beliefs: new Set(), known_techs: new Set(),
    inventory: {}, epigenome: {}, psychology: { stress_level: 0.2 },
    infections: [],
    ...overrides,
  };
}

function makeEngine() {
  const engine = new SimulationEngine(makeSim());
  // Terminate the worker pool immediately — we only call specific methods, not tick()
  engine._pool?.terminate();
  engine._pool = null;
  return engine;
}

// ── H-01: disaster deaths tracked in _newDeadThisTick ───────────────────────

describe('H-01 regression — processDisaster() death tracking', () => {
  let engine;
  beforeEach(() => { engine = makeEngine(); });
  afterEach(() => { engine.destroy?.(); });

  it('disaster deaths appear in _newDeadThisTick', () => {
    const ind = makeInd();
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine._newDeadThisTick = [];

    // mortality_factor: 1.0 → everyone dies
    engine.processDisaster([{ type: 'wildfire', mortality_factor: 1.0 }], [ind], 0);

    expect(engine._newDeadThisTick).toHaveLength(1);
    expect(engine._newDeadThisTick[0].id).toBe(ind.id);
  });

  it('disaster deaths are removed from _aliveIds', () => {
    const ind = makeInd();
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine._newDeadThisTick = [];

    engine.processDisaster([{ type: 'wildfire', mortality_factor: 1.0 }], [ind], 0);

    expect(engine._aliveIds.has(ind.id)).toBe(false);
  });

  it('disaster deaths remove individual from group member_ids', () => {
    const grpId = 'grp-1';
    const ind = makeInd({ group_id: grpId });
    engine.groups = [{ id: grpId, member_ids: [ind.id] }];
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine._newDeadThisTick = [];

    engine.processDisaster([{ type: 'flood', mortality_factor: 1.0 }], [ind], 0);

    expect(engine.groups[0].member_ids).not.toContain(ind.id);
  });

  it('disaster with mortality_factor: 0 leaves _newDeadThisTick empty', () => {
    const ind = makeInd();
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine._newDeadThisTick = [];

    engine.processDisaster([{ type: 'drought_event', mortality_factor: 0 }], [ind], 0);

    expect(engine._newDeadThisTick).toHaveLength(0);
  });

  it('worldState.natural_disaster is cleared after processDisaster', () => {
    const ind = makeInd();
    engine.worldState.natural_disaster = { type: 'wildfire', mortality_factor: 0 };
    engine._newDeadThisTick = [];

    engine.processDisaster([{ type: 'wildfire', mortality_factor: 0 }], [ind], 0);

    expect(engine.worldState.natural_disaster).toBeNull();
  });
});

// ── H-16: estimateGenerations uses _aliveIds only ───────────────────────────

describe('H-16 regression — estimateGenerations() excludes dead individuals', () => {
  let engine;
  beforeEach(() => { engine = makeEngine(); });
  afterEach(() => { engine.destroy?.(); });

  it('counts only alive individuals — dead founder with ancient birth_day is ignored', () => {
    const dead = makeInd({ birth_day: -100 * 365, is_dead: true });
    const alive = makeInd({ birth_day: -10 * 365, is_dead: false });
    engine.population.set(dead.id, dead);
    engine.population.set(alive.id, alive);
    engine._aliveIds.add(alive.id); // dead individual is NOT in _aliveIds

    engine.currentDay = 0;
    const gen = engine.estimateGenerations();

    // alive: age = 0 - (-10*365) = 3650 days → 0 generations (floor(3650/(25*365)) = 0)
    // dead:  age = 0 - (-100*365) = 36500 → 4 generations — should NOT be counted
    expect(gen).toBe(0);
  });

  it('returns 1 when alive individual has generation=1 (BUG-09: pedigree depth, not age)', () => {
    // BUG-09 fix: generation is tracked as a pedigree field, not inferred from age.
    const ind = makeInd({ generation: 1 });
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine.currentDay = 0;

    const gen = engine.estimateGenerations();
    expect(gen).toBe(1);
  });

  it('returns max generation across all alive individuals', () => {
    const gen2 = makeInd({ generation: 2 });
    const gen5 = makeInd({ generation: 5 });
    engine.population.set(gen2.id, gen2);
    engine.population.set(gen5.id, gen5);
    engine._aliveIds.add(gen2.id);
    engine._aliveIds.add(gen5.id);
    engine.currentDay = 0;
    expect(engine.estimateGenerations()).toBe(5);
  });

  it('result is cached and not recomputed within 365 days', () => {
    const ind = makeInd({ generation: 0 });
    engine.population.set(ind.id, ind);
    engine._aliveIds.add(ind.id);
    engine.currentDay = 0;

    const first = engine.estimateGenerations();
    // Add a high-generation alive individual — cache should prevent re-computation
    const newer = makeInd({ generation: 10 });
    engine.population.set(newer.id, newer);
    engine._aliveIds.add(newer.id);
    engine.currentDay = 100; // still < 365 days since last cache

    const second = engine.estimateGenerations();
    expect(second).toBe(first); // still 0 (cached, newer ignored)
  });
});

// ── H-07: mating urge age alignment ─────────────────────────────────────────

describe('H-07 regression — mating urge is zero before age 15', () => {
  let engine;
  beforeEach(() => { engine = makeEngine(); engine._newDeadThisTick = []; });
  afterEach(() => { engine.destroy?.(); });

  it('14-year-old has mating_urge reset to 0', () => {
    const ind = makeInd({ age: 14 * 365, mating_urge: 0.9, sex: 'male' });
    engine.updateMatingUrge(ind);
    expect(ind.mating_urge).toBe(0);
  });

  it('15-year-old can build mating_urge (not zeroed)', () => {
    const ind = makeInd({ age: 15 * 365 + 1, mating_urge: 0.5, sex: 'female',
      health: { hp: 1.0, calories: 1.0, hydration: 1.0, pregnancy: null } });
    engine.updateMatingUrge(ind);
    // At 15 the function returns without zeroing, and may increase urge
    expect(ind.mating_urge).toBeGreaterThan(0);
  });
});

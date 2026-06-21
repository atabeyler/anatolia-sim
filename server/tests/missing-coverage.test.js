/**
 * Tests for previously uncovered areas identified in the audit:
 *   1. IMMUNE_PRIMING methylation direction (BUG-01)
 *   2. learnFromTeacher + FOXP2 eşiği (BUG-15)
 *   3. activityEngine biome isim doğruluğu (BUG-13)
 *   4. checkTechEmergence prereq → known_techs, not discoveredTechs (BUG-02)
 *   5. beliefEngine — büyük nüfusta spatial spread performansı (BUG-17)
 *   6. processDisaster → worldState.alive_count güncelleniyor (BUG-12)
 *   7. workerPool — _serializeInd Set→Array dönüşümü ve terminate
 *   8. individual.generation kalıtımı (BUG-09)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// ── 1. IMMUNE_PRIMING — BUG-01 ───────────────────────────────────────────────

import { initializeEpigenome, updateEpigenome } from '../src/engines/epigenetics/epigeneticsEngine.js';

describe('BUG-01 — IMMUNE_PRIMING methylation (positive delta on infection)', () => {
  function makeInfected() {
    const ind = {
      id: uuidv4(),
      phenotype: { immune_strength: 0.5, aggression: 0.3, learning_rate: 0.5, oxytocin_sensitivity: 0.5 },
      psychology: { stress_level: 0.2 }, satiation: 0.8,
      infections: [{ pathogen_id: 'test-pathogen' }],
      epigenome: {},
    };
    initializeEpigenome(ind);
    return ind;
  }

  it('infected individual has IMMUNE_PRIMING methylation rise above initial value', () => {
    const ind = makeInfected();
    ind.epigenome.IMMUNE_PRIMING.methylation = 0.5;
    for (let d = 1; d <= 50; d++) updateEpigenome(ind, {}, d);
    expect(ind.epigenome.IMMUNE_PRIMING.methylation).toBeGreaterThan(0.5);
  });

  it('IMMUNE_PRIMING stays capped at 1.0 after many infected days', () => {
    const ind = makeInfected();
    for (let d = 1; d <= 1000; d++) updateEpigenome(ind, {}, d);
    expect(ind.epigenome.IMMUNE_PRIMING.methylation).toBeLessThanOrEqual(1.0);
  });

  it('uninfected individual does NOT gain IMMUNE_PRIMING methylation', () => {
    const ind = makeInfected();
    ind.infections = []; // clear infections
    ind.epigenome.IMMUNE_PRIMING.methylation = 0.5;
    for (let d = 1; d <= 50; d++) updateEpigenome(ind, {}, d);
    // no infection → methylation unchanged (only stress/nutrition/etc drive other loci)
    expect(ind.epigenome.IMMUNE_PRIMING.methylation).toBe(0.5);
  });
});

// ── 2. learnFromTeacher + FOXP2 eşiği — BUG-15 ──────────────────────────────

import { learnFromTeacher } from '../src/engines/language/languageEngine.js';

describe('BUG-15 — learnFromTeacher: FOXP2 < 0.25 blocks word acquisition', () => {
  function makeTeacher() {
    return {
      language: { stage: 3, foxp2_expression: 0.6, vocabulary: { fire: 'ba', water: 'mo', tree: 'ku' } },
      phenotype: { language_capacity: 0.8, fluid_intelligence: 0.8 },
    };
  }
  function makeLearner(foxp2) {
    return {
      phenotype: { language_capacity: 0.8, fluid_intelligence: 0.8 },
      language: { stage: 2, foxp2_expression: foxp2, vocabulary: {} },
    };
  }

  it('foxp2 < 0.25 → learner cannot acquire any words', () => {
    const learner = makeLearner(0.20);
    learnFromTeacher(learner, makeTeacher());
    expect(Object.keys(learner.language.vocabulary).length).toBe(0);
  });

  it('foxp2 = 0.24 (just below threshold) → blocked', () => {
    const learner = makeLearner(0.24);
    learnFromTeacher(learner, makeTeacher());
    expect(Object.keys(learner.language.vocabulary).length).toBe(0);
  });

  it('foxp2 = 0.25 (at threshold) → words can be acquired', () => {
    const learner = makeLearner(0.25);
    learnFromTeacher(learner, makeTeacher());
    expect(Object.keys(learner.language.vocabulary).length).toBeGreaterThan(0);
  });

  it('foxp2 = 0.60 (high expression) → acquires words normally', () => {
    const learner = makeLearner(0.60);
    learnFromTeacher(learner, makeTeacher());
    expect(Object.keys(learner.language.vocabulary).length).toBeGreaterThan(0);
  });

  it('no foxp2_expression field → falls back to capacity * 0.1 (likely < 0.25 for low caps)', () => {
    const learner = {
      phenotype: { language_capacity: 0.2, fluid_intelligence: 0.8 },
      language: { stage: 2, vocabulary: {} }, // no foxp2_expression
    };
    learnFromTeacher(learner, makeTeacher());
    // fallback = 0.2 * 0.1 = 0.02 < 0.25 → blocked
    expect(Object.keys(learner.language.vocabulary).length).toBe(0);
  });
});

// ── 3. activityEngine biome isim doğruluğu — BUG-13 ─────────────────────────

import { accumulateExperience } from '../src/engines/agent/activityEngine.js';

describe('BUG-13 — activityEngine biome name correctness', () => {
  function makeInd(action = 'forage') {
    return {
      phenotype: { fluid_intelligence: 0.7, curiosity: 0.7 },
      known_techs: new Set(), language: { stage: 0 },
      _currentAction: action, _experience: {},
    };
  }

  it("'tropical_rainforest' biome yields wood_friction gain on forage", () => {
    const ind = makeInd('forage');
    accumulateExperience(ind, { biome: 'tropical_rainforest', temperature: 28, season: 'summer', fauna: { prey_density: 0.3 }, water_abundance: 0.9 });
    expect(ind._experience.wood_friction ?? 0).toBeGreaterThan(0);
  });

  it("'tropical_savanna' biome yields plant_gathering gain on forage", () => {
    const ind = makeInd('forage');
    accumulateExperience(ind, { biome: 'tropical_savanna', temperature: 28, season: 'summer', fauna: { prey_density: 0.3 }, water_abundance: 0.5 });
    expect(ind._experience.plant_gathering ?? 0).toBeGreaterThan(0);
  });

  it("OLD name 'tropical' does NOT yield wood_friction (biome name bug was fixed)", () => {
    const ind = makeInd('forage');
    accumulateExperience(ind, { biome: 'tropical', temperature: 28, season: 'summer', fauna: { prey_density: 0.3 }, water_abundance: 0.9 });
    // 'tropical' is not in the valid biome list → no wood_friction
    expect(ind._experience.wood_friction ?? 0).toBe(0);
  });

  it("OLD name 'savanna' does NOT yield plant_gathering (biome name bug was fixed)", () => {
    const ind = makeInd('forage');
    accumulateExperience(ind, { biome: 'savanna', temperature: 28, season: 'summer', fauna: { prey_density: 0.3 }, water_abundance: 0.5 });
    expect(ind._experience.plant_gathering ?? 0).toBe(0);
  });
});

// ── 4. checkTechEmergence prereq — BUG-02 ────────────────────────────────────

import { checkTechEmergence } from '../src/engines/agent/activityEngine.js';

describe('BUG-02 (cardinal rule) — checkTechEmergence prereq uses known_techs', () => {
  it('prereq in discoveredTechs but NOT in known_techs → tech blocked', () => {
    const ind = {
      phenotype: { fluid_intelligence: 0.9, curiosity: 0.9 },
      known_techs: new Set(), // stone_tools NOT personally known
      language: { stage: 0 }, _experience: { hunting_practice: 9999, wood_friction: 9999 },
    };
    const discovered = new Set(['stone_tools']); // globally discovered but not by this individual
    const emerged = checkTechEmergence(ind, discovered);
    expect(emerged).not.toContain('hunting_spear');
  });

  it('prereq in both discoveredTechs AND known_techs → tech emerges', () => {
    const ind = {
      phenotype: { fluid_intelligence: 0.9, curiosity: 0.9 },
      known_techs: new Set(['stone_tools']),
      language: { stage: 0 }, _experience: { hunting_practice: 9999, wood_friction: 9999 },
    };
    const emerged = checkTechEmergence(ind, new Set(['stone_tools']));
    expect(emerged).toContain('hunting_spear');
  });

  it('prereq in known_techs but NOT in discoveredTechs → tech still emerges (individual knowledge is what matters)', () => {
    const ind = {
      phenotype: { fluid_intelligence: 0.9, curiosity: 0.9 },
      known_techs: new Set(['stone_tools']),
      language: { stage: 0 }, _experience: { hunting_practice: 9999, wood_friction: 9999 },
    };
    const emerged = checkTechEmergence(ind, new Set()); // discoveredTechs empty
    expect(emerged).toContain('hunting_spear');
  });
});

// ── 5. beliefEngine büyük nüfusta spatial spread — BUG-17 ───────────────────

import { updateBeliefSpread } from '../src/engines/belief/beliefEngine.js';

describe('BUG-17 — beliefEngine.updateBeliefSpread (large population performance)', () => {
  function makePop(n, withBelief = 0) {
    return Array.from({ length: n }, (_, i) => ({
      id: `ind_${i}`,
      phenotype: { religiosity: 0.9, anxiety: 0.8, curiosity: 0.8 },
      beliefs: new Set(i < withBelief ? ['ancestor_spirits'] : []),
      _beliefExposure: {},
      x: i * 0.1, y: 0,
      group_id: 'g1',
    }));
  }

  it('spread runs in under 200ms for 500 individuals and 1 belief', () => {
    const pop = makePop(500, 10);
    // Pre-load exposure so spread fires for many individuals
    pop.forEach(ind => { if (!ind.beliefs.has('ancestor_spirits')) ind._beliefExposure['ancestor_spirits'] = 999; });
    const groups = [{ id: 'g1', member_ids: pop.map(i => i.id), internal_tension: 0.3 }];
    const start = Date.now();
    updateBeliefSpread(pop, new Set(['ancestor_spirits']), groups, 100);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('group member finds group via indGroupMap cache, not groups.find().includes()', () => {
    const pop = makePop(10, 3);
    pop.forEach(ind => { ind._beliefExposure['ancestor_spirits'] = 999; });
    const groups = [{ id: 'g1', member_ids: pop.map(i => i.id), internal_tension: 0.5 }];
    const events = updateBeliefSpread(pop, new Set(['ancestor_spirits']), groups, 1);
    // Several non-believers should have adopted the belief (exposure threshold pre-loaded)
    expect(events.some(e => e.type === 'belief_spread')).toBe(true);
    // group_id is correctly set from cache
    events.forEach(e => expect(e.group_id).toBe('g1'));
  });
});

// ── 6. processDisaster → worldState.alive_count — BUG-12 ─────────────────────

import { SimulationEngine } from '../src/engines/simulationLoop.js';

function makeSim(overrides = {}) {
  return {
    id: uuidv4(), current_day: 0,
    world_state: {
      biome: 'mediterranean', season: 'summer', temperature: 22,
      water_abundance: 0.4, natural_disaster: null, current_weather: 'clear',
      longitude: 32, latitude: 38,
    },
    ...overrides,
  };
}

function makeIndividual(overrides = {}) {
  return {
    id: uuidv4(),
    is_dead: false, alive: true, sex: 'male',
    age: 30 * 365, birth_day: -30 * 365,
    x: 30, y: 38, group_id: null,
    phenotype: { fluid_intelligence: 0.7, curiosity: 0.7, physical_strength: 0.7 },
    language: { stage: 0, foxp2_expression: 0.3, vocabulary: {} },
    health: { hp: 1.0, calories: 0.8, hydration: 0.8, injuries: [] },
    mind: {}, social: { relationships: {}, reputation: 0.5, children_ids: [], has_mate: false },
    memory: { social: [], events: [], knowledge: [] },
    skills: [], beliefs: new Set(), known_techs: new Set(),
    inventory: {}, epigenome: {}, psychology: { stress_level: 0.2 },
    infections: [], generation: 0,
    ...overrides,
  };
}

describe('BUG-12 — processDisaster updates worldState.alive_count after each death', () => {
  let engine;
  beforeEach(() => {
    engine = new SimulationEngine(makeSim());
    engine._pool?.terminate();
    engine._pool = null;
    engine._newDeadThisTick = [];
  });
  afterEach(() => { engine.destroy?.(); });

  it('alive_count decrements when processDisaster kills individuals (mortality_factor=1.0)', () => {
    const pop = Array.from({ length: 5 }, () => makeIndividual());
    pop.forEach(ind => { engine.population.set(ind.id, ind); engine._aliveIds.add(ind.id); });
    engine.worldState.alive_count = 5;

    // Force all to die
    engine.processDisaster({ type: 'wildfire', mortality_factor: 1.0 }, pop, 0);

    const survivors = pop.filter(i => !i.is_dead).length;
    expect(engine.worldState.alive_count).toBe(survivors);
  });

  it('alive_count is not modified when no one dies (mortality_factor=0)', () => {
    const pop = Array.from({ length: 4 }, () => makeIndividual());
    pop.forEach(ind => { engine.population.set(ind.id, ind); engine._aliveIds.add(ind.id); });
    engine.worldState.alive_count = 4;

    engine.processDisaster({ type: 'wildfire', mortality_factor: 0 }, pop, 0);

    expect(engine.worldState.alive_count).toBe(4);
  });
});

// ── 7. workerPool — _serializeInd ve terminate ────────────────────────────────

import { WorkerPool } from '../src/engines/workerPool.mjs';

describe('WorkerPool — _serializeInd (Set→Array serialization)', () => {
  let pool;
  beforeEach(() => {
    pool = new WorkerPool();
  });
  afterEach(() => {
    pool.terminate();
  });

  it('converts Set beliefs to plain array', () => {
    const ind = { beliefs: new Set(['fire', 'water']), known_techs: new Set(['stone_tools']), x: 0, y: 0 };
    const s = pool._serializeInd(ind);
    expect(Array.isArray(s.beliefs)).toBe(true);
    expect(s.beliefs).toContain('fire');
    expect(s.beliefs).toContain('water');
  });

  it('converts Set known_techs to plain array', () => {
    const ind = { beliefs: new Set(), known_techs: new Set(['fire_making', 'fishing']), x: 0, y: 0 };
    const s = pool._serializeInd(ind);
    expect(Array.isArray(s.known_techs)).toBe(true);
    expect(s.known_techs).toContain('fire_making');
  });

  it('caches Set→Array conversion when Sets have not changed', () => {
    const ind = { beliefs: new Set(['a', 'b']), known_techs: new Set(), x: 0, y: 0 };
    const s1 = pool._serializeInd(ind);
    const s2 = pool._serializeInd(ind);
    expect(s1.beliefs).toBe(s2.beliefs); // same array reference → cached
  });

  it('invalidates cache when Set grows', () => {
    const ind = { beliefs: new Set(['a']), known_techs: new Set(), x: 0, y: 0 };
    const s1 = pool._serializeInd(ind);
    ind.beliefs.add('b'); // Set grew
    const s2 = pool._serializeInd(ind);
    expect(s2.beliefs.length).toBe(2);
    expect(s1.beliefs).not.toBe(s2.beliefs); // new array, not the cached one
  });
});

describe('WorkerPool — terminate', () => {
  it('terminate clears all workers and sets pool to empty', () => {
    const pool = new WorkerPool();
    expect(pool._workers.length).toBeGreaterThan(0);
    pool.terminate();
    expect(pool._workers.length).toBe(0);
  });
});

// ── 8. individual.generation kalıtımı — BUG-09 ───────────────────────────────

import { createFounder, createChild } from '../src/engines/biology/individual.js';
import { initializeEpigenome as epiInit } from '../src/engines/epigenetics/epigeneticsEngine.js';

describe('BUG-09 — generation field inheritance', () => {
  function makeFounder(x = 0, y = 0) {
    const f = createFounder({ x, y, ageYears: 25 });
    if (!f.epigenome || Object.keys(f.epigenome).length === 0) epiInit(f);
    return f;
  }

  it('founder has generation = 0', () => {
    const f = makeFounder();
    expect(f.generation).toBe(0);
  });

  it('first-generation child has generation = 1', () => {
    const f1 = makeFounder(0, 0);
    const f2 = makeFounder(0.01, 0.01);
    const child = createChild(f1, f2, 0, 'sim1');
    expect(child.generation).toBe(1);
  });

  it('grandchild has generation = 2', () => {
    const f1 = makeFounder(0, 0);
    const f2 = makeFounder(0.01, 0.01);
    const child1 = createChild(f1, f2, 0, 'sim1');
    child1.x = 0.005; child1.y = 0.005;
    if (!child1.epigenome || Object.keys(child1.epigenome).length === 0) epiInit(child1);
    const child2 = createChild(f1, f2, 0, 'sim1');
    child2.x = 0.005; child2.y = 0.005;
    if (!child2.epigenome || Object.keys(child2.epigenome).length === 0) epiInit(child2);
    const grandchild = createChild(child1, child2, 1, 'sim1');
    expect(grandchild.generation).toBe(2);
  });

  it('generation = max(parent1, parent2) + 1 for mixed-generation parents', () => {
    const f1 = makeFounder(0, 0);  // generation 0
    const f2 = makeFounder(0.01, 0.01); // generation 0
    const child = createChild(f1, f2, 0, 'sim1'); // generation 1
    child.x = 0.005; child.y = 0.005;
    if (!child.epigenome || Object.keys(child.epigenome).length === 0) epiInit(child);
    // Child (gen 1) mates with founder (gen 0) → offspring should be gen 2
    const offspring = createChild(child, f1, 2, 'sim1');
    expect(offspring.generation).toBe(2); // max(1, 0) + 1 = 2
  });
});

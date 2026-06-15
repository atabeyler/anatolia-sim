import { describe, it, expect } from 'vitest';
import {
  initializePsychology,
  updateMentalState,
  processBonding,
  computePopulationPsychStats,
} from '../src/engines/psychology/psychologyEngine.js';

function makeInd(overrides = {}) {
  return {
    id: 'ind1',
    phenotype: {
      fluid_intelligence: 0.6,
      anxiety: 0.3,
      curiosity: 0.5,
      social_drive: 0.5,
      oxytocin_sensitivity: 0.6,
      serotonin: 0.5,
    },
    satiation: 0.7,
    group_id: 'g1',
    language: { stage: 2 },
    mind: { consciousness: 0.1 },
    _socialObservations: 0,
    ...overrides,
  };
}

// ── initializePsychology ────────────────────────────────────────────────────

describe('initializePsychology', () => {
  it('initializes all fields', () => {
    const ind = makeInd();
    initializePsychology(ind);
    expect(ind.psychology).toBeDefined();
    expect(ind.psychology.stress_level).toBeDefined();
    expect(ind.psychology.wellbeing).toBeDefined();
    expect(ind.psychology.theory_of_mind).toBe(0);
    expect(ind.psychology.trauma_events).toEqual([]);
  });

  it('high oxytocin_sensitivity (>0.65) → secure attachment', () => {
    const ind = makeInd({ phenotype: { ...makeInd().phenotype, oxytocin_sensitivity: 0.8, anxiety: 0.2 } });
    initializePsychology(ind);
    expect(ind.psychology.attachment_style).toBe('secure');
  });

  it('low oxytocin_sensitivity (<0.35) → avoidant attachment', () => {
    const ind = makeInd({ phenotype: { ...makeInd().phenotype, oxytocin_sensitivity: 0.2, anxiety: 0.3 } });
    initializePsychology(ind);
    expect(ind.psychology.attachment_style).toBe('avoidant');
  });

  it('medium oxytocin + high anxiety → anxious attachment', () => {
    const ind = makeInd({ phenotype: { ...makeInd().phenotype, oxytocin_sensitivity: 0.5, anxiety: 0.7 } });
    initializePsychology(ind);
    expect(ind.psychology.attachment_style).toBe('anxious');
  });
});

// ── updateMentalState ───────────────────────────────────────────────────────

describe('updateMentalState — basic dynamics', () => {
  it('stress decreases by 5% each tick (natural recovery)', () => {
    const ind = makeInd();
    initializePsychology(ind);
    ind.psychology.stress_level = 0.8;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.stress_level).toBeCloseTo(0.8 * 0.95, 5);
  });

  it('satiation < 0.3 → stress increases, wellbeing decreases', () => {
    const ind = makeInd({ satiation: 0.1 });
    initializePsychology(ind);
    const beforeStress = ind.psychology.stress_level;
    const beforeWell = ind.psychology.wellbeing;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.stress_level).toBeGreaterThan(beforeStress);
    expect(ind.psychology.wellbeing).toBeLessThan(beforeWell);
  });

  it('satiation > 0.8 → wellbeing increases', () => {
    const ind = makeInd({ satiation: 0.9 });
    initializePsychology(ind);
    ind.psychology.wellbeing = 0.5;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.wellbeing).toBeGreaterThan(0.5);
  });

  it('social isolation (group_id null) → stress increases', () => {
    const inGroup = makeInd({ group_id: 'g1' });
    const alone   = makeInd({ group_id: null });
    initializePsychology(inGroup);
    initializePsychology(alone);
    inGroup.psychology.stress_level = 0.2;
    alone.psychology.stress_level   = 0.2;
    updateMentalState(inGroup, [], {}, 1);
    updateMentalState(alone,   [], {}, 1);
    expect(alone.psychology.stress_level).toBeGreaterThan(inGroup.psychology.stress_level);
  });

  it('recent_disaster → stress +0.3, added to trauma_events list', () => {
    const ind = makeInd();
    initializePsychology(ind);
    ind.psychology.stress_level = 0.2;
    updateMentalState(ind, [], { recent_disaster: 'flood' }, 10);
    expect(ind.psychology.stress_level).toBeGreaterThan(0.2);
    expect(ind.psychology.trauma_events.some(e => e.type === 'flood')).toBe(true);
  });

  it('stress > 0.7 → mental_state "anxious"', () => {
    const ind = makeInd();
    initializePsychology(ind);
    ind.psychology.stress_level = 0.9;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.mental_state).toBe('anxious');
  });

  it('wellbeing < 0.2 → mental_state "depressed"', () => {
    const ind = makeInd();
    initializePsychology(ind);
    ind.psychology.stress_level = 0.3;
    ind.psychology.wellbeing = 0.1;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.mental_state).toBe('depressed');
  });

  it('wellbeing > 0.8 and stress < 0.2 → mental_state "excited"', () => {
    const ind = makeInd();
    initializePsychology(ind);
    ind.psychology.stress_level = 0.1;
    ind.psychology.wellbeing = 0.95;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.mental_state).toBe('excited');
  });
});

describe('updateMentalState — events', () => {
  it('birth event → wellbeing increases', () => {
    const ind = makeInd({ id: 'ind1' });
    initializePsychology(ind);
    const before = ind.psychology.wellbeing;
    updateMentalState(ind, [{ type: 'birth', individual_id: 'ind1' }], {}, 1);
    expect(ind.psychology.wellbeing).toBeGreaterThan(before);
  });

  it('death_of_kin event → stress increases, trauma_events grows', () => {
    const ind = makeInd({ id: 'ind1' });
    initializePsychology(ind);
    const before = ind.psychology.stress_level;
    updateMentalState(ind, [{ type: 'death_of_kin', individual_id: 'ind1' }], {}, 1);
    expect(ind.psychology.stress_level).toBeGreaterThan(before);
    expect(ind.psychology.trauma_events.length).toBeGreaterThan(0);
  });

  it('exile event → stress increases significantly (≥0.5 added)', () => {
    const ind = makeInd({ id: 'ind1' });
    initializePsychology(ind);
    ind.psychology.stress_level = 0.1;
    updateMentalState(ind, [{ type: 'exile', individual_id: 'ind1' }], {}, 1);
    // 0.1 * 0.95 + 0.5 ≈ 0.595
    expect(ind.psychology.stress_level).toBeGreaterThan(0.5);
  });

  it('trauma_events does not exceed limit of 50', () => {
    const ind = makeInd({ id: 'ind1' });
    initializePsychology(ind);
    for (let d = 0; d < 60; d++) {
      updateMentalState(ind, [], { recent_disaster: 'flood' }, d);
    }
    expect(ind.psychology.trauma_events.length).toBeLessThanOrEqual(50);
  });
});

describe('updateMentalState — Theory of Mind', () => {
  it('accumulates observations within group (_socialObservations increases)', () => {
    const ind = makeInd({ group_id: 'g1', _socialObservations: 0 });
    initializePsychology(ind);
    updateMentalState(ind, [], {}, 1);
    expect(ind._socialObservations).toBe(1);
  });

  it('observations do not accumulate outside of a group', () => {
    const ind = makeInd({ group_id: null, _socialObservations: 0 });
    initializePsychology(ind);
    updateMentalState(ind, [], {}, 1);
    expect(ind._socialObservations).toBe(0);
  });

  it('sufficient observations + language stage ≥ 1 + IQ > 0.3 → ToM stage 1', () => {
    const ind = makeInd({
      group_id: 'g1',
      language: { stage: 2 },
      mind: { consciousness: 0.05 },
      _socialObservations: 9999,
      phenotype: {
        fluid_intelligence: 0.8,
        anxiety: 0.3,
        curiosity: 0.5,
        social_drive: 0.5,
        oxytocin_sensitivity: 0.6,
        serotonin: 0.5,
        empathy: 0.8,
      },
    });
    initializePsychology(ind);
    ind.psychology.theory_of_mind = 0;
    updateMentalState(ind, [], {}, 1);
    expect(ind.psychology.theory_of_mind).toBeGreaterThanOrEqual(1);
  });
});

// ── processBonding ──────────────────────────────────────────────────────────

describe('processBonding', () => {
  it('mating interaction → relationship strength increases for both parties', () => {
    const a = makeInd({ id: 'a' });
    const b = makeInd({ id: 'b' });
    initializePsychology(a);
    initializePsychology(b);
    processBonding(a, b, 'mating');
    expect(a.psychology.relationships['b']).toBeGreaterThan(0);
    expect(b.psychology.relationships['a']).toBeGreaterThan(0);
  });

  it('conflict interaction → relationship strength decreases', () => {
    const a = makeInd({ id: 'a' });
    const b = makeInd({ id: 'b' });
    initializePsychology(a);
    initializePsychology(b);
    processBonding(a, b, 'conflict');
    expect(a.psychology.relationships['b']).toBeLessThan(0);
  });

  it('mating interaction forms a stronger bond than cooperation interaction', () => {
    const a1 = makeInd({ id: 'a1' }), b1 = makeInd({ id: 'b1' });
    const a2 = makeInd({ id: 'a2' }), b2 = makeInd({ id: 'b2' });
    initializePsychology(a1); initializePsychology(b1);
    initializePsychology(a2); initializePsychology(b2);
    processBonding(a1, b1, 'mating');
    processBonding(a2, b2, 'cooperation');
    expect(a1.psychology.relationships['b1']).toBeGreaterThan(a2.psychology.relationships['b2']);
  });

  it('relationship value stays within [-1, 1] range', () => {
    const a = makeInd({ id: 'a' }), b = makeInd({ id: 'b' });
    initializePsychology(a); initializePsychology(b);
    for (let i = 0; i < 100; i++) processBonding(a, b, 'mating');
    expect(a.psychology.relationships['b']).toBeLessThanOrEqual(1);
    expect(a.psychology.relationships['b']).toBeGreaterThanOrEqual(-1);
  });

  it('auto-initializes when psychology is missing and does not throw', () => {
    const a = makeInd({ id: 'a' }), b = makeInd({ id: 'b' });
    expect(() => processBonding(a, b, 'play')).not.toThrow();
    expect(a.psychology).toBeDefined();
  });
});

// ── computePopulationPsychStats ─────────────────────────────────────────────

describe('computePopulationPsychStats', () => {
  it('empty population → zero statistics', () => {
    const stats = computePopulationPsychStats([]);
    expect(stats.happiness_index).toBe(0);
  });

  it('dead individuals are not included', () => {
    const dead = makeInd({ id: 'dead' });
    dead.is_dead = true;
    initializePsychology(dead);
    dead.psychology.wellbeing = 0.0;
    const alive = makeInd({ id: 'alive' });
    initializePsychology(alive);
    alive.psychology.wellbeing = 1.0;
    const stats = computePopulationPsychStats([dead, alive]);
    expect(stats.mean_wellbeing).toBeCloseTo(1.0, 5);
  });

  it('Gini > 0.30 lowers happiness index', () => {
    const pop = [makeInd({ id: 'a' }), makeInd({ id: 'b' })];
    pop.forEach(i => initializePsychology(i));
    const low  = computePopulationPsychStats(pop, 0.10);
    const high = computePopulationPsychStats(pop, 0.60);
    expect(high.happiness_index).toBeLessThan(low.happiness_index);
  });

  it('happiness_index stays within [0, 1] range', () => {
    const pop = [makeInd({ id: 'a' })];
    initializePsychology(pop[0]);
    pop[0].psychology.stress_level = 1.0;
    pop[0].psychology.wellbeing = 0.0;
    const stats = computePopulationPsychStats(pop, 0.9);
    expect(stats.happiness_index).toBeGreaterThanOrEqual(0);
    expect(stats.happiness_index).toBeLessThanOrEqual(1);
  });
});

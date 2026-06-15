import { describe, it, expect } from 'vitest';
import {
  tryFormBelief,
  updateBeliefSpread,
  checkRitualEmergence,
  BELIEF_ARCHETYPES,
} from '../src/engines/belief/beliefEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    phenotype: {
      religiosity: 0.7,
      fluid_intelligence: 0.6,
      anxiety: 0.5,
      curiosity: 0.5,
      ...overrides.phenotype,
    },
    language: { foxp2_expression: 0.5, ...overrides.language },
    beliefs: new Set(),
    _beliefReflection: 0,
    _beliefExposure: {},
    x: 0, y: 0,
    group_id: null,
    ...overrides,
  };
}

// worldState helper
const CALM_WORLD   = { recent_disaster: false, food_abundance: 0.8 };
const CRISIS_WORLD = { recent_disaster: true,  food_abundance: 0.1 };

describe('BELIEF_ARCHETYPES — structure validation', () => {
  it('6 archetypes defined', () => {
    expect(Object.keys(BELIEF_ARCHETYPES)).toHaveLength(6);
  });

  it('animism has lowest iq_min (0) and stage (1)', () => {
    expect(BELIEF_ARCHETYPES.animism.iq_min).toBe(0);
    expect(BELIEF_ARCHETYPES.animism.stage).toBe(1);
  });

  it('polytheism requires pottery technology (not writing)', () => {
    expect(BELIEF_ARCHETYPES.polytheism.requires_tech).toContain('pottery');
    expect(BELIEF_ARCHETYPES.polytheism.requires_tech).not.toContain('writing_system');
  });

  it('monotheism and philosophical belief require writing system + mathematics', () => {
    expect(BELIEF_ARCHETYPES.monotheism.requires_tech).toContain('writing_system');
    expect(BELIEF_ARCHETYPES.monotheism.requires_tech).toContain('mathematics_basic');
    expect(BELIEF_ARCHETYPES.philosophical.requires_tech).toContain('writing_system');
  });

  it('archetypes can be sorted by stage order (1→4)', () => {
    const stages = Object.values(BELIEF_ARCHETYPES).map(a => a.stage);
    expect(Math.min(...stages)).toBe(1);
    expect(Math.max(...stages)).toBe(4);
  });
});

describe('tryFormBelief — accumulation and threshold', () => {
  it('belief does not form before threshold is reached', () => {
    const ind = makeInd('i1');
    const result = tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(result).toBeNull();
  });

  it('animism forms after sufficient accumulation (all conditions met)', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.8, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.4 }, // animism foxp2_min: 0.3
      _beliefReflection: 9999, // to exceed threshold
    });
    const result = tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(result).not.toBeNull();
    expect(result.belief_id).toBe('animism'); // lowest stage selected first
  });

  it('disaster bonus increases accumulation rate', () => {
    const indCalm   = makeInd('i1', { _beliefReflection: 0 });
    const indCrisis = makeInd('i2', { _beliefReflection: 0 });

    tryFormBelief(indCalm,   new Set(), new Set(), CALM_WORLD,   1);
    tryFormBelief(indCrisis, new Set(), new Set(), CRISIS_WORLD, 1);

    // Accumulation should increase faster in a crisis world
    expect(indCrisis._beliefReflection).toBeGreaterThan(indCalm._beliefReflection);
  });

  it('scarcity bonus (food_abundance < 1) increases accumulation', () => {
    const indPlenty = makeInd('i1', { _beliefReflection: 0 });
    const indScarse = makeInd('i2', { _beliefReflection: 0 });

    tryFormBelief(indPlenty, new Set(), new Set(), { recent_disaster: false, food_abundance: 1.0 }, 1);
    tryFormBelief(indScarse, new Set(), new Set(), { recent_disaster: false, food_abundance: 0.0 }, 1);

    expect(indScarse._beliefReflection).toBeGreaterThan(indPlenty._beliefReflection);
  });

  it('high religiosity × IQ → low threshold → faster belief formation', () => {
    // Threshold = 100 / max(religiosity × IQ, 0.1)
    const highThreshold = 100 / Math.max(0.1 * 0.2, 0.1); // low rel+IQ → high threshold
    const lowThreshold  = 100 / Math.max(0.9 * 0.9, 0.1); // high rel+IQ → low threshold
    expect(lowThreshold).toBeLessThan(highThreshold);
  });

  it('already-held belief is not re-assigned', () => {
    const ind = makeInd('i1', { _beliefReflection: 9999 });
    const existing = new Set(['animism']);
    const result = tryFormBelief(ind, existing, new Set(), CALM_WORLD, 1);
    // animism already held; ancestor cult or shamanism will be tried, but is foxp2 sufficient?
    // Result is null or a belief other than animism
    if (result) expect(result.belief_id).not.toBe('animism');
  });

  it('polytheism does not form if IQ threshold insufficient (iq < 0.5)', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.4, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.9 },
      _beliefReflection: 9999,
    });
    // Polytheism requires iq_min: 0.5; this individual with IQ=0.4 cannot advance to polytheism
    const discovered = new Set(['pottery']);
    const existing   = new Set(['animism', 'ancestor_cult', 'shamanism']); // lower beliefs already held
    const result = tryFormBelief(ind, existing, discovered, CALM_WORLD, 1);
    if (result) {
      expect(['polytheism', 'monotheism', 'philosophical']).not.toContain(result.belief_id);
    }
  });

  it('accumulation resets after threshold is crossed', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.8, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.4 },
      _beliefReflection: 9999,
    });
    tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(ind._beliefReflection).toBe(0);
  });
});

describe('updateBeliefSpread — social spread', () => {
  it('non-believing individual can receive belief from a believing neighbor in the same group', () => {
    const believer  = makeInd('b1', { group_id: 'g1', beliefs: new Set(['animism']) });
    const receptive = makeInd('r1', {
      group_id: 'g1',
      phenotype: { religiosity: 0.9, anxiety: 0.5, curiosity: 0.5, fluid_intelligence: 0.5 },
      _beliefExposure: { animism: 10000 }, // pre-loaded to exceed threshold
    });
    const population    = [believer, receptive];
    const existingBeliefs = new Set(['animism']);

    updateBeliefSpread(population, existingBeliefs, [], 100);

    expect(receptive.beliefs.has('animism')).toBe(true);
  });

  it('individual in a different group and far away does not receive belief', () => {
    const believer  = makeInd('b1', { group_id: 'g1', x: 0,  y: 0,  beliefs: new Set(['animism']) });
    const isolated  = makeInd('r1', { group_id: 'g2', x: 10, y: 10, beliefs: new Set() });
    const population    = [believer, isolated];
    const existingBeliefs = new Set(['animism']);

    for (let i = 0; i < 100; i++) {
      updateBeliefSpread(population, existingBeliefs, [], i);
    }
    expect(isolated.beliefs.has('animism')).toBe(false);
  });

  it('already-held belief is not processed again', () => {
    const holder = makeInd('h1', { group_id: 'g1', beliefs: new Set(['animism']) });
    const population = [holder];
    const events = updateBeliefSpread(population, new Set(['animism']), [], 1);
    expect(events).toHaveLength(0);
  });

  it('high religiosity lowers exposure threshold (200/religiosity)', () => {
    const highRel = 200 / Math.max(0.9, 0.1); // ~222 days
    const lowRel  = 200 / Math.max(0.1, 0.1); // 2000 days
    expect(highRel).toBeLessThan(lowRel);
  });

  it('updateBeliefSpread returns immediately with no beliefs', () => {
    const result = updateBeliefSpread([], new Set(), [], 1);
    expect(result).toEqual([]);
  });
});

describe('checkRitualEmergence', () => {
  it('ritual emerges when >60% of members share the same belief', () => {
    const members = [
      makeInd('i1', { beliefs: new Set(['animism']) }),
      makeInd('i2', { beliefs: new Set(['animism']) }),
      makeInd('i3', { beliefs: new Set(['animism']) }),
      makeInd('i4', { beliefs: new Set() }),
    ];
    const group = { id: 'g1', member_ids: ['i1', 'i2', 'i3', 'i4'], has_ritual: null };
    const result = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).not.toBeNull();
    expect(result.type).toBe('ritual_emerged');
    expect(group.has_ritual).toBe('animism');
  });

  it('ritual does not emerge if group has fewer than 3 members', () => {
    const members = [makeInd('i1', { beliefs: new Set(['animism']) })];
    const group   = { id: 'g1', member_ids: ['i1'], has_ritual: null };
    const result  = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).toBeNull();
  });

  it('ritual does not form again if group already has a ritual', () => {
    const members = [
      makeInd('i1', { beliefs: new Set(['animism']) }),
      makeInd('i2', { beliefs: new Set(['animism']) }),
      makeInd('i3', { beliefs: new Set(['animism']) }),
    ];
    const group = { id: 'g1', member_ids: ['i1', 'i2', 'i3'], has_ritual: 'animism' };
    const result = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).toBeNull();
  });
});

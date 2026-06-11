import { describe, it, expect } from 'vitest';
import { updateConsciousness } from '../src/engines/consciousness/consciousnessEngine.js';

function makeInd(overrides = {}) {
  return {
    mind: { consciousness: 0 },
    phenotype: { consciousness_potential: 0.8 },
    language: { stage: 0 },
    psychology: { stress_level: 0.3, theory_of_mind: 0 },
    group_id: null,
    ...overrides,
  };
}

describe('updateConsciousness', () => {
  it('increases consciousness each tick', () => {
    const ind = makeInd();
    updateConsciousness(ind);
    expect(ind.mind.consciousness).toBeGreaterThan(0);
  });

  it('never exceeds genetic ceiling (potential × 1.2)', () => {
    const potential = 0.5;
    const ceiling = potential * 1.2;
    const ind = makeInd({ phenotype: { consciousness_potential: potential }, mind: { consciousness: ceiling - 0.001 } });
    for (let i = 0; i < 10000; i++) updateConsciousness(ind);
    expect(ind.mind.consciousness).toBeLessThanOrEqual(ceiling + 1e-9);
  });

  it('never goes negative under maximum stress', () => {
    const ind = makeInd({
      phenotype: { consciousness_potential: 0 },
      psychology: { stress_level: 1, theory_of_mind: 0 },
      mind: { consciousness: 0 },
    });
    for (let i = 0; i < 1000; i++) updateConsciousness(ind);
    expect(ind.mind.consciousness).toBeGreaterThanOrEqual(0);
  });

  it('higher language stage = faster growth', () => {
    const base = makeInd({ mind: { consciousness: 0 } });
    const withLang = makeInd({ language: { stage: 6 }, mind: { consciousness: 0 } });
    updateConsciousness(base);
    updateConsciousness(withLang);
    expect(withLang.mind.consciousness).toBeGreaterThan(base.mind.consciousness);
  });

  it('group membership adds social bonus', () => {
    const alone = makeInd({ mind: { consciousness: 0 } });
    const inGroup = makeInd({ group_id: 'g1', mind: { consciousness: 0 } });
    updateConsciousness(alone);
    updateConsciousness(inGroup);
    expect(inGroup.mind.consciousness).toBeGreaterThan(alone.mind.consciousness);
  });

  it('no-op when ind.mind is falsy', () => {
    const ind = { mind: null };
    expect(() => updateConsciousness(ind)).not.toThrow();
  });
});

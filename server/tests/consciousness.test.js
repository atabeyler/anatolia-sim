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

  it('ağır yaralanma (hp < 0.3) bilinç büyümesini yavaşlatır (injury penalty)', () => {
    const healthy  = makeInd({ health: { hp: 1.0 }, mind: { consciousness: 0.1 } });
    const injured  = makeInd({ health: { hp: 0.1 }, mind: { consciousness: 0.1 } });
    updateConsciousness(healthy);
    updateConsciousness(injured);
    expect(healthy.mind.consciousness).toBeGreaterThan(injured.mind.consciousness);
  });

  it('theory_of_mind bonusu bilinci daha hızlı artırır', () => {
    const noToM   = makeInd({ psychology: { stress_level: 0.3, theory_of_mind: 0 }, mind: { consciousness: 0 } });
    const withToM = makeInd({ psychology: { stress_level: 0.3, theory_of_mind: 3 }, mind: { consciousness: 0 } });
    updateConsciousness(noToM);
    updateConsciousness(withToM);
    expect(withToM.mind.consciousness).toBeGreaterThan(noToM.mind.consciousness);
  });

  it('potential > 0.83 olduğunda tavan min(1, potential × 1.2) = 1.0 ile sınırlanır', () => {
    const potential = 0.9; // potential × 1.2 = 1.08 > 1 → tavan = 1.0
    const ind = makeInd({
      phenotype: { consciousness_potential: potential },
      mind: { consciousness: 0.99 },
      language: { stage: 6 },
      group_id: 'g1',
      psychology: { stress_level: 0, theory_of_mind: 3 },
    });
    for (let i = 0; i < 50000; i++) updateConsciousness(ind);
    expect(ind.mind.consciousness).toBeLessThanOrEqual(1.0 + 1e-9);
  });

  it('yaralanma yokken bilinç ağır stres altında bile negatife düşmez', () => {
    const ind = makeInd({
      phenotype: { consciousness_potential: 0.5 },
      psychology: { stress_level: 1.0, theory_of_mind: 0 },
      health: { hp: 1.0 },
      mind: { consciousness: 0.001 },
    });
    for (let i = 0; i < 1000; i++) updateConsciousness(ind);
    expect(ind.mind.consciousness).toBeGreaterThanOrEqual(0);
  });
});

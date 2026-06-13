import { describe, it, expect } from 'vitest';
import { computeInbreedingCoefficient } from '../src/engines/biology/genome.js';

// Wright's path coefficient method:
//   full siblings → F = 0.25
//   half siblings → F = 0.125
//   first cousins → F = 0.0625
//   unrelated    → F = 0

function makeInd(id, p1 = null, p2 = null, inbreedCoeff = 0) {
  return { id, parent_1_id: p1, parent_2_id: p2, inbreeding_coeff: inbreedCoeff };
}

describe('computeInbreedingCoefficient', () => {
  it('unrelated founders → F = 0', () => {
    const pop = new Map();
    const gf = makeInd('gf'); const gm = makeInd('gm');
    const child = makeInd('c', 'gf', 'gm');
    pop.set('gf', gf); pop.set('gm', gm); pop.set('c', child);
    expect(computeInbreedingCoefficient(child, pop)).toBe(0);
  });

  it('no parents → F = 0', () => {
    const pop = new Map();
    const ind = makeInd('x');
    pop.set('x', ind);
    expect(computeInbreedingCoefficient(ind, pop)).toBe(0);
  });

  it('full siblings mating → offspring F ≈ 0.25', () => {
    // grandparents → parents (siblings) → child
    const pop = new Map();
    const gf = makeInd('gf'); const gm = makeInd('gm');
    const sib1 = makeInd('s1', 'gf', 'gm');
    const sib2 = makeInd('s2', 'gf', 'gm');
    const child = makeInd('c', 's1', 's2');
    [gf, gm, sib1, sib2, child].forEach(i => pop.set(i.id, i));
    const F = computeInbreedingCoefficient(child, pop);
    expect(F).toBeCloseTo(0.25, 2);
  });

  it('half siblings mating → offspring F ≈ 0.125', () => {
    // shared father, different mothers
    const pop = new Map();
    const father = makeInd('f');
    const m1 = makeInd('m1'); const m2 = makeInd('m2');
    const hs1 = makeInd('hs1', 'f', 'm1');
    const hs2 = makeInd('hs2', 'f', 'm2');
    const child = makeInd('c', 'hs1', 'hs2');
    [father, m1, m2, hs1, hs2, child].forEach(i => pop.set(i.id, i));
    const F = computeInbreedingCoefficient(child, pop);
    expect(F).toBeCloseTo(0.125, 2);
  });

  it('first cousins mating → offspring F ≈ 0.0625', () => {
    const pop = new Map();
    const gg = makeInd('gg'); const gm = makeInd('gm');
    const p1 = makeInd('p1', 'gg', 'gm'); const p2 = makeInd('p2', 'gg', 'gm');
    const m1 = makeInd('m1'); const m2 = makeInd('m2');
    const cousin1 = makeInd('c1', 'p1', 'm1');
    const cousin2 = makeInd('c2', 'p2', 'm2');
    const child = makeInd('child', 'c1', 'c2');
    [gg, gm, p1, p2, m1, m2, cousin1, cousin2, child].forEach(i => pop.set(i.id, i));
    const F = computeInbreedingCoefficient(child, pop);
    expect(F).toBeCloseTo(0.0625, 2);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createGenome, createGamete, combineGametes, computePhenotype, LOCI,
  computeInbreedingCoefficient
} from '../src/engines/biology/genome.js';

describe('createGenome', () => {
  it('contains all LOCI', () => {
    const genome = createGenome();
    for (const locusId of Object.keys(LOCI)) {
      expect(genome[locusId]).toBeDefined();
      expect(genome[locusId].allele1.value).toBeGreaterThanOrEqual(0);
      expect(genome[locusId].allele1.value).toBeLessThanOrEqual(1);
    }
  });

  it('applies overrides', () => {
    const genome = createGenome({ FOXP2_01: { a1: 0.9, a2: 0.85 } });
    expect(genome.FOXP2_01.allele1.value).toBe(0.9);
    expect(genome.FOXP2_01.allele2.value).toBe(0.85);
  });
});

describe('createGamete', () => {
  it('produces one numeric allele per locus', () => {
    const genome = createGenome();
    const gamete = createGamete(genome);
    for (const locusId of Object.keys(LOCI)) {
      expect(typeof gamete[locusId]).toBe('number');
      expect(gamete[locusId]).toBeGreaterThanOrEqual(0);
      expect(gamete[locusId]).toBeLessThanOrEqual(1);
    }
  });

  it('mutasyon oranı: 10000 gametde beklenen ~2 mutasyon/gamet (±%50 tolerans)', () => {
    // Tüm alellar 0.5 — herhangi bir sapma gerçek mutasyondur (crossing-over etkisi sıfır)
    const overrides = {};
    for (const locusId of Object.keys(LOCI)) {
      overrides[locusId] = { a1: 0.5, a2: 0.5 };
    }

    const TRIALS = 10000;
    let totalMutations = 0;
    for (let t = 0; t < TRIALS; t++) {
      const genome = createGenome(overrides);
      const gamete = createGamete(genome);
      for (const locusId of Object.keys(LOCI)) {
        if (Math.abs(gamete[locusId] - 0.5) > 1e-9) totalMutations++;
      }
    }

    const avgPerGamete = totalMutations / TRIALS;
    // Hedef: ~2 mutasyon/gamet (2/32 × 32 = 2 beklenen)
    expect(avgPerGamete).toBeGreaterThan(0.8);
    expect(avgPerGamete).toBeLessThan(4.0);
  });

  it('stres çarpanı mutasyon olasılığını artırır', () => {
    // Tüm aleller 0.5 — sapma = gerçek mutasyon
    const overrides = {};
    for (const locusId of Object.keys(LOCI)) {
      overrides[locusId] = { a1: 0.5, a2: 0.5 };
    }

    const TRIALS = 5000;
    let normalMuts = 0;
    let stressMuts = 0;
    for (let t = 0; t < TRIALS; t++) {
      const g = createGenome(overrides);
      const gNormal = createGamete(createGenome(overrides), 1.0);
      const gStress = createGamete(createGenome(overrides), 3.0);
      for (const locusId of Object.keys(LOCI)) {
        if (Math.abs(gNormal[locusId] - 0.5) > 1e-9) normalMuts++;
        if (Math.abs(gStress[locusId] - 0.5) > 1e-9) stressMuts++;
      }
    }
    expect(stressMuts).toBeGreaterThan(normalMuts);
  });
});

describe('combineGametes', () => {
  it('produces a complete child genome', () => {
    const gamete1 = createGamete(createGenome());
    const gamete2 = createGamete(createGenome());
    const child = combineGametes(gamete1, gamete2, 'female');
    for (const locusId of Object.keys(LOCI)) {
      expect(child[locusId]).toBeDefined();
    }
  });

  it('X-linked loci are hemizygous for males', () => {
    const gamete1 = createGamete(createGenome());
    const gamete2 = createGamete(createGenome());
    const male = combineGametes(gamete1, gamete2, 'male');
    expect(male.MAOA_01.expressionType).toBe('hemizygous');
  });

  it('X-linked loci are NOT hemizygous for females', () => {
    const gamete1 = createGamete(createGenome());
    const gamete2 = createGamete(createGenome());
    const female = combineGametes(gamete1, gamete2, 'female');
    expect(female.MAOA_01.expressionType).not.toBe('hemizygous');
  });
});

describe('computePhenotype', () => {
  it('returns all expected traits', () => {
    const phenotype = computePhenotype(createGenome());
    expect(phenotype.fluid_intelligence).toBeGreaterThanOrEqual(0);
    expect(phenotype.consciousness_potential).toBeGreaterThanOrEqual(0);
    expect(phenotype.consciousness_potential).toBeLessThanOrEqual(1);
    expect(phenotype.max_lifespan).toBeGreaterThan(50);
    expect(phenotype.language_capacity).toBeGreaterThanOrEqual(0);
  });

  it('high FOXP2 alleles yield high language_capacity', () => {
    const genome = createGenome({ FOXP2_01: { a1: 0.99, a2: 0.99 } });
    const phenotype = computePhenotype(genome);
    expect(phenotype.language_capacity).toBeGreaterThan(0.7);
  });

  it('belief_capacity derived from consciousness_potential', () => {
    const genome = createGenome({ NRXN1_01: { a1: 0.99, a2: 0.99 }, SHANK3_01: { a1: 0.99, a2: 0.99 }, RELN_01: { a1: 0.99, a2: 0.99 }, FOXP2_01: { a1: 0.99, a2: 0.99 } });
    const phenotype = computePhenotype(genome);
    expect(phenotype.belief_capacity).toBeGreaterThan(0);
  });
});

// Minimal individual factory for pedigree tests — no genome needed, only id/parent links.
function mkInd(id, p1 = null, p2 = null) {
  return { id, parent_1_id: p1, parent_2_id: p2, inbreeding_coeff: 0 };
}

describe('computeInbreedingCoefficient', () => {
  // Wright's path coefficient method:
  //   F = Σ_A (0.5)^(L1+L2+1) × (1+F_A)
  // Verified targets: full siblings→0.25, half siblings→0.125, first cousins→0.0625

  it('F(full siblings) = 0.25', () => {
    const gp1 = mkInd('gp1');
    const gp2 = mkInd('gp2');
    const sib1 = mkInd('sib1', 'gp1', 'gp2');
    const sib2 = mkInd('sib2', 'gp1', 'gp2');
    const child = mkInd('child', 'sib1', 'sib2');
    const pop = new Map([gp1, gp2, sib1, sib2, child].map(i => [i.id, i]));
    expect(computeInbreedingCoefficient(child, pop)).toBeCloseTo(0.25, 10);
  });

  it('F(half siblings) = 0.125', () => {
    const gp1 = mkInd('gp1');
    const gp2 = mkInd('gp2');
    const gp3 = mkInd('gp3');
    // parent1 and parent2 share only gp1
    const parent1 = mkInd('parent1', 'gp1', 'gp2');
    const parent2 = mkInd('parent2', 'gp1', 'gp3');
    const child = mkInd('child', 'parent1', 'parent2');
    const pop = new Map([gp1, gp2, gp3, parent1, parent2, child].map(i => [i.id, i]));
    expect(computeInbreedingCoefficient(child, pop)).toBeCloseTo(0.125, 10);
  });

  it('F(first cousins) = 0.0625', () => {
    const gp1 = mkInd('gp1');
    const gp2 = mkInd('gp2');
    const gp3 = mkInd('gp3'); // mate of sib1
    const gp4 = mkInd('gp4'); // mate of sib2
    // sib1 and sib2 are full siblings — share both gp1 and gp2
    const sib1 = mkInd('sib1', 'gp1', 'gp2');
    const sib2 = mkInd('sib2', 'gp1', 'gp2');
    // cousins are children of those siblings
    const cousin1 = mkInd('cousin1', 'sib1', 'gp3');
    const cousin2 = mkInd('cousin2', 'sib2', 'gp4');
    const child = mkInd('child', 'cousin1', 'cousin2');
    const pop = new Map([gp1, gp2, gp3, gp4, sib1, sib2, cousin1, cousin2, child].map(i => [i.id, i]));
    expect(computeInbreedingCoefficient(child, pop)).toBeCloseTo(0.0625, 10);
  });
});

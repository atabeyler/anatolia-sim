import { describe, it, expect } from 'vitest';
import {
  createGenome, createGamete, combineGametes, computePhenotype, LOCI
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

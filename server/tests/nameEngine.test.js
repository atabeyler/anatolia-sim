import { describe, it, expect } from 'vitest';
import { buildPhonology, derivePhonologySeed, generateName } from '../src/engines/language/nameEngine.js';

// ── buildPhonology ──────────────────────────────────────────────────────────

describe('buildPhonology', () => {
  it('returned object contains consonants, vowels, clanSuffix', () => {
    const p = buildPhonology(42, 'mediterranean');
    expect(p).toHaveProperty('consonants');
    expect(p).toHaveProperty('vowels');
    expect(p).toHaveProperty('clanSuffix');
  });

  it('same seed + biome → deterministic result', () => {
    const p1 = buildPhonology(1234, 'coastal');
    const p2 = buildPhonology(1234, 'coastal');
    expect(p1.consonants).toEqual(p2.consonants);
    expect(p1.vowels).toEqual(p2.vowels);
    expect(p1.clanSuffix).toEqual(p2.clanSuffix);
  });

  it('different seed → different phonology (at least one differs)', () => {
    const p1 = buildPhonology(1, 'mediterranean');
    const p2 = buildPhonology(5000, 'mediterranean');
    const same =
      JSON.stringify(p1.consonants) === JSON.stringify(p2.consonants) &&
      JSON.stringify(p1.vowels)     === JSON.stringify(p2.vowels);
    expect(same).toBe(false);
  });

  it('consonants array contains at least 4 unique phonemes', () => {
    const p = buildPhonology(999, 'grassland');
    expect(p.consonants.length).toBeGreaterThanOrEqual(4);
    expect(new Set(p.consonants).size).toBe(p.consonants.length); // unique
  });

  it('vowels array contains at least 3 elements', () => {
    const p = buildPhonology(0, 'desert');
    expect(p.vowels.length).toBeGreaterThanOrEqual(3);
  });

  it('clanSuffix array contains exactly 3 elements', () => {
    const p = buildPhonology(777, 'mountain');
    expect(p.clanSuffix.length).toBe(3);
  });

  it('clanSuffix elements are ≥2 characters long (consonant+vowel)', () => {
    const p = buildPhonology(321, 'tundra');
    for (const s of p.clanSuffix) {
      expect(s.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('unknown biome does not throw (default 0 bias)', () => {
    expect(() => buildPhonology(42, 'unknown_biome')).not.toThrow();
  });

  it('negative seed does not throw (absolute value is taken)', () => {
    expect(() => buildPhonology(-500, 'coastal')).not.toThrow();
    const p = buildPhonology(-500, 'coastal');
    expect(p.consonants.length).toBeGreaterThan(0);
  });

  it('works for all supported biomes', () => {
    const biomes = [
      'mediterranean', 'coastal', 'tropical_rainforest', 'tropical_savanna',
      'temperate_forest', 'boreal_forest', 'tundra', 'mountain', 'grassland', 'desert',
    ];
    for (const biome of biomes) {
      expect(() => buildPhonology(42, biome)).not.toThrow();
    }
  });
});

// ── derivePhonologySeed ─────────────────────────────────────────────────────

describe('derivePhonologySeed', () => {
  it('same coordinates → same seed', () => {
    expect(derivePhonologySeed(37.0, 35.0)).toBe(derivePhonologySeed(37.0, 35.0));
  });

  it('different coordinates → different seed', () => {
    const s1 = derivePhonologySeed(37.0, 35.0);
    const s2 = derivePhonologySeed(40.0, 29.0);
    expect(s1).not.toBe(s2);
  });

  it('result is within [0, 9999] range', () => {
    const seed = derivePhonologySeed(36.5, 34.0);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(9999);
  });

  it('returns valid seed for negative coordinates', () => {
    const seed = derivePhonologySeed(-33.9, -70.7); // Santiago
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(9999);
  });
});

// ── generateName ────────────────────────────────────────────────────────────

describe('generateName — stage 0-2 (single syllable)', () => {
  it('stage 0 → returns a non-null single syllable string', () => {
    const p = buildPhonology(42, 'mediterranean');
    const name = generateName(p, 0);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('stage 1 → single syllable (consonant+vowel typical length ≤4)', () => {
    const p = buildPhonology(1, 'coastal');
    const name = generateName(p, 1);
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(5); // single syllable, including long consonant cluster
  });

  it('stage 2 → first letter is uppercase', () => {
    const p = buildPhonology(100, 'mediterranean');
    for (let i = 0; i < 20; i++) {
      const name = generateName(p, 2);
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });

  it('stage 2 → only valid sounds used across thousands of generations', () => {
    const p = buildPhonology(555, 'grassland');
    const allSounds = new Set([...p.consonants, ...p.vowels]);

    for (let i = 0; i < 200; i++) {
      const name = generateName(p, 2).toLowerCase();
      // Name should contain only characters from the phonology set
      for (const ch of name) {
        const inSounds = [...allSounds].some(s => s.includes(ch));
        expect(inSounds).toBe(true);
      }
    }
  });
});

describe('generateName — stage 3 (two syllables)', () => {
  it('stage 3 → same length or longer than stage 2 names', () => {
    const p = buildPhonology(42, 'mediterranean');
    const s2 = generateName(p, 2);
    const s3 = generateName(p, 3);
    expect(s3.length).toBeGreaterThanOrEqual(s2.length);
  });

  it('stage 3 → does not contain hyphen (-) (no clan suffix)', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      expect(generateName(p, 3)).not.toContain('-');
    }
  });

  it('stage 3 → first letter is uppercase', () => {
    const p = buildPhonology(200, 'temperate_forest');
    for (let i = 0; i < 20; i++) {
      const name = generateName(p, 3);
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });
});

describe('generateName — stage 4+ (personal name + clan)', () => {
  it('stage 4 → contains hyphen (-)', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      expect(generateName(p, 4)).toContain('-');
    }
  });

  it('stage 4 → clan suffix first letter is uppercase', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      const name = generateName(p, 4);
      const parts = name.split('-');
      expect(parts.length).toBe(2);
      expect(parts[1][0]).toBe(parts[1][0].toUpperCase());
    }
  });

  it('stage 4 clan suffix comes from buildPhonology clanSuffix list (uppercase normalized)', () => {
    const p = buildPhonology(42, 'mediterranean');
    const suffixNorm = p.clanSuffix.map(s => s.charAt(0).toUpperCase() + s.slice(1));

    let misses = 0;
    for (let i = 0; i < 50; i++) {
      const name = generateName(p, 4);
      const clan = name.split('-')[1];
      if (!suffixNorm.includes(clan)) misses++;
    }
    expect(misses).toBe(0);
  });

  it('stage 5 → clan suffix still present (stage 4+ uniform behavior)', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 20; i++) {
      expect(generateName(p, 5)).toContain('-');
      expect(generateName(p, 6)).toContain('-');
    }
  });
});

describe('generateName — non-deterministic variety', () => {
  it('at least 3 different names in 100 generations (stage 4)', () => {
    const p = buildPhonology(42, 'mediterranean');
    const names = new Set();
    for (let i = 0; i < 100; i++) names.add(generateName(p, 4));
    expect(names.size).toBeGreaterThanOrEqual(3);
  });

  it('at least 2 different names in 100 generations (stage 2)', () => {
    const p = buildPhonology(1, 'desert');
    const names = new Set();
    for (let i = 0; i < 100; i++) names.add(generateName(p, 2));
    expect(names.size).toBeGreaterThanOrEqual(2);
  });
});

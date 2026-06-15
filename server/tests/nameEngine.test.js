import { describe, it, expect } from 'vitest';
import { buildPhonology, derivePhonologySeed, generateName } from '../src/engines/language/nameEngine.js';

// ── buildPhonology ──────────────────────────────────────────────────────────

describe('buildPhonology', () => {
  it('döndürülen obje consonants, vowels, clanSuffix içerir', () => {
    const p = buildPhonology(42, 'mediterranean');
    expect(p).toHaveProperty('consonants');
    expect(p).toHaveProperty('vowels');
    expect(p).toHaveProperty('clanSuffix');
  });

  it('aynı seed + biome → deterministik sonuç', () => {
    const p1 = buildPhonology(1234, 'coastal');
    const p2 = buildPhonology(1234, 'coastal');
    expect(p1.consonants).toEqual(p2.consonants);
    expect(p1.vowels).toEqual(p2.vowels);
    expect(p1.clanSuffix).toEqual(p2.clanSuffix);
  });

  it('farklı seed → farklı fonoloji (en az biri farklı)', () => {
    const p1 = buildPhonology(1, 'mediterranean');
    const p2 = buildPhonology(5000, 'mediterranean');
    const same =
      JSON.stringify(p1.consonants) === JSON.stringify(p2.consonants) &&
      JSON.stringify(p1.vowels)     === JSON.stringify(p2.vowels);
    expect(same).toBe(false);
  });

  it('consonants dizisi en az 4 benzersiz fonem içerir', () => {
    const p = buildPhonology(999, 'grassland');
    expect(p.consonants.length).toBeGreaterThanOrEqual(4);
    expect(new Set(p.consonants).size).toBe(p.consonants.length); // benzersiz
  });

  it('vowels dizisi en az 3 eleman içerir', () => {
    const p = buildPhonology(0, 'desert');
    expect(p.vowels.length).toBeGreaterThanOrEqual(3);
  });

  it('clanSuffix dizisi tam 3 eleman içerir', () => {
    const p = buildPhonology(777, 'mountain');
    expect(p.clanSuffix.length).toBe(3);
  });

  it('clanSuffix elemanları ≥2 karakter uzunluğundadır (consonant+vowel)', () => {
    const p = buildPhonology(321, 'tundra');
    for (const s of p.clanSuffix) {
      expect(s.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('bilinmeyen biome hata atmaz (varsayılan 0 bias)', () => {
    expect(() => buildPhonology(42, 'unknown_biome')).not.toThrow();
  });

  it('negatif seed mutlak değer alındığından hata atmaz', () => {
    expect(() => buildPhonology(-500, 'coastal')).not.toThrow();
    const p = buildPhonology(-500, 'coastal');
    expect(p.consonants.length).toBeGreaterThan(0);
  });

  it('tüm desteklenen biyomlar için çalışır', () => {
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
  it('aynı koordinatlar → aynı seed', () => {
    expect(derivePhonologySeed(37.0, 35.0)).toBe(derivePhonologySeed(37.0, 35.0));
  });

  it('farklı koordinatlar → farklı seed', () => {
    const s1 = derivePhonologySeed(37.0, 35.0);
    const s2 = derivePhonologySeed(40.0, 29.0);
    expect(s1).not.toBe(s2);
  });

  it('sonuç [0, 9999] aralığında', () => {
    const seed = derivePhonologySeed(36.5, 34.0);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(9999);
  });

  it('negatif koordinatlar için de geçerli seed döndürür', () => {
    const seed = derivePhonologySeed(-33.9, -70.7); // Santiago
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(9999);
  });
});

// ── generateName ────────────────────────────────────────────────────────────

describe('generateName — stage 0-2 (tek hece)', () => {
  it('stage 0 → null değil, tek hece string döndürür', () => {
    const p = buildPhonology(42, 'mediterranean');
    const name = generateName(p, 0);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('stage 1 → tek hece (consonant+vowel tipik uzunluğu ≤4)', () => {
    const p = buildPhonology(1, 'coastal');
    const name = generateName(p, 1);
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(5); // tek hece, uzun consonant cluster dahil
  });

  it('stage 2 → ilk harf büyük', () => {
    const p = buildPhonology(100, 'mediterranean');
    for (let i = 0; i < 20; i++) {
      const name = generateName(p, 2);
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });

  it('stage 2 → binlerce üretimde yalnızca geçerli sesler kullanılır', () => {
    const p = buildPhonology(555, 'grassland');
    const allSounds = new Set([...p.consonants, ...p.vowels]);

    for (let i = 0; i < 200; i++) {
      const name = generateName(p, 2).toLowerCase();
      // İsim yalnızca fonoloji seti elemanlarından oluşan karakterler içermeli
      for (const ch of name) {
        const inSounds = [...allSounds].some(s => s.includes(ch));
        expect(inSounds).toBe(true);
      }
    }
  });
});

describe('generateName — stage 3 (iki hece)', () => {
  it('stage 3 → stage 2 isimlerden uzun veya eşit uzunlukta', () => {
    const p = buildPhonology(42, 'mediterranean');
    const s2 = generateName(p, 2);
    const s3 = generateName(p, 3);
    expect(s3.length).toBeGreaterThanOrEqual(s2.length);
  });

  it('stage 3 → tire (-) içermez (klan eki yok)', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      expect(generateName(p, 3)).not.toContain('-');
    }
  });

  it('stage 3 → ilk harf büyük', () => {
    const p = buildPhonology(200, 'temperate_forest');
    for (let i = 0; i < 20; i++) {
      const name = generateName(p, 3);
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });
});

describe('generateName — stage 4+ (kişisel ad + klan)', () => {
  it('stage 4 → tire (-) içerir', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      expect(generateName(p, 4)).toContain('-');
    }
  });

  it('stage 4 → klan ekinin ilk harfi büyük', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 30; i++) {
      const name = generateName(p, 4);
      const parts = name.split('-');
      expect(parts.length).toBe(2);
      expect(parts[1][0]).toBe(parts[1][0].toUpperCase());
    }
  });

  it('stage 4 klan eki, buildPhonology clanSuffix listesinden gelir (büyük harf normalize)', () => {
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

  it('stage 5 → klan eki hâlâ mevcuttur (stage 4+ uniform davranış)', () => {
    const p = buildPhonology(42, 'mediterranean');
    for (let i = 0; i < 20; i++) {
      expect(generateName(p, 5)).toContain('-');
      expect(generateName(p, 6)).toContain('-');
    }
  });
});

describe('generateName — deterministik olmayan çeşitlilik', () => {
  it('100 üretimde en az 3 farklı isim çıkar (stage 4)', () => {
    const p = buildPhonology(42, 'mediterranean');
    const names = new Set();
    for (let i = 0; i < 100; i++) names.add(generateName(p, 4));
    expect(names.size).toBeGreaterThanOrEqual(3);
  });

  it('100 üretimde en az 2 farklı isim çıkar (stage 2)', () => {
    const p = buildPhonology(1, 'desert');
    const names = new Set();
    for (let i = 0; i < 100; i++) names.add(generateName(p, 2));
    expect(names.size).toBeGreaterThanOrEqual(2);
  });
});

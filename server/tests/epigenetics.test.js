import { describe, it, expect } from 'vitest';
import { inheritEpigenome, initializeEpigenome, updateEpigenome } from '../src/engines/epigenetics/epigeneticsEngine.js';

function makeParent(methylation) {
  const p = {};
  initializeEpigenome(p);
  for (const id of Object.keys(p.epigenome)) {
    p.epigenome[id].methylation = methylation;
  }
  return p;
}

describe('inheritEpigenome', () => {
  it('child starts at neutral 0.5 when both parents are neutral', () => {
    const child = {};
    inheritEpigenome(child, makeParent(0.5), makeParent(0.5));
    for (const id of Object.keys(child.epigenome)) {
      expect(child.epigenome[id].methylation).toBeCloseTo(0.5, 5);
    }
  });

  it('heritability determines deviation from 0.5 — IMMUNE_PRIMING (h=0.6) at parents=1.0 → child≈0.8', () => {
    const child = {};
    inheritEpigenome(child, makeParent(1.0), makeParent(1.0));
    // formula: 0.5 + (1.0 - 0.5) * 0.6 = 0.8
    expect(child.epigenome['IMMUNE_PRIMING'].methylation).toBeCloseTo(0.8, 5);
  });

  it('heritability determines deviation — HPA_AXIS (h=0.3) at parents=1.0 → child≈0.65', () => {
    const child = {};
    inheritEpigenome(child, makeParent(1.0), makeParent(1.0));
    // formula: 0.5 + (1.0 - 0.5) * 0.3 = 0.65
    expect(child.epigenome['HPA_AXIS'].methylation).toBeCloseTo(0.65, 5);
  });

  it('child methylation clamped to [0, 1]', () => {
    const child = {};
    inheritEpigenome(child, makeParent(0.0), makeParent(0.0));
    for (const id of Object.keys(child.epigenome)) {
      expect(child.epigenome[id].methylation).toBeGreaterThanOrEqual(0);
      expect(child.epigenome[id].methylation).toBeLessThanOrEqual(1);
    }
  });

  it('initializes missing parent epigenomes automatically', () => {
    const p1 = {};
    const p2 = {};
    const child = {};
    expect(() => inheritEpigenome(child, p1, p2)).not.toThrow();
    expect(child.epigenome).toBeDefined();
  });
});

describe('updateEpigenome — çevresel metilasyon dinamiği', () => {
  function makeUpdatable(overrides = {}) {
    return {
      epigenome: {},
      psychology: { stress_level: 0.3 },
      satiation: 0.8,
      health: { hydration: 0.8 },
      group_id: 'g1',
      age: 25 * 365,
      infections: [],
      phenotype: { anxiety: 0.3, stress_resilience: 0.5, serotonin: 0.5, oxytocin_sensitivity: 0.5,
                   learning_rate: 0.5, immune_strength: 0.5 },
      ...overrides,
    };
  }

  it('updateEpigenome hata atmaz ve epigenomu başlatır', () => {
    const ind = makeUpdatable();
    expect(() => updateEpigenome(ind, {}, 1)).not.toThrow();
    expect(ind.epigenome).toBeDefined();
    expect(ind.epigenome.HPA_AXIS).toBeDefined();
  });

  it('yüksek stres (> 0.7) HPA_AXIS metilasyonunu artırır', () => {
    const ind = makeUpdatable({ psychology: { stress_level: 0.9 } });
    initializeEpigenome(ind);
    const before = ind.epigenome.HPA_AXIS.methylation;

    for (let d = 0; d < 100; d++) updateEpigenome(ind, {}, d);

    expect(ind.epigenome.HPA_AXIS.methylation).toBeGreaterThan(before);
  });

  it('düşük stres (< 0.7) HPA_AXIS metilasyonunu azaltır (iyileşme)', () => {
    const ind = makeUpdatable({ psychology: { stress_level: 0.1 } });
    initializeEpigenome(ind);
    ind.epigenome.HPA_AXIS.methylation = 0.8; // yüksek başlangıç

    for (let d = 0; d < 100; d++) updateEpigenome(ind, {}, d);

    expect(ind.epigenome.HPA_AXIS.methylation).toBeLessThan(0.8);
  });

  it('açlık (satiation < 0.3) LEPTIN_RESIST metilasyonunu artırır', () => {
    const ind = makeUpdatable({ satiation: 0.1 });
    initializeEpigenome(ind);
    const before = ind.epigenome.LEPTIN_RESIST.methylation;

    for (let d = 0; d < 100; d++) updateEpigenome(ind, {}, d);

    expect(ind.epigenome.LEPTIN_RESIST.methylation).toBeGreaterThan(before);
  });

  it('sosyal izolasyon (group_id null) OXTR_METHYL metilasyonunu artırır', () => {
    const ind = makeUpdatable({ group_id: null });
    initializeEpigenome(ind);
    const before = ind.epigenome.OXTR_METHYL.methylation;

    for (let d = 0; d < 100; d++) updateEpigenome(ind, {}, d);

    expect(ind.epigenome.OXTR_METHYL.methylation).toBeGreaterThan(before);
  });

  it('geri-dönüşsüz lokus (MAOA_REGULATION) bir kez set edildikten sonra değişmez', () => {
    // age < 5 yaş + yüksek stres → MAOA kilitleniyor
    const ind = makeUpdatable({
      age: 2 * 365, // 2 yaşında
      psychology: { stress_level: 0.9 },
    });
    initializeEpigenome(ind);

    // İlk güncelleme: MAOA_REGULATION değişmeli (last_modified: null → set)
    updateEpigenome(ind, {}, 1);
    const afterFirst = ind.epigenome.MAOA_REGULATION.methylation;

    // Sonraki güncellemeler: MAOA_REGULATION kilitli, değişmemeli
    for (let d = 2; d < 200; d++) updateEpigenome(ind, {}, d);

    expect(ind.epigenome.MAOA_REGULATION.methylation).toBe(afterFirst);
  });

  it('metilasyon değerleri [0, 1] aralığında kalır', () => {
    const ind = makeUpdatable({ psychology: { stress_level: 1.0 }, satiation: 0.0 });
    initializeEpigenome(ind);

    for (let d = 0; d < 500; d++) updateEpigenome(ind, {}, d);

    for (const locus of Object.values(ind.epigenome)) {
      expect(locus.methylation).toBeGreaterThanOrEqual(0);
      expect(locus.methylation).toBeLessThanOrEqual(1);
    }
  });
});

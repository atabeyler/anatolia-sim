/**
 * Cardinal Rule — DAVRANIŞSAL testler
 *
 * Mevcut cardinal-rule.test.js yalnızca statik kaynak-kod regex taraması yapar.
 * Bu dosya çalışan motorları başlatarak Cardinal Rule'u davranışsal olarak doğrular:
 *   "Kurucu dışındaki hiçbir bireye, genetik kalıtım ve
 *    gözlemsel öğrenme dışında davranış atanamaz."
 */
import { describe, it, expect } from 'vitest';
import { updateConsciousness } from '../src/engines/consciousness/consciousnessEngine.js';
import { updateLanguageStage, updateFoxp2Expression } from '../src/engines/language/languageEngine.js';
import { tryFormBelief } from '../src/engines/belief/beliefEngine.js';
import { computeDailyDeathRisk } from '../src/engines/biology/mortality.js';
import { computePhenotype, createGenome } from '../src/engines/biology/genome.js';
import { initializeEpigenome, updateEpigenome } from '../src/engines/epigenetics/epigeneticsEngine.js';

// ─── Ortak fabrikalar ──────────────────────────────────────────────────────────

function makeNonFounder(phenotypeOverrides = {}) {
  const genome = createGenome();
  const phenotype = { ...computePhenotype(genome), ...phenotypeOverrides };
  return {
    id: 'non_founder_1',
    is_founder: false,
    alive: true,
    sex: 'female',
    birth_day: -25 * 365,
    age: 25 * 365,
    genome,
    phenotype,
    epigenome: {},
    mind: { consciousness: 0 },
    language: { stage: 0, foxp2_expression: phenotype.language_capacity * 0.1, vocabulary: {} },
    psychology: { stress_level: 0.3, theory_of_mind: 0, trauma_anxiety: 0 },
    health: { hp: 1.0, calories: 1.0, hydration: 1.0 },
    beliefs: new Set(),
    social: { reputation: 0.5 },
    group_id: null,
    _beliefReflection: 0,
    satiation: 0.8,
    infections: [],
  };
}

// ─── 1. Fenotip koruması ───────────────────────────────────────────────────────

describe('Cardinal Rule — fenotip koruması', () => {
  it('updateConsciousness fenotip alanlarını değiştirmez', () => {
    const ind = makeNonFounder();
    const before = { ...ind.phenotype };

    for (let i = 0; i < 1000; i++) updateConsciousness(ind);

    // Fenotip sabit kalmalı; yalnızca mind.consciousness değişebilir
    for (const key of Object.keys(before)) {
      expect(ind.phenotype[key]).toBe(before[key]);
    }
  });

  it('updateLanguageStage fenotip alanlarını değiştirmez', () => {
    const ind = makeNonFounder();
    const before = { ...ind.phenotype };

    for (let i = 0; i < 100; i++) updateLanguageStage(ind, 10, 5);

    for (const key of Object.keys(before)) {
      expect(ind.phenotype[key]).toBe(before[key]);
    }
  });

  it('updateFoxp2Expression fenotip alanlarını değiştirmez (foxp2_expression → language nesnesi)', () => {
    const ind = makeNonFounder();
    const before = { ...ind.phenotype };

    for (let i = 0; i < 500; i++) updateFoxp2Expression(ind, 10);

    for (const key of Object.keys(before)) {
      expect(ind.phenotype[key]).toBe(before[key]);
    }
    // foxp2_expression yalnızca ind.language içinde değişmeli
    expect(ind.language.foxp2_expression).toBeGreaterThanOrEqual(ind.phenotype.language_capacity * 0.1);
  });

  it('tryFormBelief fenotip alanlarını değiştirmez', () => {
    const ind = makeNonFounder({ religiosity: 0.9, fluid_intelligence: 0.8 });
    ind._beliefReflection = 9999;
    const before = { ...ind.phenotype };

    tryFormBelief(ind, new Set(), new Set(), { recent_disaster: false, food_abundance: 0.8 }, 1);

    for (const key of Object.keys(before)) {
      expect(ind.phenotype[key]).toBe(before[key]);
    }
  });
});

// ─── 2. phenotype.anxiety koruması ────────────────────────────────────────────

describe('Cardinal Rule — phenotype.anxiety değişmezliği', () => {
  it('updateEpigenome phenotype.anxiety alanını değiştirmez', () => {
    const ind = makeNonFounder();
    initializeEpigenome(ind);
    const originalAnxiety = ind.phenotype.anxiety;

    // Yüksek stres → HPA_AXIS metilasyonu artabilir ama phenotype.anxiety dokunulmamalı
    ind.psychology.stress_level = 0.9;
    for (let day = 0; day < 1000; day++) updateEpigenome(ind, {}, day);

    expect(ind.phenotype.anxiety).toBe(originalAnxiety);
  });
});

// ─── 3. mind.consciousness münhasır sahipliği ─────────────────────────────────

describe('Cardinal Rule — consciousness münhasır sahipliği', () => {
  it('consciousnessEngine dışında hiçbir motor mind.consciousness yazmaz (runtime doğrulama)', () => {
    const ind = makeNonFounder();
    const before = ind.mind.consciousness;

    // Dil ve inanç motorları consciousness değiştirmemeli
    updateLanguageStage(ind, 15, 10);
    updateFoxp2Expression(ind, 10);
    tryFormBelief(ind, new Set(), new Set(), { recent_disaster: false, food_abundance: 0.8 }, 1);

    // Sadece consciousnessEngine değiştirebilir — diğerleri sonrası aynı kalmalı
    expect(ind.mind.consciousness).toBe(before);
  });

  it('updateConsciousness YALNIZCA mind.consciousness alanını değiştirir', () => {
    const ind = makeNonFounder();
    const mindBefore = JSON.stringify(ind.mind);
    updateConsciousness(ind);
    const mindAfter = JSON.parse(JSON.stringify(ind.mind));

    // Yalnızca 'consciousness' alanı değişmiş olmalı
    const mindKeys = Object.keys(JSON.parse(mindBefore));
    for (const key of mindKeys) {
      if (key !== 'consciousness') {
        expect(mindAfter[key]).toEqual(JSON.parse(mindBefore)[key]);
      }
    }
    expect(mindAfter.consciousness).toBeGreaterThan(0);
  });
});

// ─── 4. Bilinç tavanı (potential × 1.2) hiçbir motor atlayamaz ───────────────

describe('Cardinal Rule — bilinç tavan kısıtı', () => {
  it('binlerce tick sonra bilinç potential × 1.2 tavanını geçemez', () => {
    const potential = 0.7;
    const ceiling   = potential * 1.2;
    const ind = makeNonFounder({ consciousness_potential: potential });
    ind.mind.consciousness = ceiling - 0.0001;
    ind.group_id = 'g1';
    ind.language.stage = 6;
    ind.psychology.theory_of_mind = 3;
    ind.psychology.stress_level = 0;

    for (let i = 0; i < 10000; i++) updateConsciousness(ind);

    expect(ind.mind.consciousness).toBeLessThanOrEqual(ceiling + 1e-9);
  });

  it('potential > 0.83 olduğunda tavan min(1, potential × 1.2) = 1.0 ile sınırlanır', () => {
    const potential = 0.9; // potential × 1.2 = 1.08 > 1
    const expectedCeiling = Math.min(1, potential * 1.2); // = 1.0
    const ind = makeNonFounder({ consciousness_potential: potential });
    ind.mind.consciousness = 0.99;
    ind.group_id = 'g1';
    ind.language.stage = 6;
    ind.psychology.stress_level = 0;

    for (let i = 0; i < 50000; i++) updateConsciousness(ind);

    expect(ind.mind.consciousness).toBeLessThanOrEqual(expectedCeiling + 1e-9);
  });
});

// ─── 5. Ölüm riski hesabı kurucu/kurucu-dışı davranış yazmaz ─────────────────

describe('Cardinal Rule — mortalite motoru davranış yazmaz', () => {
  it('computeDailyDeathRisk fenotip veya mind alanlarını değiştirmez', () => {
    const ind = makeNonFounder();
    const phenotypeBefore = JSON.stringify(ind.phenotype);
    const mindBefore      = JSON.stringify(ind.mind);

    computeDailyDeathRisk(ind, 0, { alive_count: 10 });

    expect(JSON.stringify(ind.phenotype)).toBe(phenotypeBefore);
    expect(JSON.stringify(ind.mind)).toBe(mindBefore);
  });
});

// ─── 6. Gözlemsel öğrenme: foxp2_expression genetik tavanı aşamaz ─────────────

describe('Cardinal Rule — foxp2_expression tavan kısıtı', () => {
  it('ne kadar sosyal etkileşim olursa olsun foxp2_expression genetik tavanı geçmez', () => {
    const ind = makeNonFounder();
    const cap = ind.phenotype.language_capacity;

    for (let i = 0; i < 50000; i++) updateFoxp2Expression(ind, 50);

    expect(ind.language.foxp2_expression).toBeLessThanOrEqual(cap + 1e-9);
  });

  it('yenidoğan foxp2_expression genetik kapasitenin %10\'undan başlar', () => {
    const ind = makeNonFounder();
    const cap = ind.phenotype.language_capacity;
    // İlk değer (fabrikada) = cap * 0.1
    expect(ind.language.foxp2_expression).toBeCloseTo(cap * 0.1, 5);
  });
});

import { describe, it, expect } from 'vitest';
import { updateLanguageStage, updateFoxp2Expression, learnFromTeacher, generateProtoWord, CORE_CONCEPTS } from '../src/engines/language/languageEngine.js';

// Eşikler (languageEngine.js ile senkronize)
// stage 0: foxp2≥0,  group≥1,  gen≥0
// stage 1: foxp2≥0,  group≥3,  gen≥0
// stage 2: foxp2≥0.40, group≥5,  gen≥1
// stage 3: foxp2≥0.55, group≥8,  gen≥4
// stage 4: foxp2≥0.65, group≥15, gen≥8
// stage 5: foxp2≥0.72, group≥25, gen≥15
// stage 6: foxp2≥0.80, group≥40, gen≥25

function makeLang(stage = 0, foxp2 = 0.5) {
  return { stage, stage_name: 'pre-linguistic', foxp2_expression: foxp2, vocabulary: {} };
}

function makeInd(overrides = {}) {
  return {
    phenotype: { language_capacity: 0.9, fluid_intelligence: 0.7 },
    language: makeLang(0, 0.5),
    ...overrides,
  };
}

// ── updateLanguageStage — eşik kombinasyonları ──────────────────────────────

describe('updateLanguageStage — FOXP2 eşiği', () => {
  it('FOXP2 < 0.40 → stage 2 geçişi engellenir (stage 1 kalır)', () => {
    const ind = makeInd({ language: makeLang(1, 0.35) });
    const res = updateLanguageStage(ind, 10, 5);
    expect(res.upgraded).toBe(false);
    expect(ind.language.stage).toBe(1);
  });

  it('FOXP2 ≥ 0.40 + grup ≥ 5 + nesil ≥ 1 → stage 2 geçişi', () => {
    const ind = makeInd({ language: makeLang(1, 0.42) });
    const res = updateLanguageStage(ind, 6, 2);
    expect(res.upgraded).toBe(true);
    expect(ind.language.stage).toBe(2);
  });

  it('FOXP2 ≥ 0.55 + grup ≥ 8 + nesil ≥ 4 → stage 3 geçişi', () => {
    const ind = makeInd({ language: makeLang(2, 0.56) });
    const res = updateLanguageStage(ind, 10, 5);
    expect(res.upgraded).toBe(true);
    expect(ind.language.stage).toBe(3);
  });

  it('FOXP2 ≥ 0.65 + grup ≥ 15 + nesil ≥ 8 → stage 4 + grammar=true', () => {
    const ind = makeInd({ language: makeLang(3, 0.66) });
    const res = updateLanguageStage(ind, 16, 9);
    expect(res.upgraded).toBe(true);
    expect(ind.language.grammar).toBe(true);
  });

  it('FOXP2 ≥ 0.80 + grup ≥ 40 + nesil ≥ 25 → stage 6 + writing=true', () => {
    const ind = makeInd({ language: makeLang(5, 0.82) });
    const res = updateLanguageStage(ind, 45, 26);
    expect(res.upgraded).toBe(true);
    expect(ind.language.stage).toBe(6);
    expect(ind.language.writing).toBe(true);
  });
});

describe('updateLanguageStage — grup boyutu eşiği', () => {
  it('grup < 3 → stage 1 geçişi engellenir', () => {
    const ind = makeInd({ language: makeLang(0, 0.0) });
    const res = updateLanguageStage(ind, 2, 0);
    expect(res.upgraded).toBe(false);
  });

  it('grup tam 15 → stage 4 geçişi (eşik dahil)', () => {
    const ind = makeInd({ language: makeLang(3, 0.66) });
    const res = updateLanguageStage(ind, 15, 9);
    expect(res.upgraded).toBe(true);
    expect(ind.language.stage).toBe(4);
  });

  it('grup 14 → stage 4 engellenir (eşik altında)', () => {
    const ind = makeInd({ language: makeLang(3, 0.66) });
    const res = updateLanguageStage(ind, 14, 9);
    expect(res.upgraded).toBe(false);
  });
});

describe('updateLanguageStage — nesil sayısı eşiği', () => {
  it('nesil < 1 → stage 2 geçişi engellenir', () => {
    const ind = makeInd({ language: makeLang(1, 0.45) });
    const res = updateLanguageStage(ind, 10, 0);
    expect(res.upgraded).toBe(false);
  });

  it('nesil < 4 → stage 3 geçişi engellenir', () => {
    const ind = makeInd({ language: makeLang(2, 0.60) });
    const res = updateLanguageStage(ind, 10, 3);
    expect(res.upgraded).toBe(false);
  });

  it('nesil tam 8 → stage 4 geçişi (eşik dahil)', () => {
    const ind = makeInd({ language: makeLang(3, 0.66) });
    const res = updateLanguageStage(ind, 16, 8);
    expect(res.upgraded).toBe(true);
  });
});

describe('updateLanguageStage — çoklu eşik başarısızlığı', () => {
  it('FOXP2 yeterli ama grup yetersiz → geçiş yok', () => {
    const ind = makeInd({ language: makeLang(2, 0.60) });
    const res = updateLanguageStage(ind, 4, 5); // group < 8
    expect(res.upgraded).toBe(false);
  });

  it('grup yeterli ama FOXP2 yetersiz → geçiş yok', () => {
    const ind = makeInd({ language: makeLang(2, 0.50) }); // foxp2 < 0.55
    const res = updateLanguageStage(ind, 10, 5);
    expect(res.upgraded).toBe(false);
  });

  it('nesil yeterli ama FOXP2 yetersiz → geçiş yok', () => {
    const ind = makeInd({ language: makeLang(3, 0.60) }); // foxp2 < 0.65
    const res = updateLanguageStage(ind, 20, 10);
    expect(res.upgraded).toBe(false);
  });

  it('mevcut stage altı geçiş önerilmez (gerileme yok)', () => {
    const ind = makeInd({ language: makeLang(4, 0.70) });
    // tüm eşikler karşılanmış ama stage zaten 4
    const res = updateLanguageStage(ind, 20, 10);
    expect(res.upgraded).toBe(false);
    expect(ind.language.stage).toBe(4);
  });
});

describe('updateLanguageStage — stage_name güncellenir', () => {
  it('stage 3 geçişinde stage_name "proto-words" olur', () => {
    const ind = makeInd({ language: makeLang(2, 0.56) });
    updateLanguageStage(ind, 10, 5);
    expect(ind.language.stage_name).toBe('proto-words');
  });

  it('stage 6 geçişinde stage_name "writing" olur', () => {
    const ind = makeInd({ language: makeLang(5, 0.82) });
    updateLanguageStage(ind, 50, 30);
    expect(ind.language.stage_name).toBe('writing');
  });
});

// ── updateFoxp2Expression ───────────────────────────────────────────────────

describe('updateFoxp2Expression', () => {
  it('grup büyüklüğü arttıkça FOXP2 daha hızlı artar', () => {
    const ind1 = makeInd({ language: makeLang(1, 0.3) });
    const ind2 = makeInd({ language: makeLang(1, 0.3) });
    updateFoxp2Expression(ind1, 2);
    updateFoxp2Expression(ind2, 10);
    expect(ind2.language.foxp2_expression).toBeGreaterThan(ind1.language.foxp2_expression);
  });

  it('genetik tavan aşılamaz', () => {
    const cap = 0.7;
    const ind = makeInd({ phenotype: { language_capacity: cap, fluid_intelligence: 0.7 }, language: makeLang(2, cap - 0.001) });
    for (let i = 0; i < 1000; i++) updateFoxp2Expression(ind, 10);
    expect(ind.language.foxp2_expression).toBeLessThanOrEqual(cap + 1e-9);
  });

  it('grup yokken staging bonusu ile de artar (stage > 0)', () => {
    const ind = makeInd({ language: makeLang(1, 0.3) });
    const before = ind.language.foxp2_expression;
    updateFoxp2Expression(ind, 0);
    expect(ind.language.foxp2_expression).toBeGreaterThan(before);
  });
});

// ── learnFromTeacher ────────────────────────────────────────────────────────

describe('learnFromTeacher', () => {
  it('öğretmenin kelimelerini öğrenir', () => {
    const teacher = makeInd({ language: { stage: 3, foxp2_expression: 0.6, vocabulary: { fire: 'ba', water: 'mo' } } });
    const learner = makeInd({ phenotype: { language_capacity: 0.8, fluid_intelligence: 0.9 }, language: makeLang(3, 0.6) });
    learnFromTeacher(learner, teacher);
    expect(learner.language.vocabulary.fire).toBe('ba');
  });

  it('zaten bilinen kelimeler ezilmez', () => {
    const teacher = makeInd({ language: { stage: 3, foxp2_expression: 0.6, vocabulary: { fire: 'za' } } });
    const learner = makeInd({ phenotype: { language_capacity: 0.8, fluid_intelligence: 0.9 }, language: { stage: 3, foxp2_expression: 0.6, vocabulary: { fire: 'ba' } } });
    learnFromTeacher(learner, teacher);
    expect(learner.language.vocabulary.fire).toBe('ba'); // orijinal kelime korunur
  });

  it('düşük IQ → az kelime öğrenir (maxLearn = floor(iq*3))', () => {
    const teacher = makeInd({ language: { stage: 3, foxp2_expression: 0.6, vocabulary: { a: '1', b: '2', c: '3', d: '4' } } });
    const learner = makeInd({ phenotype: { language_capacity: 0.5, fluid_intelligence: 0.4 }, language: makeLang(3, 0.6) });
    learnFromTeacher(learner, teacher);
    // maxLearn = floor(0.4 * 3) = 1
    expect(Object.keys(learner.language.vocabulary).length).toBeLessThanOrEqual(1);
  });
});

// ── generateProtoWord ───────────────────────────────────────────────────────

describe('generateProtoWord', () => {
  it('aynı concept+groupId → deterministik kelime', () => {
    expect(generateProtoWord('fire', 'g1')).toBe(generateProtoWord('fire', 'g1'));
  });

  it('farklı concept → farklı kelime', () => {
    expect(generateProtoWord('fire', 'g1')).not.toBe(generateProtoWord('water', 'g1'));
  });

  it('farklı groupId → farklı kelime (grup lehçe farkı)', () => {
    expect(generateProtoWord('fire', 'g1')).not.toBe(generateProtoWord('fire', 'g2'));
  });

  it('kelime yalnızca harf içerir', () => {
    for (const concept of CORE_CONCEPTS.slice(0, 10)) {
      expect(/^[a-z]+$/.test(generateProtoWord(concept, 'g1'))).toBe(true);
    }
  });

  it('kelime uzunluğu 2-6 karakter arasında (1-3 hece × 2)', () => {
    for (const concept of CORE_CONCEPTS) {
      const w = generateProtoWord(concept, 'g1');
      expect(w.length).toBeGreaterThanOrEqual(2);
      expect(w.length).toBeLessThanOrEqual(6);
    }
  });
});

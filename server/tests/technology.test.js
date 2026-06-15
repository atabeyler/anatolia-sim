import { describe, it, expect } from 'vitest';
import { TECH_TREE, learnTechFromObservation } from '../src/engines/technology/technologyEngine.js';

// ── TECH_TREE yapısı ────────────────────────────────────────────────────────

describe('TECH_TREE — statik yapı', () => {
  it('tüm tier-0 teknolojilerin ön-koşulu yok', () => {
    const tier0 = Object.entries(TECH_TREE).filter(([, t]) => t.tier === 0);
    for (const [id, tech] of tier0) {
      expect(tech.requires).toEqual([]);
    }
  });

  it('hunting_spear → stone_tools gerektirir', () => {
    expect(TECH_TREE.hunting_spear.requires).toContain('stone_tools');
  });

  it('pottery → plant_cultivation ve fire_making gerektirir', () => {
    expect(TECH_TREE.pottery.requires).toContain('plant_cultivation');
    expect(TECH_TREE.pottery.requires).toContain('fire_making');
  });

  it('writing_system → pottery gerektirir ve language_stage_min 5', () => {
    expect(TECH_TREE.writing_system.requires).toContain('pottery');
    expect(TECH_TREE.writing_system.language_stage_min).toBe(5);
  });

  it('mathematics_basic → writing_system gerektirir (tier-3 zincir)', () => {
    expect(TECH_TREE.mathematics_basic.requires).toContain('writing_system');
  });

  it('tüm ön-koşullar TECH_TREE içinde tanımlıdır', () => {
    const allIds = new Set(Object.keys(TECH_TREE));
    for (const [id, tech] of Object.entries(TECH_TREE)) {
      for (const req of tech.requires) {
        expect(allIds.has(req), `${id} ön-koşul ${req} tanımlı değil`).toBe(true);
      }
    }
  });

  it('her teknolojinin difficulty > 0 ve iq_min [0,1] aralığında', () => {
    for (const [id, tech] of Object.entries(TECH_TREE)) {
      expect(tech.difficulty).toBeGreaterThan(0);
      expect(tech.iq_min).toBeGreaterThanOrEqual(0);
      expect(tech.iq_min).toBeLessThanOrEqual(1);
    }
  });
});

// ── learnTechFromObservation ────────────────────────────────────────────────

function makeInd(overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    phenotype: { fluid_intelligence: 0.9, curiosity: 1.0 },
    known_techs: new Set(),
    ...overrides,
  };
}

describe('learnTechFromObservation — temel öğrenme', () => {
  it('yakında bilen biri varsa IQ yeterli ise teknolojiyi öğrenir (100 denemede)', () => {
    const learner = makeInd({ phenotype: { fluid_intelligence: 0.9, curiosity: 1.0 } });
    learner.known_techs = new Set();
    const teacher = makeInd();
    teacher.known_techs = new Set(['foraging']);

    // rate = (1.0 × 0.9) / (0.3 × 2000) = 0.0015/gün → P(≥1 in 3000) ≈ 98.9%
    let learned = false;
    for (let i = 0; i < 3000; i++) {
      learnTechFromObservation(learner, [teacher], new Set(['foraging']));
      if (learner.known_techs.has('foraging')) { learned = true; break; }
    }
    expect(learned).toBe(true);
  });

  it('IQ yetersizse teknolojiyi öğrenemez', () => {
    // metallurgy_copper iq_min=0.6; learner IQ=0.3
    const learner = makeInd({ phenotype: { fluid_intelligence: 0.3, curiosity: 1.0 } });
    learner.known_techs = new Set(['fire_making', 'stone_tools']);
    const teacher = makeInd();
    teacher.known_techs = new Set(['metallurgy_copper']);

    for (let i = 0; i < 500; i++) {
      learnTechFromObservation(learner, [teacher], new Set(['metallurgy_copper']));
    }
    expect(learner.known_techs.has('metallurgy_copper')).toBe(false);
  });

  it('ön-koşul eksikse teknolojiyi öğrenemez', () => {
    // hunting_spear → stone_tools gerektirir; learner stone_tools bilmiyor
    const learner = makeInd({ phenotype: { fluid_intelligence: 0.9, curiosity: 1.0 } });
    learner.known_techs = new Set(); // stone_tools yok
    const teacher = makeInd();
    teacher.known_techs = new Set(['hunting_spear']);

    for (let i = 0; i < 500; i++) {
      learnTechFromObservation(learner, [teacher], new Set(['hunting_spear']));
    }
    expect(learner.known_techs.has('hunting_spear')).toBe(false);
  });

  it('ön-koşul tamamlandığında öğrenme mümkün hale gelir', () => {
    const learner = makeInd({ phenotype: { fluid_intelligence: 0.9, curiosity: 1.0 } });
    learner.known_techs = new Set(['stone_tools']); // ön-koşul tamamlandı
    const teacher = makeInd();
    teacher.known_techs = new Set(['hunting_spear']);

    // rate = (1.0 × 0.9) / (1.2 × 2000) = 0.000375/gün → P(≥1 in 20000) ≈ 99.9%
    let learned = false;
    for (let i = 0; i < 20000; i++) {
      learnTechFromObservation(learner, [teacher], new Set(['stone_tools', 'hunting_spear']));
      if (learner.known_techs.has('hunting_spear')) { learned = true; break; }
    }
    expect(learned).toBe(true);
  });

  it('zaten bilinen teknolojiyi tekrar eklemez', () => {
    const learner = makeInd();
    learner.known_techs = new Set(['foraging']);
    const teacher = makeInd();
    teacher.known_techs = new Set(['foraging']);

    const before = learner.known_techs.size;
    for (let i = 0; i < 100; i++) {
      learnTechFromObservation(learner, [teacher], new Set(['foraging']));
    }
    expect(learner.known_techs.size).toBe(before);
  });

  it('yakın peer yoksa hiçbir şey öğrenmez', () => {
    const learner = makeInd();
    learnTechFromObservation(learner, [], new Set(['foraging']));
    expect(learner.known_techs.size).toBe(0);
  });

  it('bireyin kendisi peer listesinde varsa yok sayılır', () => {
    const learner = makeInd();
    learner.known_techs = new Set();
    const selfRef = { ...learner, known_techs: new Set(['foraging']) };
    selfRef.id = learner.id; // aynı id

    for (let i = 0; i < 200; i++) {
      learnTechFromObservation(learner, [selfRef], new Set(['foraging']));
    }
    expect(learner.known_techs.has('foraging')).toBe(false);
  });

  it('yüksek zorluklu teknoloji daha yavaş öğrenilir (foraging vs food_preservation)', () => {
    // foraging difficulty=0.3 → rate≈0.0015/çağrı
    // food_preservation difficulty=1.8 → rate≈0.00025/çağrı
    // 10000 çağrıda foraging beklenen ≈15, food_preservation beklenen ≈2.5
    const N = 10000;
    let easyLearned = 0;
    let hardLearned = 0;
    for (let i = 0; i < N; i++) {
      const le = makeInd(); le.known_techs = new Set();
      const te = makeInd(); te.known_techs = new Set(['foraging']);
      learnTechFromObservation(le, [te], new Set(['foraging']));
      if (le.known_techs.has('foraging')) easyLearned++;

      const lh = makeInd(); lh.known_techs = new Set(['fire_making']);
      const th = makeInd(); th.known_techs = new Set(['food_preservation']);
      learnTechFromObservation(lh, [th], new Set(['food_preservation', 'fire_making']));
      if (lh.known_techs.has('food_preservation')) hardLearned++;
    }
    expect(easyLearned).toBeGreaterThan(hardLearned);
  });
});

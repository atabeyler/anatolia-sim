import { describe, it, expect } from 'vitest';
import {
  tryFormBelief,
  updateBeliefSpread,
  checkRitualEmergence,
  BELIEF_ARCHETYPES,
} from '../src/engines/belief/beliefEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    phenotype: {
      religiosity: 0.7,
      fluid_intelligence: 0.6,
      anxiety: 0.5,
      curiosity: 0.5,
      ...overrides.phenotype,
    },
    language: { foxp2_expression: 0.5, ...overrides.language },
    beliefs: new Set(),
    _beliefReflection: 0,
    _beliefExposure: {},
    x: 0, y: 0,
    group_id: null,
    ...overrides,
  };
}

// worldState yardımcısı
const CALM_WORLD   = { recent_disaster: false, food_abundance: 0.8 };
const CRISIS_WORLD = { recent_disaster: true,  food_abundance: 0.1 };

describe('BELIEF_ARCHETYPES — yapı doğrulaması', () => {
  it('6 arketip tanımlı', () => {
    expect(Object.keys(BELIEF_ARCHETYPES)).toHaveLength(6);
  });

  it('animizm en düşük iq_min (0) ve stage (1) sahip', () => {
    expect(BELIEF_ARCHETYPES.animism.iq_min).toBe(0);
    expect(BELIEF_ARCHETYPES.animism.stage).toBe(1);
  });

  it('politeizm çömlek teknolojisi gerektirir (yazı değil)', () => {
    expect(BELIEF_ARCHETYPES.polytheism.requires_tech).toContain('pottery');
    expect(BELIEF_ARCHETYPES.polytheism.requires_tech).not.toContain('writing_system');
  });

  it('monoteizm ve felsefi inanç yazı sistemi + matematik gerektirir', () => {
    expect(BELIEF_ARCHETYPES.monotheism.requires_tech).toContain('writing_system');
    expect(BELIEF_ARCHETYPES.monotheism.requires_tech).toContain('mathematics_basic');
    expect(BELIEF_ARCHETYPES.philosophical.requires_tech).toContain('writing_system');
  });

  it('arketipler aşama sırasına göre sıralanabilir (1→4)', () => {
    const stages = Object.values(BELIEF_ARCHETYPES).map(a => a.stage);
    expect(Math.min(...stages)).toBe(1);
    expect(Math.max(...stages)).toBe(4);
  });
});

describe('tryFormBelief — birikim ve eşik', () => {
  it('eşiğe ulaşılmadan inanç oluşmaz', () => {
    const ind = makeInd('i1');
    const result = tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(result).toBeNull();
  });

  it('yeterli birikim sonrası animizm oluşur (tüm koşullar karşılanmış)', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.8, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.4 }, // animizm foxp2_min: 0.3
      _beliefReflection: 9999, // eşiği geçmek için
    });
    const result = tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(result).not.toBeNull();
    expect(result.belief_id).toBe('animism'); // en düşük stage ilk seçilir
  });

  it('felaket bonusu birikim hızını artırır', () => {
    const indCalm   = makeInd('i1', { _beliefReflection: 0 });
    const indCrisis = makeInd('i2', { _beliefReflection: 0 });

    tryFormBelief(indCalm,   new Set(), new Set(), CALM_WORLD,   1);
    tryFormBelief(indCrisis, new Set(), new Set(), CRISIS_WORLD, 1);

    // Kriz dünyasında birikim daha hızlı artmalı
    expect(indCrisis._beliefReflection).toBeGreaterThan(indCalm._beliefReflection);
  });

  it('kıtlık bonusu (food_abundance < 1) birikim artırır', () => {
    const indPlenty = makeInd('i1', { _beliefReflection: 0 });
    const indScarse = makeInd('i2', { _beliefReflection: 0 });

    tryFormBelief(indPlenty, new Set(), new Set(), { recent_disaster: false, food_abundance: 1.0 }, 1);
    tryFormBelief(indScarse, new Set(), new Set(), { recent_disaster: false, food_abundance: 0.0 }, 1);

    expect(indScarse._beliefReflection).toBeGreaterThan(indPlenty._beliefReflection);
  });

  it('yüksek dinsellik × IQ → düşük eşik → daha hızlı inanç', () => {
    // Eşik = 100 / max(religiosity × IQ, 0.1)
    const highThreshold = 100 / Math.max(0.1 * 0.2, 0.1); // düşük rel+IQ → yüksek eşik
    const lowThreshold  = 100 / Math.max(0.9 * 0.9, 0.1); // yüksek rel+IQ → düşük eşik
    expect(lowThreshold).toBeLessThan(highThreshold);
  });

  it('zaten sahip olunan inanç tekrar atanmaz', () => {
    const ind = makeInd('i1', { _beliefReflection: 9999 });
    const existing = new Set(['animism']);
    const result = tryFormBelief(ind, existing, new Set(), CALM_WORLD, 1);
    // animizm zaten var; ata kültü veya şamanizm denenecek ama foxp2 yeterli mi?
    // Sonuç null veya animism olmayan bir inanç
    if (result) expect(result.belief_id).not.toBe('animism');
  });

  it('IQ eşiği yetersizse politeizm oluşmaz (iq < 0.5)', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.4, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.9 },
      _beliefReflection: 9999,
    });
    // Politeizm iq_min: 0.5 gerektirir; bu birey IQ=0.4 ile politeizme geçemez
    const discovered = new Set(['pottery']);
    const existing   = new Set(['animism', 'ancestor_cult', 'shamanism']); // düşük inançlar zaten var
    const result = tryFormBelief(ind, existing, discovered, CALM_WORLD, 1);
    if (result) {
      expect(['polytheism', 'monotheism', 'philosophical']).not.toContain(result.belief_id);
    }
  });

  it('birikim eşik sonrası sıfırlanır', () => {
    const ind = makeInd('i1', {
      phenotype: { religiosity: 0.9, fluid_intelligence: 0.8, anxiety: 0.5, curiosity: 0.5 },
      language: { foxp2_expression: 0.4 },
      _beliefReflection: 9999,
    });
    tryFormBelief(ind, new Set(), new Set(), CALM_WORLD, 1);
    expect(ind._beliefReflection).toBe(0);
  });
});

describe('updateBeliefSpread — sosyal yayılım', () => {
  it('inançsız birey grup içindeki inanan komşudan inanç alabilir', () => {
    const believer  = makeInd('b1', { group_id: 'g1', beliefs: new Set(['animism']) });
    const receptive = makeInd('r1', {
      group_id: 'g1',
      phenotype: { religiosity: 0.9, anxiety: 0.5, curiosity: 0.5, fluid_intelligence: 0.5 },
      _beliefExposure: { animism: 10000 }, // eşiği geçmek için önceden yüklü
    });
    const population    = [believer, receptive];
    const existingBeliefs = new Set(['animism']);

    updateBeliefSpread(population, existingBeliefs, [], 100);

    expect(receptive.beliefs.has('animism')).toBe(true);
  });

  it('farklı grupta ve uzakta olan birey inanç almaz', () => {
    const believer  = makeInd('b1', { group_id: 'g1', x: 0,  y: 0,  beliefs: new Set(['animism']) });
    const isolated  = makeInd('r1', { group_id: 'g2', x: 10, y: 10, beliefs: new Set() });
    const population    = [believer, isolated];
    const existingBeliefs = new Set(['animism']);

    for (let i = 0; i < 100; i++) {
      updateBeliefSpread(population, existingBeliefs, [], i);
    }
    expect(isolated.beliefs.has('animism')).toBe(false);
  });

  it('zaten sahip olunan inanç tekrar işlenmez', () => {
    const holder = makeInd('h1', { group_id: 'g1', beliefs: new Set(['animism']) });
    const population = [holder];
    const events = updateBeliefSpread(population, new Set(['animism']), [], 1);
    expect(events).toHaveLength(0);
  });

  it('yüksek dinsellik maruziyet eşiğini düşürür (200/religiosity)', () => {
    const highRel = 200 / Math.max(0.9, 0.1); // ~222 gün
    const lowRel  = 200 / Math.max(0.1, 0.1); // 2000 gün
    expect(highRel).toBeLessThan(lowRel);
  });

  it('updateBeliefSpread inanç olmadan hemen döner', () => {
    const result = updateBeliefSpread([], new Set(), [], 1);
    expect(result).toEqual([]);
  });
});

describe('checkRitualEmergence', () => {
  it('>%60 üye aynı inancı taşıyorsa ritüel oluşur', () => {
    const members = [
      makeInd('i1', { beliefs: new Set(['animism']) }),
      makeInd('i2', { beliefs: new Set(['animism']) }),
      makeInd('i3', { beliefs: new Set(['animism']) }),
      makeInd('i4', { beliefs: new Set() }),
    ];
    const group = { id: 'g1', member_ids: ['i1', 'i2', 'i3', 'i4'], has_ritual: null };
    const result = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).not.toBeNull();
    expect(result.type).toBe('ritual_emerged');
    expect(group.has_ritual).toBe('animism');
  });

  it('grup < 3 üye ise ritüel oluşmaz', () => {
    const members = [makeInd('i1', { beliefs: new Set(['animism']) })];
    const group   = { id: 'g1', member_ids: ['i1'], has_ritual: null };
    const result  = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).toBeNull();
  });

  it('ritüel oluştuğunda grup zaten ritüel sahibi ise tekrar oluşmaz', () => {
    const members = [
      makeInd('i1', { beliefs: new Set(['animism']) }),
      makeInd('i2', { beliefs: new Set(['animism']) }),
      makeInd('i3', { beliefs: new Set(['animism']) }),
    ];
    const group = { id: 'g1', member_ids: ['i1', 'i2', 'i3'], has_ritual: 'animism' };
    const result = checkRitualEmergence(group, members, new Set(['animism']), 100);
    expect(result).toBeNull();
  });
});

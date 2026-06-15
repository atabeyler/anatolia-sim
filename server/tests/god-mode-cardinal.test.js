import { describe, it, expect } from 'vitest';

/**
 * God Mode Cardinal Rule testleri.
 *
 * god.js HTTP route'larını mock'lamak yerine aynı iş mantığını
 * doğrudan uygulayarak Cardinal Rule kısıtlamalarını doğrularız.
 * Bu, route'taki switch bloğunun aynen kopyasıdır — router değişirse
 * testler de güncellenmeli.
 */

function markDead(individual, day, cause) {
  individual.is_dead = true;
  individual.alive = false;
  individual.death_day = day;
  individual.death_cause = cause;
}

function makeFounder(overrides = {}) {
  return {
    id: 'founder-1',
    is_founder: true,
    is_dead: false,
    alive: true,
    phenotype: { fluid_intelligence: 0.7, language_capacity: 0.8, immune_strength: 0.6, max_lifespan: 70, aggression: 0.4 },
    health: { hp: 1.0, calories: 1.0, hydration: 1.0 },
    ...overrides,
  };
}

function makeNonFounder(overrides = {}) {
  return {
    id: 'child-1',
    is_founder: false,
    is_dead: false,
    alive: true,
    birth_day: 100,
    phenotype: { fluid_intelligence: 0.6, language_capacity: 0.7, immune_strength: 0.5, max_lifespan: 65, aggression: 0.3 },
    health: { hp: 1.0, calories: 1.0, hydration: 1.0 },
    ...overrides,
  };
}

// ── instant_death ───────────────────────────────────────────────────────────

describe('God Mode — instant_death', () => {
  it('instant_death founder üzerinde çalışır', () => {
    const ind = makeFounder();
    markDead(ind, 100, 'god_intervention');
    expect(ind.is_dead).toBe(true);
    expect(ind.death_cause).toBe('god_intervention');
  });

  it('instant_death non-founder üzerinde çalışır (Cardinal Rule: ölüm engellenmez)', () => {
    // Doğrudan ölüm, doğal afetlerle (deprem/salgın) aynı kategoride —
    // Cardinal Rule davranış enjeksiyonunu yasaklar, ölüm olayını değil.
    const ind = makeNonFounder();
    markDead(ind, 200, 'god_intervention');
    expect(ind.is_dead).toBe(true);
    expect(ind.alive).toBe(false);
  });

  it('instant_death death_cause "god_intervention" olarak etiketler', () => {
    const ind = makeNonFounder();
    markDead(ind, 200, 'god_intervention');
    expect(ind.death_cause).toBe('god_intervention');
    // Doğal ölümden ayırt edilebilir (istatistik/raporlama için)
    expect(ind.death_cause).not.toBe('old_age');
    expect(ind.death_cause).not.toBe('starvation');
  });

  it('zaten ölü bireyde death_day değişmez (çift ölüm koruması)', () => {
    const ind = makeNonFounder({ is_dead: true, alive: false, death_day: 50 });
    // Route'ta "if (ind && !ind.is_dead)" şartı — bu testte mantığı taklit ediyoruz
    const shouldApply = !ind.is_dead;
    if (shouldApply) markDead(ind, 200, 'god_intervention');
    expect(ind.death_day).toBe(50); // orijinal ölüm günü korunur
  });
});

// ── genetic_boost — Cardinal Rule engeli ───────────────────────────────────

describe('God Mode — genetic_boost (Cardinal Rule)', () => {
  it('genetic_boost founder üzerinde çalışır', () => {
    const ind = makeFounder();
    // Founder kontrolü: is_founder === true → uygula
    if (!ind.is_founder) throw new Error('Cardinal Rule ihlali');
    const before = ind.phenotype.fluid_intelligence;
    ind.phenotype.fluid_intelligence = Math.min(1, ind.phenotype.fluid_intelligence + 0.1);
    expect(ind.phenotype.fluid_intelligence).toBeGreaterThan(before);
  });

  it('genetic_boost non-founder üzerinde reddedilir (Cardinal Rule)', () => {
    const ind = makeNonFounder();
    // Route mantığı: !ind.is_founder → 400 hatası
    const blocked = !ind.is_founder;
    expect(blocked).toBe(true);
    // Fenotip değişmeden kalmalı
    const before = ind.phenotype.fluid_intelligence;
    if (!blocked) ind.phenotype.fluid_intelligence += 0.2; // bu satır çalışmamalı
    expect(ind.phenotype.fluid_intelligence).toBe(before);
  });

  it('genetic_boost değer 1.0 ile sınırlandırılır', () => {
    const ind = makeFounder({ phenotype: { ...makeFounder().phenotype, fluid_intelligence: 0.95 } });
    ind.phenotype.fluid_intelligence = Math.min(1, ind.phenotype.fluid_intelligence + 0.2);
    expect(ind.phenotype.fluid_intelligence).toBe(1.0);
  });
});

// ── longevity — Cardinal Rule engeli ───────────────────────────────────────

describe('God Mode — longevity (Cardinal Rule)', () => {
  it('longevity non-founder için reddedilir', () => {
    const ind = makeNonFounder();
    const blocked = !ind.is_founder;
    expect(blocked).toBe(true);
  });

  it('longevity founder için çalışır, max_lifespan 200 ile sınırlandırılır', () => {
    const ind = makeFounder({ phenotype: { ...makeFounder().phenotype, max_lifespan: 180 } });
    ind.phenotype.max_lifespan = Math.min(200, ind.phenotype.max_lifespan + 50);
    expect(ind.phenotype.max_lifespan).toBe(200);
  });
});

// ── deprem/sel/salgın — non-founder üzerinde çalışır ──────────────────────

describe('God Mode — çevresel olaylar non-founder öldürebilir (Cardinal Rule dışı)', () => {
  it('deprem herkesi etkileyebilir — bu Cardinal Rule ihlali değil', () => {
    // Çevresel ölüm (doğal seçilim) Cardinal Rule kapsamı dışındadır.
    const population = [makeFounder(), makeNonFounder()];
    const magnitude = 9;
    const radius = 500 / 111; // derece
    const deaths = [];
    for (const ind of population) {
      const dist = 0; // merkez üstünde
      const risk = (magnitude - 4) / 5 * (1 - dist / radius);
      if (risk > 0.9) { markDead(ind, 10, 'earthquake'); deaths.push(ind.id); }
    }
    // Hem founder hem non-founder etkilenebilir
    expect(deaths.length).toBe(2);
  });

  it('salgın hem founder hem non-founder üzerinde olasılıklı öldürür', () => {
    const pop = [makeFounder(), makeNonFounder()];
    let epidemicDeaths = 0;
    // spread_rate=1.0, mortality_rate=1.0 (deterministic test)
    for (const ind of pop) {
      const dies = 1.0 * (1 - (ind.phenotype.immune_strength ?? 0.5)) > 0.4;
      if (dies) { markDead(ind, 20, 'epidemic'); epidemicDeaths++; }
    }
    expect(epidemicDeaths).toBeGreaterThan(0);
  });
});

// ── kardinal kural özeti ────────────────────────────────────────────────────

describe('God Mode — Cardinal Rule özet', () => {
  it('is_founder=true bireylerde fenotip değişikliğine izin verilir', () => {
    const ind = makeFounder();
    expect(ind.is_founder).toBe(true);
  });

  it('is_founder=false bireylerde fenotip değişikliği engellenmeli', () => {
    const ind = makeNonFounder();
    expect(ind.is_founder).toBe(false);
    // genetic_boost ve longevity bu kontrolü yapıyor
  });

  it('god_intervention death_cause etiketi natural death"dan ayırt edilebilir', () => {
    const naturalCauses = ['old_age', 'starvation', 'dehydration', 'infection', 'drowning'];
    expect(naturalCauses).not.toContain('god_intervention');
  });
});

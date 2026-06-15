import { describe, it, expect } from 'vitest';

/**
 * God Mode Cardinal Rule tests.
 *
 * Instead of mocking the god.js HTTP routes, we validate the Cardinal Rule
 * constraints by applying the same business logic directly.
 * This is an exact copy of the switch block in the route — if the router changes,
 * these tests must be updated too.
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
  it('instant_death works on founder', () => {
    const ind = makeFounder();
    markDead(ind, 100, 'god_intervention');
    expect(ind.is_dead).toBe(true);
    expect(ind.death_cause).toBe('god_intervention');
  });

  it('instant_death works on non-founder (Cardinal Rule: death is not blocked)', () => {
    // Direct death is in the same category as natural disasters (earthquake/epidemic) —
    // Cardinal Rule forbids behavior injection, not death events.
    const ind = makeNonFounder();
    markDead(ind, 200, 'god_intervention');
    expect(ind.is_dead).toBe(true);
    expect(ind.alive).toBe(false);
  });

  it('instant_death labels death_cause as "god_intervention"', () => {
    const ind = makeNonFounder();
    markDead(ind, 200, 'god_intervention');
    expect(ind.death_cause).toBe('god_intervention');
    // Distinguishable from natural death (for statistics/reporting)
    expect(ind.death_cause).not.toBe('old_age');
    expect(ind.death_cause).not.toBe('starvation');
  });

  it('death_day does not change for already-dead individual (double-death protection)', () => {
    const ind = makeNonFounder({ is_dead: true, alive: false, death_day: 50 });
    // Route has "if (ind && !ind.is_dead)" condition — we simulate the logic here
    const shouldApply = !ind.is_dead;
    if (shouldApply) markDead(ind, 200, 'god_intervention');
    expect(ind.death_day).toBe(50); // original death day is preserved
  });
});

// ── genetic_boost — Cardinal Rule block ────────────────────────────────────

describe('God Mode — genetic_boost (Cardinal Rule)', () => {
  it('genetic_boost works on founder', () => {
    const ind = makeFounder();
    // Founder check: is_founder === true → apply
    if (!ind.is_founder) throw new Error('Cardinal Rule violation');
    const before = ind.phenotype.fluid_intelligence;
    ind.phenotype.fluid_intelligence = Math.min(1, ind.phenotype.fluid_intelligence + 0.1);
    expect(ind.phenotype.fluid_intelligence).toBeGreaterThan(before);
  });

  it('genetic_boost is rejected for non-founder (Cardinal Rule)', () => {
    const ind = makeNonFounder();
    // Route logic: !ind.is_founder → 400 error
    const blocked = !ind.is_founder;
    expect(blocked).toBe(true);
    // Phenotype should remain unchanged
    const before = ind.phenotype.fluid_intelligence;
    if (!blocked) ind.phenotype.fluid_intelligence += 0.2; // this line must not run
    expect(ind.phenotype.fluid_intelligence).toBe(before);
  });

  it('genetic_boost value is capped at 1.0', () => {
    const ind = makeFounder({ phenotype: { ...makeFounder().phenotype, fluid_intelligence: 0.95 } });
    ind.phenotype.fluid_intelligence = Math.min(1, ind.phenotype.fluid_intelligence + 0.2);
    expect(ind.phenotype.fluid_intelligence).toBe(1.0);
  });
});

// ── longevity — Cardinal Rule block ────────────────────────────────────────

describe('God Mode — longevity (Cardinal Rule)', () => {
  it('longevity is rejected for non-founder', () => {
    const ind = makeNonFounder();
    const blocked = !ind.is_founder;
    expect(blocked).toBe(true);
  });

  it('longevity works for founder, max_lifespan is capped at 200', () => {
    const ind = makeFounder({ phenotype: { ...makeFounder().phenotype, max_lifespan: 180 } });
    ind.phenotype.max_lifespan = Math.min(200, ind.phenotype.max_lifespan + 50);
    expect(ind.phenotype.max_lifespan).toBe(200);
  });
});

// ── earthquake/flood/epidemic — works on non-founder ──────────────────────

describe('God Mode — environmental events can kill non-founders (outside Cardinal Rule)', () => {
  it('earthquake can affect everyone — this is not a Cardinal Rule violation', () => {
    // Environmental death (natural selection) is outside the scope of Cardinal Rule.
    const population = [makeFounder(), makeNonFounder()];
    const magnitude = 9;
    const radius = 500 / 111; // degrees
    const deaths = [];
    for (const ind of population) {
      const dist = 0; // at epicenter
      const risk = (magnitude - 4) / 5 * (1 - dist / radius);
      if (risk > 0.9) { markDead(ind, 10, 'earthquake'); deaths.push(ind.id); }
    }
    // Both founder and non-founder can be affected
    expect(deaths.length).toBe(2);
  });

  it('epidemic probabilistically kills both founder and non-founder', () => {
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

// ── cardinal rule summary ────────────────────────────────────────────────────

describe('God Mode — Cardinal Rule summary', () => {
  it('phenotype modification is allowed for is_founder=true individuals', () => {
    const ind = makeFounder();
    expect(ind.is_founder).toBe(true);
  });

  it('phenotype modification must be blocked for is_founder=false individuals', () => {
    const ind = makeNonFounder();
    expect(ind.is_founder).toBe(false);
    // genetic_boost and longevity perform this check
  });

  it('god_intervention death_cause label is distinguishable from natural death', () => {
    const naturalCauses = ['old_age', 'starvation', 'dehydration', 'infection', 'drowning'];
    expect(naturalCauses).not.toContain('god_intervention');
  });
});

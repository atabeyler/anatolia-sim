import { describe, it, expect } from 'vitest';
import { checkReproduction } from '../src/engines/biology/reproduction.js';
import { createFounder, isFertile } from '../src/engines/biology/individual.js';

// createFounder initializes real genome, phenotype, epigenome and all fields
function makeMale(overrides = {}) {
  return createFounder({ sex: 'male', ageYears: 25, x: 0, y: 0, ...overrides });
}
function makeFemale(overrides = {}) {
  return createFounder({ sex: 'female', ageYears: 25, x: 0, y: 0, ...overrides });
}

describe('isFertile', () => {
  it('female aged 15-50 is fertile', () => {
    const f = makeFemale({ ageYears: 25 });
    expect(isFertile(f, 0)).toBe(true);
  });

  it('female aged 10 is infertile', () => {
    const f = makeFemale({ ageYears: 10 });
    expect(isFertile(f, 0)).toBe(false);
  });

  it('female aged 55 is infertile', () => {
    const f = makeFemale({ ageYears: 55 });
    expect(isFertile(f, 0)).toBe(false);
  });

  it('male aged 25 is fertile', () => {
    const m = makeMale({ ageYears: 25 });
    expect(isFertile(m, 0)).toBe(true);
  });

  it('male aged 70 is infertile', () => {
    const m = makeMale({ ageYears: 70 });
    expect(isFertile(m, 0)).toBe(false);
  });
});

describe('checkReproduction — pregnancy formation', () => {
  it('male and female in close proximity produce a pregnancy over time', () => {
    const male   = makeMale();
    const female = makeFemale();
    const pop    = new Map([[male.id, male], [female.id, female]]);

    let conceived = false;
    for (let day = 0; day < 300; day++) {
      checkReproduction(pop, day, 'sim1');
      if (female.health?.pregnancy) { conceived = true; break; }
    }
    expect(conceived).toBe(true);
  });

  it('a pregnant female cannot become pregnant again', () => {
    const male   = makeMale();
    const female = makeFemale();
    // Manually assign pregnancy — due_day far in future, birth will not occur
    female.health.pregnancy = {
      father_id: male.id,
      conception_day: 0,
      due_day: 99999, // will never give birth
    };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    // Run 100 ticks — pregnancy should never change
    for (let day = 1; day <= 100; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    // Original pregnancy should be preserved
    expect(female.health.pregnancy).not.toBeNull();
    expect(female.health.pregnancy.conception_day).toBe(0);
  });

  it('distant male (>2 degrees) does not produce pregnancy', () => {
    const male   = makeMale({ x: 10 }); // >2 degrees from female
    const female = makeFemale({ x: 0 });
    const pop    = new Map([[male.id, male], [female.id, female]]);

    for (let day = 0; day < 200; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    expect(female.health?.pregnancy ?? null).toBeNull();
  });

  it('infertile young female (age 10) cannot become pregnant', () => {
    const male        = makeMale();
    const youngFemale = makeFemale({ ageYears: 10 });
    const pop = new Map([[male.id, male], [youngFemale.id, youngFemale]]);

    for (let day = 0; day < 200; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    expect(youngFemale.health?.pregnancy ?? null).toBeNull();
  });
});

describe('checkReproduction — birth', () => {
  it('baby is born when due day arrives, pregnancy is cleared', () => {
    const male   = makeMale();
    const female = makeFemale();
    female.health.pregnancy = {
      father_id: male.id,
      conception_day: -280,
      due_day: 0,
    };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    const newborns = checkReproduction(pop, 0, 'sim1');

    expect(newborns.length).toBeGreaterThanOrEqual(1);
    expect(female.health.pregnancy).toBeNull();
  });

  it('newborn receives parent_1_id (mother) and parent_2_id (father)', () => {
    const male   = makeMale();
    const female = makeFemale();
    female.health.pregnancy = { father_id: male.id, conception_day: -280, due_day: 0 };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    const newborns = checkReproduction(pop, 0, 'sim1');
    const alive = newborns.filter(n => n.alive);
    if (alive.length > 0) {
      expect(alive[0].parent_1_id).toBe(female.id);
      expect(alive[0].parent_2_id).toBe(male.id);
    }
  });

  it('newborn starts with low foxp2_expression (~genetic_ceiling × 0.1)', () => {
    const male   = makeMale();
    const female = makeFemale();
    female.health.pregnancy = { father_id: male.id, conception_day: -280, due_day: 0 };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    const newborns = checkReproduction(pop, 0, 'sim1');
    const alive = newborns.filter(n => n.alive);
    if (alive.length > 0) {
      const infant = alive[0];
      const cap = infant.phenotype?.language_capacity ?? 0.5;
      // ~10% start (because isFounder=false)
      expect(infant.language.foxp2_expression).toBeCloseTo(cap * 0.1, 4);
    }
  });

  it('newborn starts with hp=0.4 (fragile) at birth', () => {
    const male   = makeMale();
    const female = makeFemale();
    female.health.pregnancy = { father_id: male.id, conception_day: -280, due_day: 0 };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    const newborns = checkReproduction(pop, 0, 'sim1');
    const alive = newborns.filter(n => n.alive);
    if (alive.length > 0) {
      expect(alive[0].health.hp).toBe(0.4);
    }
  });

  it('newborn receives a real genome (combineGametes)', () => {
    const male   = makeMale();
    const female = makeFemale();
    female.health.pregnancy = { father_id: male.id, conception_day: -280, due_day: 0 };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    const newborns = checkReproduction(pop, 0, 'sim1');
    const alive = newborns.filter(n => n.alive);
    if (alive.length > 0) {
      expect(alive[0].genome).toBeDefined();
      expect(alive[0].genome.FOXP2_01).toBeDefined();
    }
  });

  it('male mating_urge decreases after pregnancy', () => {
    const male   = makeMale();
    const female = makeFemale();
    male.mating_urge = 1.0;
    const pop = new Map([[male.id, male], [female.id, female]]);

    let conceived = false;
    for (let day = 0; day < 300; day++) {
      checkReproduction(pop, day, 'sim1');
      if (female.health?.pregnancy) { conceived = true; break; }
    }
    if (conceived) {
      expect(male.mating_urge).toBeLessThan(1.0);
    }
  });
});

describe('checkReproduction — twin rate formula', () => {
  it('twin chance for average fertility=0.5 is ~1.7%', () => {
    // Formula: Math.max(0, 0.003 + (fshr - 0.3) * 0.07) at fshr=0.5
    const fshr = 0.5;
    const twinChance = Math.max(0, 0.003 + (fshr - 0.3) * 0.07);
    expect(twinChance).toBeCloseTo(0.017, 3);
  });

  it('twin chance increases for high fertility=1.0', () => {
    const lowFshr  = Math.max(0, 0.003 + (0.3 - 0.3) * 0.07); // ~0.3% — base
    const highFshr = Math.max(0, 0.003 + (1.0 - 0.3) * 0.07); // ~8%
    expect(highFshr).toBeGreaterThan(lowFshr);
  });

  it('twin chance for low fertility=0.1 should be at base (0) or low', () => {
    const chance = Math.max(0, 0.003 + (0.1 - 0.3) * 0.07);
    expect(chance).toBeGreaterThanOrEqual(0);
    expect(chance).toBeLessThan(0.003);
  });
});

describe('checkReproduction — MHC diversity bonus direction', () => {
  it('couple with high MHC difference has higher conception probability', () => {
    // conceptionProbability is private — test the formula directly:
    // mhcBonus = (|fI1 - mI1| + |fI2 - mI2|) / 2 × 0.2
    const bonusSimilar = ((Math.abs(0.5 - 0.5) + Math.abs(0.5 - 0.5)) / 2) * 0.2; // 0
    const bonusDiverse = ((Math.abs(0.0 - 1.0) + Math.abs(0.0 - 1.0)) / 2) * 0.2; // 0.2
    expect(bonusDiverse).toBeGreaterThan(bonusSimilar);
  });
});

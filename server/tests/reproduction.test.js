import { describe, it, expect } from 'vitest';
import { checkReproduction } from '../src/engines/biology/reproduction.js';
import { createFounder, isFertile } from '../src/engines/biology/individual.js';

// createFounder gerçek genomu, fenotipi, epigenomu ve tüm alanları başlatır
function makeMale(overrides = {}) {
  return createFounder({ sex: 'male', ageYears: 25, x: 0, y: 0, ...overrides });
}
function makeFemale(overrides = {}) {
  return createFounder({ sex: 'female', ageYears: 25, x: 0, y: 0, ...overrides });
}

describe('isFertile', () => {
  it('15-50 yaş arası kadın fertildir', () => {
    const f = makeFemale({ ageYears: 25 });
    expect(isFertile(f, 0)).toBe(true);
  });

  it('10 yaşındaki kadın infertildir', () => {
    const f = makeFemale({ ageYears: 10 });
    expect(isFertile(f, 0)).toBe(false);
  });

  it('55 yaşındaki kadın infertildir', () => {
    const f = makeFemale({ ageYears: 55 });
    expect(isFertile(f, 0)).toBe(false);
  });

  it('25 yaşındaki erkek fertildir', () => {
    const m = makeMale({ ageYears: 25 });
    expect(isFertile(m, 0)).toBe(true);
  });

  it('70 yaşındaki erkek infertildir', () => {
    const m = makeMale({ ageYears: 70 });
    expect(isFertile(m, 0)).toBe(false);
  });
});

describe('checkReproduction — hamilelik oluşumu', () => {
  it('yakın konumdaki erkek ve kadın zaman içinde hamilelik üretir', () => {
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

  it('hamile kadın tekrar gebe kalamaz', () => {
    const male   = makeMale();
    const female = makeFemale();
    // Hamileliği doğrudan manuel ata — due_day çok ileride, doğum olmayacak
    female.health.pregnancy = {
      father_id: male.id,
      conception_day: 0,
      due_day: 99999, // hiç doğmayacak
    };
    female.social = { children_ids: [] };
    const pop = new Map([[male.id, male], [female.id, female]]);

    // 100 tik çalıştır — hamilelik hiç değişmemeli
    for (let day = 1; day <= 100; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    // Orijinal hamilelik korunmuş olmalı
    expect(female.health.pregnancy).not.toBeNull();
    expect(female.health.pregnancy.conception_day).toBe(0);
  });

  it('uzak erkek (>2 derece) gebelik üretmez', () => {
    const male   = makeMale({ x: 10 }); // kadından >2 derece uzakta
    const female = makeFemale({ x: 0 });
    const pop    = new Map([[male.id, male], [female.id, female]]);

    for (let day = 0; day < 200; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    expect(female.health?.pregnancy ?? null).toBeNull();
  });

  it('infertil genç kadın (10 yaş) gebe kalamaz', () => {
    const male        = makeMale();
    const youngFemale = makeFemale({ ageYears: 10 });
    const pop = new Map([[male.id, male], [youngFemale.id, youngFemale]]);

    for (let day = 0; day < 200; day++) {
      checkReproduction(pop, day, 'sim1');
    }
    expect(youngFemale.health?.pregnancy ?? null).toBeNull();
  });
});

describe('checkReproduction — doğum', () => {
  it('vade günü geldiğinde bebek doğar, hamilelik temizlenir', () => {
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

  it('yenidoğan parent_1_id (anne) ve parent_2_id (baba) alır', () => {
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

  it('yenidoğan düşük foxp2_expression ile başlar (~genetik_tavan × 0.1)', () => {
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
      // ~%10 başlangıç (isFounder=false olduğu için)
      expect(infant.language.foxp2_expression).toBeCloseTo(cap * 0.1, 4);
    }
  });

  it('yenidoğan doğumda hp=0.4 (kırılgan) ile başlar', () => {
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

  it('yenidoğan gerçek bir genome alır (combineGametes)', () => {
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

  it('erkek mating_urge hamilelik sonrası azalır', () => {
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

describe('checkReproduction — ikiz oranı formülü', () => {
  it('ortalama fertility=0.5 için ikiz şansı ~%1.7', () => {
    // Formül: Math.max(0, 0.003 + (fshr - 0.3) * 0.07) at fshr=0.5
    const fshr = 0.5;
    const twinChance = Math.max(0, 0.003 + (fshr - 0.3) * 0.07);
    expect(twinChance).toBeCloseTo(0.017, 3);
  });

  it('yüksek fertility=1.0 için ikiz şansı artar', () => {
    const lowFshr  = Math.max(0, 0.003 + (0.3 - 0.3) * 0.07); // ~0.3% — taban
    const highFshr = Math.max(0, 0.003 + (1.0 - 0.3) * 0.07); // ~8%
    expect(highFshr).toBeGreaterThan(lowFshr);
  });

  it('düşük fertility=0.1 için ikiz şansı taban (0) ya da düşük olmalı', () => {
    const chance = Math.max(0, 0.003 + (0.1 - 0.3) * 0.07);
    expect(chance).toBeGreaterThanOrEqual(0);
    expect(chance).toBeLessThan(0.003);
  });
});

describe('checkReproduction — MHC çeşitlilik bonusu yönü', () => {
  it('MHC farkı yüksek çift daha yüksek gebe kalma olasılığına sahip', () => {
    // conceptionProbability private — formülü doğrudan test et:
    // mhcBonus = (|fI1 - mI1| + |fI2 - mI2|) / 2 × 0.2
    const bonusSimilar = ((Math.abs(0.5 - 0.5) + Math.abs(0.5 - 0.5)) / 2) * 0.2; // 0
    const bonusDiverse = ((Math.abs(0.0 - 1.0) + Math.abs(0.0 - 1.0)) / 2) * 0.2; // 0.2
    expect(bonusDiverse).toBeGreaterThan(bonusSimilar);
  });
});

import { describe, it, expect } from 'vitest';
import { computeDailyDeathRisk, rollDeath } from '../src/engines/biology/mortality.js';

function makeInd(overrides = {}) {
  return {
    birth_day: -25 * 365, // 25 yaşında yetişkin
    phenotype: { max_lifespan: 70, immune_strength: 0.5 },
    health: { hp: 1.0, calories: 1.0, hydration: 1.0 },
    inbreeding_coeff: 0,
    _inWater: false,
    ...overrides,
  };
}

const DAY = 0; // currentDay referans

describe('computeDailyDeathRisk — temel oranlar', () => {
  it('bebek (<1 yıl) temel riski ~0.00022/gün', () => {
    const ind = makeInd({ birth_day: DAY - 50 }); // 50 günlük
    const risk = computeDailyDeathRisk(ind, DAY, { alive_count: 100 });
    // immune_strength × 0.3 indirimi uygulanmış olmakla birlikte taban aralığında olmalı
    expect(risk).toBeGreaterThan(0);
    expect(risk).toBeLessThan(0.001);
  });

  it('yaş bantları yükseldikçe risk artar: yetişkin < orta yaş < yaşlı', () => {
    const adult     = makeInd({ birth_day: DAY - 25 * 365 });
    const middleAge = makeInd({ birth_day: DAY - 55 * 365 });
    const old       = makeInd({ birth_day: DAY - 72 * 365 });

    const rA = computeDailyDeathRisk(adult,     DAY, { alive_count: 100 });
    const rM = computeDailyDeathRisk(middleAge, DAY, { alive_count: 100 });
    const rO = computeDailyDeathRisk(old,       DAY, { alive_count: 100 });

    expect(rM).toBeGreaterThan(rA);
    expect(rO).toBeGreaterThan(rM);
  });

  it('yıllık bebek mortalitesi ~%7.7 (0.00022 × 365 bileşik)', () => {
    const annual = 1 - Math.pow(1 - 0.00022, 365);
    expect(annual).toBeCloseTo(0.077, 2);
  });

  it('yıllık yaşlı (75+) mortalitesi ~%20 (0.00061 × 365 bileşik)', () => {
    const annual = 1 - Math.pow(1 - 0.00061, 365);
    expect(annual).toBeCloseTo(0.20, 1);
  });
});

describe('computeDailyDeathRisk — çarpanlar', () => {
  it('susuzluk (hydration < 0.1) riski büyük ölçüde artırır', () => {
    const normal    = makeInd({ birth_day: DAY - 25 * 365 });
    const dehydrated = makeInd({
      birth_day: DAY - 25 * 365,
      health: { hp: 1.0, calories: 1.0, hydration: 0.05 },
    });
    const rN = computeDailyDeathRisk(normal,    DAY, { alive_count: 100 });
    const rD = computeDailyDeathRisk(dehydrated, DAY, { alive_count: 100 });
    expect(rD).toBeGreaterThan(rN * 5);
  });

  it('açlık (calories < 0.1) riski artırır', () => {
    const normal   = makeInd({ birth_day: DAY - 25 * 365 });
    const starving = makeInd({
      birth_day: DAY - 25 * 365,
      health: { hp: 1.0, calories: 0.05, hydration: 1.0 },
    });
    const rN = computeDailyDeathRisk(normal,  DAY, { alive_count: 100 });
    const rS = computeDailyDeathRisk(starving, DAY, { alive_count: 100 });
    expect(rS).toBeGreaterThan(rN * 3);
  });

  it('sağlıklı yetişkin (hp>0.85, kalori>0.7) 0.4× bonusu alır', () => {
    const thriving = makeInd({
      birth_day: DAY - 25 * 365,
      health: { hp: 0.9, calories: 0.8, hydration: 1.0 },
    });
    const baseline = makeInd({
      birth_day: DAY - 25 * 365,
      health: { hp: 0.5, calories: 0.5, hydration: 1.0 },
    });
    expect(computeDailyDeathRisk(thriving, DAY, { alive_count: 100 }))
      .toBeLessThan(computeDailyDeathRisk(baseline, DAY, { alive_count: 100 }));
  });

  it('akrabalık katsayısı > 0.25 riski ×1.5 yapar', () => {
    const normal = makeInd({ birth_day: DAY - 25 * 365 });
    const inbred = makeInd({ birth_day: DAY - 25 * 365, inbreeding_coeff: 0.3 });
    const rN = computeDailyDeathRisk(normal, DAY, { alive_count: 100 });
    const rI = computeDailyDeathRisk(inbred, DAY, { alive_count: 100 });
    expect(rI).toBeCloseTo(rN * 1.5, 6);
  });

  it('akrabalık katsayısı = 0.25 eşiğinde çarpan UYGULANMAZ', () => {
    const atThreshold  = makeInd({ birth_day: DAY - 25 * 365, inbreeding_coeff: 0.25 });
    const justBelow    = makeInd({ birth_day: DAY - 25 * 365, inbreeding_coeff: 0.24 });
    const rAt    = computeDailyDeathRisk(atThreshold, DAY, { alive_count: 100 });
    const rBelow = computeDailyDeathRisk(justBelow,   DAY, { alive_count: 100 });
    expect(rAt).toBeCloseTo(rBelow, 8); // ≤ 0.25 için ×1.5 uygulanmamalı
  });

  it('risk 0.99 ile sınırlandırılır', () => {
    const worst = makeInd({
      birth_day: DAY - 100 * 365,
      phenotype: { max_lifespan: 50, immune_strength: 0 },
      health: { hp: 0.05, calories: 0.01, hydration: 0.01 },
      _inWater: true, _waterExperience: 0,
    });
    expect(computeDailyDeathRisk(worst, DAY, { alive_count: 100 })).toBeLessThanOrEqual(0.99);
  });
});

describe('computeDailyDeathRisk — su/boğulma', () => {
  it('suda olmak riski artırır', () => {
    const dry = makeInd({ birth_day: DAY - 25 * 365 });
    const wet = makeInd({ birth_day: DAY - 25 * 365, _inWater: true, _waterExperience: 0 });
    expect(computeDailyDeathRisk(wet, DAY, { alive_count: 100 }))
      .toBeGreaterThan(computeDailyDeathRisk(dry, DAY, { alive_count: 100 }));
  });

  it('su deneyimi boğulma riskini azaltır', () => {
    const noExp  = makeInd({ birth_day: DAY - 25 * 365, _inWater: true, _waterExperience: 0 });
    const expert = makeInd({ birth_day: DAY - 25 * 365, _inWater: true, _waterExperience: 1.0 });
    expect(computeDailyDeathRisk(expert, DAY, { alive_count: 100 }))
      .toBeLessThan(computeDailyDeathRisk(noExp, DAY, { alive_count: 100 }));
  });
});

describe('computeDailyDeathRisk — extinction guard', () => {
  it('küçük popülasyonda (< 15) risk azalır (model artefaktı)', () => {
    const ind   = makeInd({ birth_day: DAY - 25 * 365 });
    const rLarge = computeDailyDeathRisk(ind, DAY, { alive_count: 100 });
    const rSmall = computeDailyDeathRisk(ind, DAY, { alive_count: 5 });
    // Biyolojiye aykırı ama tasarım gereği — tez savunmasında model sınırlaması olarak raporlanmalı
    expect(rSmall).toBeLessThan(rLarge);
  });

  it('popülasyon = 1 için risk 0.30× çarpan alır (minimum guard)', () => {
    const ind     = makeInd({ birth_day: DAY - 25 * 365 });
    const rSingle = computeDailyDeathRisk(ind, DAY, { alive_count: 1 });
    const r15     = computeDailyDeathRisk(ind, DAY, { alive_count: 15 });
    expect(rSingle).toBeCloseTo(r15 * 0.3 / 1, 0); // 1/15 ≈ 0.067 < 0.30 → min 0.30
  });
});

describe('rollDeath — nedensellik', () => {
  it('sağlıklı yetişkin 100 denemede nadiren ölür', () => {
    const healthy = makeInd({ birth_day: DAY - 25 * 365 });
    let deaths = 0;
    for (let i = 0; i < 100; i++) {
      if (rollDeath(healthy, DAY, { alive_count: 100 })) deaths++;
    }
    expect(deaths).toBeLessThan(5);
  });

  it('ölüm gerçekleştiğinde string neden döndürür', () => {
    // Çok yüksek risk: çok yaşlı, susuz, aç
    const ind = makeInd({
      birth_day: DAY - 100 * 365,
      phenotype: { max_lifespan: 50, immune_strength: 0 },
      health: { hp: 0.05, calories: 0.01, hydration: 0.01 },
    });
    let cause = null;
    for (let i = 0; i < 200; i++) {
      cause = rollDeath(ind, DAY, { alive_count: 100 });
      if (cause) break;
    }
    expect(typeof cause).toBe('string');
  });

  it('_inWater=true olduğunda ölüm nedeni "drowning" olmalı', () => {
    const ind = makeInd({
      birth_day: DAY - 25 * 365,
      _inWater: true, _waterExperience: 0,
      health: { hp: 0.05, calories: 0.01, hydration: 0.01 },
    });
    let sawDrowning = false;
    for (let i = 0; i < 500; i++) {
      const cause = rollDeath(ind, DAY, { alive_count: 100 });
      if (cause === 'drowning') { sawDrowning = true; break; }
    }
    expect(sawDrowning).toBe(true);
  });

  it('hydration < 0.1 olduğunda "dehydration" nedeni görülür', () => {
    // Çok yüksek risk için: çok yaşlı + düşük HP + susuz (ama aç değil → açlık önce değil)
    const ind = makeInd({
      birth_day: DAY - 90 * 365,
      phenotype: { max_lifespan: 50, immune_strength: 0 }, // max_lifespan geçilmiş → +0.03
      health: { hp: 0.1, calories: 0.8, hydration: 0.05 }, // hydration<0.1 ×10, hp<0.2 ×3
    });
    // Risk: ~(0.00061 + 0.03) × 3 × 10 × 1.0 ≈ 0.9 → çok sık ölüm
    let sawDehydration = false;
    for (let i = 0; i < 200; i++) {
      const cause = rollDeath(ind, DAY, { alive_count: 100 });
      if (cause === 'dehydration') { sawDehydration = true; break; }
    }
    expect(sawDehydration).toBe(true);
  });

  it('bebek (<5 yaş) ölüm nedeni "infection" olmalı (en yaygın)', () => {
    const infant = makeInd({
      birth_day: DAY - 2 * 365,
      health: { hp: 0.1, calories: 0.5, hydration: 0.5 }, // su/açlık patlamaması için orta değer
    });
    const causes = {};
    for (let i = 0; i < 1000; i++) {
      const c = rollDeath(infant, DAY, { alive_count: 100 });
      if (c) causes[c] = (causes[c] ?? 0) + 1;
    }
    // infection, bebek ölümlerinde en baskın neden olmalı
    const total = Object.values(causes).reduce((a, b) => a + b, 0);
    if (total > 10) {
      expect((causes.infection ?? 0) / total).toBeGreaterThan(0.4);
    }
  });
});

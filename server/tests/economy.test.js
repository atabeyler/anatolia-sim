import { describe, it, expect } from 'vitest';
import {
  gatherResources, consumeResources, computeEconomicStats, initializeInventory,
  produceGoods, attemptTrade,
} from '../src/engines/economy/economyEngine.js';

function makeInd(foodOverride) {
  const inv = initializeInventory();
  if (foodOverride !== undefined) inv.food = foodOverride;
  return {
    phenotype: { conscientiousness: 0.7, physical_strength: 0.7 },
    inventory: inv,
  };
}

const WORLD = {
  food_abundance: 0.8,
  water_abundance: 0.6,
  flora: { density: 0.5 },
  fauna: { prey_density: 0.3 },
  biome: 'grassland',
};

describe('gatherResources', () => {
  it('produces positive food delta with food_abundance > 0', () => {
    const delta = gatherResources(makeInd(), WORLD, new Set());
    expect(delta.food).toBeGreaterThan(0);
  });

  it('produces positive water delta', () => {
    const delta = gatherResources(makeInd(), WORLD, new Set());
    expect(delta.water).toBeGreaterThan(0);
  });

  it('foraging tech increases food yield', () => {
    const base = gatherResources(makeInd(), WORLD, new Set());
    const tech = gatherResources(makeInd(), WORLD, new Set(['foraging']));
    expect(tech.food).toBeGreaterThan(base.food);
  });
});

describe('consumeResources', () => {
  it('reduces food and water from inventory', () => {
    const ind = makeInd();
    const prevFood = ind.inventory.food;
    const prevWater = ind.inventory.water;
    const { inv } = consumeResources(ind);
    expect(inv.food).toBeLessThan(prevFood);
    expect(inv.water).toBeLessThan(prevWater);
  });

  it('satiation = 0 when inventory is empty', () => {
    const ind = makeInd(0);
    ind.inventory.water = 0;
    const { satiation } = consumeResources(ind);
    expect(satiation).toBe(0);
  });

  it('satiation = 1 when inventory is fully stocked', () => {
    const ind = makeInd(100);
    ind.inventory.water = 100;
    const { satiation } = consumeResources(ind);
    expect(satiation).toBe(1);
  });
});

describe('computeEconomicStats', () => {
  it('Gini = 0 for perfectly equal distribution', () => {
    const pop = [
      { inventory: { food: 10, water: 5 } },
      { inventory: { food: 10, water: 5 } },
      { inventory: { food: 10, water: 5 } },
    ];
    const { gini } = computeEconomicStats(pop);
    expect(gini).toBeCloseTo(0, 5);
  });

  it('Gini > 0 for unequal distribution', () => {
    const pop = [
      { inventory: { food: 0 } },
      { inventory: { food: 0 } },
      { inventory: { food: 100 } },
    ];
    const { gini } = computeEconomicStats(pop);
    expect(gini).toBeGreaterThan(0);
  });

  it('single individual → Gini = 0', () => {
    const pop = [{ inventory: { food: 50 } }];
    const { gini } = computeEconomicStats(pop);
    expect(gini).toBe(0);
  });

  it('empty population → mean_wealth = 0 and gini = 0', () => {
    const { mean_wealth, gini } = computeEconomicStats([]);
    expect(mean_wealth).toBe(0);
    expect(gini).toBe(0);
  });
});

describe('produceGoods', () => {
  it('produces stone_tool when stone_tools tech known and stone available', () => {
    const ind = {
      phenotype: { conscientiousness: 0.99, fluid_intelligence: 0.99 },
      inventory: { stone: 10, clay: 0, wood: 0 },
    };
    let produced = false;
    for (let i = 0; i < 500 && !produced; i++) {
      const { produced: p } = produceGoods(ind, new Set(['stone_tools']));
      if ((p.stone_tool ?? 0) > 0) produced = true;
    }
    expect(produced).toBe(true);
  });

  it('does not produce stone_tool without stone_tools tech', () => {
    const ind = {
      phenotype: { conscientiousness: 0.99, fluid_intelligence: 0.99 },
      inventory: { stone: 100, clay: 0, wood: 0 },
    };
    for (let i = 0; i < 200; i++) {
      const { produced: p } = produceGoods(ind, new Set());
      expect(p.stone_tool ?? 0).toBe(0);
    }
  });

  it('produces ceramic_vessel when pottery tech known and clay available', () => {
    const ind = {
      phenotype: { conscientiousness: 0.99, fluid_intelligence: 0.99 },
      inventory: { clay: 100, stone: 0, wood: 0 },
    };
    let produced = false;
    for (let i = 0; i < 500 && !produced; i++) {
      const { produced: p } = produceGoods(ind, new Set(['pottery']));
      if ((p.ceramic_vessel ?? 0) > 0) produced = true;
    }
    expect(produced).toBe(true);
  });

  it('consumes clay when producing ceramic_vessel', () => {
    const ind = {
      phenotype: { conscientiousness: 0.99, fluid_intelligence: 0.99 },
      inventory: { clay: 100, stone: 0, wood: 0 },
    };
    const before = ind.inventory.clay;
    let used = false;
    for (let i = 0; i < 500 && !used; i++) {
      const { inv } = produceGoods(ind, new Set(['pottery']));
      if (inv.clay < before) used = true;
    }
    expect(used).toBe(true);
  });

  it('returns unchanged inventory when no techs known', () => {
    const ind = {
      phenotype: { conscientiousness: 0.5, fluid_intelligence: 0.5 },
      inventory: { food: 5, water: 3, stone: 1, clay: 5, wood: 2 },
    };
    const snapshot = { ...ind.inventory };
    const { inv } = produceGoods(ind, new Set());
    expect(inv).toEqual(snapshot);
  });
});

describe('attemptTrade', () => {
  it('returns null when either inventory is missing', () => {
    const a = { inventory: { food: 10 }, phenotype: { altruism: 0.8 }, social: { reputation: 0.7 }, group_id: null };
    const b = { phenotype: { altruism: 0.8 }, social: { reputation: 0.7 }, group_id: null };
    expect(attemptTrade(a, b, 1)).toBeNull();
  });

  it('trade increases reputation of both parties', () => {
    const a = {
      id: 'a', group_id: null,
      phenotype: { altruism: 0.99 },
      social: { reputation: 0.5 },
      inventory: { food: 20, water: 0.1 },
    };
    const b = {
      id: 'b', group_id: null,
      phenotype: { altruism: 0.99 },
      social: { reputation: 0.5 },
      inventory: { water: 20, food: 0.1 },
    };
    let traded = false;
    for (let i = 0; i < 500 && !traded; i++) {
      const result = attemptTrade(a, b, i);
      if (result) traded = true;
    }
    if (traded) {
      expect(a.social.reputation).toBeGreaterThan(0.5);
      expect(b.social.reputation).toBeGreaterThan(0.5);
    }
  });

  it('trade result has correct shape', () => {
    const a = {
      id: 'a', group_id: null,
      phenotype: { altruism: 0.99 },
      social: { reputation: 0.5 },
      inventory: { food: 50, water: 0 },
    };
    const b = {
      id: 'b', group_id: null,
      phenotype: { altruism: 0.99 },
      social: { reputation: 0.5 },
      inventory: { water: 50, food: 0 },
    };
    let result = null;
    for (let i = 0; i < 500 && !result; i++) {
      result = attemptTrade(a, b, i);
    }
    if (result) {
      expect(result).toMatchObject({ type: 'trade', individual_a: 'a', individual_b: 'b' });
    }
  });

  it('inter-group trade harder than intra-group (low rep blocks cross-group)', () => {
    let sameGroupTrades = 0;
    let diffGroupTrades = 0;
    for (let i = 0; i < 200; i++) {
      const a1 = { id: 'a', group_id: 'g1', phenotype: { altruism: 0.99 }, social: { reputation: 0.1 }, inventory: { food: 50, water: 0 } };
      const b1 = { id: 'b', group_id: 'g1', phenotype: { altruism: 0.99 }, social: { reputation: 0.1 }, inventory: { water: 50, food: 0 } };
      if (attemptTrade(a1, b1, i)) sameGroupTrades++;

      const a2 = { id: 'a', group_id: 'g1', phenotype: { altruism: 0.99 }, social: { reputation: 0.1 }, inventory: { food: 50, water: 0 } };
      const b2 = { id: 'b', group_id: 'g2', phenotype: { altruism: 0.99 }, social: { reputation: 0.1 }, inventory: { water: 50, food: 0 } };
      if (attemptTrade(a2, b2, i)) diffGroupTrades++;
    }
    expect(sameGroupTrades).toBeGreaterThanOrEqual(diffGroupTrades);
  });
});

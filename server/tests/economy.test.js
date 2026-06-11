import { describe, it, expect } from 'vitest';
import {
  gatherResources, consumeResources, computeEconomicStats, initializeInventory
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

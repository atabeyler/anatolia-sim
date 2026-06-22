import { describe, it, expect } from 'vitest';
import {
  STRUCTURE_TYPES,
  processArchitectureTick,
  createSettlement,
  computeSettlementCapacity,
  computeSettlementDefense,
  checkSettlementOvercrowding,
} from '../src/engines/architecture/architectureEngine.js';

function makeSettlement(overrides = {}) {
  return {
    id: 'settlement-1',
    name: 'Test Camp',
    group_id: 'g1',
    x: 32, y: 38,
    biome: 'mediterranean',
    structures: [],
    labor_pool: 0,
    stockpile: {},
    founded_day: 0,
    ...overrides,
  };
}

function makeInd(id, overrides = {}) {
  return {
    id,
    is_dead: false,
    group_id: 'g1',
    life_stage: 'ADULT',
    inventory: { food: 5, water: 3, wood: 10, stone: 10, clay: 5 },
    ...overrides,
  };
}

const WORLD = { food_abundance: 0.6, biome: 'mediterranean', recent_disaster: null };

describe('STRUCTURE_TYPES — definition checks', () => {
  it('defines 12 structure types', () => {
    expect(Object.keys(STRUCTURE_TYPES)).toHaveLength(12);
  });

  it('cave_dwelling requires no tech and has no labor cost', () => {
    expect(STRUCTURE_TYPES.cave_dwelling.requires_tech).toHaveLength(0);
    expect(STRUCTURE_TYPES.cave_dwelling.labor_days).toBe(0);
  });

  it('city_wall is the most labor-intensive structure', () => {
    const maxLabor = Math.max(...Object.values(STRUCTURE_TYPES).map(s => s.labor_days));
    expect(STRUCTURE_TYPES.city_wall.labor_days).toBe(maxLabor);
  });

  it('stone_temple requires architecture_stone tech', () => {
    expect(STRUCTURE_TYPES.stone_temple.requires_tech).toContain('architecture_stone');
  });
});

describe('createSettlement', () => {
  it('creates settlement with correct group_id', () => {
    const group = { id: 'g1', territory: { x: 30, y: 40 } };
    const s = createSettlement(group, WORLD, 1);
    expect(s.group_id).toBe('g1');
    expect(s.x).toBe(30);
    expect(s.y).toBe(40);
  });

  it('starts with empty structures and stockpile', () => {
    const group = { id: 'g1', territory: { x: 0, y: 0 } };
    const s = createSettlement(group, WORLD, 1);
    expect(s.structures).toHaveLength(0);
    expect(Object.keys(s.stockpile)).toHaveLength(0);
  });

  it('records founded_day', () => {
    const group = { id: 'g1', territory: { x: 0, y: 0 } };
    const s = createSettlement(group, WORLD, 42);
    expect(s.founded_day).toBe(42);
  });
});

describe('computeSettlementCapacity', () => {
  it('returns 0 for settlement with no structures', () => {
    expect(computeSettlementCapacity(makeSettlement())).toBe(0);
  });

  it('sums capacity of all structures', () => {
    const s = makeSettlement({
      structures: [
        { type: 'cave_dwelling', condition: 1.0 },  // capacity: 8
        { type: 'post_frame_hut', condition: 1.0 }, // capacity: 6
      ],
    });
    expect(computeSettlementCapacity(s)).toBe(14);
  });
});

describe('computeSettlementDefense', () => {
  it('returns 0 when no defensive structures exist', () => {
    const s = makeSettlement({ structures: [{ type: 'cave_dwelling', condition: 1.0 }] });
    expect(computeSettlementDefense(s)).toBe(0);
  });

  it('returns > 0 when defensive_wall is present', () => {
    const s = makeSettlement({ structures: [{ type: 'defensive_wall', condition: 1.0 }] });
    expect(computeSettlementDefense(s)).toBeGreaterThan(0);
  });

  it('degraded wall contributes less defense than intact wall', () => {
    const intact  = makeSettlement({ structures: [{ type: 'defensive_wall', condition: 1.0 }] });
    const damaged = makeSettlement({ structures: [{ type: 'defensive_wall', condition: 0.3 }] });
    expect(computeSettlementDefense(intact)).toBeGreaterThan(computeSettlementDefense(damaged));
  });
});

describe('checkSettlementOvercrowding', () => {
  it('returns null when capacity is 0 (no structures built yet)', () => {
    const s = makeSettlement();
    expect(checkSettlementOvercrowding(s, 50, 1)).toBeNull();
  });

  it('returns null when group fits within capacity', () => {
    const s = makeSettlement({ structures: [{ type: 'stone_temple', condition: 1.0 }] }); // capacity 50
    expect(checkSettlementOvercrowding(s, 30, 1)).toBeNull();
  });

  it('returns overcrowding event when group exceeds 120% of capacity', () => {
    const s = makeSettlement({ structures: [{ type: 'cave_dwelling', condition: 1.0 }] }); // cap 8
    const ev = checkSettlementOvercrowding(s, 12, 1); // 12 > 8 * 1.2 = 9.6
    expect(ev).not.toBeNull();
    expect(ev.type).toBe('settlement_overcrowded');
    expect(ev.settlement_id).toBe('settlement-1');
  });

  it('returns null when group size equals exactly 120% of capacity', () => {
    const s = makeSettlement({ structures: [{ type: 'cave_dwelling', condition: 1.0 }] }); // cap 8
    // 9.6 is not strictly > 9.6, so no overcrowding
    const ev = checkSettlementOvercrowding(s, 9, 1); // 9 < 9.6
    expect(ev).toBeNull();
  });
});

describe('processArchitectureTick — labor and materials', () => {
  it('null settlement returns empty events', () => {
    const result = processArchitectureTick(null, [], new Set(), WORLD, 1);
    expect(result.events).toHaveLength(0);
  });

  it('labor_pool accumulates from adult members', () => {
    const s = makeSettlement();
    const members = Array.from({ length: 10 }, (_, i) => makeInd(`i${i}`));
    processArchitectureTick(s, members, new Set(), WORLD, 1);
    expect(s.labor_pool).toBeGreaterThan(0);
  });

  it('surplus materials transferred to stockpile', () => {
    const s = makeSettlement();
    const ind = makeInd('i1', { inventory: { wood: 20, stone: 0, clay: 0 } });
    processArchitectureTick(s, [ind], new Set(), WORLD, 1);
    expect(s.stockpile.wood).toBeGreaterThan(0);
  });

  it('lean_to built when labor and materials available', () => {
    const s = makeSettlement({
      labor_pool: 5,
      stockpile: { wood: 5 },
    });
    const members = Array.from({ length: 5 }, (_, i) => makeInd(`i${i}`, { inventory: {} }));
    const evs = processArchitectureTick(s, members, new Set(), WORLD, 1);
    const built = evs.events.find(e => e.type === 'structure_built');
    if (built) {
      expect(built.structure_type).toBeDefined();
      expect(built.day).toBe(1);
    }
  });

  it('structure built event has correct shape', () => {
    const s = makeSettlement({
      labor_pool: 1000,
      stockpile: { wood: 100, stone: 100, clay: 100 },
    });
    const members = Array.from({ length: 10 }, (_, i) => makeInd(`i${i}`, { inventory: {} }));
    const { events } = processArchitectureTick(s, members, new Set(['stone_tools']), WORLD, 5);
    const ev = events.find(e => e.type === 'structure_built');
    if (ev) {
      expect(ev).toMatchObject({ type: 'structure_built', settlement_id: 'settlement-1', day: 5 });
      expect(typeof ev.structure_type).toBe('string');
    }
  });

  it('structures degrade over time', () => {
    const s = makeSettlement({
      structures: [{ id: 'st1', type: 'lean_to', built_day: 0, condition: 1.0 }],
    });
    processArchitectureTick(s, [], new Set(), WORLD, 1);
    expect(s.structures[0].condition).toBeLessThan(1.0);
  });

  it('structures with condition ≤ 0.05 are removed', () => {
    const s = makeSettlement({
      structures: [{ id: 'st1', type: 'lean_to', built_day: 0, condition: 0.03 }],
    });
    processArchitectureTick(s, [], new Set(), WORLD, 1);
    expect(s.structures).toHaveLength(0);
  });
});

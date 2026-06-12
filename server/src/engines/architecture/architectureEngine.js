// Architecture Engine
const YAPI_TR = {
  cave_dwelling: 'mağara konutu',
  lean_to: 'sığınak',
  pit_house: 'çukur ev',
  post_frame_hut: 'direkli kulübe',
  storage_pit: 'depo çukuru',
  mud_brick_house: 'kerpiç ev',
  granary: 'tahıl ambarı',
  defensive_wall: 'savunma duvarı',
  stone_temple: 'taş tapınak',
  stone_house: 'taş ev',
  marketplace: 'pazar yeri',
  city_wall: 'şehir surları'
};

export const STRUCTURE_TYPES = {
  cave_dwelling: {
    tier: 0,
    capacity: 8,
    requires_tech: [],
    materials: [],
    labor_days: 0,
    durability: 1.0
  },
  lean_to: {
    tier: 0,
    capacity: 4,
    requires_tech: [],
    materials: ['wood'],
    labor_days: 1,
    durability: 0.2
  },
  pit_house: {
    tier: 1,
    capacity: 6,
    requires_tech: ['stone_tools'],
    materials: ['wood', 'stone'],
    labor_days: 5,
    durability: 0.5
  },
  post_frame_hut: {
    tier: 1,
    capacity: 6,
    requires_tech: ['stone_tools'],
    materials: ['wood'],
    labor_days: 4,
    durability: 0.4
  },
  storage_pit: {
    tier: 1,
    capacity: 0,
    requires_tech: ['stone_tools'],
    materials: [],
    labor_days: 2,
    durability: 0.7,
    purpose: 'storage'
  },
  mud_brick_house: {
    tier: 2,
    capacity: 8,
    requires_tech: ['pottery', 'plant_cultivation'],
    materials: ['clay'],
    labor_days: 15,
    durability: 0.7
  },
  granary: {
    tier: 2,
    capacity: 0,
    requires_tech: ['plant_cultivation', 'pottery'],
    materials: ['clay', 'wood'],
    labor_days: 10,
    durability: 0.6,
    purpose: 'granary'
  },
  defensive_wall: {
    tier: 2,
    capacity: 0,
    requires_tech: ['stone_tools'],
    materials: ['stone', 'wood'],
    labor_days: 20,
    durability: 0.8,
    purpose: 'defense'
  },
  stone_temple: {
    tier: 3,
    capacity: 50,
    requires_tech: ['architecture_stone', 'metallurgy_copper'],
    materials: ['stone'],
    labor_days: 200,
    durability: 1.0,
    purpose: 'ritual'
  },
  stone_house: {
    tier: 3,
    capacity: 10,
    requires_tech: ['architecture_stone'],
    materials: ['stone'],
    labor_days: 30,
    durability: 1.0
  },
  marketplace: {
    tier: 3,
    capacity: 100,
    requires_tech: ['wheel', 'writing_system'],
    materials: ['stone', 'wood'],
    labor_days: 50,
    durability: 0.9,
    purpose: 'trade'
  },
  city_wall: {
    tier: 3,
    capacity: 0,
    requires_tech: ['architecture_stone', 'metallurgy_copper'],
    materials: ['stone'],
    labor_days: 500,
    durability: 1.0,
    purpose: 'defense'
  }
};

const BUILD_MATERIALS = ['wood', 'stone', 'clay', 'flint', 'bone', 'hide'];
const KEEP_THRESHOLD = 2.0; // individuals keep this much, donate rest to stockpile

export function processArchitectureTick(settlement, population, discoveredTechs, worldState, simDay) {
  if (!settlement) return { events: [] };
  const events = [];
  const members = population.filter(i => i.group_id === settlement.group_id && !i.is_dead);
  const groupSize = members.length;
  if (!settlement.structures) settlement.structures = [];
  if (!settlement.labor_pool) settlement.labor_pool = 0;
  if (!settlement.stockpile) settlement.stockpile = {};
  settlement.labor_pool += members.filter(i => i.life_stage === 'ADULT').length * 0.1;
  // Collect surplus building materials from group members into settlement stockpile
  for (const ind of members) {
    if (!ind.inventory) continue;
    for (const mat of BUILD_MATERIALS) {
      const held = ind.inventory[mat] ?? 0;
      if (held > KEEP_THRESHOLD) {
        const surplus = held - KEEP_THRESHOLD;
        settlement.stockpile[mat] = (settlement.stockpile[mat] ?? 0) + surplus;
        ind.inventory[mat] = KEEP_THRESHOLD;
      }
    }
  }
  const p = getBuildPriority(settlement, groupSize, worldState);
  if (p) {
    if (p.requires_tech.every(ft => discoveredTechs.has(ft))) {
      const st = STRUCTURE_TYPES[p.id];
      if (st && settlement.labor_pool >= st.labor_days && hasMat(settlement, st.materials)) {
        consumeMat(settlement, st.materials);
        settlement.labor_pool -= st.labor_days;
        settlement.structures.push({
          id: `struct_${simDay}_${Math.random().toString(36).slice(2, 6)}`,
          type: p.id,
          built_day: simDay,
          condition: 1.0
        });
        events.push({
          type: 'structure_built',
          structure_type: p.id,
          settlement_id: settlement.id,
          day: simDay,
          importance: st.tier >= 3 ? 'high' : 'medium',
          description: `${settlement.name ?? 'Yerleşim'}, ${YAPI_TR[p.id] ?? p.id.replace(/_/g, ' ')} inşaatını tamamladı`
        });
      }
    }
  }
  for (const s of settlement.structures) {
    const d = STRUCTURE_TYPES[s.type];
    s.condition = Math.max(s.condition - (d ? (1 - d.durability) * 0.001 : 0.002), 0);
  }
  settlement.structures = settlement.structures.filter(s => s.condition > 0.05);
  return { events };
}

function getBuildPriority(s, gs, ws) {
  const ex = new Set(s.structures?.map(x => x.type) ?? []);
  if (!ex.has('lean_to') && !ex.has('pit_house') && !ex.has('mud_brick_house')) {
    return { id: 'lean_to', requires_tech: [] };
  }
  if (gs >= 6 && !ex.has('storage_pit')) return { id: 'storage_pit', requires_tech: ['stone_tools'] };
  if (gs >= 8 && !ex.has('mud_brick_house')) return { id: 'mud_brick_house', requires_tech: ['pottery'] };
  if (gs >= 10 && !ex.has('granary')) return { id: 'granary', requires_tech: ['plant_cultivation'] };
  if (ws.recent_disaster === 'conflict' && !ex.has('defensive_wall')) {
    return { id: 'defensive_wall', requires_tech: ['stone_tools'] };
  }
  if (gs >= 20 && !ex.has('stone_temple')) return { id: 'stone_temple', requires_tech: ['architecture_stone'] };
  return null;
}

function hasMat(s, m) {
  if (!m || m.length === 0) return true;
  return m.every(x => (s.stockpile?.[x] ?? 0) >= 1);
}

function consumeMat(s, m) {
  if (!s.stockpile) s.stockpile = {};
  for (const x of m) s.stockpile[x] = Math.max((s.stockpile[x] ?? 0) - 1, 0);
}

export function computeSettlementCapacity(s) {
  return (s.structures ?? []).reduce((c, x) => c + (STRUCTURE_TYPES[x.type]?.capacity ?? 0), 0);
}

export function checkSettlementOvercrowding(settlement, groupSize, simDay) {
  const cap = computeSettlementCapacity(settlement);
  if (cap > 0 && groupSize > cap * 1.2) {
    return {
      type: 'settlement_overcrowded',
      settlement_id: settlement.id,
      day: simDay,
      importance: 'medium',
      description: `${settlement.name ?? 'Yerleşim'} doldu taştı — ${groupSize} birey, mevcut kapasite: ${cap}`
    };
  }
  return null;
}

export function computeSettlementDefense(s) {
  return (
    s.structures?.filter(x => x.type === 'defensive_wall' || x.type === 'city_wall') ?? []
  ).reduce((d, w) => d + w.condition * 0.5, 0);
}

export function createSettlement(group, worldState, simDay) {
  return {
    id: `settlement_${simDay}_${Math.random().toString(36).slice(2, 6)}`,
    name: null,
    group_id: group.id,
    x: group.territory?.x ?? 0,
    y: group.territory?.y ?? 0,
    biome: worldState.biome,
    structures: [],
    labor_pool: 0,
    stockpile: {},
    founded_day: simDay
  };
}

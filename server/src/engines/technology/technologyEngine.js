export const TECH_TREE = {
  fire_making:     { tier: 0, requires: [], difficulty: 0.8, iq_min: 0.3,  env_trigger: 'any' },
  stone_tools:     { tier: 0, requires: [], difficulty: 0.6, iq_min: 0.25, env_trigger: 'any' },
  foraging:        { tier: 0, requires: [], difficulty: 0.3, iq_min: 0.2,  env_trigger: 'any' },
  hunting_spear:   { tier: 1, requires: ['stone_tools'],   difficulty: 1.2, iq_min: 0.35, env_trigger: 'fauna_present' },
  shelter_basic:   { tier: 1, requires: [],                difficulty: 0.9, iq_min: 0.3,  env_trigger: 'cold_or_rain' },
  water_container: { tier: 1, requires: ['stone_tools'],   difficulty: 1.0, iq_min: 0.3,  env_trigger: 'water_need' },
  animal_trap:     { tier: 1, requires: ['stone_tools'],   difficulty: 1.3, iq_min: 0.4,  env_trigger: 'fauna_present' },
  clothing_basic:  { tier: 1, requires: [],                difficulty: 1.1, iq_min: 0.3,  env_trigger: 'cold' },
  fishing:         { tier: 2, requires: ['stone_tools'],         difficulty: 1.4, iq_min: 0.4,  env_trigger: 'water_nearby' },
  plant_cultivation:{ tier: 2, requires: ['foraging'],           difficulty: 2.0, iq_min: 0.5,  env_trigger: 'seasonal_plants' },
  animal_herding:  { tier: 2, requires: ['animal_trap'],         difficulty: 2.5, iq_min: 0.55, env_trigger: 'herdable_animals' },
  food_preservation:{ tier: 2, requires: ['fire_making'],        difficulty: 1.8, iq_min: 0.45, env_trigger: 'any' },
  bow_arrow:       { tier: 2, requires: ['hunting_spear'],       difficulty: 2.2, iq_min: 0.5,  env_trigger: 'any' },
  pottery:         { tier: 3, requires: ['plant_cultivation','fire_making'], difficulty: 3.0, iq_min: 0.55, env_trigger: 'clay_nearby' },
  weaving:         { tier: 3, requires: ['clothing_basic'],      difficulty: 2.8, iq_min: 0.5,  env_trigger: 'plant_fibers' },
  metallurgy_copper:{ tier: 3, requires: ['fire_making','stone_tools'], difficulty: 4.0, iq_min: 0.6, env_trigger: 'copper_ore' },
  writing_system:  { tier: 3, requires: ['pottery'],             difficulty: 5.0, iq_min: 0.7,  env_trigger: 'trade_need', language_stage_min: 5 },
  calendar:        { tier: 3, requires: ['plant_cultivation'],   difficulty: 3.5, iq_min: 0.6,  env_trigger: 'any', language_stage_min: 4 },
  mathematics_basic:{ tier: 3, requires: ['writing_system'],     difficulty: 4.5, iq_min: 0.65, env_trigger: 'any' },
  architecture_stone:{ tier: 4, requires: ['metallurgy_copper'], difficulty: 5.5, iq_min: 0.65, env_trigger: 'stone_available' },
  wheel:           { tier: 4, requires: ['metallurgy_copper'],   difficulty: 5.0, iq_min: 0.65, env_trigger: 'any' },
  irrigation:      { tier: 4, requires: ['plant_cultivation','wheel'], difficulty: 5.5, iq_min: 0.65, env_trigger: 'river_nearby' },
  sailing:         { tier: 4, requires: ['fishing','wheel'],     difficulty: 5.5, iq_min: 0.65, env_trigger: 'coastal_or_river' },
  metallurgy_iron: { tier: 4, requires: ['metallurgy_copper'],   difficulty: 6.0, iq_min: 0.7,  env_trigger: 'iron_ore' },
};

// Iterative discovery: each eligible tick adds progress; discovery fires when >= 1.0.
// Multiple individuals contributing to the same technology speeds up discovery
// proportionally — collective problem-solving, not a single lucky roll.
export function tryDiscoverTech(individual, discoveredTechs, worldState, simDay, techProgress) {
  const discoveries = [];
  for (const techId of Object.keys(TECH_TREE)) {
    if (discoveredTechs.has(techId)) continue;
    const p = computeDiscoveryProbability(individual, techId, discoveredTechs, worldState);
    if (p <= 0) continue;
    const prev = techProgress?.get(techId) ?? 0;
    const next = prev + p;
    if (techProgress) techProgress.set(techId, next);
    if (next >= 1.0) {
      discoveries.push({ tech_id: techId, discoverer_id: individual.id, discovery_day: simDay, x: individual.x, y: individual.y });
      discoveredTechs.add(techId);
      if (techProgress) techProgress.delete(techId);
    }
  }
  return discoveries;
}

export function computeDiscoveryProbability(individual, techId, discoveredTechs, worldState) {
  const tech = TECH_TREE[techId];
  if (!tech) return 0;
  if (tech.requires?.some(p => !discoveredTechs.has(p))) return 0;
  if (individual.phenotype.fluid_intelligence < tech.iq_min) return 0;
  if (tech.language_stage_min && individual.language.stage < tech.language_stage_min) return 0;
  if (!checkEnvTrigger(tech.env_trigger, worldState)) return 0;
  return Math.min((individual.phenotype.curiosity * individual.phenotype.fluid_intelligence * 0.5) / (tech.difficulty * 500), 0.05);
}

function checkEnvTrigger(trigger, ws) {
  if (!trigger || trigger === 'any') return true;
  const checks = {
    fauna_present:    () => ws.fauna?.prey_density > 0.2,
    water_nearby:     () => ws.water_abundance > 0.3,
    cold:             () => ws.temperature < 10,
    cold_or_rain:     () => ws.temperature < 15 || ws.season === 'spring',
    seasonal_plants:  () => ws.food_abundance > 0.4 && ws.season !== 'winter',
    herdable_animals: () => ws.fauna?.prey_density > 0.4,
    clay_nearby:      () => ['coastal','temperate_forest','grassland'].includes(ws.biome),
    plant_fibers:     () => ws.flora?.density > 0.4,
    copper_ore:       () => ['mountain','mediterranean'].includes(ws.biome),
    iron_ore:         () => ws.biome !== 'desert',
    river_nearby:     () => ws.water_abundance > 0.5,
    coastal_or_river: () => ws.water_abundance > 0.4,
    water_need:       () => (ws.water_abundance ?? 0.5) < 0.4,
    trade_need:       () => (ws.alive_count ?? 0) >= 15,
    stone_available:  () => !['desert','tundra','tropical_rainforest'].includes(ws.biome),
  };
  return checks[trigger]?.() ?? true;
}

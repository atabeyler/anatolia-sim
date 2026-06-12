export const TECH_TREE = {
  fire_making:     { tier: 0, requires: [], difficulty: 0.8, iq_min: 0.3,  env_trigger: 'any' },
  stone_tools:     { tier: 0, requires: [], difficulty: 0.6, iq_min: 0.25, env_trigger: 'any' },
  foraging:        { tier: 0, requires: [], difficulty: 0.3, iq_min: 0.2,  env_trigger: 'any' },
  hunting_spear:   { tier: 1, requires: ['stone_tools'],   difficulty: 1.2, iq_min: 0.35, env_trigger: 'fauna_present' },
  shelter_basic:   { tier: 1, requires: [],                difficulty: 0.9, iq_min: 0.3,  env_trigger: 'cold_or_rain' },
  water_container: { tier: 1, requires: ['stone_tools'],   difficulty: 1.0, iq_min: 0.3,  env_trigger: 'water_need' },
  animal_trap:     { tier: 1, requires: ['stone_tools'],   difficulty: 1.3, iq_min: 0.4,  env_trigger: 'fauna_present' },
  clothing_basic:  { tier: 1, requires: [],                difficulty: 1.1, iq_min: 0.3,  env_trigger: 'cold' },
  swimming:        { tier: 1, requires: [],                      difficulty: 1.0, iq_min: 0.25, env_trigger: 'water_nearby' },
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

// Observational technology learning: an individual learns a tech by observing
// a nearby peer who personally knows it (cardinal rule: only via observation).
export function learnTechFromObservation(individual, nearby, discoveredTechs) {
  if (!nearby || nearby.length === 0) return;
  if (!individual.known_techs) individual.known_techs = new Set();
  for (const other of nearby) {
    if (!other.known_techs || other.id === individual.id) continue;
    for (const techId of other.known_techs) {
      if (individual.known_techs.has(techId)) continue;
      const tech = TECH_TREE[techId];
      if (!tech) continue;
      if ((individual.phenotype?.fluid_intelligence ?? 0) < tech.iq_min) continue;
      // Observational rate: curiosity × IQ, difficulty-scaled; slower than discovery
      const rate = ((individual.phenotype?.curiosity ?? 0.5) * (individual.phenotype?.fluid_intelligence ?? 0.5)) / (tech.difficulty * 2000);
      if (Math.random() < rate) individual.known_techs.add(techId);
    }
  }
}

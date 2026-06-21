/**
 * Activity Engine — Physical Experience & Emergent Technology
 *
 * Every day, each individual gains experience purely from what they DO
 * and what their environment offers — completely independent of the
 * economy system. No inventory checks. No probability.
 *
 * When a combination of experiences crosses a structural threshold
 * (divided by the individual's own learning capacity), a technology
 * emerges. No random roll anywhere.
 */

// ── Technology emergence thresholds ───────────────────────────────────────────
// ALL listed skills must simultaneously exceed their threshold.
// Effective threshold = base / learningFactor(ind).
// SYNC NOTE: Every tech key here MUST also exist in technologyEngine.js TECH_TREE,
// and vice versa — the two representations must stay in lock-step.
export const TECH_SKILLS = {
  // Tier 0
  stone_tools:        { prereqs: [],                              skills: { stone_handling: 1500 } },
  foraging:           { prereqs: [],                              skills: { plant_gathering: 1200 } },
  fire_making:        { prereqs: [],                              skills: { stone_handling: 1000, wood_friction: 700 } },

  // Tier 1
  hunting_spear:      { prereqs: ['stone_tools'],                 skills: { hunting_practice: 1500, wood_friction: 800 } },
  shelter_basic:      { prereqs: [],                              skills: { wood_friction: 1500, stone_handling: 500 } },
  water_container:    { prereqs: ['stone_tools'],                 skills: { water_carrying: 1500, hide_working: 600 } },
  animal_trap:        { prereqs: ['stone_tools'],                 skills: { animal_observation: 2000, wood_friction: 800 } },
  clothing_basic:     { prereqs: ['stone_tools'],                 skills: { hide_working: 2000 } },

  // Tier 2
  fishing:            { prereqs: ['stone_tools'],                 skills: { water_carrying: 1200, animal_observation: 1000 } },
  plant_cultivation:  { prereqs: ['foraging'],                    skills: { farming_observation: 3000 } },
  animal_herding:     { prereqs: ['animal_trap'],                 skills: { animal_observation: 4000 } },
  food_preservation:  { prereqs: ['fire_making'],                 skills: { wood_friction: 1500, plant_gathering: 1500 } },
  bow_arrow:          { prereqs: ['hunting_spear'],               skills: { hunting_practice: 3000, wood_friction: 2000 } },

  // Tier 3
  pottery:            { prereqs: ['plant_cultivation', 'fire_making'], skills: { clay_working: 4000 } },
  weaving:            { prereqs: ['clothing_basic'],              skills: { fiber_working: 4000, hide_working: 1000 } },
  metallurgy_copper:  { prereqs: ['fire_making', 'stone_tools'], skills: { metal_working: 4000 } },
  writing_system:     { prereqs: ['pottery'],                     skills: { social_exchange: 8000, clay_working: 3000 }, langMin: 5 },
  calendar:           { prereqs: ['plant_cultivation'],           skills: { sky_observation: 10000, farming_observation: 3000 }, langMin: 4 },
  mathematics_basic:  { prereqs: ['writing_system'],              skills: { social_exchange: 12000, sky_observation: 5000 } },

  // Tier 4
  architecture_stone: { prereqs: ['metallurgy_copper'],           skills: { stone_handling: 10000, wood_friction: 6000 } },
  wheel:              { prereqs: ['metallurgy_copper'],           skills: { stone_handling: 8000, wood_friction: 8000 } },
  irrigation:         { prereqs: ['plant_cultivation', 'wheel'], skills: { farming_observation: 10000, water_carrying: 5000 } },
  sailing:            { prereqs: ['fishing', 'wheel'],           skills: { water_carrying: 10000, wood_friction: 10000 } },
  metallurgy_iron:    { prereqs: ['metallurgy_copper'],           skills: { metal_working: 10000 } },

  // Swimming: accumulated water-carrying experience near water bodies eventually
  // produces deliberate swimming technique. No language prerequisite — purely physical.
  swimming:           { prereqs: [],                              skills: { water_carrying: 2000 } },
};

const IQ_MINIMUMS = {
  fire_making: 0.3, stone_tools: 0.25, foraging: 0.2,
  hunting_spear: 0.35, shelter_basic: 0.3, water_container: 0.3,
  animal_trap: 0.4, clothing_basic: 0.3, fishing: 0.4,
  plant_cultivation: 0.5, animal_herding: 0.55, food_preservation: 0.45,
  bow_arrow: 0.5, pottery: 0.55, weaving: 0.5,
  metallurgy_copper: 0.6, writing_system: 0.7, calendar: 0.6,
  mathematics_basic: 0.65, architecture_stone: 0.65, wheel: 0.65,
  irrigation: 0.65, sailing: 0.65, metallurgy_iron: 0.7,
  swimming: 0.2,
};

/**
 * Accumulate physical experience from today's action and environment.
 * No economy, no inventory — only what the agent does and where they are.
 */
export function accumulateExperience(ind, worldState) {
  if (!ind._experience) ind._experience = {};
  const exp    = ind._experience;
  const action = ind._currentAction ?? 'explore';
  const biome  = worldState?.biome ?? 'grassland';
  const temp   = worldState?.temperature ?? 20;
  const season = worldState?.season ?? 'summer';
  const fauna  = (worldState?.fauna?.prey_density ?? 0) > 0.2;
  const water  = (worldState?.water_abundance ?? 0) > 0.2;

  // Individual learning capacity — smarter, more curious agents learn more
  // from the same physical activity. Range: ~0.04 to ~1.0.
  const iq  = ind.phenotype?.fluid_intelligence ?? 0.5;
  const cur = ind.phenotype?.curiosity          ?? 0.5;
  const lr  = iq * cur;

  function gain(skill, amount) {
    exp[skill] = (exp[skill] ?? 0) + amount * lr;
  }

  // ── Stone handling ─────────────────────────────────────────────────────────
  // Stones are part of daily life in almost every terrestrial biome.
  // Foraging, exploring, and crafting all involve picking up, striking, testing stones.
  const stonesPresent = !['open_ocean'].includes(biome);
  if (stonesPresent) {
    if (action === 'craft')                          gain('stone_handling', 1.0);
    else if (action === 'forage' || action === 'hunt') gain('stone_handling', 0.7);
    else if (action === 'explore')                   gain('stone_handling', 0.3);
  }

  // ── Wood friction ──────────────────────────────────────────────────────────
  // Handling branches, sticks — shaping, rubbing, testing flexibility.
  const woodPresent = ['temperate_forest', 'tropical_rainforest', 'mediterranean', 'grassland', 'tropical_savanna'].includes(biome);
  if (woodPresent) {
    if (action === 'craft')   gain('wood_friction', 1.0);
    else if (action === 'forage' || action === 'explore') gain('wood_friction', 0.3);
  }

  // ── Plant gathering ────────────────────────────────────────────────────────
  // Collecting, testing, sorting plants — the foundation of foraging knowledge.
  const plantsPresent = ['grassland', 'temperate_forest', 'mediterranean', 'tropical_rainforest', 'tropical_savanna'].includes(biome);
  if (plantsPresent) {
    if (action === 'forage')  gain('plant_gathering', 1.0);
    else if (action === 'explore') gain('plant_gathering', 0.2);
  }

  // ── Farming observation ────────────────────────────────────────────────────
  // Noticing how seeds fall, sprout, and grow in patterns. Very gradual.
  if (plantsPresent && action === 'forage') {
    gain('farming_observation', season === 'spring' ? 0.6 : 0.1);
  }
  if (action === 'explore' && season === 'spring') {
    gain('farming_observation', 0.1);
  }

  // ── Hunting practice ───────────────────────────────────────────────────────
  // Actively chasing, tracking, cornering prey.
  if (fauna && action === 'hunt') {
    gain('hunting_practice', 1.0);
    gain('animal_observation', 0.5);
    gain('hide_working', 0.4);  // butchering follows hunting
  }

  // ── Animal observation ─────────────────────────────────────────────────────
  // Watching animal behavior, patterns, herding tendencies.
  if (fauna && action === 'explore') {
    gain('animal_observation', 0.5);
  }

  // ── Water carrying ─────────────────────────────────────────────────────────
  // Repeatedly attempting to transport water; thirst drives experimentation.
  if (water) {
    const thirsty = (ind.health?.hydration ?? 0.7) < 0.5;
    gain('water_carrying', thirsty ? 1.0 : (action === 'drink' ? 0.6 : 0.1));
  }

  // ── Hide working ───────────────────────────────────────────────────────────
  // Working animal skins — scraping, stretching, softening — after kills.
  if (fauna && action === 'craft') {
    gain('hide_working', 0.6);
  }

  // ── Clay working ───────────────────────────────────────────────────────────
  // Clay is only useful once you know how to harden it — requires fire first.
  const clayPresent = ['coastal', 'temperate_forest', 'grassland', 'mediterranean'].includes(biome);
  if (clayPresent && action === 'craft' && ind.known_techs?.has?.('fire_making')) {
    gain('clay_working', 1.0);
  }

  // ── Fiber working ──────────────────────────────────────────────────────────
  // Twisting, braiding plant fibers while crafting or resting.
  if (plantsPresent && action === 'craft') {
    gain('fiber_working', 0.8);
  }

  // ── Metal working ──────────────────────────────────────────────────────────
  // Ore deposits only matter once you know how to apply fire to them.
  const orePresent = ['mountain', 'mediterranean'].includes(biome);
  if (orePresent && action === 'craft' && ind.known_techs?.has?.('fire_making')) {
    gain('metal_working', 1.0);
  }

  // ── Social exchange ────────────────────────────────────────────────────────
  // Communicating, teaching, trading — precursor to symbolic recording.
  if (action === 'socialize') {
    gain('social_exchange', 1.0);
  }

  // ── Sky observation ────────────────────────────────────────────────────────
  // Noticing sun/moon/star positions while exploring. Very slow accumulation.
  if (action === 'explore') {
    gain('sky_observation', 0.3);
  }
}

/**
 * Deterministic technology emergence.
 * Called each tick after accumulateExperience.
 * Returns array of newly emerged tech IDs (may be empty).
 */
export function checkTechEmergence(ind, discoveredTechs) {
  const emerged = [];
  if (!ind._experience) return emerged;

  const exp    = ind._experience;
  const known  = ind.known_techs ?? new Set();
  const iq     = ind.phenotype?.fluid_intelligence ?? 0.5;
  const cur    = ind.phenotype?.curiosity          ?? 0.5;
  // Factor: genius (0.9×0.9×4 ≈ 3.24) reaches thresholds ~3× faster.
  const factor = Math.max(0.1, iq * cur * 4);

  for (const [techId, req] of Object.entries(TECH_SKILLS)) {
    if (discoveredTechs.has(techId)) continue;
    if (known.has(techId))           continue;
    // Kardinal Kural: önkoşullar bireyin kendi bilgisinde olmalı (global havuzda değil).
    if (req.prereqs?.some(p => !known.has(p))) continue;
    if (req.langMin && (ind.language?.stage ?? 0) < req.langMin) continue;
    if ((iq) < (IQ_MINIMUMS[techId] ?? 0)) continue;

    const allMet = Object.entries(req.skills).every(([skill, base]) =>
      (exp[skill] ?? 0) >= base / factor
    );

    if (allMet) {
      emerged.push(techId);
      discoveredTechs.add(techId);
      if (!ind.known_techs) ind.known_techs = new Set();
      ind.known_techs.add(techId);
    }
  }

  return emerged;
}

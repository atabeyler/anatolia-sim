/**
 * Agent Decision Engine
 *
 * Each tick, every living individual evaluates its needs and selects one action.
 * This action is stored as ind._currentAction and influences movement direction
 * and technology discovery context.
 *
 * Actions are not imposed from outside — the agent reads its own state.
 */

export const ACTIONS = {
  FORAGE:      'forage',      // hungry — search for food
  DRINK:       'drink',       // thirsty — search for water
  FLEE:        'flee',        // predator / disaster fear
  SEEK_WARMTH: 'seek_warmth', // dangerously cold
  REST:        'rest',        // HP critical
  HUNT:        'hunt',        // well-fed, fauna present
  CRAFT:       'craft',       // curious, basic needs met — experiment
  SOCIALIZE:   'socialize',   // bonding with nearby kin
  MATE:        'mate',        // reproductive urge high
  EXPLORE:     'explore',     // curiosity-driven wandering
};

/**
 * Score every possible action given the individual's current state and
 * the world environment. Returns the action with the highest score.
 */
export function selectAction(ind, worldState) {
  const health    = ind.health       ?? {};
  const cal       = health.calories  ?? 0.7;
  const hyd       = health.hydration ?? 0.7;
  const hp        = health.hp        ?? 1.0;
  const ph        = ind.phenotype    ?? {};
  const curiosity = ph.curiosity     ?? 0.5;
  const strength  = ph.physical_strength ?? 0.5;
  const stress    = ind.psychology?.stress_level ?? 0.3;
  const mating    = ind.mating_urge  ?? 0;
  const predFear  = ind._fears?.predator  ?? 0;
  const disFear   = ind._fears?.disaster  ?? 0;
  const temp      = worldState?.temperature ?? 20;
  const fauna     = worldState?.fauna?.prey_density ?? 0;
  const ageYears  = (ind.age ?? 0) / 365;
  const isAdult   = ageYears >= 13;

  const scores = {
    [ACTIONS.FLEE]:       0,
    [ACTIONS.REST]:       0,
    [ACTIONS.DRINK]:      0,
    [ACTIONS.FORAGE]:     0,
    [ACTIONS.SEEK_WARMTH]:0,
    [ACTIONS.HUNT]:       0,
    [ACTIONS.MATE]:       0,
    [ACTIONS.CRAFT]:      0,
    [ACTIONS.SOCIALIZE]:  0,
    [ACTIONS.EXPLORE]:    0,
  };

  // ── Survival tier (overrides everything) ──────────────────────────────────
  scores[ACTIONS.FLEE]       = Math.max(predFear, disFear) * 2.0;
  scores[ACTIONS.REST]       = hp < 0.25 ? (1.0 - hp) * 1.8 : 0;
  scores[ACTIONS.DRINK]      = hyd < 0.4 ? (0.4 - hyd) * 3.5 : 0;
  scores[ACTIONS.FORAGE]     = cal < 0.4 ? (0.4 - cal) * 3.0 : 0;
  scores[ACTIONS.SEEK_WARMTH]= temp < 8  ? (8 - temp) / 10   : 0;

  // ── Secondary needs (social/reproductive) ─────────────────────────────────
  if (isAdult && mating > 0.65 && cal > 0.4 && hyd > 0.35 && !health.pregnancy) {
    scores[ACTIONS.MATE] = (mating - 0.65) * 2.0;
  }

  // ── Growth (only when basic needs comfortable) ────────────────────────────
  const wellbeing = (cal + hyd + hp) / 3;
  if (wellbeing > 0.55 && stress < 0.7) {
    // Hunt if fauna is present and physically capable
    if (fauna > 0.2 && strength > 0.3 && cal < 0.8) {
      scores[ACTIONS.HUNT] = fauna * strength * 0.8;
    }
    // Craft when curious and basic needs met
    scores[ACTIONS.CRAFT]     = curiosity * wellbeing * 0.6;
    // Socialize when group nearby
    scores[ACTIONS.SOCIALIZE] = wellbeing * 0.25;
    // Explore driven by curiosity
    scores[ACTIONS.EXPLORE]   = curiosity * 0.2;
  }

  // Pick the highest-scoring action; break ties with small noise
  let best = ACTIONS.EXPLORE;
  let bestScore = -1;
  for (const [action, score] of Object.entries(scores)) {
    const noisy = score + (Math.random() * 0.04);
    if (noisy > bestScore) { bestScore = noisy; best = action; }
  }
  return best;
}

// Removed: techContextMultiplier — technology discovery is now fully emergent
// through physical experience accumulation in activityEngine.js.
// eslint-disable-next-line no-unused-vars
function _removedTechContextMultiplier(techId, ind, worldState) {
  const action  = ind._currentAction ?? ACTIONS.EXPLORE;
  const health  = ind.health ?? {};
  const cal     = health.calories  ?? 0.7;
  const hyd     = health.hydration ?? 0.7;
  const temp    = worldState?.temperature ?? 20;
  const fauna   = worldState?.fauna?.prey_density ?? 0;
  const water   = worldState?.water_abundance ?? 0.5;
  const season  = worldState?.season ?? 'summer';
  const biome   = worldState?.biome ?? 'grassland';
  const knowsTech = tech => ind.known_techs?.has(tech);

  switch (techId) {
    case 'fire_making':
      // Cold → desperately need fire; also boosted while seeking warmth
      return (temp < 5 ? 6.0 : temp < 12 ? 3.0 : 1.0)
           * (action === ACTIONS.SEEK_WARMTH ? 2.5 : 1.0);

    case 'stone_tools':
      // Foraging or crafting — experimenting with rocks
      return (action === ACTIONS.FORAGE || action === ACTIONS.CRAFT ? 2.5 : 1.0);

    case 'foraging':
      // Hungry → motivated to find food patterns
      return (cal < 0.4 ? 3.0 : cal < 0.6 ? 1.5 : 1.0)
           * (action === ACTIONS.FORAGE ? 2.0 : 1.0);

    case 'hunting_spear':
      // Only discoverable while actively hunting with stone_tools known
      return (action === ACTIONS.HUNT && knowsTech('stone_tools') ? 5.0
            : action === ACTIONS.HUNT ? 2.0
            : 0.3);

    case 'shelter_basic':
      // Cold or rain triggers shelter-building impulse
      return (temp < 10 ? 4.0 : ['spring'].includes(season) ? 2.0 : 0.8)
           * (action === ACTIONS.SEEK_WARMTH ? 2.0 : 1.0);

    case 'water_container':
      // Thirsty + knows stone_tools → container idea
      return (hyd < 0.3 ? 5.0 : hyd < 0.5 ? 2.0 : 0.5)
           * (knowsTech('stone_tools') ? 1.5 : 1.0);

    case 'animal_trap':
      // Hunting context + hungry
      return (action === ACTIONS.HUNT ? 3.5 : action === ACTIONS.FORAGE ? 1.5 : 0.4)
           * (cal < 0.5 ? 1.5 : 1.0);

    case 'clothing_basic':
      // Very cold, needs warmth, already has stone_tools for scraping hides
      return (temp < 5 ? 5.0 : temp < 12 ? 2.5 : 0.4)
           * (knowsTech('stone_tools') ? 1.5 : 1.0);

    case 'fishing':
      // Near water, hungry
      return (water > 0.5 ? 3.0 : water > 0.3 ? 1.5 : 0.1)
           * (cal < 0.5 ? 1.5 : 1.0)
           * (['coastal', 'temperate_forest'].includes(biome) ? 1.5 : 1.0);

    case 'plant_cultivation':
      // Spring + foraging + already knows foraging tech
      return (season === 'spring' ? 3.0 : season === 'summer' ? 1.5 : 0.5)
           * (action === ACTIONS.FORAGE ? 2.5 : 1.0)
           * (knowsTech('foraging') ? 2.0 : 1.0);

    case 'animal_herding':
      // Has traps, fauna present, crafting
      return (fauna > 0.4 ? 3.0 : fauna > 0.2 ? 1.5 : 0.3)
           * (knowsTech('animal_trap') ? 2.0 : 1.0)
           * (action === ACTIONS.CRAFT ? 1.5 : 1.0);

    case 'food_preservation':
      // Has fire + food concerns
      return (knowsTech('fire_making') ? 3.0 : 0.4)
           * (cal < 0.6 ? 2.0 : 1.0)
           * (action === ACTIONS.CRAFT ? 1.5 : 1.0);

    case 'bow_arrow':
      // Hunting with spear already known
      return (action === ACTIONS.HUNT && knowsTech('hunting_spear') ? 5.0
            : knowsTech('hunting_spear') ? 1.5
            : 0.2);

    case 'pottery':
      // Has fire + plant_cultivation + clay biome + crafting
      return (knowsTech('fire_making') && knowsTech('plant_cultivation') ? 2.5 : 0.3)
           * (['coastal', 'temperate_forest', 'grassland'].includes(biome) ? 2.0 : 0.5)
           * (action === ACTIONS.CRAFT ? 2.0 : 0.8);

    case 'weaving':
      // Has clothing_basic, crafting, flora available
      return (knowsTech('clothing_basic') ? 2.5 : 0.3)
           * (action === ACTIONS.CRAFT ? 2.0 : 0.8);

    case 'metallurgy_copper':
      // Has fire, right biome, crafting
      return (knowsTech('fire_making') ? 2.0 : 0.1)
           * (['mountain', 'mediterranean'].includes(biome) ? 3.0 : 0.2)
           * (action === ACTIONS.CRAFT ? 2.0 : 0.5);

    default:
      // Advanced techs: only while crafting
      return action === ACTIONS.CRAFT ? 1.0 : 0.3;
  }
}

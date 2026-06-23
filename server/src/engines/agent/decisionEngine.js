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
  const ph           = ind.phenotype    ?? {};
  const curiosity    = ph.curiosity     ?? 0.5;
  const strength     = ph.physical_strength ?? 0.5;
  const riskTolerance = ph.risk_tolerance ?? 0.5;
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
  // Low risk_tolerance → flee sooner; high risk_tolerance → stand ground longer
  scores[ACTIONS.FLEE]       = Math.max(predFear, disFear) * (2.0 - riskTolerance * 0.6);
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
    // Hunt if fauna is present and physically capable; risk_tolerance lowers the threshold
    const huntThreshold = Math.max(0.05, 0.2 - riskTolerance * 0.1);
    if (fauna > huntThreshold && strength > 0.3 && cal < 0.8) {
      scores[ACTIONS.HUNT] = fauna * strength * (0.8 + riskTolerance * 0.4);
    }
    // Craft when curious and basic needs met
    scores[ACTIONS.CRAFT]     = curiosity * wellbeing * 0.6;
    // Socialize when group nearby
    scores[ACTIONS.SOCIALIZE] = wellbeing * 0.25;
    // Explore driven by curiosity and risk_tolerance
    scores[ACTIONS.EXPLORE]   = curiosity * 0.2 + riskTolerance * 0.1;
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

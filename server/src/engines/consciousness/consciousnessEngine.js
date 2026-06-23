// Consciousness emerges from genetics × language × social interaction × theory of mind.
// Cardinal rule: this formula is the ONLY way consciousness may change on any individual.
// No external code may directly set ind.mind.consciousness.
//
// Theoretical basis: loosely modelled on Global Workspace Theory (Baars 1988; Dehaene 2011).
// Language, social context, and Theory of Mind are the "ignition" signals that broadcast
// information across the global workspace, expanding conscious access. The genetic ceiling
// represents the individual's maximum workspace capacity. This models cumulative consciousness
// CAPACITY (analogous to dendritic density), not moment-to-moment state; momentary fluctuations
// are captured by psychology.mental_state and stress_level.
//
// Formula:
//   Δ = max(potential × 0.001, 0.00015)          ← genetic base rate
//       + (lang_stage/6) × 0.0005                 ← language broadcast bonus (GWT)
//       + 0.0002 (if in group)                    ← social ignition bonus (GWT)
//       + (theory_of_mind/3) × 0.0003             ← ToM bonus (metacognition)
//       − stress_level × 0.0003                   ← stress penalty
//       − injury/illness penalty (hp < 0.3):       ← physiological disruption of global workspace
//           (0.3 − hp) × 0.002                       severe trauma/disease compresses capacity
//   ceiling = min(1, potential × 1.2)   ← 20% experiential plasticity bonus: accumulated
//                                          language/social/ToM stimulation can push realised
//                                          capacity slightly beyond the genetic baseline,
//                                          consistent with GWT's broadcast-amplification
//                                          mechanism and empirical synaptic-plasticity data.
//
// Inner thought generation (updateInnerThought):
//   The individual's actual vocabulary (concept→proto-word) drives the inner voice.
//   No templates — we only supply priority rules for which concepts become salient
//   given the individual's current physiological and psychological state.
//   The proto-words themselves are unique per group (emergent phonology).

// Concepts that can become salient, ordered by abstraction level.
// Stage 2-3: only concrete survival concepts (indices 0-9)
// Stage 4:   social/relational concepts (indices 10-18)
// Stage 5+:  abstract/existential (indices 19+)
const CONCEPT_TIERS = [
  // tier 0 — raw survival
  'food', 'water', 'danger', 'pain', 'fire', 'sleep', 'hunt', 'run',
  // tier 1 — self/social primitive
  'me', 'you', 'us', 'die', 'born', 'good', 'bad', 'here', 'there', 'them',
  // tier 2 — world observation
  'sun', 'moon', 'rain', 'dark', 'light', 'earth', 'eat',
  // tier 3 — abstract/existential
  'time', 'god', 'spirit', 'sky',
];

// Minimum language stage to access each tier
const TIER_STAGE = [2, 3, 4, 5];

// State → salient concept priorities (ordered, most urgent first)
function getSalientConcepts(ind, simDay) {
  const ps       = ind.psychology ?? {};
  const health   = ind.health ?? {};
  const lang     = ind.language ?? {};
  const ph       = ind.phenotype ?? {};
  const c        = ind.mind?.consciousness ?? 0;
  const stage    = lang.stage ?? 0;
  const hunger   = 1 - (ind.satiation ?? 0.5);
  const thirst   = 1 - (ind.hydration ?? 0.5);
  const hp       = health.hp ?? 1;
  const mentalState  = ps.mental_state ?? 'calm';
  const stress       = ps.stress_level ?? 0;
  const wellbeing    = ps.wellbeing ?? 0.5;
  const hasGroup     = !!ind.group_id;
  const hasMate      = !!(ps.mate_id || ind.social?.mate_id);
  const recentDeath  = (ps.trauma_events ?? []).some(e => e.type === 'kin_death' && (simDay - e.day) < 20);
  const recentDisaster = (ps.trauma_events ?? []).some(e => e.type !== 'kin_death' && (simDay - e.day) < 15);
  const curiosity    = ph.curiosity ?? 0.5;

  const priority = [];

  // Physiological urgency overrides everything
  if (hunger > 0.7)         priority.push('food', 'hunt', 'eat');
  if (thirst > 0.7)         priority.push('water');
  if (hp < 0.3)             priority.push('pain', 'die');
  if (recentDisaster)       priority.push('danger', 'run', 'fire');

  // Emotional state
  if (mentalState === 'grieving' || recentDeath)   priority.push('die', 'you', 'bad');
  if (mentalState === 'anxious')                   priority.push('danger', 'run', 'bad');
  if (mentalState === 'depressed')                 priority.push('bad', 'sleep', 'die');

  // Mid-urgency physical
  if (hunger > 0.45)        priority.push('food');
  if (thirst > 0.45)        priority.push('water');

  // Social
  if (!hasGroup)            priority.push('us', 'here', 'you');
  if (hasMate)              priority.push('you', 'good');
  if (mentalState === 'excited') priority.push('good', 'us', 'here');

  // Abstract (only if consciousness high enough)
  if (c > 0.3 && curiosity > 0.6) priority.push('sky', 'sun', 'moon', 'time');
  if (c > 0.5)              priority.push('god', 'spirit', 'time');
  if (wellbeing > 0.7)      priority.push('good', 'here', 'us');

  // Always include some base anchors
  priority.push('me', 'here', 'good', 'bad', 'sleep');

  // Deduplicate while preserving order
  const seen = new Set();
  return priority.filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
}

// Build the inner thought string from known words, shaped by language stage.
function buildThoughtString(concepts, vocab, stage, c, simDay) {
  // Only use concepts the individual actually has a word for
  const known = concepts.filter(concept => vocab[concept]);

  if (known.length === 0) {
    // No vocabulary at all — pure sensation marker
    return { tr: '...', en: '...' };
  }

  // How many words can appear — scales with stage and consciousness
  const maxWords = stage <= 2 ? 1
    : stage === 3 ? Math.min(2, known.length)
    : stage === 4 ? Math.min(3 + Math.floor(c * 3), known.length)
    : Math.min(4 + Math.floor(c * 5), known.length);

  const selected = known.slice(0, maxWords);
  const wordStr = selected.map(concept => vocab[concept]).join(stage >= 4 ? ' ' : '... ');

  // Add concept hints for readability: show proto-word + [concept]
  const withHints = selected
    .map(concept => `${vocab[concept]} [${concept}]`)
    .join(stage >= 4 ? '  ' : '... ');

  return { proto: wordStr, annotated: withHints };
}

export function updateInnerThought(ind, simDay) {
  if (!ind.mind) return;
  const c        = ind.mind.consciousness ?? 0;
  const stage    = ind.language?.stage ?? 0;

  // No thought possible below stage 2 or near-zero consciousness
  if (stage < 2 || c < 0.02) {
    if (c < 0.02) ind.mind.inner_thought = null;
    return;
  }

  // Update interval: more conscious individuals process more often
  const interval = Math.max(1, Math.round(5 / Math.max(0.05, c)));
  if (simDay % interval !== 0) return;

  const vocab    = ind.language?.vocabulary ?? {};
  if (Object.keys(vocab).length === 0) return;

  const concepts = getSalientConcepts(ind, simDay);

  // Filter concepts accessible at this stage
  const accessibleTier = TIER_STAGE.findLastIndex(minStage => stage >= minStage);
  const maxConceptIdx  = CONCEPT_TIERS.length; // tier gating by vocab content is implicit
  // Actually: just use all known words — the vocab itself is the real gate
  const accessible = concepts; // individual can only think words they know

  const thought = buildThoughtString(accessible, vocab, stage, c, simDay);
  ind.mind.inner_thought = thought;
}

export function updateConsciousness(ind) {
  if (!ind.mind) return;
  const potential     = ind.phenotype?.consciousness_potential ?? 0;
  const baseRate      = Math.max(potential * 0.001, 0.00015);
  const langBonus     = (ind.language?.stage ?? 0) / 6 * 0.0005;
  const socialBonus   = ind.group_id ? 0.0002 : 0;
  const stressPenalty = (ind.psychology?.stress_level ?? 0.3) * 0.0003;
  const tomBonus      = (ind.psychology?.theory_of_mind ?? 0) / 3 * 0.0003;
  // Severe injury or illness (hp < 0.3) suppresses global workspace broadcast capacity.
  const hp            = ind.health?.hp ?? 1.0;
  const injuryPenalty = hp < 0.3 ? (0.3 - hp) * 0.002 : 0;
  const geneticCap    = Math.min(1, potential * 1.2);
  ind.mind.consciousness = Math.min(geneticCap, Math.max(0,
    (ind.mind.consciousness ?? 0) + baseRate + langBonus + socialBonus + tomBonus - stressPenalty - injuryPenalty
  ));
}

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
//   ceiling = min(1, potential × 1.2)

export function updateConsciousness(ind) {
  if (!ind.mind) return;
  const potential     = ind.phenotype?.consciousness_potential ?? 0;
  const baseRate      = Math.max(potential * 0.001, 0.00015);
  const langBonus     = (ind.language?.stage ?? 0) / 6 * 0.0005;
  const socialBonus   = ind.group_id ? 0.0002 : 0;
  const stressPenalty = (ind.psychology?.stress_level ?? 0.3) * 0.0003;
  const tomBonus      = (ind.psychology?.theory_of_mind ?? 0) / 3 * 0.0003;
  const geneticCap    = Math.min(1, potential * 1.2);
  ind.mind.consciousness = Math.min(geneticCap, Math.max(0,
    (ind.mind.consciousness ?? 0) + baseRate + langBonus + socialBonus + tomBonus - stressPenalty
  ));
}

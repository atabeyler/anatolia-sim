// Belief & Religion Engine
export const BELIEF_ARCHETYPES = {
  animism: {
    stage: 1,
    iq_min: 0.0,
    foxp2_min: 0.3,
    requires_tech: []
  },
  ancestor_cult: {
    stage: 2,
    iq_min: 0.3,
    foxp2_min: 0.4,
    requires_tech: []
  },
  shamanism: {
    stage: 2,
    iq_min: 0.4,
    foxp2_min: 0.5,
    requires_tech: []
  },
  polytheism: {
    stage: 3,
    iq_min: 0.5,
    foxp2_min: 0.6,
    // Historically polytheism precedes writing (Egypt ~3500 BCE, writing ~3100 BCE).
    // Pottery is the earliest material correlate of symbolic thought (Cauvin 2000).
    requires_tech: ['pottery']
  },
  monotheism: {
    stage: 4,
    iq_min: 0.6,
    foxp2_min: 0.65,
    requires_tech: ['writing_system', 'mathematics_basic']
  },
  philosophical: {
    stage: 4,
    iq_min: 0.7,
    foxp2_min: 0.7,
    requires_tech: ['writing_system', 'mathematics_basic']
  }
};

export function tryFormBelief(individual, existingBeliefs, discoveredTechs, worldState, simDay) {
  const p = individual.phenotype;
  // Reflection accumulates from pure experience (environment, not genetics in the gain).
  // The THRESHOLD is genetics-derived — curious/religious individuals need fewer days.
  // Designer sets one base constant (100); actual timing emerges from the individual.
  const rel = p.religiosity ?? ((p.anxiety + p.curiosity) / 2);
  const envGain = 1.0
    + (worldState.recent_disaster ? 5.0 : 0)
    + Math.max(0, 1 - worldState.food_abundance) * 3.0;
  individual._beliefReflection = (individual._beliefReflection ?? 0) + envGain;
  const threshold = 100 / Math.max(rel * (p.fluid_intelligence ?? 0.5), 0.1);
  if (individual._beliefReflection < threshold) return null;
  individual._beliefReflection = 0;
  const eligible = Object.entries(BELIEF_ARCHETYPES).filter(([name, arch]) =>
    !existingBeliefs.has(name) &&
    p.fluid_intelligence >= arch.iq_min &&
    (individual.language?.foxp2_expression ?? 0) >= arch.foxp2_min &&
    !arch.requires_tech.some(t => !discoveredTechs.has(t))
  );
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => a[1].stage - b[1].stage);
  const [beliefId, arch] = eligible[0];
  existingBeliefs.add(beliefId);
  if (!(individual.beliefs instanceof Set)) individual.beliefs = new Set();
  individual.beliefs.add(beliefId);
  const descs = {
    animism: 'Spirits inhabit all living things and natural features',
    ancestor_cult: 'The spirits of ancestors guide and protect the living',
    shamanism: 'Selected individuals commune with the spirit world',
    polytheism: 'Multiple deities govern different aspects of existence',
    monotheism: 'A single all-powerful deity rules the cosmos',
    philosophical: 'Abstract reasoning about existence, ethics, and cosmos'
  };
  return {
    type: 'belief_formed',
    belief_id: beliefId,
    founder_id: individual.id,
    day: simDay,
    importance: arch.stage >= 3 ? 'high' : 'medium',
    description: descs[beliefId] ?? beliefId
  };
}

export function updateBeliefSpread(population, existingBeliefs, groups, simDay) {
  if (existingBeliefs.size === 0) return [];
  const events = [];

  const groupById = new Map(groups.map(g => [g.id, g]));
  const indGroupMap = new Map();
  for (const ind of population) {
    if (ind.group_id) indGroupMap.set(ind.id, groupById.get(ind.group_id) ?? null);
  }

  // O(N) pre-pass: for each belief, build a Set<group_id> of groups that have at least one
  // believer, and keep the holders array only for the O(N_holders) proximity fallback.
  // This makes the inGroup check O(1) instead of O(N_holders) — the main O(N²) culprit.
  const groupsWithBelief = new Map();
  const holdersByBelief  = new Map();
  for (const belief of existingBeliefs) {
    const holders = population.filter(p => p.beliefs instanceof Set && p.beliefs.has(belief));
    holdersByBelief.set(belief, holders);
    const gSet = new Set();
    for (const h of holders) if (h.group_id) gSet.add(h.group_id);
    groupsWithBelief.set(belief, gSet);
  }

  for (const ind of population) {
    if (!(ind.beliefs instanceof Set)) ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);
    for (const belief of existingBeliefs) {
      if (ind.beliefs.has(belief)) continue;
      // O(1) group check — no longer scans all believers
      const inGroup = !!(ind.group_id && groupsWithBelief.get(belief)?.has(ind.group_id));
      // Proximity check only when not in a believing group (rare case after initial spread)
      const nearby = !inGroup && (holdersByBelief.get(belief) ?? []).some(h =>
        Math.hypot((h.x ?? 0) - (ind.x ?? 0), (h.y ?? 0) - (ind.y ?? 0)) < 2
      );
      if (!inGroup && !nearby) continue;
      const sus = ind.phenotype.religiosity ?? ((ind.phenotype.anxiety + ind.phenotype.curiosity) / 2);
      if (!ind._beliefExposure) ind._beliefExposure = {};
      ind._beliefExposure[belief] = (ind._beliefExposure[belief] ?? 0) + 1;
      if (ind._beliefExposure[belief] < 80 / Math.max(sus, 0.2)) continue;
      delete ind._beliefExposure[belief];
      ind.beliefs.add(belief);
      const group = indGroupMap.get(ind.id) ?? null;
      if (group) group.internal_tension = Math.max(0, (group.internal_tension ?? 0.5) - 0.05);
      events.push({
        type: 'belief_spread',
        belief_id: belief,
        individual_id: ind.id,
        group_id: group?.id ?? null,
        day: simDay,
        importance: 'low',
      });
    }
  }
  return events;
}

export function checkRitualEmergence(group, population, existingBeliefs, simDay) {
  if (!group || existingBeliefs.size === 0) return null;
  const memberSet = new Set(group.member_ids ?? []);
  const members = population.filter(i => memberSet.has(i.id));
  if (members.length < 3) return null;
  for (const belief of existingBeliefs) {
    if (
      members.filter(m => m.beliefs instanceof Set && m.beliefs.has(belief)).length / members.length > 0.6 &&
      !group.has_ritual
    ) {
      group.has_ritual = belief;
      group.ritual_cohesion = 0.1;
      return {
        type: 'ritual_emerged',
        group_id: group.id,
        belief,
        day: simDay,
        importance: 'medium',
        description: `A ${belief.replace(/_/g, ' ')} ritual emerges in the group`
      };
    }
  }
  return null;
}

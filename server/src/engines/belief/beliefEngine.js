// Belief & Religion Engine

// Primitive proto-beliefs: arise from specific environmental triggers, not a probability lottery.
// These must exist before formal archetypes (animism etc.) can emerge.
export const PROTO_BELIEFS = {
  nature_fear:  { stage: 0, description: 'The world harbors unseen forces and dangers' },
  food_spirit:  { stage: 0, description: 'Some places and seasons are favored by invisible abundance' },
  death_wonder: { stage: 0, description: 'The dead depart the body but their presence seems to linger' },
};

export const BELIEF_ARCHETYPES = {
  animism:      { stage: 1, iq_min: 0.0,  foxp2_min: 0.3,  requires_tech: [],                                        requires_belief: ['nature_fear', 'food_spirit', 'death_wonder'] },
  ancestor_cult:{ stage: 2, iq_min: 0.3,  foxp2_min: 0.4,  requires_tech: [],                                        requires_belief: ['animism'] },
  shamanism:    { stage: 2, iq_min: 0.4,  foxp2_min: 0.5,  requires_tech: [],                                        requires_belief: ['animism'] },
  polytheism:   { stage: 3, iq_min: 0.5,  foxp2_min: 0.6,  requires_tech: ['writing_system'],                        requires_belief: ['animism'] },
  monotheism:   { stage: 4, iq_min: 0.6,  foxp2_min: 0.65, requires_tech: ['writing_system', 'mathematics_basic'],   requires_belief: ['polytheism'] },
  philosophical:{ stage: 4, iq_min: 0.7,  foxp2_min: 0.7,  requires_tech: ['writing_system', 'mathematics_basic'],   requires_belief: [] },
};

export function tryFormBelief(individual, existingBeliefs, discoveredTechs, worldState, simDay) {
  const p = individual.phenotype;
  const rel = p.religiosity ?? ((p.anxiety + p.curiosity) / 2);
  const consciousness = individual.mind?.consciousness ?? 0;

  // 1. Proto-beliefs — triggered by direct experience, not abstract probability
  if (!existingBeliefs.has('nature_fear') && (worldState.recent_disaster || (worldState.predator_risk ?? 0) > 0.5)) {
    const fearProb = rel * 0.3 + (worldState.recent_disaster ? 0.5 : 0);
    if (Math.random() < Math.min(fearProb, 0.8)) {
      existingBeliefs.add('nature_fear');
      return { type: 'belief_formed', belief_id: 'nature_fear', founder_id: individual.id, day: simDay, importance: 'medium', description: PROTO_BELIEFS.nature_fear.description };
    }
  }
  if (!existingBeliefs.has('food_spirit') && (worldState.food_abundance ?? 0) > 0.65 && consciousness > 0.05 && p.fluid_intelligence >= 0.2) {
    if (Math.random() < rel * 0.05) {
      existingBeliefs.add('food_spirit');
      return { type: 'belief_formed', belief_id: 'food_spirit', founder_id: individual.id, day: simDay, importance: 'medium', description: PROTO_BELIEFS.food_spirit.description };
    }
  }
  if (!existingBeliefs.has('death_wonder') && p.fluid_intelligence >= 0.25 && consciousness > 0.1) {
    if (Math.random() < rel * 0.001 * (1 + consciousness)) {
      existingBeliefs.add('death_wonder');
      return { type: 'belief_formed', belief_id: 'death_wonder', founder_id: individual.id, day: simDay, importance: 'medium', description: PROTO_BELIEFS.death_wonder.description };
    }
  }

  // 2. Formal archetypes — require prior proto-beliefs and standard prerequisites
  const prob = (rel * 0.5 + p.fluid_intelligence * 0.2 + (worldState.recent_disaster ? 0.1 : 0) + Math.max(0, 1 - worldState.food_abundance) * 0.1) / 2000;
  if (Math.random() > Math.min(prob, 0.005)) return null;

  const eligible = Object.entries(BELIEF_ARCHETYPES).filter(([name, arch]) =>
    !existingBeliefs.has(name) &&
    p.fluid_intelligence >= arch.iq_min &&
    (individual.language?.foxp2_expression ?? 0) >= arch.foxp2_min &&
    !arch.requires_tech.some(t => !discoveredTechs.has(t)) &&
    (arch.requires_belief.length === 0 || arch.requires_belief.some(b => existingBeliefs.has(b)))
  );
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => a[1].stage - b[1].stage);
  const [beliefId, arch] = eligible[0];
  existingBeliefs.add(beliefId);
  const descs = {
    animism:       'Spirits inhabit all living things and natural features',
    ancestor_cult: 'The spirits of ancestors guide and protect the living',
    shamanism:     'Selected individuals commune with the spirit world',
    polytheism:    'Multiple deities govern different aspects of existence',
    monotheism:    'A single all-powerful deity rules the cosmos',
    philosophical: 'Abstract reasoning about existence, ethics, and cosmos',
  };
  return { type: 'belief_formed', belief_id: beliefId, founder_id: individual.id, day: simDay, importance: arch.stage >= 3 ? 'high' : 'medium', description: descs[beliefId] ?? beliefId };
}

export function updateBeliefSpread(population, existingBeliefs, groups, simDay = 0) {
  if (existingBeliefs.size === 0) return [];
  const events = [];
  for (const ind of population) {
    if (!(ind.beliefs instanceof Set)) ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);
    for (const belief of existingBeliefs) {
      if (ind.beliefs.has(belief)) continue;
      const sus = ind.phenotype.religiosity ?? ((ind.phenotype.anxiety + ind.phenotype.curiosity) / 2);
      if (Math.random() < sus * 0.001) {
        ind.beliefs.add(belief);
        const group = groups.find(g => g.member_ids?.includes(ind.id));
        if (group) group.internal_tension = Math.max(0, (group.internal_tension ?? 0.5) - 0.05);
        const name = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        events.push({ type: 'belief_spread', belief_id: belief, individual_id: ind.id, name, day: simDay, importance: 'low', description: `${name} adopts ${belief.replace(/_/g, ' ')}` });
      }
    }
  }
  return events;
}

export function checkRitualEmergence(group, population, existingBeliefs, simDay) {
  if (!group || existingBeliefs.size === 0) return null;
  const members = population.filter(i => group.member_ids?.includes(i.id));
  if (members.length < 3) return null;
  for (const belief of existingBeliefs) {
    if (members.filter(m => m.beliefs instanceof Set && m.beliefs.has(belief)).length / members.length > 0.6 && !group.has_ritual) {
      group.has_ritual = belief;
      group.ritual_cohesion = 0.1;
      return { type: 'ritual_emerged', group_id: group.id, belief, day: simDay, importance: 'medium', description: `A ${belief.replace(/_/g, ' ')} ritual emerges in the group` };
    }
  }
  return null;
}

// Evolutionary Psychology Engine
export function initializePsychology(individual) {
  const p = individual.phenotype;
  const oxt = p.oxytocin_sensitivity ?? 0.5;
  individual.psychology = {
    mental_state: 'content',
    wellbeing: 0.6,
    attachment_style: oxt > 0.65
      ? 'secure'
      : (oxt > 0.45 && p.anxiety > 0.5)
        ? 'anxious'
        : oxt < 0.35
          ? 'avoidant'
          : 'secure',
    stress_level: 0.2,
    trauma_events: [],
    relationships: {},
    theory_of_mind: 0,
    self_awareness: p.fluid_intelligence > 0.6,
    life_satisfaction: 0.6
  };
}

export function updateMentalState(individual, events, worldState, simDay) {
  if (!individual.psychology || !individual.psychology.trauma_events) initializePsychology(individual);
  const ps = individual.psychology;
  const p = individual.phenotype;
  ps.stress_level = ps.stress_level * 0.95;
  ps.wellbeing = ps.wellbeing * 0.98 + (1 - ps.stress_level) * 0.02;
  const fs = individual.satiation ?? 0.5;
  if (fs < 0.3) {
    ps.stress_level = Math.min(ps.stress_level + 0.1, 1.0);
    ps.wellbeing = Math.max(ps.wellbeing - 0.05, 0);
  } else if (fs > 0.8) {
    ps.wellbeing = Math.min(ps.wellbeing + 0.02, 1.0);
  }
  if (!individual.group_id) ps.stress_level = Math.min(ps.stress_level + (p.social_drive ?? 0.5) * 0.05, 1.0);
  if (worldState.recent_disaster) {
    ps.stress_level = Math.min(ps.stress_level + 0.3, 1.0);
    if (ps.trauma_events.length >= 50) ps.trauma_events.shift();
    ps.trauma_events.push({ type: worldState.recent_disaster, day: simDay });
  }
  for (const ev of events) {
    if (ev.individual_id !== individual.id) continue;
    if (ev.type === 'birth') {
      ps.wellbeing = Math.min(ps.wellbeing + 0.1, 1.0);
    } else if (ev.type === 'mate_bond') {
      ps.wellbeing = Math.min(ps.wellbeing + 0.15, 1.0);
    } else if (ev.type === 'death_of_kin') {
      ps.stress_level = Math.min(ps.stress_level + 0.4, 1.0);
      const empathyCapacity = ((p.oxytocin_sensitivity ?? 0.5) + (p.serotonin ?? 0.5)) / 2;
      if (Math.random() < empathyCapacity) ps.mental_state = 'grieving';
      if (ps.trauma_events.length >= 50) ps.trauma_events.shift();
      ps.trauma_events.push({ type: 'kin_death', day: simDay });
    } else if (ev.type === 'exile') {
      ps.stress_level = Math.min(ps.stress_level + 0.5, 1.0);
      ps.mental_state = 'depressed';
    } else if (ev.type === 'discovery') {
      ps.wellbeing = Math.min(ps.wellbeing + 0.2, 1.0);
    }
  }
  const effectiveAnxiety = Math.min(1, (p.anxiety ?? 0.3) + (ps.trauma_anxiety ?? 0));
  if (ps.stress_level > 0.8 && effectiveAnxiety > 0.6) ps.mental_state = 'anxious';
  else if (ps.stress_level > 0.7) ps.mental_state = 'anxious';
  else if (ps.wellbeing < 0.2) ps.mental_state = 'depressed';
  else if (ps.mental_state === 'grieving' && ps.stress_level > 0.4) ps.mental_state = 'grieving';
  else if (ps.wellbeing > 0.8 && ps.stress_level < 0.2) ps.mental_state = 'excited';
  else if (ps.wellbeing > 0.6 && ps.stress_level < 0.3) ps.mental_state = 'content';
  else ps.mental_state = 'calm';
  if (ps.trauma_events.length > 3) ps.trauma_anxiety = Math.min((ps.trauma_anxiety ?? 0) + 0.01, 0.7);
  if (ps.wellbeing < 0.3) individual.health_score = Math.max((individual.health_score ?? 0.5) - 0.005, 0);
  const _tom = ps.theory_of_mind ?? 0;
  const _qi = p.fluid_intelligence ?? 0;
  const _ls2 = individual.language?.stage ?? 0;
  const _c2 = individual.mind?.consciousness ?? 0;
  if (_tom < 1 && _ls2 >= 1 && _qi > 0.3 && Math.random() < 0.003) ps.theory_of_mind = 1;
  if (_tom < 2 && _ls2 >= 2 && _c2 > 0.02 && _qi > 0.4 && Math.random() < 0.001) ps.theory_of_mind = 2;
  if (_tom < 3 && _ls2 >= 3 && _c2 > 0.1 && _qi > 0.55 && Math.random() < 0.0004) ps.theory_of_mind = 3;
  ps.life_satisfaction = (ps.wellbeing + (1 - ps.stress_level)) / 2;
}

export function processBonding(indA, indB, interactionType) {
  if (!indA.psychology || !indA.psychology.trauma_events) initializePsychology(indA);
  if (!indB.psychology || !indB.psychology.trauma_events) initializePsychology(indB);
  const bs = ((indA.phenotype.oxytocin_sensitivity ?? 0.5) + (indB.phenotype.oxytocin_sensitivity ?? 0.5)) / 2;
  const d = interactionType === 'mating' ? 0.3
    : interactionType === 'cooperation' ? 0.1
    : interactionType === 'play' ? 0.08
    : interactionType === 'conflict' ? -0.2
    : 0.02;
  indA.psychology.relationships[indB.id] = Math.min(Math.max((indA.psychology.relationships[indB.id] ?? 0) + d * bs, -1), 1);
  indB.psychology.relationships[indA.id] = Math.min(Math.max((indB.psychology.relationships[indA.id] ?? 0) + d * bs, -1), 1);
}

export function computePopulationPsychStats(population) {
  const living = population.filter(i => !i.is_dead && i.psychology);
  if (living.length === 0) return { mean_wellbeing: 0, mean_stress: 0, happiness_index: 0 };
  const mw = living.reduce((s, i) => s + i.psychology.wellbeing, 0) / living.length;
  const ms = living.reduce((s, i) => s + i.psychology.stress_level, 0) / living.length;
  return { mean_wellbeing: mw, mean_stress: ms, happiness_index: (mw + (1 - ms)) / 2 };
}

// Art & Music Engine
export const ART_FORMS = {
  cave_painting: {
    medium: 'visual',
    iq_min: 0.35,
    artistic_min: 0.3,
    requires_tech: [],
    surplus_min: 0.3
  },
  sculpture: {
    medium: 'visual',
    iq_min: 0.45,
    artistic_min: 0.4,
    requires_tech: ['stone_tools'],
    surplus_min: 0.4
  },
  pottery_decoration: {
    medium: 'visual',
    iq_min: 0.5,
    artistic_min: 0.4,
    requires_tech: ['pottery'],
    surplus_min: 0.3
  },
  textile_pattern: {
    medium: 'visual',
    iq_min: 0.5,
    artistic_min: 0.45,
    requires_tech: ['weaving'],
    surplus_min: 0.35
  },
  architecture_art: {
    medium: 'visual',
    iq_min: 0.6,
    artistic_min: 0.5,
    requires_tech: ['architecture_stone'],
    surplus_min: 0.5
  },
  rhythmic_percussion: {
    medium: 'music',
    iq_min: 0.25,
    artistic_min: 0.2,
    requires_tech: [],
    surplus_min: 0.2
  },
  vocal_melody: {
    medium: 'music',
    iq_min: 0.3,
    artistic_min: 0.25,
    requires_tech: [],
    surplus_min: 0.2
  },
  flute_bone: {
    medium: 'music',
    iq_min: 0.4,
    artistic_min: 0.35,
    requires_tech: ['stone_tools'],
    surplus_min: 0.3
  },
  string_instrument: {
    medium: 'music',
    iq_min: 0.5,
    artistic_min: 0.4,
    requires_tech: ['hunting_spear'],
    surplus_min: 0.4
  },
  oral_story: {
    medium: 'narrative',
    iq_min: 0.4,
    artistic_min: 0.3,
    requires_tech: [],
    surplus_min: 0.25,
    foxp2_min: 0.45
  },
  epic_poem: {
    medium: 'narrative',
    iq_min: 0.55,
    artistic_min: 0.5,
    requires_tech: [],
    surplus_min: 0.4,
    foxp2_min: 0.6
  },
  written_story: {
    medium: 'narrative',
    iq_min: 0.65,
    artistic_min: 0.5,
    requires_tech: ['writing_system'],
    surplus_min: 0.5,
    foxp2_min: 0.65
  }
};

const ART_DESC = {
  cave_painting: 'Pigments applied to rock surfaces depict animals and figures',
  sculpture: 'Three-dimensional forms carved from stone or bone',
  pottery_decoration: 'Geometric and figurative patterns adorn ceramic surfaces',
  textile_pattern: 'Woven cloth bears complex repeating patterns',
  architecture_art: 'Buildings are decorated with carved reliefs and motifs',
  rhythmic_percussion: 'Stones and bones struck together in rhythmic patterns',
  vocal_melody: 'Sustained pitched vocalizations form melodic sequences',
  flute_bone: 'A hollow bone with finger holes produces musical tones',
  string_instrument: 'A taut cord vibrates to produce musical notes',
  oral_story: 'Narrative accounts passed between individuals by spoken word',
  epic_poem: 'Long rhythmic verse recounts heroic deeds and origins',
  written_story: 'Narrative accounts preserved in written symbols'
};

// Art forms can only emerge while the individual is actively performing
// the relevant activity (Cardinal Rule: behavior must arise from what the
// individual does, not from a system scan of their traits).
//   visual / instrument → requires active crafting
//   music (percussion, vocal) → requires active socializing
//   narrative → requires active socializing
const ART_ACTION_GATE = { visual: 'craft', music: 'socialize', narrative: 'socialize' };

export function processArtTick(population, discoveredArts, discoveredTechs, worldState, simDay) {
  const events = [];
  const surplus = worldState.food_abundance;
  for (const individual of population) {
    if (individual.life_stage === 'infant' || individual.life_stage === 'child') continue;
    const p = individual.phenotype;
    const a = p.artistic_sense ?? 0.3;
    const foxp2 = individual.language?.foxp2_expression ?? 0;
    const action = individual._currentAction;
    for (const [artId, art] of Object.entries(ART_FORMS)) {
      if (
        discoveredArts.has(artId) ||
        p.fluid_intelligence < art.iq_min ||
        a < art.artistic_min ||
        surplus < art.surplus_min ||
        (art.requires_tech?.some(t => !discoveredTechs.has(t))) ||
        (art.foxp2_min && foxp2 < art.foxp2_min) ||
        action !== ART_ACTION_GATE[art.medium]
      ) continue;
      if (Math.random() < a * p.fluid_intelligence * surplus / 5000) {
        discoveredArts.add(artId);
        events.push({
          type: 'art_created',
          art_id: artId,
          medium: art.medium,
          creator_id: individual.id,
          day: simDay,
          importance: art.iq_min > 0.5 ? 'high' : 'medium',
          description: ART_DESC[artId] ?? artId
        });
      }
    }
  }
  return events;
}

export function applyArtEffects(individual, group, discoveredArts) {
  if (discoveredArts.size === 0) return;
  if (!individual.psychology) individual.psychology = { wellbeing: 0.5, stress_level: 0.3 };
  if (individual.psychology.wellbeing == null) individual.psychology.wellbeing = 0.5;
  individual.psychology.wellbeing = Math.min(
    individual.psychology.wellbeing + discoveredArts.size * 0.00005,
    1.0
  );
  if (group && discoveredArts.size > 3) {
    group.internal_tension = Math.max(0, (group.internal_tension ?? 0.5) - 0.01);
  }
}

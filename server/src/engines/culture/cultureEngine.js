// Culture Engine
export const CULTURAL_MEMES = {
  shared_greeting: { stage: 1, foxp2_min: 0.2, group_size_min: 2, spread_rate: 0.05 },
  mourning_ritual: { stage: 1, foxp2_min: 0.3, group_size_min: 3, spread_rate: 0.03 },
  food_sharing_norm: { stage: 1, foxp2_min: 0.2, group_size_min: 2, spread_rate: 0.06 },
  reciprocity_norm: { stage: 2, foxp2_min: 0.4, group_size_min: 4, spread_rate: 0.04 },
  gender_roles: { stage: 2, foxp2_min: 0.4, group_size_min: 5, spread_rate: 0.04 },
  age_hierarchy: { stage: 2, foxp2_min: 0.4, group_size_min: 4, spread_rate: 0.05 },
  gift_exchange: { stage: 2, foxp2_min: 0.5, group_size_min: 5, spread_rate: 0.03 },
  body_decoration: { stage: 3, foxp2_min: 0.5, group_size_min: 3, spread_rate: 0.04 },
  storytelling: { stage: 3, foxp2_min: 0.55, group_size_min: 4, spread_rate: 0.05 },
  music_drumming: { stage: 3, foxp2_min: 0.5, group_size_min: 3, spread_rate: 0.06 },
  dance_ritual: { stage: 3, foxp2_min: 0.5, group_size_min: 4, spread_rate: 0.05 },
  naming_ceremony: { stage: 3, foxp2_min: 0.55, group_size_min: 3, spread_rate: 0.03 },
  marriage_ceremony: { stage: 4, foxp2_min: 0.6, group_size_min: 5, spread_rate: 0.03 },
  seasonal_festival: { stage: 4, foxp2_min: 0.6, group_size_min: 6, spread_rate: 0.03 },
  taboo_system: { stage: 4, foxp2_min: 0.6, group_size_min: 5, spread_rate: 0.02 },
  trade_ceremony: { stage: 4, foxp2_min: 0.65, group_size_min: 6, spread_rate: 0.02 },
  written_myth: { stage: 5, foxp2_min: 0.7, group_size_min: 10, spread_rate: 0.02, requires_tech: ['writing_system'] },
  legal_code: { stage: 5, foxp2_min: 0.7, group_size_min: 10, spread_rate: 0.01, requires_tech: ['writing_system'] }
};

const MEME_DESC = {
  shared_greeting: 'A consistent greeting gesture develops',
  mourning_ritual: 'Communal mourning practices emerge for the dead',
  food_sharing_norm: 'Food is shared equally among group members',
  reciprocity_norm: 'Gifts and favors are expected to be returned',
  gender_roles: 'Different tasks become associated with different sexes',
  age_hierarchy: 'Elders are accorded special respect',
  gift_exchange: 'Ceremonial gift-giving strengthens social bonds',
  body_decoration: 'Pigments and natural materials used for body adornment',
  storytelling: 'Oral narratives preserve group memory and values',
  music_drumming: 'Rhythmic percussion emerges as social bonding activity',
  dance_ritual: 'Coordinated movement used in group ceremonies',
  naming_ceremony: 'Birth is marked with naming rites',
  marriage_ceremony: 'Pair-bonding is formalized through ritual',
  seasonal_festival: 'Cyclical celebrations mark the seasons',
  taboo_system: 'Certain behaviors become culturally forbidden',
  trade_ceremony: 'Exchange is ritualized to build trust',
  written_myth: 'Origin stories are recorded in written form',
  legal_code: 'Rules and punishments are written and formalized'
};

export function processCultureTick(population, groups, discoveredTechs, simDay) {
  const events = [];
  for (const group of groups) {
    const members = population.filter(i => group.member_ids?.includes(i.id));
    if (members.length < 2) continue;
    const avgFoxp2 = members.reduce((s, m) => s + (m.language?.foxp2_expression ?? 0), 0) / members.length;
    const avgArt = members.reduce((s, m) => s + (m.phenotype?.artistic_sense ?? 0), 0) / members.length;
    if (!group.culture) group.culture = new Set();
    for (const [memeId, meme] of Object.entries(CULTURAL_MEMES)) {
      if (
        group.culture.has(memeId) ||
        avgFoxp2 < meme.foxp2_min ||
        members.length < meme.group_size_min ||
        (meme.requires_tech?.some(t => !discoveredTechs.has(t)))
      ) continue;
      // Pure time: 1 point/day while conditions hold.
      // THRESHOLD from group genetics (avgArt) × meme complexity (spread_rate).
      // Artistic groups and simple memes crystallize sooner — no fixed designer deadline.
      if (!group._culturePressure) group._culturePressure = {};
      group._culturePressure[memeId] = (group._culturePressure[memeId] ?? 0) + 1;
      const cultureThreshold = 100 / Math.max(avgArt * meme.spread_rate, 0.001);
      if (group._culturePressure[memeId] < cultureThreshold) continue;
      group._culturePressure[memeId] = 0;
      group.culture.add(memeId);
      group.internal_tension = Math.max(0, (group.internal_tension ?? 0.5) - 0.03);
      events.push({
        type: 'cultural_meme_emerged',
        meme_id: memeId,
        group_id: group.id,
        day: simDay,
        importance: meme.stage >= 4 ? 'high' : 'low',
        description: MEME_DESC[memeId] ?? memeId
      });
    }
    // Inter-group contact: 1 point/day; exchange fires every ~67 days.
    group._diffusionPressure = (group._diffusionPressure ?? 0) + 1;
    if (group._diffusionPressure >= 67) {
      group._diffusionPressure = 0;
      const others = groups.filter(g => g.id !== group.id && g.culture?.size > 0);
      if (others.length > 0) {
        const src = others[Math.floor(Math.random() * others.length)];
        const novel = [...(src.culture ?? [])].find(m => !group.culture.has(m));
        if (novel) {
          group.culture.add(novel);
          events.push({
            type: 'cultural_diffusion',
            meme_id: novel,
            from_group: src.id,
            to_group: group.id,
            day: simDay,
            importance: 'low'
          });
        }
      }
    }
  }
  return events;
}

export function computeCulturalPrestige(group) {
  return Math.min((group.culture?.size ?? 0) * 0.05, 1.0);
}

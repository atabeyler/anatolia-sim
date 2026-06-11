// Law & Ethics Engine
export const NORM_TYPES = {
  reciprocity: {
    stage: 1,
    iq_min: 0.0,
    group_min: 2,
    foxp2_min: 0.2,
    effect: { cooperation: 0.1 }
  },
  no_theft: {
    stage: 1,
    iq_min: 0.0,
    group_min: 3,
    foxp2_min: 0.3,
    effect: { trust: 0.15 }
  },
  incest_taboo: {
    stage: 1,
    iq_min: 0.0,
    group_min: 2,
    foxp2_min: 0.2,
    effect: { inbreeding: -0.2 }
  },
  elder_respect: {
    stage: 2,
    iq_min: 0.3,
    group_min: 4,
    foxp2_min: 0.4,
    effect: { knowledge_transfer: 0.1 }
  },
  hospitality: {
    stage: 2,
    iq_min: 0.3,
    group_min: 5,
    foxp2_min: 0.4,
    effect: { trade: 0.1 }
  },
  blood_feud: {
    stage: 2,
    iq_min: 0.3,
    group_min: 4,
    foxp2_min: 0.4,
    effect: { revenge_violence: 0.2 }
  },
  communal_work: {
    stage: 2,
    iq_min: 0.35,
    group_min: 5,
    foxp2_min: 0.4,
    effect: { production: 0.15 }
  },
  leader_arbitration: {
    stage: 3,
    iq_min: 0.5,
    group_min: 8,
    foxp2_min: 0.55,
    effect: { conflict: -0.2 }
  },
  property_rights: {
    stage: 3,
    iq_min: 0.5,
    group_min: 8,
    foxp2_min: 0.55,
    effect: { trade: 0.2 }
  },
  punishment_exile: {
    stage: 3,
    iq_min: 0.5,
    group_min: 8,
    foxp2_min: 0.55,
    effect: { deviance: -0.3 }
  },
  written_law: {
    stage: 4,
    iq_min: 0.65,
    group_min: 15,
    foxp2_min: 0.65,
    requires_tech: ['writing_system'],
    effect: { order: 0.3 }
  },
  tax_system: {
    stage: 4,
    iq_min: 0.65,
    group_min: 20,
    foxp2_min: 0.65,
    requires_tech: ['writing_system', 'mathematics_basic'],
    effect: { state_power: 0.2 }
  },
  contract_law: {
    stage: 4,
    iq_min: 0.7,
    group_min: 20,
    foxp2_min: 0.7,
    requires_tech: ['writing_system'],
    effect: { trade: 0.3 }
  }
};

const NORM_DESC = {
  reciprocity: 'Members are expected to return favors',
  no_theft: "Taking others' possessions is prohibited",
  incest_taboo: 'Mating between close relatives is forbidden',
  elder_respect: 'Elders are addressed with deference',
  hospitality: 'Strangers must be offered food and shelter',
  blood_feud: 'Violence against a kin member demands revenge',
  communal_work: 'All able members must contribute to group tasks',
  leader_arbitration: 'The leader resolves disputes',
  property_rights: 'Individual ownership of goods is recognized',
  punishment_exile: 'Persistent violators may be driven out',
  written_law: 'Rules are codified in written form',
  tax_system: 'Members contribute a portion of resources to the group',
  contract_law: 'Agreements between parties are legally binding'
};

export function processLawTick(group, population, discoveredTechs, simDay) {
  const events = [];
  if (!group) return events;
  const members = population.filter(i => group.member_ids?.includes(i.id) && !i.is_dead);
  if (members.length < 2) return events;
  if (!group.norms) group.norms = new Set();
  const avgFoxp2 = members.reduce((s, m) => s + (m.language?.foxp2_expression ?? 0), 0) / members.length;
  const avgIq = members.reduce((s, m) => s + m.phenotype.fluid_intelligence, 0) / members.length;
  const leader = members.find(m => m.id === group.leader_id);
  for (const [normId, norm] of Object.entries(NORM_TYPES)) {
    if (
      group.norms.has(normId) ||
      members.length < norm.group_min ||
      avgFoxp2 < norm.foxp2_min ||
      avgIq < norm.iq_min ||
      (norm.requires_tech?.some(t => !discoveredTechs.has(t)))
    ) continue;
    if (Math.random() < ((group.internal_tension ?? 0.3) + (leader?.phenotype?.fluid_intelligence ?? 0.4) * 0.3) * 0.0005) {
      group.norms.add(normId);
      applyNE(group, norm.effect);
      events.push({
        type: 'norm_emerged',
        norm_id: normId,
        group_id: group.id,
        day: simDay,
        importance: norm.stage >= 4 ? 'high' : norm.stage >= 3 ? 'medium' : 'low',
        description: NORM_DESC[normId] ?? normId
      });
    }
  }
  const ve = procViolation(group, members, simDay);
  if (ve) events.push(ve);
  return events;
}

function applyNE(g, e) {
  if (!e) return;
  if (e.cooperation) g.cooperation_level = Math.min((g.cooperation_level ?? 0.5) + e.cooperation, 1.0);
  if (e.trust) g.trust_level = Math.min((g.trust_level ?? 0.5) + e.trust, 1.0);
  if (e.conflict) g.conflict_rate = Math.max((g.conflict_rate ?? 0.3) + e.conflict, 0);
  if (e.trade) g.trade_willingness = Math.min((g.trade_willingness ?? 0.3) + e.trade, 1.0);
  if (e.order) g.internal_tension = Math.max((g.internal_tension ?? 0.5) - 0.1, 0);
}

function procViolation(group, members, simDay) {
  if (!group.norms || group.norms.size === 0 || Math.random() > 0.01) return null;
  const v = members[Math.floor(Math.random() * members.length)];
  if (!v) return null;
  if (Math.random() > (v.phenotype.aggression - v.phenotype.conscientiousness + 1) / 2 * 0.3) return null;
  const vn = [...group.norms][Math.floor(Math.random() * group.norms.size)];
  let punishment = 'social_shaming';
  if (group.norms.has('punishment_exile') && Math.random() < 0.2) {
    punishment = 'exile';
    group.member_ids = group.member_ids.filter(id => id !== v.id);
    v.group_id = null;
  } else if (group.norms.has('leader_arbitration')) {
    punishment = 'fine';
    if (v.inventory?.food > 2) v.inventory.food -= 1;
  }
  return {
    type: 'norm_violation',
    violator_id: v.id,
    norm_id: vn,
    punishment,
    group_id: group.id,
    day: simDay,
    importance: punishment === 'exile' ? 'medium' : 'low'
  };
}

// Larger groups need proportionally more norms to maintain the same order level.
export function computeSocialOrder(group) {
  const memberCount = Math.max(2, group.member_ids?.length ?? 5);
  const normDensity = (group.norms?.size ?? 0) / Math.log2(memberCount);
  return Math.min(normDensity * 0.08 + (1 - (group.internal_tension ?? 0.5)) * 0.4, 1.0);
}

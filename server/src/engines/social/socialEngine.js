// Social & Conflict Engine
export const RELATIONSHIP_TYPES = {
  KIN: 'kin',
  MATE: 'mate',
  ALLY: 'ally',
  RIVAL: 'rival',
  NEUTRAL: 'neutral',
  OUTGROUP: 'outgroup'
};

export const GROUP_ROLES = {
  LEADER: 'leader',
  ELDER: 'elder',
  WARRIOR: 'warrior',
  GATHERER: 'gatherer',
  HEALER: 'healer',
  MEMBER: 'member'
};

export function computeSocialStatus(individual, group) {
  if (!group) return 0;
  const p = individual.phenotype;
  const w = Math.min((group.founded_day ?? 0) / 1000, 1.0);
  const dom = p.dominance ?? 0.5;
  const iq = p.fluid_intelligence ?? 0.5;
  const emp = p.empathy ?? 0.5;
  const str = p.physical_strength ?? 0.5;
  const age = (individual.age ?? 0) / 365;
  return Math.min(
    Math.max(
      dom * 0.3 +
      iq * 0.25 * w +
      emp * 0.2 * w +
      (age < 40 ? str : 0) * 0.15 * (1 - w) +
      ((individual.social?.reputation ?? 0) * 0.1),
      0
    ),
    1
  );
}

export function processGroupDynamics(population, groups, simDay) {
  const popMap = new Map(population.map(i => [i.id, i]));
  const events = [];
  const ungrouped = population.filter(i => !i.group_id && i.life_stage !== 'INFANT');
  for (const ind of ungrouped) {
    const nearbyGroup = findNearbyGroup(ind, groups, 5);
    if (nearbyGroup && canJoinGroup(ind, nearbyGroup)) {
      ind.group_id = nearbyGroup.id;
      if (ind.social) ind.social.group_id = nearbyGroup.id;
      nearbyGroup.member_ids.push(ind.id);
      events.push({ type: 'group_join', individual_id: ind.id, group_id: nearbyGroup.id, day: simDay });
    } else if (population.filter(i => !i.group_id).length >= 2) {
      const partner = ungrouped.find(o => o.id !== ind.id && !o.group_id);
      if (partner) {
        const newGroup = createGroup(ind, partner, simDay);
        groups.push(newGroup);
        ind.group_id = newGroup.id;
        if (ind.social) ind.social.group_id = newGroup.id;
        partner.group_id = newGroup.id;
        if (partner.social) partner.social.group_id = newGroup.id;
        events.push({ type: 'group_formed', group_id: newGroup.id, founder_id: ind.id, day: simDay });
      }
    }
  }
  for (const group of groups) {
    const members = group.member_ids.map(id => popMap.get(id)).filter(Boolean);
    if (members.length < 2) continue;
    const currentLeader = members.find(m => m.id === group.leader_id);
    const challenger = findChallenger(members, currentLeader, group);
    if (challenger && currentLeader) {
      const result = resolveLeadershipContest(currentLeader, challenger, simDay);
      if (result.new_leader_id !== group.leader_id) {
        group.leader_id = result.new_leader_id;
        events.push({
          type: 'leadership_change',
          group_id: group.id,
          new_leader_id: result.new_leader_id,
          day: simDay
        });
      }
    } else if (!group.leader_id && members.length > 0) {
      group.leader_id = [...members].sort(
        (a, b) => computeSocialStatus(b, group) - computeSocialStatus(a, group)
      )[0].id;
    }
    if (members.length > 25 || (group.internal_tension ?? 0) > 0.8) {
      const fission = attemptGroupFission(group, members, simDay);
      if (fission) {
        fission.newGroup.member_ids.forEach(id => {
          const m = population.find(p => p.id === id);
          if (m) {
            m.group_id = fission.newGroup.id;
            if (m.social) m.social.group_id = fission.newGroup.id;
          }
        });
        groups.push(fission.newGroup);
        events.push({
          type: 'group_split',
          parent_group_id: group.id,
          new_group_id: fission.newGroup.id,
          day: simDay
        });
      }
    }
  }
  if (groups.length >= 2 && Math.random() < 0.001) {
    const [a, b] = pickTwoRivals(groups, population);
    if (a && b) events.push({ ...resolveConflict(a, b, population, simDay), day: simDay });
  }
  return events;
}

function createGroup(i1, i2, d) {
  return {
    id: `group_${d}_${Math.random().toString(36).slice(2, 7)}`,
    name: null,
    founder_id: i1.id,
    leader_id: i1.id,
    member_ids: [i1.id, i2.id],
    founded_day: d,
    internal_tension: 0,
    prestige: 0.1,
    territory: { x: i1.x, y: i1.y, radius: 0.3 },
    alliances: [],
    rival_ids: []
  };
}

function findNearbyGroup(ind, groups, r) {
  return groups.find(g => {
    const dx = ind.x - (g.territory?.x ?? 0);
    const dy = ind.y - (g.territory?.y ?? 0);
    return Math.sqrt(dx * dx + dy * dy) < (g.territory?.radius ?? r);
  });
}

function canJoinGroup(ind, group) {
  return Math.random() > ((ind.phenotype?.xenophobia ?? 0.5) + 0.5) / 2 * 0.8;
}

function findChallenger(members, leader, group) {
  if (!leader) return null;
  return members.find(m => {
    if (m.id === leader.id) return false;
    return (
      computeSocialStatus(m, group) - computeSocialStatus(leader, group) > 0.2 &&
      Math.random() < 0.05
    );
  });
}

function resolveLeadershipContest(leader, challenger) {
  if (!leader || !challenger || !leader.phenotype || !challenger.phenotype) {
    return { new_leader_id: leader?.id ?? challenger?.id };
  }
  const ls = (leader.phenotype.dominance ?? 0.5) + (leader.phenotype.physical_strength ?? 0.5);
  const cs = (challenger.phenotype.dominance ?? 0.5) + (challenger.phenotype.physical_strength ?? 0.5);
  return { new_leader_id: Math.random() < ls / (ls + cs) ? leader.id : challenger.id };
}

function attemptGroupFission(group, members, simDay) {
  if (members.length < 8) return null;
  const dissenters = members.filter(
    m =>
      (m.phenotype?.independence ?? 0) > 0.6 &&
      computeSocialStatus(m, group) < 0.4 &&
      Math.random() < 0.1
  );
  if (dissenters.length < 3) return null;
  group.member_ids = group.member_ids.filter(id => !dissenters.find(d => d.id === id));
  const nl = [...dissenters].sort(
    (a, b) =>
      ((b.phenotype?.dominance ?? 0.5) + (b.phenotype?.fluid_intelligence ?? 0.5)) -
      ((a.phenotype?.dominance ?? 0.5) + (a.phenotype?.fluid_intelligence ?? 0.5))
  )[0];
  const ng = {
    id: `group_${simDay}_${Math.random().toString(36).slice(2, 7)}`,
    name: null,
    founder_id: nl.id,
    leader_id: nl.id,
    member_ids: dissenters.map(d => d.id),
    founded_day: simDay,
    internal_tension: 0.2,
    prestige: 0.05,
    territory: {
      x: (dissenters[0].x ?? 0) + (Math.random() - 0.5) * 2,
      y: (dissenters[0].y ?? 0) + (Math.random() - 0.5) * 2,
      radius: 1
    },
    alliances: [],
    rival_ids: [group.id]
  };
  group.rival_ids = [...(group.rival_ids ?? []), ng.id];
  return { newGroup: ng };
}

function pickTwoRivals(groups) {
  const wm = groups.filter(g => g.member_ids.length > 0);
  if (wm.length < 2) return [null, null];
  const i = Math.floor(Math.random() * wm.length);
  const j = (i + 1 + Math.floor(Math.random() * (wm.length - 1))) % wm.length;
  return [wm[i], wm[j]];
}

function resolveConflict(gA, gB, population, simDay) {
  const lMap = new Map(population.map(i => [i.id, i]));
  const mA = gA.member_ids.map(id => lMap.get(id)).filter(Boolean);
  const mB = gB.member_ids.map(id => lMap.get(id)).filter(Boolean);
  const sA = mA.reduce((s, m) => s + (m.phenotype?.physical_strength ?? 0.5), 0) / Math.max(mA.length, 1);
  const sB = mB.reduce((s, m) => s + (m.phenotype?.physical_strength ?? 0.5), 0) / Math.max(mB.length, 1);
  const aWins = Math.random() < sA / (sA + sB);
  const loser = aWins ? mB : mA;
  const cc = Math.floor(loser.length * (0.05 + Math.random() * 0.15));
  loser.slice(0, cc).forEach(c => {
    c.is_dead = true;
    c.death_cause = 'conflict';
    c.death_day = simDay;
  });
  const winner = aWins ? gA : gB;
  winner.prestige = Math.min((winner.prestige ?? 0) + 0.1, 1.0);
  return {
    type: 'intergroup_conflict',
    attacker_group: gA.id,
    defender_group: gB.id,
    winner_group: winner.id,
    casualties: cc,
    importance: cc > 2 ? 'high' : 'medium'
  };
}

// Roles are inferred from each individual's accumulated behavioral history
// (_behaviorCounts), not assigned from phenotype. This satisfies the Cardinal
// Rule: the role an individual holds reflects what they actually do, which in
// turn is driven by their needs and environment — not scripted by the system.
export function assignGroupRoles(members, group) {
  if (!members || members.length === 0) return;
  for (const m of members) {
    if (m.is_founder) { m.group_role = 'anchor'; continue; }
    if (m.id === group.leader_id) { m.group_role = GROUP_ROLES.LEADER; continue; }

    const counts = m._behaviorCounts ?? {};
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const ageYears = (m.age ?? 0) / 365;

    if      (dominant === 'hunt')      m.group_role = GROUP_ROLES.WARRIOR;
    else if (dominant === 'socialize') m.group_role = GROUP_ROLES.HEALER;
    else if (dominant === 'forage')    m.group_role = GROUP_ROLES.GATHERER;
    else if (ageYears > 40)            m.group_role = GROUP_ROLES.ELDER;
    else                               m.group_role = GROUP_ROLES.MEMBER;
  }
}

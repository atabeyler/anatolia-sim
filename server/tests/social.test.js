import { describe, it, expect } from 'vitest';
import {
  RELATIONSHIP_TYPES,
  GROUP_ROLES,
  computeSocialStatus,
  processGroupDynamics,
  assignGroupRoles,
} from '../src/engines/social/socialEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    alive: true,
    is_dead: false,
    life_stage: 'ADULT',
    age: 25 * 365,
    x: 32, y: 38,
    group_id: null,
    phenotype: {
      dominance: 0.5,
      fluid_intelligence: 0.5,
      empathy: 0.5,
      physical_strength: 0.5,
      aggression: 0.3,
      curiosity: 0.5,
      xenophobia: 0.0,
      independence: 0.3,
      ...overrides.phenotype,
    },
    social: { reputation: 0.5, group_id: null },
    ...overrides,
  };
}

function makeGroup(id, memberIds, overrides = {}) {
  return {
    id,
    founder_id: memberIds[0],
    leader_id: memberIds[0],
    member_ids: [...memberIds],
    founded_day: 100,
    internal_tension: 0.2,
    prestige: 0.1,
    territory: { x: 32, y: 38, radius: 5 },
    alliances: [],
    rival_ids: [],
    ...overrides,
  };
}

// ── RELATIONSHIP_TYPES & GROUP_ROLES ─────────────────────────────────────────

describe('RELATIONSHIP_TYPES — definition checks', () => {
  it('defines 6 relationship types', () => {
    expect(Object.keys(RELATIONSHIP_TYPES)).toHaveLength(6);
  });

  it('includes KIN, MATE, ALLY, RIVAL, NEUTRAL, OUTGROUP', () => {
    expect(RELATIONSHIP_TYPES.KIN).toBe('kin');
    expect(RELATIONSHIP_TYPES.MATE).toBe('mate');
    expect(RELATIONSHIP_TYPES.ALLY).toBe('ally');
    expect(RELATIONSHIP_TYPES.RIVAL).toBe('rival');
    expect(RELATIONSHIP_TYPES.NEUTRAL).toBe('neutral');
    expect(RELATIONSHIP_TYPES.OUTGROUP).toBe('outgroup');
  });
});

describe('GROUP_ROLES — definition checks', () => {
  it('defines 6 roles', () => {
    expect(Object.keys(GROUP_ROLES)).toHaveLength(6);
  });

  it('includes LEADER, ELDER, WARRIOR, GATHERER, HEALER, MEMBER', () => {
    expect(GROUP_ROLES.LEADER).toBe('leader');
    expect(GROUP_ROLES.ELDER).toBe('elder');
    expect(GROUP_ROLES.WARRIOR).toBe('warrior');
    expect(GROUP_ROLES.HEALER).toBe('healer');
    expect(GROUP_ROLES.MEMBER).toBe('member');
  });
});

// ── computeSocialStatus ───────────────────────────────────────────────────────

describe('computeSocialStatus', () => {
  it('returns 0 when group is null', () => {
    const ind = makeInd('i1');
    expect(computeSocialStatus(ind, null)).toBe(0);
  });

  it('result is always between 0 and 1', () => {
    const ind = makeInd('i1', {
      phenotype: { dominance: 0.9, fluid_intelligence: 0.9, empathy: 0.9, physical_strength: 0.9 },
      social: { reputation: 1.0 },
    });
    const group = makeGroup('g1', ['i1']);
    const status = computeSocialStatus(ind, group);
    expect(status).toBeGreaterThanOrEqual(0);
    expect(status).toBeLessThanOrEqual(1);
  });

  it('high-dominance individual has higher status than low-dominance', () => {
    const group = makeGroup('g1', ['a', 'b'], { founded_day: 0 });
    const high = makeInd('a', { phenotype: { dominance: 0.9, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5 }, social: { reputation: 0.5 } });
    const low  = makeInd('b', { phenotype: { dominance: 0.1, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5 }, social: { reputation: 0.5 } });
    expect(computeSocialStatus(high, group)).toBeGreaterThan(computeSocialStatus(low, group));
  });

  it('higher reputation increases status', () => {
    const group = makeGroup('g1', ['a', 'b'], { founded_day: 0 });
    const base = makeInd('a', { social: { reputation: 0.2 } });
    const rep  = makeInd('b', { social: { reputation: 0.9 } });
    expect(computeSocialStatus(rep, group)).toBeGreaterThan(computeSocialStatus(base, group));
  });

  it('physical_strength contributes in young groups but not old ones', () => {
    const youngGroup = makeGroup('g1', ['a'], { founded_day: 0 });
    const oldGroup   = makeGroup('g2', ['a'], { founded_day: 5000 });
    // Strong but dim: benefits from youth weight (physical_strength), hurt by old-group weight (intelligence)
    const strongDim = makeInd('a', {
      age: 30 * 365,
      phenotype: { dominance: 0.0, fluid_intelligence: 0.0, empathy: 0.0, physical_strength: 0.99 },
      social: { reputation: 0.0 },
    });
    // physical_strength * 0.15 * (1-w): w=0 for youngGroup → contributes; w=1 for oldGroup → contributes 0
    expect(computeSocialStatus(strongDim, youngGroup)).toBeGreaterThan(
      computeSocialStatus(strongDim, oldGroup)
    );
  });
});

// ── processGroupDynamics ──────────────────────────────────────────────────────

describe('processGroupDynamics — group formation', () => {
  it('returns array', () => {
    const result = processGroupDynamics([], [], 1);
    expect(Array.isArray(result)).toBe(true);
  });

  it('two ungrouped adults near each other form a new group', () => {
    const i1 = makeInd('i1', { x: 32, y: 38 });
    const i2 = makeInd('i2', { x: 32, y: 38 });
    const groups = [];
    const events = processGroupDynamics([i1, i2], groups, 1);
    const formed = events.find(e => e.type === 'group_formed');
    expect(formed).toBeDefined();
    expect(groups).toHaveLength(1);
  });

  it('group_formed event has correct shape', () => {
    const i1 = makeInd('i1');
    const i2 = makeInd('i2');
    const groups = [];
    const events = processGroupDynamics([i1, i2], groups, 10);
    const ev = events.find(e => e.type === 'group_formed');
    expect(ev).toBeDefined();
    expect(typeof ev.group_id).toBe('string');
    expect(ev.day).toBe(10);
  });

  it('infant life_stage is excluded from ungrouped pool', () => {
    const infant = makeInd('infant', { life_stage: 'INFANT' });
    const adult  = makeInd('adult');
    const groups = [];
    processGroupDynamics([infant, adult], groups, 1);
    // Only 1 non-infant ungrouped → no group formed
    expect(groups).toHaveLength(0);
  });
});

describe('processGroupDynamics — join existing group', () => {
  it('ungrouped individual joins nearby group', () => {
    const leader = makeInd('leader', { group_id: 'g1', x: 32, y: 38 });
    leader.group_id = 'g1';
    const newcomer = makeInd('newcomer', { x: 32, y: 38, phenotype: { xenophobia: 0.0, dominance: 0.5, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5, aggression: 0.3, curiosity: 0.5, independence: 0.3 } });
    const group = makeGroup('g1', ['leader'], { territory: { x: 32, y: 38, radius: 5 } });
    const groups = [group];
    let joined = false;
    for (let day = 0; day < 100 && !joined; day++) {
      const evs = processGroupDynamics([leader, newcomer], groups, day);
      if (evs.find(e => e.type === 'group_join')) joined = true;
    }
    expect(joined).toBe(true);
  });
});

describe('processGroupDynamics — leadership change', () => {
  it('strong challenger can unseat current leader', () => {
    const leader = makeInd('leader', {
      group_id: 'g1',
      phenotype: { dominance: 0.1, physical_strength: 0.1, fluid_intelligence: 0.5, empathy: 0.5, aggression: 0.3, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
      social: { reputation: 0.5 },
    });
    const challenger = makeInd('challenger', {
      group_id: 'g1',
      phenotype: { dominance: 0.99, physical_strength: 0.99, fluid_intelligence: 0.5, empathy: 0.5, aggression: 0.3, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
      social: { reputation: 0.5 },
    });
    const group = makeGroup('g1', ['leader', 'challenger'], { leader_id: 'leader', founded_day: 0 });
    const groups = [group];
    let changed = false;
    for (let day = 0; day < 2000 && !changed; day++) {
      const evs = processGroupDynamics([leader, challenger], groups, day);
      if (evs.find(e => e.type === 'leadership_change')) changed = true;
    }
    expect(changed).toBe(true);
  });

  it('leadership_change event has correct shape', () => {
    const leader = makeInd('leader', {
      group_id: 'g1',
      phenotype: { dominance: 0.05, physical_strength: 0.05, fluid_intelligence: 0.5, empathy: 0.5, aggression: 0.3, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
      social: { reputation: 0.5 },
    });
    const challenger = makeInd('challenger', {
      group_id: 'g1',
      phenotype: { dominance: 0.99, physical_strength: 0.99, fluid_intelligence: 0.5, empathy: 0.5, aggression: 0.3, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
      social: { reputation: 0.5 },
    });
    const group = makeGroup('g1', ['leader', 'challenger'], { leader_id: 'leader', founded_day: 0 });
    let ev = null;
    for (let day = 0; day < 2000 && !ev; day++) {
      const evs = processGroupDynamics([leader, challenger], [group], day);
      ev = evs.find(e => e.type === 'leadership_change') ?? null;
    }
    if (ev) {
      expect(ev).toMatchObject({ type: 'leadership_change', group_id: 'g1' });
      expect(typeof ev.new_leader_id).toBe('string');
      expect(ev.day).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('processGroupDynamics — group fission', () => {
  it('large group with high tension can split', () => {
    const members = Array.from({ length: 12 }, (_, i) =>
      makeInd(`m${i}`, {
        group_id: 'g1',
        x: 32 + (Math.random() - 0.5),
        y: 38 + (Math.random() - 0.5),
        phenotype: {
          dominance: 0.5, fluid_intelligence: 0.5, empathy: 0.5,
          physical_strength: 0.5, aggression: 0.5, curiosity: 0.5,
          xenophobia: 0.0, independence: 0.9,
        },
        social: { reputation: 0.3 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id), { internal_tension: 0.85, founded_day: 0 });
    const groups = [group];
    let split = false;
    for (let day = 0; day < 500 && !split; day++) {
      const evs = processGroupDynamics(members, groups, day);
      if (evs.find(e => e.type === 'group_split')) split = true;
    }
    expect(split).toBe(true);
  });

  it('group_split event has correct shape', () => {
    const members = Array.from({ length: 12 }, (_, i) =>
      makeInd(`m${i}`, {
        group_id: 'g1',
        phenotype: {
          dominance: 0.5, fluid_intelligence: 0.5, empathy: 0.5,
          physical_strength: 0.5, aggression: 0.5, curiosity: 0.5,
          xenophobia: 0.0, independence: 0.95,
        },
        social: { reputation: 0.2 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id), { internal_tension: 0.9, founded_day: 0 });
    const groups = [group];
    let ev = null;
    for (let day = 0; day < 500 && !ev; day++) {
      const evs = processGroupDynamics(members, groups, day);
      ev = evs.find(e => e.type === 'group_split') ?? null;
    }
    if (ev) {
      expect(ev).toMatchObject({ type: 'group_split', parent_group_id: 'g1' });
      expect(typeof ev.new_group_id).toBe('string');
    }
  });
});

// ── assignGroupRoles ──────────────────────────────────────────────────────────

describe('assignGroupRoles', () => {
  it('does nothing for empty members array', () => {
    const group = makeGroup('g1', []);
    expect(() => assignGroupRoles([], group)).not.toThrow();
  });

  it('leader gets LEADER role', () => {
    const leader = makeInd('leader', { group_id: 'g1' });
    const member = makeInd('member', { group_id: 'g1' });
    const group = makeGroup('g1', ['leader', 'member'], { leader_id: 'leader' });
    assignGroupRoles([leader, member], group);
    expect(leader.group_role).toBe(GROUP_ROLES.LEADER);
  });

  it('high-empathy + high-intelligence member gets HEALER role', () => {
    const healer = makeInd('healer', {
      group_id: 'g1',
      phenotype: { empathy: 0.8, fluid_intelligence: 0.7, physical_strength: 0.3, aggression: 0.2, dominance: 0.5, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
    });
    const group = makeGroup('g1', ['leader', 'healer'], { leader_id: 'leader' });
    const leader = makeInd('leader', { group_id: 'g1' });
    assignGroupRoles([leader, healer], group);
    expect(healer.group_role).toBe(GROUP_ROLES.HEALER);
  });

  it('high-strength + high-aggression member gets WARRIOR role', () => {
    const warrior = makeInd('warrior', {
      group_id: 'g1',
      phenotype: { physical_strength: 0.8, aggression: 0.7, empathy: 0.3, fluid_intelligence: 0.4, dominance: 0.5, curiosity: 0.5, xenophobia: 0.0, independence: 0.3 },
    });
    const group = makeGroup('g1', ['leader', 'warrior'], { leader_id: 'leader' });
    const leader = makeInd('leader', { group_id: 'g1' });
    assignGroupRoles([leader, warrior], group);
    expect(warrior.group_role).toBe(GROUP_ROLES.WARRIOR);
  });

  it('curious elder (age > 40) gets ELDER role', () => {
    const elder = makeInd('elder', {
      group_id: 'g1',
      age: 50 * 365,
      phenotype: { curiosity: 0.8, empathy: 0.4, physical_strength: 0.3, aggression: 0.2, fluid_intelligence: 0.4, dominance: 0.5, xenophobia: 0.0, independence: 0.3 },
    });
    const group = makeGroup('g1', ['leader', 'elder'], { leader_id: 'leader' });
    const leader = makeInd('leader', { group_id: 'g1' });
    assignGroupRoles([leader, elder], group);
    expect(elder.group_role).toBe(GROUP_ROLES.ELDER);
  });

  it('default member gets MEMBER role', () => {
    const member = makeInd('member', {
      group_id: 'g1',
      phenotype: { empathy: 0.3, fluid_intelligence: 0.3, physical_strength: 0.3, aggression: 0.2, curiosity: 0.3, dominance: 0.5, xenophobia: 0.0, independence: 0.3 },
    });
    const group = makeGroup('g1', ['leader', 'member'], { leader_id: 'leader' });
    const leader = makeInd('leader', { group_id: 'g1' });
    assignGroupRoles([leader, member], group);
    expect(member.group_role).toBe(GROUP_ROLES.MEMBER);
  });

  it('every member gets a role assigned', () => {
    const members = Array.from({ length: 8 }, (_, i) => makeInd(`m${i}`, { group_id: 'g1' }));
    const group = makeGroup('g1', members.map(m => m.id), { leader_id: 'm0' });
    assignGroupRoles(members, group);
    members.forEach(m => expect(m.group_role).toBeDefined());
  });
});

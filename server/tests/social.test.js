import { describe, it, expect } from 'vitest';
import {
  computeSocialStatus,
  processGroupDynamics,
  GROUP_ROLES,
  RELATIONSHIP_TYPES,
} from '../src/engines/social/socialEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    alive: true,
    x: 0, y: 0,
    age: 25 * 365,
    life_stage: 'ADULT',
    group_id: null,
    phenotype: {
      dominance: 0.5,
      fluid_intelligence: 0.5,
      empathy: 0.5,
      physical_strength: 0.5,
      xenophobia: 0.1,
      independence: 0.5,
      ...overrides.phenotype,
    },
    social: { reputation: 0.5, group_id: null, children_ids: [], relationships: {}, ...overrides.social },
    beliefs: new Set(),
    _behaviorCounts: {},
    ...overrides,
  };
}

function makeGroup(id, memberIds, overrides = {}) {
  return {
    id,
    leader_id: memberIds[0],
    member_ids: [...memberIds],
    founded_day: 0,
    internal_tension: 0,
    territory: { x: 0, y: 0, radius: 10 },
    alliances: [],
    rival_ids: [],
    prestige: 0.1,
    ...overrides,
  };
}

describe('computeSocialStatus', () => {
  it('returns 0 when no group exists', () => {
    const ind = makeInd('i1');
    expect(computeSocialStatus(ind, null)).toBe(0);
  });

  it('produces value in [0, 1] range', () => {
    const ind   = makeInd('i1', { phenotype: { dominance: 0.8, fluid_intelligence: 0.8, empathy: 0.8, physical_strength: 0.8 } });
    const group = makeGroup('g1', ['i1'], { founded_day: 1000 });
    const status = computeSocialStatus(ind, group);
    expect(status).toBeGreaterThanOrEqual(0);
    expect(status).toBeLessThanOrEqual(1);
  });

  it('high dominance + IQ → high status', () => {
    const high = makeInd('h', { phenotype: { dominance: 0.9, fluid_intelligence: 0.9, empathy: 0.9, physical_strength: 0.9 } });
    const low  = makeInd('l', { phenotype: { dominance: 0.1, fluid_intelligence: 0.1, empathy: 0.1, physical_strength: 0.1 } });
    const group = makeGroup('g1', ['h', 'l'], { founded_day: 500 });
    expect(computeSocialStatus(high, group)).toBeGreaterThan(computeSocialStatus(low, group));
  });

  it('reputation contributes to status', () => {
    const highRep = makeInd('hr', { social: { reputation: 1.0 } });
    const lowRep  = makeInd('lr', { social: { reputation: 0.0 } });
    const group   = makeGroup('g1', ['hr', 'lr'], { founded_day: 500 });
    expect(computeSocialStatus(highRep, group)).toBeGreaterThan(computeSocialStatus(lowRep, group));
  });
});

describe('processGroupDynamics — group formation', () => {
  it('two groupless individuals in close proximity form a new group', () => {
    const i1 = makeInd('i1');
    const i2 = makeInd('i2');
    const population = [i1, i2];
    const groups = [];

    processGroupDynamics(population, groups, 1);

    expect(groups.length).toBeGreaterThan(0);
    expect(i1.group_id).not.toBeNull();
    expect(i2.group_id).not.toBeNull();
  });

  it('individuals are assigned to the same group', () => {
    const i1 = makeInd('i1');
    const i2 = makeInd('i2');
    const groups = [];

    processGroupDynamics([i1, i2], groups, 1);

    expect(i1.group_id).toBe(i2.group_id);
  });
});

describe('processGroupDynamics — group fission', () => {
  it('group with 26+ members attempts fission (threshold: 25)', () => {
    // Create 26 individuals — all with high independence, low status (for fission)
    const members = Array.from({ length: 26 }, (_, i) =>
      makeInd(`m${i}`, {
        phenotype: { dominance: 0.1, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5, independence: 0.8 },
        social: { reputation: 0.1 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup('g1', members.map(m => m.id));
    const groups = [group];

    // Fission is probabilistic — should occur at least once in 300 tries
    let fissioned = false;
    for (let day = 0; day < 300; day++) {
      processGroupDynamics(members, groups, day);
      if (groups.length > 1) { fissioned = true; break; }
    }
    expect(fissioned).toBe(true);
  });

  it('tension > 0.8 triggers fission', () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeInd(`m${i}`, {
        phenotype: { dominance: 0.1, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5, independence: 0.9 },
        social: { reputation: 0.1 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup('g1', members.map(m => m.id), { internal_tension: 0.9 });
    const groups = [group];

    let fissioned = false;
    for (let day = 0; day < 300; day++) {
      processGroupDynamics(members, groups, day);
      if (groups.length > 1) { fissioned = true; break; }
    }
    expect(fissioned).toBe(true);
  });

  it('group with < 8 members does not split (minimum size condition)', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeInd(`m${i}`, {
        phenotype: { independence: 0.9, dominance: 0.1, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5 },
        social: { reputation: 0.1 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup('g1', members.map(m => m.id), { internal_tension: 0.9 });
    const groups = [group];

    for (let day = 0; day < 30; day++) {
      processGroupDynamics(members, groups, day);
    }
    expect(groups.length).toBe(1); // no fission should occur
  });
});

describe('RELATIONSHIP_TYPES — definition check', () => {
  it('6 relationship types defined', () => {
    expect(Object.keys(RELATIONSHIP_TYPES)).toHaveLength(6);
  });

  it('contains basic types', () => {
    expect(RELATIONSHIP_TYPES.KIN).toBe('kin');
    expect(RELATIONSHIP_TYPES.MATE).toBe('mate');
    expect(RELATIONSHIP_TYPES.RIVAL).toBe('rival');
  });
});

describe('GROUP_ROLES — definition check', () => {
  it('6 roles defined', () => {
    expect(Object.keys(GROUP_ROLES)).toHaveLength(6);
  });

  it('contains basic roles', () => {
    expect(GROUP_ROLES.LEADER).toBe('leader');
    expect(GROUP_ROLES.WARRIOR).toBe('warrior');
    expect(GROUP_ROLES.HEALER).toBe('healer');
  });
});

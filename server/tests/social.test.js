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
  it('grup yoksa 0 döner', () => {
    const ind = makeInd('i1');
    expect(computeSocialStatus(ind, null)).toBe(0);
  });

  it('[0, 1] aralığında değer üretir', () => {
    const ind   = makeInd('i1', { phenotype: { dominance: 0.8, fluid_intelligence: 0.8, empathy: 0.8, physical_strength: 0.8 } });
    const group = makeGroup('g1', ['i1'], { founded_day: 1000 });
    const status = computeSocialStatus(ind, group);
    expect(status).toBeGreaterThanOrEqual(0);
    expect(status).toBeLessThanOrEqual(1);
  });

  it('yüksek dominance + IQ → yüksek statü', () => {
    const high = makeInd('h', { phenotype: { dominance: 0.9, fluid_intelligence: 0.9, empathy: 0.9, physical_strength: 0.9 } });
    const low  = makeInd('l', { phenotype: { dominance: 0.1, fluid_intelligence: 0.1, empathy: 0.1, physical_strength: 0.1 } });
    const group = makeGroup('g1', ['h', 'l'], { founded_day: 500 });
    expect(computeSocialStatus(high, group)).toBeGreaterThan(computeSocialStatus(low, group));
  });

  it('itibar (reputation) statüye katkıda bulunur', () => {
    const highRep = makeInd('hr', { social: { reputation: 1.0 } });
    const lowRep  = makeInd('lr', { social: { reputation: 0.0 } });
    const group   = makeGroup('g1', ['hr', 'lr'], { founded_day: 500 });
    expect(computeSocialStatus(highRep, group)).toBeGreaterThan(computeSocialStatus(lowRep, group));
  });
});

describe('processGroupDynamics — grup oluşumu', () => {
  it('iki grupssuz birey yakın konumdaysa yeni grup oluşturur', () => {
    const i1 = makeInd('i1');
    const i2 = makeInd('i2');
    const population = [i1, i2];
    const groups = [];

    processGroupDynamics(population, groups, 1);

    expect(groups.length).toBeGreaterThan(0);
    expect(i1.group_id).not.toBeNull();
    expect(i2.group_id).not.toBeNull();
  });

  it('bireyler aynı gruba atanır', () => {
    const i1 = makeInd('i1');
    const i2 = makeInd('i2');
    const groups = [];

    processGroupDynamics([i1, i2], groups, 1);

    expect(i1.group_id).toBe(i2.group_id);
  });
});

describe('processGroupDynamics — grup bölünmesi (fission)', () => {
  it('26+ üyeli grup bölünme girişimi yapar (eşik: 25)', () => {
    // 26 birey oluştur — hepsi bağımsızlık yüksek, düşük statü (bölünme için)
    const members = Array.from({ length: 26 }, (_, i) =>
      makeInd(`m${i}`, {
        phenotype: { dominance: 0.1, fluid_intelligence: 0.5, empathy: 0.5, physical_strength: 0.5, independence: 0.8 },
        social: { reputation: 0.1 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup('g1', members.map(m => m.id));
    const groups = [group];

    // Fission olasılıklı — 50 denemede en az bir kez gerçekleşmeli
    let fissioned = false;
    for (let day = 0; day < 50; day++) {
      processGroupDynamics(members, groups, day);
      if (groups.length > 1) { fissioned = true; break; }
    }
    expect(fissioned).toBe(true);
  });

  it('gerilim > 0.8 bölünme tetikler', () => {
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
    for (let day = 0; day < 50; day++) {
      processGroupDynamics(members, groups, day);
      if (groups.length > 1) { fissioned = true; break; }
    }
    expect(fissioned).toBe(true);
  });

  it('< 8 üyeli grup bölünmez (minimum boyut koşulu)', () => {
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
    expect(groups.length).toBe(1); // bölünme olmamalı
  });
});

describe('RELATIONSHIP_TYPES — tanım kontrolü', () => {
  it('6 ilişki tipi tanımlı', () => {
    expect(Object.keys(RELATIONSHIP_TYPES)).toHaveLength(6);
  });

  it('temel tipleri içerir', () => {
    expect(RELATIONSHIP_TYPES.KIN).toBe('kin');
    expect(RELATIONSHIP_TYPES.MATE).toBe('mate');
    expect(RELATIONSHIP_TYPES.RIVAL).toBe('rival');
  });
});

describe('GROUP_ROLES — tanım kontrolü', () => {
  it('6 rol tanımlı', () => {
    expect(Object.keys(GROUP_ROLES)).toHaveLength(6);
  });

  it('temel rolleri içerir', () => {
    expect(GROUP_ROLES.LEADER).toBe('leader');
    expect(GROUP_ROLES.WARRIOR).toBe('warrior');
    expect(GROUP_ROLES.HEALER).toBe('healer');
  });
});

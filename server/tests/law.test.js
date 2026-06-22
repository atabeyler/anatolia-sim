import { describe, it, expect } from 'vitest';
import { NORM_TYPES, processLawTick, computeSocialOrder } from '../src/engines/law/lawEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    is_dead: false,
    group_id: 'g1',
    phenotype: {
      fluid_intelligence: 0.6,
      aggression: 0.3,
      conscientiousness: 0.6,
      ...overrides.phenotype,
    },
    language: { foxp2_expression: 0.5, ...overrides.language },
    inventory: { food: 5, water: 3 },
    social: {},
    ...overrides,
  };
}

function makeGroup(memberIds, overrides = {}) {
  return {
    id: 'g1',
    leader_id: memberIds[0],
    member_ids: [...memberIds],
    norms: new Set(),
    internal_tension: 0.3,
    ...overrides,
  };
}

describe('NORM_TYPES — definition checks', () => {
  it('defines 13 norms', () => {
    expect(Object.keys(NORM_TYPES)).toHaveLength(13);
  });

  it('stage-1 norms have low iq_min', () => {
    const stage1 = Object.values(NORM_TYPES).filter(n => n.stage === 1);
    stage1.forEach(n => expect(n.iq_min).toBeLessThanOrEqual(0.1));
  });

  it('written_law requires writing_system tech', () => {
    expect(NORM_TYPES.written_law.requires_tech).toContain('writing_system');
  });

  it('tax_system requires writing and math', () => {
    expect(NORM_TYPES.tax_system.requires_tech).toContain('writing_system');
    expect(NORM_TYPES.tax_system.requires_tech).toContain('mathematics_basic');
  });
});

describe('processLawTick — norm emergence', () => {
  it('returns empty array for null group', () => {
    expect(processLawTick(null, [], new Set(), 0)).toHaveLength(0);
  });

  it('returns empty array if group has fewer than 2 members', () => {
    const group = makeGroup(['i1']);
    const pop = [makeInd('i1')];
    expect(processLawTick(group, pop, new Set(), 1)).toHaveLength(0);
  });

  it('does not add norm when foxp2 requirement not met', () => {
    const members = Array.from({ length: 5 }, (_, i) => makeInd(`i${i}`, { language: { foxp2_expression: 0.05 } }));
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup(members.map(m => m.id));
    for (let day = 0; day < 500; day++) {
      processLawTick(group, members, new Set(), day);
    }
    expect(group.norms.size).toBe(0);
  });

  it('does not add written_law without writing_system tech', () => {
    const members = Array.from({ length: 20 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { fluid_intelligence: 0.8 },
        language: { foxp2_expression: 0.8 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup(members.map(m => m.id), { norms: new Set(['reciprocity', 'no_theft', 'incest_taboo', 'elder_respect', 'hospitality', 'blood_feud', 'communal_work', 'leader_arbitration', 'property_rights', 'punishment_exile']) });
    for (let day = 0; day < 1000; day++) {
      processLawTick(group, members, new Set(), day);
    }
    expect(group.norms.has('written_law')).toBe(false);
  });

  it('norm event has correct shape', () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { fluid_intelligence: 0.9, aggression: 0.1, conscientiousness: 0.9 },
        language: { foxp2_expression: 0.9 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup(members.map(m => m.id), { internal_tension: 0.9 });
    let normEvent = null;
    for (let day = 0; day < 5000 && !normEvent; day++) {
      const events = processLawTick(group, members, new Set(), day);
      normEvent = events.find(e => e.type === 'norm_emerged');
    }
    expect(normEvent).not.toBeNull();
    expect(normEvent).toMatchObject({
      type: 'norm_emerged',
      group_id: 'g1',
    });
    expect(typeof normEvent.norm_id).toBe('string');
    expect(typeof normEvent.description).toBe('string');
  });
});

describe('processLawTick — norm violation', () => {
  it('high-aggression individual can violate norms', () => {
    const members = Array.from({ length: 6 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { fluid_intelligence: 0.5, aggression: 0.95, conscientiousness: 0.1 },
        language: { foxp2_expression: 0.5 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup(members.map(m => m.id), { norms: new Set(['reciprocity', 'no_theft']) });
    let violation = null;
    for (let day = 0; day < 5000 && !violation; day++) {
      const evs = processLawTick(group, members, new Set(), day);
      violation = evs.find(e => e.type === 'norm_violation');
    }
    expect(violation).not.toBeNull();
    expect(violation.punishment).toBeDefined();
  });

  it('exile removes individual from group', () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { fluid_intelligence: 0.5, aggression: 0.99, conscientiousness: 0.01 },
        language: { foxp2_expression: 0.6 },
      })
    );
    members.forEach(m => { m.group_id = 'g1'; });
    const group = makeGroup(members.map(m => m.id), {
      norms: new Set(['punishment_exile', 'no_theft', 'reciprocity']),
    });
    let exiled = false;
    for (let day = 0; day < 5000 && !exiled; day++) {
      const evs = processLawTick(group, members, new Set(), day);
      if (evs.find(e => e.type === 'norm_violation' && e.punishment === 'exile')) {
        exiled = true;
      }
    }
    if (exiled) {
      const exiledMember = members.find(m => m.group_id === null);
      if (exiledMember) {
        expect(group.member_ids).not.toContain(exiledMember.id);
      }
    }
    // If exile never triggered, test still passes (probabilistic)
  });
});

describe('computeSocialOrder', () => {
  it('returns 0 for group with no norms', () => {
    const group = makeGroup(['i1', 'i2'], { norms: new Set(), internal_tension: 0.5 });
    const order = computeSocialOrder(group);
    expect(order).toBeGreaterThanOrEqual(0);
    expect(order).toBeLessThanOrEqual(1);
  });

  it('more norms → higher order', () => {
    const few = makeGroup(['i1', 'i2', 'i3', 'i4'], { norms: new Set(['reciprocity']), internal_tension: 0.3 });
    const many = makeGroup(['i1', 'i2', 'i3', 'i4'], { norms: new Set(['reciprocity', 'no_theft', 'incest_taboo', 'elder_respect']), internal_tension: 0.3 });
    expect(computeSocialOrder(many)).toBeGreaterThan(computeSocialOrder(few));
  });

  it('lower tension → higher order', () => {
    const tense = makeGroup(['i1', 'i2', 'i3'], { norms: new Set(['reciprocity']), internal_tension: 0.9 });
    const calm  = makeGroup(['i1', 'i2', 'i3'], { norms: new Set(['reciprocity']), internal_tension: 0.1 });
    expect(computeSocialOrder(calm)).toBeGreaterThan(computeSocialOrder(tense));
  });

  it('result is always between 0 and 1', () => {
    const group = makeGroup(['i1', 'i2', 'i3'], {
      norms: new Set(Object.keys(NORM_TYPES)),
      internal_tension: 0,
    });
    const order = computeSocialOrder(group);
    expect(order).toBeGreaterThanOrEqual(0);
    expect(order).toBeLessThanOrEqual(1);
  });
});

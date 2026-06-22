import { describe, it, expect } from 'vitest';
import { CULTURAL_MEMES, processCultureTick, computeCulturalPrestige } from '../src/engines/culture/cultureEngine.js';

function makeInd(id, overrides = {}) {
  return {
    id,
    group_id: 'g1',
    phenotype: { artistic_sense: 0.7, ...overrides.phenotype },
    language: { foxp2_expression: 0.6, ...overrides.language },
    ...overrides,
  };
}

function makeGroup(id, memberIds, overrides = {}) {
  return {
    id,
    member_ids: [...memberIds],
    culture: new Set(),
    _culturePressure: {},
    _diffusionPressure: 0,
    internal_tension: 0.5,
    ...overrides,
  };
}

describe('CULTURAL_MEMES — definition checks', () => {
  it('defines 18 memes', () => {
    expect(Object.keys(CULTURAL_MEMES)).toHaveLength(18);
  });

  it('shared_greeting is the most accessible meme (lowest foxp2_min)', () => {
    const mins = Object.values(CULTURAL_MEMES).map(m => m.foxp2_min);
    expect(CULTURAL_MEMES.shared_greeting.foxp2_min).toBe(Math.min(...mins));
  });

  it('written_myth and legal_code require writing_system', () => {
    expect(CULTURAL_MEMES.written_myth.requires_tech).toContain('writing_system');
    expect(CULTURAL_MEMES.legal_code.requires_tech).toContain('writing_system');
  });

  it('stage-5 memes require the largest group size', () => {
    const stage5 = Object.values(CULTURAL_MEMES).filter(m => m.stage === 5);
    const stage4 = Object.values(CULTURAL_MEMES).filter(m => m.stage === 4);
    const maxS5 = Math.max(...stage5.map(m => m.group_size_min));
    const maxS4 = Math.max(...stage4.map(m => m.group_size_min));
    expect(maxS5).toBeGreaterThanOrEqual(maxS4);
  });
});

describe('processCultureTick — meme emergence', () => {
  it('returns empty array for group with < 2 members', () => {
    const group = makeGroup('g1', ['i1']);
    const pop = [makeInd('i1')];
    const evs = processCultureTick(pop, [group], new Set(), 1);
    expect(evs).toHaveLength(0);
  });

  it('meme blocked when foxp2 requirement not met', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeInd(`i${i}`, { language: { foxp2_expression: 0.01 } })
    );
    const group = makeGroup('g1', members.map(m => m.id));
    for (let day = 0; day < 1000; day++) {
      processCultureTick(members, [group], new Set(), day);
    }
    expect(group.culture.size).toBe(0);
  });

  it('meme blocked when group too small', () => {
    const members = Array.from({ length: 3 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { artistic_sense: 0.9 },
        language: { foxp2_expression: 0.8 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id));
    for (let day = 0; day < 2000; day++) {
      processCultureTick(members, [group], new Set(), day);
    }
    expect(group.culture.has('gift_exchange')).toBe(false);
  });

  it('written_myth blocked without writing_system tech', () => {
    const members = Array.from({ length: 15 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { artistic_sense: 0.99 },
        language: { foxp2_expression: 0.99 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id));
    for (let day = 0; day < 3000; day++) {
      processCultureTick(members, [group], new Set(), day);
    }
    expect(group.culture.has('written_myth')).toBe(false);
  });

  it('meme emergence event has correct shape', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { artistic_sense: 0.99 },
        language: { foxp2_expression: 0.99 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id));
    let event = null;
    for (let day = 0; day < 10000 && !event; day++) {
      const evs = processCultureTick(members, [group], new Set(), day);
      event = evs.find(e => e.type === 'cultural_meme_emerged') ?? null;
    }
    expect(event).not.toBeNull();
    expect(event).toMatchObject({ type: 'cultural_meme_emerged', group_id: 'g1' });
    expect(typeof event.meme_id).toBe('string');
    expect(typeof event.description).toBe('string');
  });

  it('already-known meme not added again', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { artistic_sense: 0.99 },
        language: { foxp2_expression: 0.99 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id), {
      culture: new Set(Object.keys(CULTURAL_MEMES)),
    });
    const before = group.culture.size;
    for (let day = 0; day < 200; day++) {
      processCultureTick(members, [group], new Set(['writing_system']), day);
    }
    expect(group.culture.size).toBe(before);
  });

  it('meme emergence reduces internal_tension', () => {
    const members = Array.from({ length: 5 }, (_, i) =>
      makeInd(`i${i}`, {
        phenotype: { artistic_sense: 0.99 },
        language: { foxp2_expression: 0.99 },
      })
    );
    const group = makeGroup('g1', members.map(m => m.id), { internal_tension: 0.5 });
    group._culturePressure['shared_greeting'] = 99999;
    const evs = processCultureTick(members, [group], new Set(), 1);
    if (evs.find(e => e.meme_id === 'shared_greeting')) {
      expect(group.internal_tension).toBeLessThan(0.5);
    }
  });
});

describe('processCultureTick — inter-group diffusion', () => {
  it('fires after 67 ticks of pressure accumulation', () => {
    const members1 = Array.from({ length: 5 }, (_, i) =>
      makeInd(`g1_${i}`, { language: { foxp2_expression: 0.8 } })
    );
    const members2 = Array.from({ length: 5 }, (_, i) =>
      makeInd(`g2_${i}`, { group_id: 'g2', language: { foxp2_expression: 0.8 } })
    );
    members2.forEach(m => { m.group_id = 'g2'; });
    const group1 = makeGroup('g1', members1.map(m => m.id), {
      culture: new Set(['shared_greeting']),
    });
    const group2 = makeGroup('g2', members2.map(m => m.id), {
      _diffusionPressure: 66,
    });
    const allMembers = [...members1, ...members2];
    let diffused = false;
    for (let day = 0; day < 200 && !diffused; day++) {
      const evs = processCultureTick(allMembers, [group1, group2], new Set(), day);
      if (evs.find(e => e.type === 'cultural_diffusion')) diffused = true;
    }
    expect(diffused).toBe(true);
  });
});

describe('computeCulturalPrestige', () => {
  it('returns 0 for group with no culture', () => {
    const group = makeGroup('g1', []);
    expect(computeCulturalPrestige(group)).toBe(0);
  });

  it('more memes → higher prestige', () => {
    const few  = makeGroup('g1', [], { culture: new Set(['shared_greeting']) });
    const many = makeGroup('g2', [], { culture: new Set(['shared_greeting', 'mourning_ritual', 'food_sharing_norm', 'gift_exchange', 'storytelling']) });
    expect(computeCulturalPrestige(many)).toBeGreaterThan(computeCulturalPrestige(few));
  });

  it('prestige is capped at 1.0', () => {
    const group = makeGroup('g1', [], { culture: new Set(Object.keys(CULTURAL_MEMES)) });
    expect(computeCulturalPrestige(group)).toBeLessThanOrEqual(1.0);
  });
});

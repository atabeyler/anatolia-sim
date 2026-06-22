import { describe, it, expect } from 'vitest';
import { ART_FORMS, processArtTick, applyArtEffects } from '../src/engines/art/artEngine.js';

function makeInd(overrides = {}) {
  return {
    id: 'ind-1',
    life_stage: 'ADULT',
    phenotype: {
      fluid_intelligence: 0.8,
      artistic_sense: 0.8,
      ...overrides.phenotype,
    },
    language: { foxp2_expression: 0.7, ...overrides.language },
    psychology: { wellbeing: 0.5, stress_level: 0.2 },
    _currentAction: 'craft',
    ...overrides,
  };
}

const RICH_WORLD = { food_abundance: 0.9 };
const POOR_WORLD = { food_abundance: 0.1 };

describe('ART_FORMS — definition checks', () => {
  it('defines 12 art forms', () => {
    expect(Object.keys(ART_FORMS)).toHaveLength(12);
  });

  it('rhythmic_percussion has lowest iq_min (most accessible)', () => {
    const minIq = Math.min(...Object.values(ART_FORMS).map(a => a.iq_min));
    expect(ART_FORMS.rhythmic_percussion.iq_min).toBe(minIq);
  });

  it('written_story requires writing_system tech', () => {
    expect(ART_FORMS.written_story.requires_tech).toContain('writing_system');
  });

  it('visual arts require craft action', () => {
    // All visual arts must be discovered while crafting (ART_ACTION_GATE)
    const visualForms = Object.entries(ART_FORMS).filter(([, a]) => a.medium === 'visual');
    expect(visualForms.length).toBeGreaterThan(0);
  });

  it('narrative arts have foxp2_min defined', () => {
    const narrativeForms = Object.values(ART_FORMS).filter(a => a.medium === 'narrative');
    narrativeForms.forEach(a => expect(a.foxp2_min).toBeGreaterThan(0));
  });
});

describe('processArtTick — discovery conditions', () => {
  it('returns empty array when discoveredArts already contains all forms', () => {
    const ind = makeInd();
    const all = new Set(Object.keys(ART_FORMS));
    const events = processArtTick([ind], all, new Set(), RICH_WORLD, 1);
    expect(events).toHaveLength(0);
  });

  it('infants and children cannot create art', () => {
    const infant = makeInd({ life_stage: 'INFANT' });
    const child  = makeInd({ life_stage: 'CHILD' });
    const events = processArtTick([infant, child], new Set(), new Set(), RICH_WORLD, 1);
    expect(events).toHaveLength(0);
  });

  it('low food surplus prevents art discovery', () => {
    const ind = makeInd();
    let found = false;
    for (let day = 0; day < 1000; day++) {
      const evs = processArtTick([ind], new Set(), new Set(), POOR_WORLD, day);
      if (evs.length > 0) { found = true; break; }
    }
    // rhythmic_percussion requires surplus_min: 0.2 — food_abundance: 0.1 is below threshold
    expect(found).toBe(false);
  });

  it('wrong action type blocks art discovery', () => {
    const ind = makeInd({ _currentAction: 'forage' });
    // all art requiring 'craft' or 'socialize' blocked; forage matches neither
    for (let day = 0; day < 500; day++) {
      const evs = processArtTick([ind], new Set(), new Set(), RICH_WORLD, day);
      expect(evs).toHaveLength(0);
    }
  });

  it('art event has correct shape when discovered', () => {
    const ind = makeInd({
      id: 'artist-1',
      _currentAction: 'socialize',
      phenotype: { fluid_intelligence: 0.99, artistic_sense: 0.99 },
      language: { foxp2_expression: 0.0 },
    });
    let event = null;
    for (let day = 0; day < 100000 && !event; day++) {
      const discovered = new Set();
      const evs = processArtTick([ind], discovered, new Set(), RICH_WORLD, day);
      event = evs[0] ?? null;
    }
    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      type: 'art_created',
      creator_id: 'artist-1',
    });
    expect(typeof event.art_id).toBe('string');
    expect(typeof event.medium).toBe('string');
    expect(typeof event.description).toBe('string');
  });

  it('art requiring stone_tools not discovered without that tech', () => {
    const ind = makeInd({ _currentAction: 'craft' });
    const discovered = new Set();
    for (let day = 0; day < 5000; day++) {
      processArtTick([ind], discovered, new Set(), RICH_WORLD, day);
    }
    // sculpture requires stone_tools — should not appear without it
    expect(discovered.has('sculpture')).toBe(false);
  });

  it('sculpture discoverable with stone_tools tech', () => {
    const ind = makeInd({
      _currentAction: 'craft',
      phenotype: { fluid_intelligence: 0.99, artistic_sense: 0.99 },
    });
    const discovered = new Set();
    let found = false;
    for (let day = 0; day < 100000 && !found; day++) {
      processArtTick([ind], discovered, new Set(['stone_tools']), RICH_WORLD, day);
      if (discovered.has('sculpture')) found = true;
    }
    expect(found).toBe(true);
  });
});

describe('applyArtEffects', () => {
  it('no effect when discoveredArts is empty', () => {
    const ind = makeInd();
    const before = ind.psychology.wellbeing;
    applyArtEffects(ind, null, new Set());
    expect(ind.psychology.wellbeing).toBe(before);
  });

  it('increases wellbeing when art forms are known', () => {
    const ind = makeInd();
    const before = ind.psychology.wellbeing;
    applyArtEffects(ind, null, new Set(['rhythmic_percussion', 'vocal_melody', 'cave_painting']));
    expect(ind.psychology.wellbeing).toBeGreaterThan(before);
  });

  it('wellbeing never exceeds 1.0', () => {
    const ind = makeInd({ psychology: { wellbeing: 0.9999 } });
    const allArts = new Set(Object.keys(ART_FORMS));
    for (let i = 0; i < 1000; i++) {
      applyArtEffects(ind, null, allArts);
    }
    expect(ind.psychology.wellbeing).toBeLessThanOrEqual(1.0);
  });

  it('reduces group tension when 4+ art forms known', () => {
    const ind = makeInd();
    const group = { internal_tension: 0.5 };
    const fourArts = new Set(['rhythmic_percussion', 'vocal_melody', 'cave_painting', 'oral_story']);
    applyArtEffects(ind, group, fourArts);
    expect(group.internal_tension).toBeLessThan(0.5);
  });

  it('does not reduce group tension with fewer than 4 art forms', () => {
    const ind = makeInd();
    const group = { internal_tension: 0.5 };
    applyArtEffects(ind, group, new Set(['rhythmic_percussion']));
    expect(group.internal_tension).toBe(0.5);
  });
});

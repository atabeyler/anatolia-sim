import { describe, it, expect } from 'vitest';
import { ASTRONOMY_KNOWLEDGE, processAstronomyTick, getAstronomyBonus } from '../src/engines/astronomy/astronomyEngine.js';

function makeObs(id, overrides = {}) {
  return {
    id,
    is_dead: false,
    life_stage: 'ADULT',
    phenotype: {
      curiosity: 0.8,
      fluid_intelligence: 0.8,
      ...overrides.phenotype,
    },
    language: { foxp2_expression: 0.7, ...overrides.language },
    ...overrides,
  };
}

describe('ASTRONOMY_KNOWLEDGE — definition checks', () => {
  it('defines 5 knowledge types', () => {
    expect(Object.keys(ASTRONOMY_KNOWLEDGE)).toHaveLength(5);
  });

  it('lunar_tracking has lowest iq_min', () => {
    const mins = Object.values(ASTRONOMY_KNOWLEDGE).map(k => k.iq_min);
    expect(ASTRONOMY_KNOWLEDGE.lunar_tracking.iq_min).toBe(Math.min(...mins));
  });

  it('planetary_model requires math and writing', () => {
    const k = ASTRONOMY_KNOWLEDGE.planetary_model;
    expect(k.requires_tech).toContain('mathematics_basic');
    expect(k.requires_tech).toContain('writing_system');
  });

  it('eclipse_prediction requires prior lunar_cycle observation', () => {
    expect(ASTRONOMY_KNOWLEDGE.eclipse_prediction.requires_obs).toContain('lunar_cycle');
  });
});

describe('processAstronomyTick — celestial events', () => {
  it('returns array (may be empty on a non-event day)', () => {
    const events = processAstronomyTick([], new Set(), new Set(), new Set(), 1);
    expect(Array.isArray(events)).toBe(true);
  });

  it('observation is added to set when event fires', () => {
    const obs = new Set();
    let fired = false;
    for (let day = 0; day <= 3000 && !fired; day++) {
      processAstronomyTick([], obs, new Set(), new Set(), day);
      if (obs.has('lunar_cycle')) fired = true;
    }
    expect(fired).toBe(true);
  });

  it('infants and children do not unlock astronomy knowledge', () => {
    const infant = makeObs('i1', { life_stage: 'INFANT' });
    const child  = makeObs('c1', { life_stage: 'CHILD' });
    const obs = new Set(['lunar_cycle']);
    const knowledge = new Set();
    for (let day = 0; day < 5000; day++) {
      processAstronomyTick([infant, child], obs, knowledge, new Set(), day);
    }
    expect(knowledge.size).toBe(0);
  });

  it('low-curiosity observer cannot unlock knowledge', () => {
    const observer = makeObs('o1', {
      phenotype: { curiosity: 0.3, fluid_intelligence: 0.8 },
    });
    const obs = new Set(['lunar_cycle']);
    const knowledge = new Set();
    for (let day = 0; day < 10000; day++) {
      processAstronomyTick([observer], obs, knowledge, new Set(), day);
    }
    expect(knowledge.size).toBe(0);
  });

  it('low iq prevents specific knowledge unlock', () => {
    const observer = makeObs('o1', {
      phenotype: { curiosity: 0.9, fluid_intelligence: 0.1 },
      language: { foxp2_expression: 0.9 },
    });
    const obs = new Set(['lunar_cycle']);
    const knowledge = new Set();
    for (let day = 0; day < 10000; day++) {
      processAstronomyTick([observer], obs, knowledge, new Set(), day);
    }
    expect(knowledge.has('lunar_tracking')).toBe(false);
  });

  it('lunar_tracking discoverable with correct observer and observations', () => {
    const observer = makeObs('o1', {
      phenotype: { curiosity: 0.99, fluid_intelligence: 0.99 },
      language: { foxp2_expression: 0.99 },
    });
    const obs = new Set(['lunar_cycle']);
    const knowledge = new Set();
    let found = false;
    for (let day = 0; day < 200000 && !found; day++) {
      processAstronomyTick([observer], obs, knowledge, new Set(), day);
      if (knowledge.has('lunar_tracking')) found = true;
    }
    expect(found).toBe(true);
  });

  it('astronomy_discovery event has correct shape', () => {
    const observer = makeObs('o1', {
      id: 'stargazer',
      phenotype: { curiosity: 0.99, fluid_intelligence: 0.99 },
      language: { foxp2_expression: 0.99 },
    });
    const obs = new Set(['lunar_cycle']);
    const knowledge = new Set();
    let event = null;
    for (let day = 0; day < 200000 && !event; day++) {
      const evs = processAstronomyTick([observer], obs, knowledge, new Set(), day);
      event = evs.find(e => e.type === 'astronomy_discovery') ?? null;
    }
    if (event) {
      expect(event).toMatchObject({ type: 'astronomy_discovery', discoverer_id: 'stargazer' });
      expect(typeof event.knowledge_id).toBe('string');
      expect(typeof event.description).toBe('string');
    }
  });

  it('seasonal_calendar requires calendar tech', () => {
    const observer = makeObs('o1', {
      phenotype: { curiosity: 0.99, fluid_intelligence: 0.99 },
      language: { foxp2_expression: 0.99 },
    });
    const obs = new Set(['solstice', 'equinox']);
    const knowledge = new Set();
    for (let day = 0; day < 50000; day++) {
      processAstronomyTick([observer], obs, knowledge, new Set(), day);
    }
    expect(knowledge.has('seasonal_calendar')).toBe(false);
  });
});

describe('getAstronomyBonus', () => {
  it('returns empty object for empty knowledge set', () => {
    expect(getAstronomyBonus(new Set())).toEqual({});
  });

  it('lunar_tracking grants navigation bonus', () => {
    const bonus = getAstronomyBonus(new Set(['lunar_tracking']));
    expect(bonus.navigation).toBeGreaterThan(0);
  });

  it('seasonal_calendar grants farming_efficiency bonus', () => {
    const bonus = getAstronomyBonus(new Set(['seasonal_calendar']));
    expect(bonus.farming_efficiency).toBeGreaterThan(0);
  });

  it('star_map grants navigation and seafaring bonuses', () => {
    const bonus = getAstronomyBonus(new Set(['star_map']));
    expect(bonus.navigation).toBeGreaterThan(0);
    expect(bonus.seafaring).toBeGreaterThan(0);
  });

  it('all knowledge combined accumulates bonuses', () => {
    const all = new Set(['lunar_tracking', 'seasonal_calendar', 'star_map', 'eclipse_prediction', 'planetary_model']);
    const bonus = getAstronomyBonus(all);
    expect(bonus.navigation).toBeGreaterThan(0.3);
    expect(bonus.farming_efficiency).toBeGreaterThan(0.15);
    expect(bonus.innovation_rate).toBeGreaterThan(0);
  });
});

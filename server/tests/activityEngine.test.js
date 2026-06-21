import { describe, it, expect } from 'vitest';
import { accumulateExperience, checkTechEmergence, TECH_SKILLS } from '../src/engines/agent/activityEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeInd(overrides = {}) {
  return {
    phenotype: { fluid_intelligence: 0.7, curiosity: 0.7 },
    known_techs: new Set(),
    language: { stage: 0 },
    _currentAction: 'explore',
    _experience: {},
    ...overrides,
  };
}

function makeWorld(overrides = {}) {
  return {
    biome: 'mediterranean',
    temperature: 20,
    season: 'summer',
    fauna: { prey_density: 0.5 },
    water_abundance: 0.5,
    ...overrides,
  };
}

// ── accumulateExperience ─────────────────────────────────────────────────────

describe('accumulateExperience — stone_handling', () => {
  it('craft in non-ocean biome gains stone_handling', () => {
    const ind = makeInd({ _currentAction: 'craft' });
    accumulateExperience(ind, makeWorld());
    expect(ind._experience.stone_handling).toBeGreaterThan(0);
  });

  it('explore in non-ocean biome gains stone_handling (lower rate than craft)', () => {
    const craft = makeInd({ _currentAction: 'craft', _experience: {} });
    const explore = makeInd({ _currentAction: 'explore', _experience: {} });
    accumulateExperience(craft, makeWorld());
    accumulateExperience(explore, makeWorld());
    expect(craft._experience.stone_handling).toBeGreaterThan(explore._experience.stone_handling);
  });

  it('open_ocean biome: no stone_handling gained', () => {
    const ind = makeInd({ _currentAction: 'craft' });
    accumulateExperience(ind, makeWorld({ biome: 'open_ocean' }));
    expect(ind._experience.stone_handling ?? 0).toBe(0);
  });
});

describe('accumulateExperience — hunting_practice', () => {
  it('hunt action with fauna gains hunting_practice', () => {
    const ind = makeInd({ _currentAction: 'hunt' });
    accumulateExperience(ind, makeWorld({ fauna: { prey_density: 0.5 } }));
    expect(ind._experience.hunting_practice).toBeGreaterThan(0);
  });

  it('hunt with no fauna (density ≤ 0.2) does not gain hunting_practice', () => {
    const ind = makeInd({ _currentAction: 'hunt' });
    accumulateExperience(ind, makeWorld({ fauna: { prey_density: 0.1 } }));
    expect(ind._experience.hunting_practice ?? 0).toBe(0);
  });
});

describe('accumulateExperience — learning rate scaling', () => {
  it('higher IQ × curiosity → more experience per action', () => {
    const genius = makeInd({ phenotype: { fluid_intelligence: 0.9, curiosity: 0.9 }, _currentAction: 'craft' });
    const slow   = makeInd({ phenotype: { fluid_intelligence: 0.2, curiosity: 0.2 }, _currentAction: 'craft' });
    accumulateExperience(genius, makeWorld());
    accumulateExperience(slow,   makeWorld());
    expect(genius._experience.stone_handling).toBeGreaterThan(slow._experience.stone_handling);
  });
});

describe('accumulateExperience — water_carrying', () => {
  it('thirsty individual near water gains more water_carrying than non-thirsty', () => {
    const thirsty = makeInd({ health: { hydration: 0.3 } });
    const fine    = makeInd({ health: { hydration: 0.9 } });
    accumulateExperience(thirsty, makeWorld({ water_abundance: 0.5 }));
    accumulateExperience(fine,    makeWorld({ water_abundance: 0.5 }));
    expect(thirsty._experience.water_carrying).toBeGreaterThan(fine._experience.water_carrying ?? 0);
  });

  it('no water present → no water_carrying gain', () => {
    const ind = makeInd({ _currentAction: 'drink', health: { hydration: 0.2 } });
    accumulateExperience(ind, makeWorld({ water_abundance: 0.1 }));
    expect(ind._experience.water_carrying ?? 0).toBe(0);
  });
});

// ── checkTechEmergence ───────────────────────────────────────────────────────

describe('checkTechEmergence — stone_tools emergence', () => {
  it('emerges when stone_handling exceeds threshold', () => {
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.7, curiosity: 0.7 } });
    // factor = max(0.1, 0.7 * 0.7 * 4) = 1.96; threshold = 1500 / 1.96 ≈ 765
    ind._experience = { stone_handling: 1000 };
    const discovered = new Set();
    const emerged = checkTechEmergence(ind, discovered);
    expect(emerged).toContain('stone_tools');
    expect(discovered.has('stone_tools')).toBe(true);
    expect(ind.known_techs.has('stone_tools')).toBe(true);
  });

  it('does not emerge when experience is too low', () => {
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.7, curiosity: 0.7 } });
    ind._experience = { stone_handling: 10 };
    const emerged = checkTechEmergence(ind, new Set());
    expect(emerged).not.toContain('stone_tools');
  });
});

describe('checkTechEmergence — prerequisite enforcement (BUG-02: uses known_techs not discoveredTechs)', () => {
  it('hunting_spear blocked when stone_tools not in individual known_techs', () => {
    // BUG-02 fix: prereq check uses ind.known_techs, not discoveredTechs global.
    // Even if discoveredTechs has stone_tools, individual must personally know it.
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.8, curiosity: 0.8 } });
    ind._experience = { hunting_practice: 9999, wood_friction: 9999 };
    ind.known_techs = new Set(); // individual does NOT know stone_tools
    const globalDiscovered = new Set(['stone_tools']); // global discovery doesn't help
    const emerged = checkTechEmergence(ind, globalDiscovered);
    expect(emerged).not.toContain('hunting_spear');
  });

  it('hunting_spear emerges once stone_tools is in individual known_techs', () => {
    // BUG-02 fix: individual must have stone_tools in their own known_techs.
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.8, curiosity: 0.8 } });
    ind._experience = { stone_handling: 9999, hunting_practice: 9999, wood_friction: 9999 };
    ind.known_techs = new Set(['stone_tools']); // individual personally knows it
    const emerged = checkTechEmergence(ind, new Set(['stone_tools']));
    expect(emerged).toContain('hunting_spear');
  });
});

describe('checkTechEmergence — IQ minimum', () => {
  it('writing_system blocked when IQ below 0.7', () => {
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.5, curiosity: 0.9 } });
    ind.language = { stage: 6 };
    ind._experience = { social_exchange: 9999, clay_working: 9999 };
    const discovered = new Set(['pottery']);
    const emerged = checkTechEmergence(ind, discovered);
    expect(emerged).not.toContain('writing_system');
  });
});

describe('checkTechEmergence — no double-emergence', () => {
  it('already in discoveredTechs is never returned again', () => {
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.9, curiosity: 0.9 } });
    ind._experience = { stone_handling: 9999, plant_gathering: 9999 };
    const discovered = new Set(['stone_tools', 'foraging']);
    const emerged = checkTechEmergence(ind, discovered);
    expect(emerged).not.toContain('stone_tools');
    expect(emerged).not.toContain('foraging');
  });
});

describe('checkTechEmergence — swimming (no prereqs)', () => {
  it('swimming emerges with sufficient water_carrying, no prereqs required', () => {
    const ind = makeInd({ phenotype: { fluid_intelligence: 0.5, curiosity: 0.5 } });
    ind._experience = { water_carrying: 9999 };
    const emerged = checkTechEmergence(ind, new Set());
    expect(emerged).toContain('swimming');
  });

  it('swimming prereqs list is empty in TECH_SKILLS definition', () => {
    expect(TECH_SKILLS.swimming.prereqs).toEqual([]);
  });
});

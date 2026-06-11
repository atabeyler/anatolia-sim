import { describe, it, expect } from 'vitest';
import { updateLanguageStage, updateFoxp2Expression } from '../src/engines/language/languageEngine.js';

function makeInd(foxp2Expression, stage = 0) {
  return {
    phenotype: { language_capacity: 0.9, fluid_intelligence: 0.7 },
    language: {
      stage,
      stage_name: 'pre-linguistic',
      foxp2_expression: foxp2Expression,
      vocabulary: {},
    },
  };
}

describe('updateLanguageStage', () => {
  it('stays at 0 with group_size < 3', () => {
    const ind = makeInd(0.8);
    const result = updateLanguageStage(ind, 1, 0);
    expect(result.upgraded).toBe(false);
    expect(ind.language.stage).toBe(0);
  });

  it('advances to stage 1 with group>=3 and gen>=0 (foxp2_min=0)', () => {
    const ind = makeInd(0.0);
    const result = updateLanguageStage(ind, 5, 0);
    expect(result.upgraded).toBe(true);
    expect(ind.language.stage).toBeGreaterThanOrEqual(1);
  });

  it('stage 2 blocked when foxp2 < 0.4', () => {
    const ind = makeInd(0.35, 1);
    updateLanguageStage(ind, 10, 1);
    expect(ind.language.stage).toBeLessThan(2);
  });

  it('stage 2 advances when foxp2 >= 0.4', () => {
    const ind = makeInd(0.45, 1);
    updateLanguageStage(ind, 10, 1);
    expect(ind.language.stage).toBeGreaterThanOrEqual(2);
  });

  it('grammar flag set at stage 4+', () => {
    const ind = makeInd(0.72, 3);
    updateLanguageStage(ind, 20, 8);
    expect(ind.language.grammar).toBe(true);
  });

  it('writing flag set at stage 6', () => {
    const ind = makeInd(0.85, 5);
    updateLanguageStage(ind, 50, 25);
    expect(ind.language.writing).toBe(true);
  });
});

describe('updateFoxp2Expression', () => {
  it('grows with social contact', () => {
    const ind = makeInd(0.3);
    const before = ind.language.foxp2_expression;
    updateFoxp2Expression(ind, 10);
    expect(ind.language.foxp2_expression).toBeGreaterThan(before);
  });

  it('never exceeds genetic ceiling', () => {
    const ind = makeInd(0.88);
    for (let i = 0; i < 2000; i++) updateFoxp2Expression(ind, 20);
    expect(ind.language.foxp2_expression).toBeLessThanOrEqual(ind.phenotype.language_capacity + 1e-9);
  });
});

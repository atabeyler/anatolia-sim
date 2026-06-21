import { describe, it, expect, vi, afterEach } from 'vitest';
import { processMicrobiomeTick, spreadInfection } from '../src/engines/microbiome/microbiomeEngine.js';

describe('microbiome infection dedupe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not add duplicate infections for the same pathogen during spread', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const infected = {
      infections: [{ pathogen_id: 'respiratory_common', days_remaining: 10 }],
    };
    const susceptible = {
      phenotype: { immune_strength: 0 },
      infections: [{ pathogen_id: 'respiratory_common', days_remaining: 5 }],
      immunities: {},
    };

    const spread = spreadInfection(infected, susceptible, 'respiratory_common', 10, 20);

    expect(spread).toBe(false);
    expect(susceptible.infections).toHaveLength(1);
  });

  it('collapses duplicate persisted infections before processing a tick', () => {
    const individual = {
      is_dead: false,
      phenotype: { immune_strength: 1 },
      health: { hp: 1 },
      infections: [
        { pathogen_id: 'respiratory_common', days_remaining: 2 },
        { pathogen_id: 'respiratory_common', days_remaining: 9 },
        { pathogen_id: 'fungal_skin', days_remaining: 5 },
      ],
    };

    processMicrobiomeTick([individual], { biome: 'mediterranean', season: 'spring' }, 200);

    expect(individual.infections.map(i => i.pathogen_id).sort()).toEqual(['fungal_skin', 'respiratory_common']);
    expect(individual.infections.find(i => i.pathogen_id === 'respiratory_common').days_remaining).toBe(9);
  });
});

import { getAge, getLifeStage } from './individual.js';

const DEATH_CAUSES = {
  INFECTION: 'infection', TRAUMA: 'trauma', STARVATION: 'starvation',
  DEHYDRATION: 'dehydration', BIRTH_COMP: 'birth_complications',
  GENETIC: 'genetic_disease', OLD_AGE: 'old_age', PREDATOR: 'predator', CONFLICT: 'conflict',
};

// Target annual mortality rates (prehistoric hunter-gatherer baseline):
//   0-1 yr  → ~25%  → 0.00077/day
//   1-5 yr  → ~8%   → 0.00023/day
//   5-15 yr → ~1.5% → 0.000041/day
//   15-45   → ~1.5% → 0.000041/day
//   45-60   → ~3%   → 0.000083/day
//   60-75   → ~10%  → 0.00029/day
//   75+     → ~25%  → 0.00077/day
// Disease outbreaks, starvation, disasters layer on top via multipliers.
export function computeDailyDeathRisk(individual, currentDay, environment) {
  const age = getAge(individual, currentDay);
  const { health, phenotype } = individual;
  let baseRisk = 0;
  if      (age < 1)  baseRisk = 0.00077;
  else if (age < 5)  baseRisk = 0.00023;
  else if (age < 15) baseRisk = 0.000041;
  else if (age < 45) baseRisk = 0.000041;
  else if (age < 60) baseRisk = 0.000083;
  else if (age < 75) baseRisk = 0.00029;
  else               baseRisk = 0.00077;

  if (age >= (phenotype?.max_lifespan ?? 80)) baseRisk += 0.03;
  if ((health?.hp ?? 1) < 0.2)                baseRisk *= 3;
  if ((health?.calories ?? 1) < 0.1)          baseRisk *= 5;
  if ((health?.hydration ?? 1) < 0.1)         baseRisk *= 10;
  if (health?.disease)                         baseRisk += health.disease.daily_mortality_risk ?? 0;
  baseRisk *= (1 - (phenotype?.immune_strength ?? 0.5) * 0.3);
  if (environment) {
    baseRisk += (environment.predator_risk  ?? 0) * 0.0002;
    baseRisk += (environment.disease_pressure ?? 0) * 0.0003;
  }
  if ((individual.inbreeding_coeff ?? 0) > 0.25) baseRisk *= 1.5;
  return Math.min(baseRisk, 0.99);
}

export function rollDeath(individual, currentDay, environment) {
  const risk = computeDailyDeathRisk(individual, currentDay, environment);
  if (Math.random() < risk) return determineCause(individual, currentDay, environment);
  return null;
}

function determineCause(individual, currentDay, environment) {
  const { health } = individual;
  const age = getAge(individual, currentDay);
  if ((health?.hydration ?? 1) < 0.1)                               return DEATH_CAUSES.DEHYDRATION;
  if ((health?.calories  ?? 1) < 0.05)                              return DEATH_CAUSES.STARVATION;
  if (health?.disease)                                               return DEATH_CAUSES.INFECTION;
  if (age >= (individual.phenotype?.max_lifespan ?? 80) - 5)        return DEATH_CAUSES.OLD_AGE;
  if ((environment?.predator_risk ?? 0) > 0.5 && Math.random() < 0.3) return DEATH_CAUSES.PREDATOR;
  const roll = Math.random();
  if (roll < 0.35) return DEATH_CAUSES.INFECTION;
  if (roll < 0.55) return DEATH_CAUSES.TRAUMA;
  if (roll < 0.70) return DEATH_CAUSES.STARVATION;
  if (roll < 0.77) return DEATH_CAUSES.BIRTH_COMP;
  if (roll < 0.84) return DEATH_CAUSES.GENETIC;
  if (roll < 0.94) return DEATH_CAUSES.OLD_AGE;
  return DEATH_CAUSES.PREDATOR;
}

import { getAge, getLifeStage } from './individual.js';

const DEATH_CAUSES = {
  INFECTION: 'infection', TRAUMA: 'trauma', STARVATION: 'starvation',
  DEHYDRATION: 'dehydration', BIRTH_COMP: 'birth_complications',
  GENETIC: 'genetic_disease', OLD_AGE: 'old_age', PREDATOR: 'predator', CONFLICT: 'conflict',
};

// Target annual mortality rates (prehistoric hunter-gatherer baseline):
//   0-1 yr  → ~20%  → 0.00061/day  (reduced from 25% — founding pair provides intense infant care)
//   1-5 yr  → ~6%   → 0.00017/day
//   5-15 yr → ~1%   → 0.000027/day
//   15-45   → ~1%   → 0.000027/day
//   45-60   → ~2.5% → 0.000069/day
//   60-75   → ~8%   → 0.00023/day
//   75+     → ~20%  → 0.00061/day
// Disease outbreaks, starvation, disasters layer on top via multipliers.
export function computeDailyDeathRisk(individual, currentDay, environment) {
  const age = getAge(individual, currentDay);
  // Founders are completely protected from random death until age 60
  if (individual.is_founder && age < 60) return 0;
  const { health, phenotype } = individual;
  let baseRisk = 0;
  if      (age < 1)  baseRisk = 0.00022;
  else if (age < 5)  baseRisk = 0.00010;
  else if (age < 15) baseRisk = 0.000027;
  else if (age < 45) baseRisk = 0.000027;
  else if (age < 60) baseRisk = 0.000069;
  else if (age < 75) baseRisk = 0.00023;
  else               baseRisk = 0.00061;

  // Small-group care: when population is tiny, each individual receives much more attention
  const aliveCount = environment?.alive_count ?? 100;
  if (aliveCount < 15) baseRisk *= Math.max(0.3, aliveCount / 15);

  // Thriving healthy adult: low risk if they're well-fed and in prime years
  if (age >= 15 && age < 45 && (health?.hp ?? 1) > 0.85 && (health?.calories ?? 1) > 0.7) {
    baseRisk *= 0.4;
  }

  if (age >= (phenotype?.max_lifespan ?? 90)) baseRisk += 0.03;
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
  if ((health?.hydration ?? 1) < 0.1)                              return DEATH_CAUSES.DEHYDRATION;
  if ((health?.calories  ?? 1) < 0.05)                             return DEATH_CAUSES.STARVATION;
  if (health?.disease)                                              return DEATH_CAUSES.INFECTION;
  if (age >= (individual.phenotype?.max_lifespan ?? 90) - 5)       return DEATH_CAUSES.OLD_AGE;
  if ((environment?.predator_risk ?? 0) > 0.5 && Math.random() < 0.3) return DEATH_CAUSES.PREDATOR;
  // Cause reflects the actual risk profile, not random label lottery
  if (age < 5)   return DEATH_CAUSES.INFECTION;   // infants/toddlers: mostly infection
  if (age < 15)  return Math.random() < 0.5 ? DEATH_CAUSES.INFECTION : DEATH_CAUSES.TRAUMA;
  if (age < 45) {
    const r = Math.random();
    if (r < 0.45) return DEATH_CAUSES.INFECTION;
    if (r < 0.75) return DEATH_CAUSES.TRAUMA;
    if (r < 0.97) return DEATH_CAUSES.GENETIC;
    return DEATH_CAUSES.PREDATOR;
  }
  // 45+
  const r = Math.random();
  if (r < 0.45) return DEATH_CAUSES.INFECTION;
  if (r < 0.65) return DEATH_CAUSES.OLD_AGE;
  if (r < 0.80) return DEATH_CAUSES.TRAUMA;
  return DEATH_CAUSES.GENETIC;
}

import { getAge, getLifeStage } from './individual.js';

const DEATH_CAUSES = {
  INFECTION: 'infection', TRAUMA: 'trauma', STARVATION: 'starvation',
  DEHYDRATION: 'dehydration', BIRTH_COMP: 'birth_complications',
  GENETIC: 'genetic_disease', OLD_AGE: 'old_age', PREDATOR: 'predator', CONFLICT: 'conflict',
};

export function computeDailyDeathRisk(individual, currentDay, environment) {
  const age = getAge(individual, currentDay);
  const { health, phenotype } = individual;
  let baseRisk = 0;
  if (age < 1) baseRisk = 0.008;
  else if (age < 5) baseRisk = 0.002;
  else if (age < 15) baseRisk = 0.0003;
  else if (age < 45) baseRisk = 0.0002;
  else if (age < 60) baseRisk = 0.001;
  else if (age < 75) baseRisk = 0.003;
  else baseRisk = 0.008;
  if (age >= phenotype.max_lifespan) baseRisk += 0.05;
  if (health.hp < 0.2) baseRisk *= 3;
  if (health.calories < 0.1) baseRisk *= 5;
  if (health.hydration < 0.1) baseRisk *= 10;
  if (health.disease) baseRisk += health.disease.daily_mortality_risk ?? 0;
  baseRisk *= (1 - phenotype.immune_strength * 0.3);
  if (environment) {
    baseRisk += environment.predator_risk * 0.001;
    baseRisk += environment.disease_pressure * 0.002;
  }
  if (individual.inbreeding_coeff > 0.25) baseRisk *= 1.5;
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
  if (health.hydration < 0.1) return DEATH_CAUSES.DEHYDRATION;
  if (health.calories < 0.05) return DEATH_CAUSES.STARVATION;
  if (health.disease) return DEATH_CAUSES.INFECTION;
  if (age >= individual.phenotype.max_lifespan - 5) return DEATH_CAUSES.OLD_AGE;
  if (environment?.predator_risk > 0.5 && Math.random() < 0.3) return DEATH_CAUSES.PREDATOR;
  const roll = Math.random();
  if (roll < 0.35) return DEATH_CAUSES.INFECTION;
  if (roll < 0.55) return DEATH_CAUSES.TRAUMA;
  if (roll < 0.70) return DEATH_CAUSES.STARVATION;
  if (roll < 0.77) return DEATH_CAUSES.BIRTH_COMP;
  if (roll < 0.84) return DEATH_CAUSES.GENETIC;
  if (roll < 0.94) return DEATH_CAUSES.OLD_AGE;
  return DEATH_CAUSES.PREDATOR;
}

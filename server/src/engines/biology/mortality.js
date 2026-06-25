import { getAge, getLifeStage } from './individual.js';
import { computeEpigeneticAge } from '../epigenetics/epigeneticsEngine.js';
import { PATHOGEN_TYPES } from '../microbiome/microbiomeEngine.js';

const DEATH_CAUSES = {
  INFECTION: 'infection', TRAUMA: 'trauma', STARVATION: 'starvation',
  DEHYDRATION: 'dehydration', BIRTH_COMP: 'birth_complications',
  GENETIC: 'genetic_disease', OLD_AGE: 'old_age', PREDATOR: 'predator', CONFLICT: 'conflict',
  DROWNING: 'drowning',
};

// Target annual mortality rates (prehistoric hunter-gatherer baseline):
//   0-1 yr  → ~8%   → 0.00022/day  (reduced — founding pair provides intense infant care)
//   1-5 yr  → ~3.7% → 0.00010/day
//   5-15 yr → ~1%   → 0.000027/day
//   15-45   → ~1%   → 0.000027/day
//   45-60   → ~2.5% → 0.000069/day
//   60-75   → ~8%   → 0.00023/day
//   75+     → ~20%  → 0.00061/day
// Disease outbreaks, starvation, disasters layer on top via multipliers.
export function computeDailyDeathRisk(individual, currentDay, environment) {
  const chronologicalAge = getAge(individual, currentDay);
  // Epigenetic age modifier: stress/nutrition history accelerates or slows biological aging.
  // computeEpigeneticAge returns a year value only when epigenome is present.
  let age = chronologicalAge;
  if (individual.epigenome) {
    const epiYears = computeEpigeneticAge({ ...individual, age: chronologicalAge * 365 });
    if (typeof epiYears === 'number' && !isNaN(epiYears) && epiYears > 0) age = epiYears;
  }
  const { health, phenotype } = individual;
  let baseRisk = 0;
  if      (age < 1)  baseRisk = 0.00022;
  else if (age < 5)  baseRisk = 0.00010;
  else if (age < 15) baseRisk = 0.000027;
  else if (age < 45) baseRisk = 0.000027;
  else if (age < 60) baseRisk = 0.000069;
  else if (age < 75) baseRisk = 0.00023;
  else               baseRisk = 0.00061;

  // Extinction guard: tiny bands receive high individual attention (infant care, food sharing).
  const aliveCount = environment?.alive_count ?? 100;
  if (aliveCount < 25) baseRisk *= Math.max(0.25, aliveCount / 25);

  // Thriving healthy adult: low risk if they're well-fed and in prime years
  if (age >= 15 && age < 45 && (health?.hp ?? 1) > 0.85 && (health?.calories ?? 1) > 0.7) {
    baseRisk *= 0.4;
  }

  const isFounder = individual.is_founder === true;
  if (age >= (phenotype?.max_lifespan ?? 90)) baseRisk += 0.03;
  // Founders are hardier — extreme-condition multipliers are dampened
  if ((health?.hp ?? 1) < 0.2)       baseRisk *= isFounder ? 1.8 : 3;
  if ((health?.calories ?? 1) < 0.1) baseRisk *= isFounder ? 2.5 : 5;
  if ((health?.hydration ?? 1) < 0.1) baseRisk *= isFounder ? 5   : 10;

  // ── Wizard phenotype fields → actual mortality impact ───────────────────────
  // immune_strength: reduces overall disease-related risk
  baseRisk *= (1 - (phenotype?.immune_strength ?? 0.5) * 0.3);

  // stress_resilience + health_resilience: general survival buffer
  const resilience = ((phenotype?.stress_resilience ?? 0.5) + (phenotype?.health_resilience ?? 0.5)) / 2;
  baseRisk *= (1 - (resilience - 0.5) * 0.25); // range: ×1.125 (min) → ×0.875 (max)

  // endurance + physical_strength: reduces trauma and predator risk
  const toughness = ((phenotype?.endurance ?? 0.5) + (phenotype?.physical_strength ?? 0.5)) / 2;
  if (environment) {
    const predatorReduction = (toughness - 0.5) * 0.4;
    baseRisk -= (environment.predator_risk ?? 0) * 0.0002 * predatorReduction;
  }

  // metabolism: high metabolism burns calories faster → slightly higher starvation risk
  if ((health?.calories ?? 1) < 0.4) {
    const metab = phenotype?.metabolism ?? 0.5;
    baseRisk *= (1 + (metab - 0.5) * 0.2); // high metabolism = up to 10% more risk when hungry
  }

  // Drowning risk — reduced by accumulated water experience (observational learning)
  if (individual._inWater) {
    const waterSkill = Math.min(0.9, (individual._waterExperience ?? 0) * 0.9);
    baseRisk += 0.05 * (1 - waterSkill);
  }
  if (environment) {
    // Founders are more alert and experienced — reduced exposure to predators and disease
    const envMult = isFounder ? 0.4 : 1.0;
    baseRisk += (environment.predator_risk   ?? 0) * 0.0002 * envMult;
    baseRisk += (environment.disease_pressure ?? 0) * 0.0003 * envMult;
  }
  if ((individual.inbreeding_coeff ?? 0) > 0.50) baseRisk *= 1.25;

  // Founders are hand-selected survivors — they carry the strongest constitution
  // the player could choose. Halve their base mortality to reflect this.
  if (individual.is_founder) baseRisk *= 0.5;

  return Math.min(baseRisk, 0.99);
}

export function rollDeath(individual, currentDay, environment) {
  const risk = computeDailyDeathRisk(individual, currentDay, environment);
  if (Math.random() < risk) return determineCause(individual, currentDay, environment);
  return null;
}

function determineCause(individual, currentDay, environment) {
  const { health, phenotype } = individual;
  const age = getAge(individual, currentDay);
  const isFounder = individual.is_founder === true;
  if (individual._inWater)                                          return DEATH_CAUSES.DROWNING;
  if ((health?.hydration ?? 1) < 0.1)                              return DEATH_CAUSES.DEHYDRATION;
  if ((health?.calories  ?? 1) < 0.05)                             return DEATH_CAUSES.STARVATION;
  // Only attribute death to infection if a genuinely lethal pathogen is active (base_mortality >= 0.05).
  // Mild infections (fungal_skin, respiratory_common) should not override the actual cause.
  if (individual.infections?.some(inf => (PATHOGEN_TYPES[inf.pathogen_id]?.base_mortality ?? 0) >= 0.05)) return DEATH_CAUSES.INFECTION;
  if (age >= (phenotype?.max_lifespan ?? 90) - 5)                  return DEATH_CAUSES.OLD_AGE;
  // Founders are more alert and capable of evading predators
  const predatorThreshold = isFounder ? 0.15 : 0.3;
  if ((environment?.predator_risk ?? 0) > 0.5 && Math.random() < predatorThreshold) return DEATH_CAUSES.PREDATOR;

  // Founders never die of genetic disease — user designed their genome intentionally

  // Genetic disease probability scales down with health_resilience + immune_strength
  const geneticResistance = ((phenotype?.health_resilience ?? 0.5) + (phenotype?.immune_strength ?? 0.5)) / 2;
  // At resistance=0.0 → geneticChance=0.30; at 0.5 → 0.22; at 1.0 → 0.0
  const geneticChance = isFounder ? 0 : Math.max(0, 0.30 - geneticResistance * 0.30);

  // Fertility: high fertility reduces birth complication risk for females in labour
  const birthCompChance = (individual.sex === 'female' && health?.pregnancy)
    ? Math.max(0, 0.15 - (phenotype?.fertility ?? 0.5) * 0.15)
    : 0;

  // Physical toughness reduces trauma probability
  const toughness = ((phenotype?.endurance ?? 0.5) + (phenotype?.physical_strength ?? 0.5)) / 2;
  const traumaWeight = Math.max(0.05, 0.30 - (toughness - 0.5) * 0.20);

  if (age < 5)  return DEATH_CAUSES.INFECTION;
  if (age < 15) return Math.random() < 0.5 ? DEATH_CAUSES.INFECTION : DEATH_CAUSES.TRAUMA;

  // Founders are constitutionally stronger — lower infection and trauma weights
  const founderFactor = isFounder ? 0.55 : 1.0;
  const adjustedTrauma = traumaWeight * founderFactor;

  if (age < 45) {
    const r = Math.random();
    const infectionCut  = isFounder ? 0.28 : 0.45;
    const traumaCut     = infectionCut + adjustedTrauma;
    const birthCompCut  = traumaCut + birthCompChance;
    const geneticCut    = birthCompCut + geneticChance;
    if (r < infectionCut) return DEATH_CAUSES.INFECTION;
    if (r < traumaCut)    return DEATH_CAUSES.TRAUMA;
    if (r < birthCompCut) return DEATH_CAUSES.BIRTH_COMP;
    if (r < geneticCut)   return DEATH_CAUSES.GENETIC;
    return DEATH_CAUSES.PREDATOR;
  }
  // 45+
  const r = Math.random();
  const infectionCut = isFounder ? 0.28 : 0.45;
  const oldAgeCut    = infectionCut + 0.20;
  const traumaCut    = oldAgeCut + adjustedTrauma;
  const geneticCut   = traumaCut + geneticChance;
  if (r < infectionCut) return DEATH_CAUSES.INFECTION;
  if (r < oldAgeCut)    return DEATH_CAUSES.OLD_AGE;
  if (r < traumaCut)    return DEATH_CAUSES.TRAUMA;
  if (r < geneticCut)   return DEATH_CAUSES.GENETIC;
  return DEATH_CAUSES.OLD_AGE;
}

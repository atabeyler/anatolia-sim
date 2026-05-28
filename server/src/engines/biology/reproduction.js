import { isFertile, getAge, createChild } from './individual.js';

const PREGNANCY_MIN = 266;
const PREGNANCY_MAX = 280;

export function checkReproduction(population, currentDay, simulationId) {
  const newborns = [];
  const females = [...population.values()].filter(i =>
    i.alive && i.sex === 'female' && isFertile(i, currentDay) && !i.health.pregnancy
  );
  for (const female of females) {
    if (!female.social.has_mate || !female.social.mate_id) continue;
    const male = population.get(female.social.mate_id);
    if (!male || !male.alive || !isFertile(male, currentDay)) continue;
    const p = conceptionProbability(female, male, currentDay);
    if (Math.random() < p) {
      female.health.pregnancy = {
        father_id: male.id, conception_day: currentDay,
        due_day: currentDay + PREGNANCY_MIN + Math.floor(Math.random() * 14),
      };
    }
  }
  for (const female of [...population.values()].filter(i => i.alive && i.health.pregnancy)) {
    const preg = female.health.pregnancy;
    if (currentDay >= preg.due_day) {
      const father = population.get(preg.father_id);
      if (father) {
        if (!female.social.children_ids) female.social.children_ids = [];
        const { child, motherSurvives } = deliverBirth(female, father, currentDay, simulationId);
        newborns.push(child);
        if (!motherSurvives) { female.alive = false; female.is_dead = true; female.death_day = currentDay; female.death_cause = 'birth_complications'; }
      }
      female.health.pregnancy = null;
    }
  }
  return newborns;
}

function conceptionProbability(female, male, currentDay) {
  const age = getAge(female, currentDay);
  let ageFactor = 1;
  if (age < 18) ageFactor = 0.3;
  else if (age < 20) ageFactor = 0.7;
  else if (age > 35) ageFactor = 0.6;
  else if (age > 40) ageFactor = 0.2;
  const mhcBonus = Math.abs((female.genome.IMMUNE_01?.allele1.value ?? 0.5) - (male.genome.IMMUNE_01?.allele1.value ?? 0.5)) * 0.2;
  const p = (female.phenotype.fertility * ageFactor + mhcBonus - (female.inbreeding_coeff ?? 0) * 0.5) * 0.012;
  return Math.max(0, Math.min(0.1, p));
}

function deliverBirth(mother, father, birthDay, simulationId) {
  const motherSurvives = Math.random() > 0.02;
  const child = createChild(mother, father, birthDay, simulationId);
  if (Math.random() < 0.05) { child.alive = false; child.is_dead = true; child.death_day = birthDay; child.death_cause = 'birth_complications'; }
  mother.social.children_ids.push(child.id);
  return { child, motherSurvives };
}

export function attemptMating(individual1, individual2, currentDay) {
  if (individual1.sex === individual2.sex) return false;
  if (!isFertile(individual1, currentDay) || !isFertile(individual2, currentDay)) return false;
  if (individual1.social.has_mate || individual2.social.has_mate) return false;
  const age1 = getAge(individual1, currentDay);
  const age2 = getAge(individual2, currentDay);
  if (Math.abs(age1 - age2) > 20) return false;
  const bondStrength = (individual1.phenotype.social_bonding + individual2.phenotype.social_bonding) / 2;
  if (Math.random() < bondStrength * 0.3) {
    const male = individual1.sex === 'male' ? individual1 : individual2;
    const female = individual1.sex === 'female' ? individual1 : individual2;
    male.social.has_mate = true; male.social.mate_id = female.id;
    female.social.has_mate = true; female.social.mate_id = male.id;
    return true;
  }
  return false;
}

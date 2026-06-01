import { isFertile, getAge, createChild } from './individual.js';
import { generateName } from '../language/nameEngine.js';

const PREGNANCY_MIN = 266;
const PREGNANCY_MAX = 280;
const MATING_RADIUS  = 5; // degrees (~500 km) — same as social interaction radius

export function checkReproduction(population, currentDay, simulationId, communityLangStage = 0, phonology = null) {
  const newborns = [];

  // Proximity-based mating — no permanent pair bond required
  const fertileMales = [...population.values()].filter(i =>
    i.alive && i.sex === 'male' && isFertile(i, currentDay)
  );
  const females = [...population.values()].filter(i =>
    i.alive && i.sex === 'female' && isFertile(i, currentDay) && !(i.health?.pregnancy)
  );

  for (const female of females) {
    const nearbyMales = fertileMales.filter(m =>
      Math.hypot((m.x ?? 0) - (female.x ?? 0), (m.y ?? 0) - (female.y ?? 0)) < MATING_RADIUS
    );
    if (nearbyMales.length === 0) continue;
    const male = nearbyMales[Math.floor(Math.random() * nearbyMales.length)];
    const p = conceptionProbability(female, male, currentDay);
    if (Math.random() < p) {
      if (!female.health) female.health = {};
      female.health.pregnancy = {
        father_id: male.id, conception_day: currentDay,
        due_day: currentDay + PREGNANCY_MIN + Math.floor(Math.random() * 14),
      };
    }
  }

  for (const female of [...population.values()].filter(i => i.alive && i.health?.pregnancy)) {
    const preg = female.health.pregnancy;
    if (currentDay >= preg.due_day) {
      const father = population.get(preg.father_id);
      if (father) {
        if (!female.social) female.social = {};
        if (!female.social.children_ids) female.social.children_ids = [];
        const { child, motherSurvives } = deliverBirth(female, father, currentDay, simulationId, communityLangStage, phonology);
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
  if (age < 18)       ageFactor = 0.3;
  else if (age < 20)  ageFactor = 0.7;
  else if (age > 40)  ageFactor = 0.2;
  else if (age > 35)  ageFactor = 0.6;
  const mhcBonus = Math.abs((female.genome?.IMMUNE_01?.allele1?.value ?? 0.5) - (male.genome?.IMMUNE_01?.allele1?.value ?? 0.5)) * 0.2;
  const p = ((female.phenotype?.fertility ?? 0.5) * ageFactor + mhcBonus - (female.inbreeding_coeff ?? 0) * 0.5) * 0.07;
  return Math.max(0, Math.min(0.30, p));
}

function deliverBirth(mother, father, birthDay, simulationId, communityLangStage = 0, phonology = null) {
  const motherSurvives = Math.random() > 0.02;
  const child = createChild(mother, father, birthDay, simulationId, communityLangStage, phonology);
  if (Math.random() < 0.05) { child.alive = false; child.is_dead = true; child.death_day = birthDay; child.death_cause = 'birth_complications'; }
  mother.social.children_ids.push(child.id);
  return { child, motherSurvives };
}

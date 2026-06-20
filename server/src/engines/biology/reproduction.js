import { isFertile, getAge, createChild } from './individual.js';

const PREGNANCY_MIN = 266;
const MATING_RADIUS  = 2; // degrees (~220 km) — matches SOCIAL_INTERACTION_RADIUS

// BUG-01: accepts optional nearbyMalesFn callback for O(n) spatial lookup from simulationLoop
export function checkReproduction(population, currentDay, simulationId, communityLangStage = 0, phonology = null, nearbyMalesFn = null) {
  const newborns = [];

  // Only build the O(n) full scan when no spatial grid callback is provided (fallback)
  const fertileMales = nearbyMalesFn ? null : [...population.values()].filter(i =>
    i.alive && i.sex === 'male' && isFertile(i, currentDay)
  );

  const females = [...population.values()].filter(i =>
    i.alive && i.sex === 'female' && isFertile(i, currentDay) && !(i.health?.pregnancy)
  );

  for (const female of females) {
    // BUG-01: use spatial grid callback when available, else fall back to full scan
    const nearbyMales = nearbyMalesFn
      ? nearbyMalesFn(female).filter(m => !m.is_dead && m.sex === 'male' && isFertile(m, currentDay))
      : fertileMales.filter(m =>
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
      female.mating_urge = 0;
      male.mating_urge = Math.max(0, (male.mating_urge ?? 0) - 0.7);
    }
  }

  for (const female of [...population.values()].filter(i => i.alive && i.health?.pregnancy)) {
    const preg = female.health.pregnancy;
    if (currentDay >= preg.due_day) {
      const father = population.get(preg.father_id);
      if (father) {
        if (!female.social) female.social = {};
        if (!female.social.children_ids) female.social.children_ids = [];
        const { children, motherSurvives } = deliverBirth(female, father, currentDay, simulationId, communityLangStage, phonology);
        newborns.push(...children);
        if (!motherSurvives) {
          female.alive = false;
          female.is_dead = true;
          female.death_day = currentDay;
          female.death_cause = 'birth_complications';
        }
      }
      female.health.pregnancy = null;
    }
  }
  return newborns;
}

function conceptionProbability(female, male, currentDay) {
  const age = getAge(female, currentDay);
  let ageFactor = 1;
  if (age > 40)       ageFactor = 0.2;
  else if (age > 35)  ageFactor = 0.6;
  else if (age < 18)  ageFactor = 0.3;
  else if (age < 20)  ageFactor = 0.7;
  const fI1 = ((female.genome?.IMMUNE_01?.allele1?.value ?? 0.5) + (female.genome?.IMMUNE_01?.allele2?.value ?? 0.5)) / 2;
  const fI2 = ((female.genome?.IMMUNE_02?.allele1?.value ?? 0.5) + (female.genome?.IMMUNE_02?.allele2?.value ?? 0.5)) / 2;
  const mI1 = ((male.genome?.IMMUNE_01?.allele1?.value ?? 0.5) + (male.genome?.IMMUNE_01?.allele2?.value ?? 0.5)) / 2;
  const mI2 = ((male.genome?.IMMUNE_02?.allele1?.value ?? 0.5) + (male.genome?.IMMUNE_02?.allele2?.value ?? 0.5)) / 2;
  const mhcBonus = ((Math.abs(fI1 - mI1) + Math.abs(fI2 - mI2)) / 2) * 0.2;
  const inbreedPenalty = Math.max(female.inbreeding_coeff ?? 0, male.inbreeding_coeff ?? 0);
  const urgeFactor = 0.6 + (female.mating_urge ?? 0.5) * 0.4;
  const p = ((female.phenotype?.fertility ?? 0.5) * ageFactor + mhcBonus - inbreedPenalty * 0.5) * 0.09 * urgeFactor;
  return Math.max(0, p);
}

function deliverBirth(mother, father, birthDay, simulationId, communityLangStage = 0, phonology = null) {
  const maternalResilience = mother.phenotype?.health_resilience ?? 0.5;
  const maternalLifespan = mother.phenotype?.max_lifespan ?? 70;
  const motherRisk = Math.max(0.002, 0.06 * (1 - maternalResilience) * (90 - Math.min(maternalLifespan, 90)) / 90);
  const neonatalRisk = Math.max(0.005, motherRisk * 0.6);
  const motherSurvives = Math.random() > motherRisk;
  const children = [];

  // BUG-12: tag each child with whether the father was alive at birth (for accurate birth event display)
  const fatherAliveAtBirth = !father.is_dead;

  const first = createChild(mother, father, birthDay, simulationId, communityLangStage, phonology);
  first._fatherAliveAtBirth = fatherAliveAtBirth;
  if (Math.random() < neonatalRisk) {
    first.alive = false; first.is_dead = true; first.death_day = birthDay; first.death_cause = 'birth_complications';
  }
  children.push(first);

  const fshr = mother.phenotype?.fertility ?? 0.5;
  const twinChance = Math.max(0, 0.003 + (fshr - 0.3) * 0.07);

  if (Math.random() < twinChance) {
    const twin = createChild(mother, father, birthDay, simulationId, communityLangStage, phonology);
    twin.is_twin = true;
    twin._fatherAliveAtBirth = fatherAliveAtBirth;
    if (Math.random() < neonatalRisk * 2.5) {
      twin.alive = false; twin.is_dead = true; twin.death_day = birthDay; twin.death_cause = 'birth_complications';
    }
    children.push(twin);

    if (Math.random() < twinChance * 0.1) {
      const triplet = createChild(mother, father, birthDay, simulationId, communityLangStage, phonology);
      triplet.is_twin = true;
      triplet._fatherAliveAtBirth = fatherAliveAtBirth;
      if (Math.random() < neonatalRisk * 4) {
        triplet.alive = false; triplet.is_dead = true; triplet.death_day = birthDay; triplet.death_cause = 'birth_complications';
      }
      children.push(triplet);
    }
  }

  mother.social.children_ids.push(...children.map(c => c.id));
  return { children, motherSurvives };
}

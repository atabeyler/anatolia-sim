import { v4 as uuidv4 } from 'uuid';
import { createGenome, createGamete, combineGametes, computePhenotype } from './genome.js';
import { generateName } from '../language/nameEngine.js';

export const LIFE_STAGE = {
  INFANT:     { name: 'infant',     minAge: 0,  maxAge: 2   },
  CHILD:      { name: 'child',      minAge: 2,  maxAge: 12  },
  ADOLESCENT: { name: 'adolescent', minAge: 12, maxAge: 18  },
  ADULT:      { name: 'adult',      minAge: 18, maxAge: 45  },
  ELDER:      { name: 'elder',      minAge: 45, maxAge: 999 },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function createFounder(params = {}) {
  const sex = params.sex ?? (Math.random() < 0.5 ? 'male' : 'female');
  // Founders are prehistoric survivors — they self-selected for strong social bonding.
  // High OXTR (oxytocin receptor) + AVPR1A (vasopressin) gives them high parental_care,
  // which children inherit genetically through combineGametes.
  const founderGenomeDefaults = {
    OXTR_01:   { a1: 0.82, a2: 0.82 },
    AVPR1A_01: { a1: 0.78, a2: 0.78 },
  };
  const genome = createGenome({ ...founderGenomeDefaults, ...(params.genome ?? {}) });
  const phenotype = computePhenotype(genome);
  const appearance = params.appearance ?? {};
  phenotype.name = params.name?.trim() || null; // founders get user-supplied name or none
  phenotype.eye_color = appearance.eye_color ?? phenotype.eye_color;
  phenotype.hair_color = appearance.hair_color ?? phenotype.hair_color;
  phenotype.skin_tone = appearance.skin_tone ?? phenotype.skin_tone;
  phenotype.skin_color = appearance.skin_color ?? appearance.skin_tone ?? phenotype.skin_tone;
  phenotype.height_cm = Math.round(150 + phenotype.height_factor * 45);
  return {
    id: uuidv4(), simulation_id: null,
    birth_day: -(params.ageYears ?? 20) * 365,
    death_day: null, alive: true, sex,
    x: params.x ?? 0, y: params.y ?? 0,
    genome, phenotype, epigenome: {},
    health: createInitialHealth(phenotype),
    mind: createInitialMind(phenotype),
    social: createInitialSocial(),
    skills: [], beliefs: {},
    language: createInitialLanguage(phenotype),
    memory: { social: [], events: [], knowledge: [] },
    parent_1_id: null, parent_2_id: null, inbreeding_coeff: 0,
  };
}

export function createChild(parent1, parent2, birthDay, simulationId, communityLangStage = 0, phonology = null) {
  const sex = Math.random() < 0.5 ? 'male' : 'female';
  const genome = combineGametes(createGamete(parent1.genome), createGamete(parent2.genome), sex);
  const phenotype = computePhenotype(genome);
  // Name emerges from the civilization's own phonological system, not a pre-written list
  phenotype.name = phonology ? generateName(phonology, communityLangStage) : null;
  phenotype.height_cm = Math.round(150 + phenotype.height_factor * 45);
  return {
    id: uuidv4(), simulation_id: simulationId,
    birth_day: birthDay, death_day: null, alive: true, sex,
    x: parent1.x + (Math.random() - 0.5) * 0.04,
    y: parent1.y + (Math.random() - 0.5) * 0.04,
    genome, phenotype,
    epigenome: inheritEpigenome(parent1, parent2),
    health: createInitialHealth(phenotype, true),
    mind: createInitialMind(phenotype),
    social: createInitialSocial(),
    skills: [], beliefs: {},
    language: createInitialLanguage(phenotype),
    memory: { social: [], events: [], knowledge: [] },
    parent_1_id: parent1.id, parent_2_id: parent2.id,
    inbreeding_coeff: 0, is_twin: Math.random() < 0.012,
  };
}

function createInitialHealth(phenotype, isNewborn = false) {
  return {
    hp: isNewborn ? 0.4 : 1.0, max_hp: 1.0,
    calories: isNewborn ? 0.8 : 1.0, hydration: 1.0,
    disease: null, disease_resistance: phenotype.immune_strength,
    injuries: [], pregnancy: null, pregnancy_day: null,
  };
}

function createInitialMind(phenotype) {
  return {
    fluid_intelligence: phenotype.fluid_intelligence,
    working_memory: phenotype.working_memory,
    consciousness: 0, death_awareness: false,
    belief_capacity: phenotype.belief_capacity,
    emotional_state: 0.5, stress: 0,
  };
}

function createInitialSocial() {
  return {
    group_id: null, relationships: {}, reputation: 0.5,
    status: 0, has_mate: false, mate_id: null, children_ids: [],
  };
}

function createInitialLanguage(phenotype) {
  return {
    stage: 0, stage_name: 'pre-linguistic',
    vocabulary: {}, grammar: false, writing: false,
    foxp2_expression: phenotype.language_capacity,
  };
}

function inheritEpigenome(parent1, parent2) {
  const inherited = {};
  for (const epi of [parent1.epigenome, parent2.epigenome]) {
    for (const [key, val] of Object.entries(epi)) {
      if (val.heritable && val.generation_count > 0) {
        inherited[key] = { ...val, generation_count: val.generation_count - 1 };
      }
    }
  }
  return inherited;
}

export function getAge(individual, currentDay) {
  return (currentDay - individual.birth_day) / 365;
}

export function getLifeStage(individual, currentDay) {
  const age = getAge(individual, currentDay);
  for (const stage of Object.values(LIFE_STAGE)) {
    if (age >= stage.minAge && age < stage.maxAge) return stage.name;
  }
  return 'elder';
}

export function isFertile(individual, currentDay) {
  const age = getAge(individual, currentDay);
  if (individual.sex === 'female') return age >= 15 && age <= 50;
  if (individual.sex === 'male') return age >= 15 && age <= 65;
  return false;
}

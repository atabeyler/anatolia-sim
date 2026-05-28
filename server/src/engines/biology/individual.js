import { v4 as uuidv4 } from 'uuid';
import { createGenome, createGamete, combineGametes, computePhenotype } from './genome.js';

export const LIFE_STAGE = {
  INFANT:     { name: 'infant',     minAge: 0,  maxAge: 2   },
  CHILD:      { name: 'child',      minAge: 2,  maxAge: 12  },
  ADOLESCENT: { name: 'adolescent', minAge: 12, maxAge: 18  },
  ADULT:      { name: 'adult',      minAge: 18, maxAge: 45  },
  ELDER:      { name: 'elder',      minAge: 45, maxAge: 999 },
};

function traitToGenomeOverrides(params) {
  const overrides = {};
  const set = (locus, v) => { overrides[locus] = { a1: v, a2: v }; };
  if (params.fluid_intelligence != null) ['DTNBP1_01','BDNF_01','COMT_01','NRG1_01','DISC1_01'].forEach(l => set(l, params.fluid_intelligence));
  if (params.curiosity        != null) set('DRD4_01', params.curiosity);
  if (params.aggression       != null) set('MAOA_01', params.aggression);
  if (params.empathy          != null) set('OXTR_01', params.empathy);
  if (params.conscientiousness!= null) set('DISC1_01', params.conscientiousness);
  if (params.artistic_sense   != null) { set('NRXN1_01', params.artistic_sense); set('SHANK3_01', params.artistic_sense); }
  if (params.immune_strength  != null) { set('IMMUNE_01', params.immune_strength); set('IMMUNE_02', params.immune_strength); }
  if (params.fertility        != null) set('FSHR_01', params.fertility);
  if (params.longevity        != null) { set('TERT_01', params.longevity); set('APOE_01', params.longevity); }
  if (params.language_capacity!= null) { set('FOXP2_01', params.language_capacity); set('CNTNAP2_01', params.language_capacity); }
  if (params.physical_strength!= null) { set('HEIGHT_01', params.physical_strength); set('METABOLISM_01', params.physical_strength); }
  if (params.eye_color        != null) set('HERC2_01', params.eye_color);
  if (params.hair_color       != null) set('MC1R_01', params.hair_color);
  if (params.skin_tone        != null) set('SLC24A5_01', params.skin_tone);
  return { ...overrides, ...(params.genome ?? {}) };
}

export function createFounder(params = {}) {
  const sex = params.sex ?? (Math.random() < 0.5 ? 'male' : 'female');
  const genome = createGenome(traitToGenomeOverrides(params));
  const phenotype = computePhenotype(genome);
  return {
    id: uuidv4(), simulation_id: null,
    name: params.name ?? null,
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

export function createChild(parent1, parent2, birthDay, simulationId) {
  const sex = Math.random() < 0.5 ? 'male' : 'female';
  const genome = combineGametes(createGamete(parent1.genome), createGamete(parent2.genome), sex);
  const phenotype = computePhenotype(genome);
  return {
    id: uuidv4(), simulation_id: simulationId,
    birth_day: birthDay, death_day: null, alive: true, sex,
    x: parent1.x + (Math.random() - 0.5) * 2,
    y: parent1.y + (Math.random() - 0.5) * 2,
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
  if (individual.sex === 'female') return age >= 15 && age <= 45;
  if (individual.sex === 'male') return age >= 15 && age <= 65;
  return false;
}

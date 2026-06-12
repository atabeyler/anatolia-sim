import { v4 as uuidv4 } from 'uuid';
import { createGenome, createGamete, combineGametes, computePhenotype } from './genome.js';
import { generateName } from '../language/nameEngine.js';
import { inheritEpigenome, initializeEpigenome } from '../epigenetics/epigeneticsEngine.js';
import { isOnLand } from '../../utils/landMask.js';

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
    // Social bonding — passes to children via Mendelian inheritance
    OXTR_01:    { a1: 0.82, a2: 0.82 },
    AVPR1A_01:  { a1: 0.78, a2: 0.78 },
    // Immunity & longevity — founders must survive long enough to found the lineage
    IMMUNE_01:  { a1: 0.88, a2: 0.85 },
    IMMUNE_02:  { a1: 0.85, a2: 0.82 },
    TERT_01:    { a1: 0.85, a2: 0.85 },
    APOE_01:    { a1: 0.80, a2: 0.80 },
    // Language & cognition — hypothesis requires founders to develop proto-language
    FOXP2_01:   { a1: 0.90, a2: 0.88 },
    CNTNAP2_01: { a1: 0.82, a2: 0.80 },
    BDNF_01:    { a1: 0.80, a2: 0.78 },
    COMT_01:    { a1: 0.78, a2: 0.76 },
    DTNBP1_01:  { a1: 0.80, a2: 0.78 },
    // Consciousness potential — critical for the emergent consciousness hypothesis
    NRXN1_01:   { a1: 0.82, a2: 0.80 },
    SHANK3_01:  { a1: 0.80, a2: 0.78 },
    RELN_01:    { a1: 0.80, a2: 0.78 },
    // Curiosity & motivation — drives exploration and discovery
    DRD4_01:    { a1: 0.75, a2: 0.75 },
    DRD2_01:    { a1: 0.75, a2: 0.72 },
    // Physical survival
    STRENGTH_01: { a1: 0.78, a2: 0.75 },
    ACTN3_01:    { a1: 0.76, a2: 0.74 },
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
    _waterFear: 0.35, // adults have lived near water — moderate inherited caution
    genome, phenotype, epigenome: {},
    health: createInitialHealth(phenotype),
    mind: createInitialMind(phenotype),
    social: createInitialSocial(),
    skills: [],
    beliefs: new Set(),
    language: createInitialLanguage(phenotype, true),
    memory: { social: [], events: [], knowledge: [] },
    parent_1_id: null, parent_2_id: null, inbreeding_coeff: 0,
  };
}

export function createChild(parent1, parent2, birthDay, simulationId, communityLangStage = 0, phonology = null) {
  const sex = Math.random() < 0.5 ? 'male' : 'female';
  const p1Stress = parent1.epigenome?.BDNF_PROMOTER?.methylation ?? 0.5;
  const p2Stress = parent2.epigenome?.BDNF_PROMOTER?.methylation ?? 0.5;
  const stressMult = 1 + Math.max(p1Stress, p2Stress) * 0.5;
  const genome = combineGametes(createGamete(parent1.genome, stressMult), createGamete(parent2.genome, stressMult), sex);
  const phenotype = computePhenotype(genome);
  // Name emerges from the civilization's own phonological system, not a pre-written list
  phenotype.name = phonology ? generateName(phonology, communityLangStage) : null;
  phenotype.height_cm = Math.round(150 + phenotype.height_factor * 45);

  // Ensure parents have epigenomes before inheriting
  if (!parent1.epigenome || Object.keys(parent1.epigenome).length === 0) initializeEpigenome(parent1);
  if (!parent2.epigenome || Object.keys(parent2.epigenome).length === 0) initializeEpigenome(parent2);

  // Inherit a fraction of parental water fear — epigenetic transmission of
  // learned aversion. Child starts with ~45% of parents' average fear level.
  const inheritedWaterFear = ((parent1._waterFear ?? 0) + (parent2._waterFear ?? 0)) / 2 * 0.45;

  const child = {
    id: uuidv4(), simulation_id: simulationId,
    birth_day: birthDay, death_day: null, alive: true, sex,
    ...(() => {
      for (let i = 0; i < 8; i++) {
        const cx = parent1.x + (Math.random() - 0.5) * 0.04;
        const cy = parent1.y + (Math.random() - 0.5) * 0.04;
        if (isOnLand(cy, cx)) return { x: cx, y: cy };
      }
      return { x: parent1.x, y: parent1.y }; // fallback to parent's position
    })(),
    _waterFear: inheritedWaterFear,
    genome, phenotype,
    epigenome: {},
    health: createInitialHealth(phenotype, true),
    mind: createInitialMind(phenotype),
    social: createInitialSocial(),
    skills: [],
    beliefs: new Set(),
    language: createInitialLanguage(phenotype),
    memory: { social: [], events: [], knowledge: [] },
    parent_1_id: parent1.id, parent_2_id: parent2.id,
    inbreeding_coeff: 0, is_twin: false,
  };

  // Populate epigenome with proper heritability-weighted inheritance
  inheritEpigenome(child, parent1, parent2);

  return child;
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

function createInitialLanguage(phenotype, isFounder = false) {
  return {
    stage: 0, stage_name: 'pre-linguistic',
    vocabulary: {}, grammar: false, writing: false,
    // Founders are adults who have already developed expression through life experience.
    // Newborns start near zero and grow through social interaction (see updateFoxp2Expression).
    foxp2_expression: isFounder
      ? phenotype.language_capacity * 0.7
      : phenotype.language_capacity * 0.1,
  };
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

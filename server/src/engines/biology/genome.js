import { v4 as uuidv4 } from 'uuid';

// All functional gene loci modeled in the simulation
export const LOCI = {
  // Intelligence components
  BDNF_01:   { chr: 11, trait: 'neural_plasticity',    type: 'codominant' },
  COMT_01:   { chr: 22, trait: 'working_memory',       type: 'codominant' },
  DTNBP1_01: { chr: 6,  trait: 'fluid_intelligence',   type: 'codominant' },
  NRG1_01:   { chr: 8,  trait: 'cognitive_speed',      type: 'codominant' },
  DISC1_01:  { chr: 1,  trait: 'executive_function',   type: 'codominant' },

  // Language & communication
  FOXP2_01:  { chr: 7,  trait: 'language_capacity',    type: 'dominant' },
  CNTNAP2_01:{ chr: 7,  trait: 'language_learning',    type: 'codominant' },

  // Social & emotional
  OXTR_01:   { chr: 3,  trait: 'social_bonding',       type: 'codominant' },
  SLC6A4_01: { chr: 17, trait: 'serotonin_transport',  type: 'codominant' },
  DRD4_01:   { chr: 11, trait: 'curiosity',            type: 'codominant' },
  MAOA_01:   { chr: 'X', trait: 'aggression',          type: 'x_linked' },

  // Consciousness & belief capacity
  NRXN1_01:  { chr: 2,  trait: 'self_awareness',       type: 'codominant' },
  SHANK3_01: { chr: 22, trait: 'prefrontal_dev',       type: 'codominant' },
  RELN_01:   { chr: 7,  trait: 'theory_of_mind',       type: 'codominant' },

  // Physical traits
  HEIGHT_01: { chr: 6,  trait: 'height',               type: 'polygenic' },
  HEIGHT_02: { chr: 2,  trait: 'height',               type: 'polygenic' },
  HEIGHT_03: { chr: 20, trait: 'height',               type: 'polygenic' },
  METABOLISM_01: { chr: 16, trait: 'metabolism',       type: 'codominant' },
  IMMUNE_01: { chr: 6,  trait: 'immune_strength',      type: 'codominant' },
  IMMUNE_02: { chr: 6,  trait: 'immune_breadth',       type: 'codominant' },

  // Health & longevity
  TERT_01:   { chr: 5,  trait: 'telomere_length',      type: 'codominant' },
  APOE_01:   { chr: 19, trait: 'longevity',            type: 'codominant' },

  // Reproduction
  FSHR_01:   { chr: 2,  trait: 'fertility',            type: 'codominant' },

  // Physical appearance
  HERC2_01:  { chr: 15, trait: 'eye_color',            type: 'dominant' },
  MC1R_01:   { chr: 16, trait: 'hair_color',           type: 'codominant' },
  SLC24A5_01:{ chr: 15, trait: 'skin_pigmentation',    type: 'dominant' },
};

const LOCI_KEYS = Object.keys(LOCI);

function randomAllele(min = 0.1, max = 0.9) {
  return Math.random() * (max - min) + min;
}

export function createGenome(overrides = {}) {
  const chromosomes = {};
  for (const [locusId, meta] of Object.entries(LOCI)) {
    chromosomes[locusId] = {
      locusId,
      chromosome: meta.chr,
      allele1: { value: overrides[locusId]?.a1 ?? randomAllele(), origin: 'paternal' },
      allele2: { value: overrides[locusId]?.a2 ?? randomAllele(), origin: 'maternal' },
      expressionType: meta.type,
      trait: meta.trait,
    };
  }
  return chromosomes;
}

export function createGamete(genome) {
  const gamete = {};
  for (const locusId of LOCI_KEYS) {
    const locus = genome[locusId];
    if (!locus) continue;
    const crossover = Math.random() < 0.5;
    const chosen = crossover ? locus.allele2.value : locus.allele1.value;
    const mutated = applyMutation(chosen, locusId);
    gamete[locusId] = mutated;
  }
  return gamete;
}

function applyMutation(value, locusId) {
  const mutationProb = 35 / LOCI_KEYS.length;
  if (Math.random() < mutationProb) {
    const effect = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, value + effect));
  }
  return value;
}

export function combineGametes(gamete1, gamete2, childSex) {
  const genome = {};
  for (const locusId of LOCI_KEYS) {
    const meta = LOCI[locusId];
    genome[locusId] = {
      locusId,
      chromosome: meta.chr,
      allele1: { value: gamete1[locusId] ?? randomAllele(), origin: 'paternal' },
      allele2: { value: gamete2[locusId] ?? randomAllele(), origin: 'maternal' },
      expressionType: meta.type,
      trait: meta.trait,
    };
  }
  return genome;
}

export function computePhenotype(genome) {
  const g = (locusId) => {
    const locus = genome[locusId];
    if (!locus) return 0.5;
    const { allele1, allele2, expressionType } = locus;
    if (expressionType === 'dominant') return Math.max(allele1.value, allele2.value);
    return (allele1.value + allele2.value) / 2;
  };

  const height_base = (g('HEIGHT_01') + g('HEIGHT_02') + g('HEIGHT_03')) / 3;
  const language_capacity = (g('FOXP2_01') * 0.6 + g('CNTNAP2_01') * 0.4);
  const fluid_intelligence = (g('BDNF_01') + g('COMT_01') + g('DTNBP1_01') + g('NRG1_01') + g('DISC1_01')) / 5;
  const consciousness_potential = (g('NRXN1_01') + g('SHANK3_01') + g('RELN_01') + g('FOXP2_01')) / 4;
  const belief_capacity = consciousness_potential > 0.55 ? (consciousness_potential - 0.55) / 0.45 : 0;
  const immune_strength = (g('IMMUNE_01') + g('IMMUNE_02')) / 2;
  const max_lifespan = 50 + g('TERT_01') * 50 + g('APOE_01') * 20;

  return {
    height_factor: height_base,
    fluid_intelligence,
    working_memory: g('COMT_01'),
    language_capacity,
    social_bonding: g('OXTR_01'),
    aggression: g('MAOA_01'),
    curiosity: g('DRD4_01'),
    serotonin: g('SLC6A4_01'),
    metabolism: g('METABOLISM_01'),
    immune_strength,
    max_lifespan: Math.round(max_lifespan),
    fertility: g('FSHR_01'),
    consciousness_potential,
    belief_capacity,
    eye_color: g('HERC2_01') > 0.5 ? 'brown' : 'blue',
    hair_color: g('MC1R_01') > 0.6 ? 'dark' : g('MC1R_01') > 0.3 ? 'medium' : 'light',
    skin_tone: g('SLC24A5_01'),
  };
}

export function computeInbreedingCoefficient(individual, population) {
  if (!individual.parent_1_id || !individual.parent_2_id) return 0;
  const parent1 = population.get(individual.parent_1_id);
  const parent2 = population.get(individual.parent_2_id);
  if (!parent1 || !parent2) return 0;
  const gp1 = new Set([parent1.parent_1_id, parent1.parent_2_id].filter(Boolean));
  const gp2 = new Set([parent2.parent_1_id, parent2.parent_2_id].filter(Boolean));
  const shared = [...gp1].filter(id => gp2.has(id)).length;
  return shared * 0.25;
}

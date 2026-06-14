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
  // FOXP2 shows haploinsufficiency — one damaged allele causes severe language disorder.
  // Codominant (average) correctly models heterozygous fitness reduction. (Lai et al. 2001)
  FOXP2_01:  { chr: 7,  trait: 'language_capacity',    type: 'codominant' },
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
  STRENGTH_01: { chr: 12, trait: 'physical_strength',  type: 'codominant' },
  METABOLISM_01: { chr: 16, trait: 'metabolism',       type: 'codominant' },
  IMMUNE_01: { chr: 6,  trait: 'immune_strength',      type: 'codominant' },
  IMMUNE_02: { chr: 6,  trait: 'immune_breadth',       type: 'codominant' },

  // Health & longevity
  TERT_01:   { chr: 5,  trait: 'telomere_length',      type: 'codominant' },
  APOE_01:   { chr: 19, trait: 'longevity',            type: 'codominant' },

  // Motivation & leadership (dopamine D2 pathway)
  DRD2_01:    { chr: 11, trait: 'motivation',              type: 'codominant' },

  // Pair bonding & cooperation (arginine vasopressin receptor)
  AVPR1A_01:  { chr: 12, trait: 'pair_bonding',            type: 'codominant' },

  // Muscle power & endurance (actinin alpha-3)
  ACTN3_01:   { chr: 11, trait: 'muscle_fiber_type',       type: 'codominant' },

  // Memory consolidation & learning speed (adrenergic receptor 2B)
  ADRA2B_01:  { chr: 2,  trait: 'memory_consolidation',    type: 'codominant' },

  // Novelty seeking & risk tolerance (voltage-gated calcium channel)
  CACNA1C_01: { chr: 12, trait: 'novelty_seeking',         type: 'codominant' },

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

export function createGamete(genome, stressMultiplier = 1.0) {
  const gamete = {};
  for (const locusId of LOCI_KEYS) {
    const locus = genome[locusId];
    if (!locus) continue;
    const crossover = Math.random() < 0.5;
    const chosen = crossover ? locus.allele2.value : locus.allele1.value;
    const mutated = applyMutation(chosen, locusId, stressMultiplier);
    gamete[locusId] = mutated;
  }
  return gamete;
}

function applyMutation(value, locusId, stressMultiplier = 1.0) {
  // ~2 mutations per gamete on average; stress can double/triple this rate
  const mutationProb = 2 / LOCI_KEYS.length * stressMultiplier;
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
    const a1 = gamete1[locusId] ?? randomAllele();
    const a2 = gamete2[locusId] ?? randomAllele();
    // Convention: gamete1 = paternal, gamete2 = maternal.
    // X-linked loci: males are hemizygous — only one functional X allele, inherited from mother (gamete2).
    const isXLinked = meta.type === 'x_linked';
    const isMale = childSex === 'male';
    genome[locusId] = {
      locusId,
      chromosome: meta.chr,
      allele1: { value: isMale && isXLinked ? a2 : a1, origin: isMale && isXLinked ? 'maternal' : 'paternal' },
      allele2: { value: isMale && isXLinked ? a2 : a2, origin: isMale && isXLinked ? 'hemizygous' : 'maternal' },
      expressionType: isMale && isXLinked ? 'hemizygous' : meta.type,
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
    // Hemizygous: males with X-linked genes express the single maternal allele directly
    if (expressionType === 'hemizygous') return allele1.value;
    return (allele1.value + allele2.value) / 2;
  };

  const height_base = (g('HEIGHT_01') + g('HEIGHT_02') + g('HEIGHT_03')) / 3;
  const language_capacity = g('FOXP2_01') * 0.6 + g('CNTNAP2_01') * 0.4;
  const fluid_intelligence = (g('BDNF_01') + g('COMT_01') + g('DTNBP1_01') + g('NRG1_01') + g('DISC1_01')) / 5;
  const consciousness_potential = (g('NRXN1_01') + g('SHANK3_01') + g('RELN_01') + g('FOXP2_01')) / 4;
  const belief_capacity = Math.max(0, (consciousness_potential - 0.1) / 0.9);
  const immune_strength = (g('IMMUNE_01') + g('IMMUNE_02')) / 2;
  const max_lifespan = 50 + g('TERT_01') * 50 + g('APOE_01') * 20;

  return {
    height_factor:        height_base,
    physical_strength:    Math.min(1, g('STRENGTH_01') * 0.5 + g('HEIGHT_01') * 0.25 + g('METABOLISM_01') * 0.25),
    physical_endurance:   g('METABOLISM_01'),
    endurance:            Math.min(1, g('ACTN3_01') * 0.5 + g('METABOLISM_01') * 0.3 + g('STRENGTH_01') * 0.2),
    fluid_intelligence,
    working_memory:       g('COMT_01'),
    conscientiousness:    g('DISC1_01'),
    learning_rate:        Math.min(1, g('ADRA2B_01') * 0.4 + g('BDNF_01') * 0.35 + g('COMT_01') * 0.25),
    language_capacity,
    language_learning:    g('CNTNAP2_01'),
    social_bonding:       g('OXTR_01'),
    social_drive:         g('OXTR_01'),
    oxytocin_sensitivity: g('OXTR_01'),
    empathy:              (g('OXTR_01') + g('RELN_01')) / 2,
    cooperation:          Math.min(1, g('AVPR1A_01') * 0.5 + g('OXTR_01') * 0.35 + (1 - g('MAOA_01')) * 0.15),
    altruism:             Math.max(0, g('OXTR_01') * 0.7 + (1 - g('MAOA_01')) * 0.3),
    parental_care:        Math.min(1, g('OXTR_01') * 0.6 + g('AVPR1A_01') * 0.4),
    aggression:           g('MAOA_01'),
    dominance:            Math.min(1, g('DRD2_01') * 0.5 + g('MAOA_01') * 0.3 + g('DISC1_01') * 0.2),
    curiosity:            g('DRD4_01'),
    risk_tolerance:       Math.min(1, g('CACNA1C_01') * 0.55 + g('DRD4_01') * 0.35 + (1 - g('SLC6A4_01')) * 0.1),
    innovation:           Math.min(1, (g('CACNA1C_01') + fluid_intelligence + g('DRD4_01')) / 3),
    artistic_sense:       (consciousness_potential + g('DRD4_01')) / 2,
    serotonin:            g('SLC6A4_01'),
    stress_resilience:    g('SLC6A4_01'),
    health_resilience:    Math.min(1, g('SLC6A4_01') * 0.4 + g('STRENGTH_01') * 0.3 + g('TERT_01') * 0.3),
    anxiety:              Math.max(0, 1 - g('SLC6A4_01')),
    independence:         (g('DRD4_01') + fluid_intelligence) / 2,
    xenophobia:           Math.max(0, (1 - g('OXTR_01') + g('MAOA_01')) / 2),
    metabolism:           g('METABOLISM_01'),
    immune_strength,
    max_lifespan:         Math.round(max_lifespan),
    fertility:            g('FSHR_01'),
    consciousness_potential,
    belief_capacity,
    religiosity:          Math.min(1, belief_capacity * 0.6 + (1 - g('SLC6A4_01')) * 0.4),
    self_awareness:       (g('NRXN1_01') + g('SHANK3_01')) / 2,
    eye_color:  g('HERC2_01') > 0.5 ? 'brown' : 'blue',
    hair_color: g('MC1R_01') > 0.6 ? 'dark' : g('MC1R_01') > 0.3 ? 'medium' : 'light',
    skin_tone:  g('SLC24A5_01'),
  };
}

// Wright's path coefficient method: F = Σ_A (0.5)^(L1+L2+1) × (1+F_A)
// where L1/L2 are path lengths from each parent to common ancestor A.
// Verified values: full siblings→0.25, half siblings→0.125, first cousins→0.0625.
export function computeInbreedingCoefficient(individual, population) {
  if (!individual.parent_1_id || !individual.parent_2_id) return 0;
  const parent1 = population.get(individual.parent_1_id);
  const parent2 = population.get(individual.parent_2_id);
  if (!parent1 || !parent2) return 0;

  const probs1 = _ancestorProbs(parent1, population, 10);
  const probs2 = _ancestorProbs(parent2, population, 10);

  let F = 0;
  for (const [ancId, p1] of probs1) {
    const p2 = probs2.get(ancId);
    if (p2 === undefined) continue;
    const FA = population.get(ancId)?.inbreeding_coeff ?? 0;
    F += 0.5 * p1 * p2 * (1 + FA);
  }
  return Math.min(F, 1);
}

// Returns Map<ancestorId, sum of (0.5)^depth over all paths from startInd to that ancestor>.
// visited key = "id:depth" prevents infinite loops in inbred pedigrees while
// still allowing the same ancestor to be reached at different depths via distinct paths.
function _ancestorProbs(startInd, population, maxDepth) {
  const probs = new Map();
  const stack = [{ ind: startInd, depth: 0 }];
  const visited = new Set();
  while (stack.length) {
    const { ind, depth } = stack.pop();
    if (depth >= maxDepth) continue;
    for (const pid of [ind.parent_1_id, ind.parent_2_id]) {
      if (!pid) continue;
      const parent = population.get(pid);
      if (!parent) continue;
      probs.set(pid, (probs.get(pid) ?? 0) + Math.pow(0.5, depth + 1));
      const key = `${pid}:${depth + 1}`;
      if (!visited.has(key)) {
        visited.add(key);
        stack.push({ ind: parent, depth: depth + 1 });
      }
    }
  }
  return probs;
}

const LANGUAGE_STAGES = [
  { stage: 0, name: 'pre-linguistic',   foxp2_min: 0,    group_min: 1,  gen_min: 0  },
  { stage: 1, name: 'gestural',         foxp2_min: 0,    group_min: 3,  gen_min: 0  },
  { stage: 2, name: 'emotional-sounds', foxp2_min: 0.4,  group_min: 5,  gen_min: 1  },
  { stage: 3, name: 'proto-words',      foxp2_min: 0.55, group_min: 8,  gen_min: 4  },
  { stage: 4, name: 'syntax',           foxp2_min: 0.65, group_min: 15, gen_min: 8  },
  { stage: 5, name: 'abstract',         foxp2_min: 0.72, group_min: 25, gen_min: 15 },
  { stage: 6, name: 'writing',          foxp2_min: 0.80, group_min: 40, gen_min: 25 },
];

export function updateLanguageStage(individual, groupSize, generationCount, groupId = 'default') {
  if (!individual.phenotype || !individual.language) return { upgraded: false };
  // Stage check uses expressed foxp2, not genetic ceiling.
  // Expression grows through social interaction (see updateFoxp2Expression).
  const foxp2 = individual.language?.foxp2_expression ?? (individual.phenotype?.language_capacity ?? 0.5) * 0.10;
  const currentStage = individual.language?.stage ?? 0;
  for (let i = LANGUAGE_STAGES.length - 1; i >= 0; i--) {
    const s = LANGUAGE_STAGES[i];
    if (foxp2 >= s.foxp2_min && groupSize >= s.group_min && generationCount >= s.gen_min) {
      if (i > currentStage) {
        // Advance at most one stage per tick to prevent multi-stage jumps
        const nextStage = currentStage + 1;
        const nextDef = LANGUAGE_STAGES[nextStage];
        const prevStage = currentStage;
        individual.language.stage = nextStage;
        individual.language.stage_name = nextDef.name;
        if (nextStage >= 4) individual.language.grammar = true;
        if (nextStage >= 6) individual.language.writing = true;
        // No vocabulary seeding — words must emerge through observation and social teaching.
        return { upgraded: true, prevStage, newStage: nextStage, stageName: nextDef.name };
      }
      break;
    }
  }
  return { upgraded: false };
}

// FOXP2 expression grows toward genetic ceiling through social language use.
// This models developmental plasticity: the gene provides potential, experience
// drives actual expression. Founders start at 70% of their cap (already adults);
// newborns start at 10% and grow through group interaction.
export function updateFoxp2Expression(individual, groupMemberCount = 0) {
  const geneticCap = individual.phenotype.language_capacity;
  const current = individual.language.foxp2_expression ?? geneticCap * 0.1;
  const socialGain = Math.min(groupMemberCount, 10) * 0.000015;
  const stagingGain = individual.language.stage > 0 ? 0.000005 : 0;
  individual.language.foxp2_expression = Math.min(geneticCap, current + socialGain + stagingGain);
}

// Organic word acquisition: an individual coins a sound-label for a concept
// they have directly encountered. Requires stage 2+ and sufficient foxp2 expression.
// Founders (high foxp2, adult-level expression) will coin words much faster than
// newborns. Other individuals acquire vocabulary mainly through learnFromTeacher.
export function tryAcquireWordFromEnvironment(individual, concept, groupId) {
  if (!individual.language || individual.language.stage < 2) return false;
  if (individual.language.vocabulary?.[concept]) return false;
  const foxp2 = individual.language.foxp2_expression ?? individual.phenotype.language_capacity * 0.1;
  if (foxp2 < 0.35) return false;
  const iq = individual.phenotype?.fluid_intelligence ?? 0.5;
  if (Math.random() > foxp2 * iq * 0.15) return false;
  individual.language.vocabulary = individual.language.vocabulary ?? {};
  individual.language.vocabulary[concept] = generateProtoWord(concept, groupId);
  return true;
}

export function learnFromTeacher(learner, teacher) {
  if (!teacher.language?.vocabulary) return;
  const teacherWords = Object.keys(teacher.language.vocabulary);
  if (teacherWords.length === 0) return;
  if (!learner.language) return;
  // Learner needs minimum FOXP2 expression to form new words from observation
  const foxp2 = learner.language.foxp2_expression ?? (learner.phenotype?.language_capacity ?? 0.5) * 0.1;
  if (foxp2 < 0.25) return;
  if (!learner.language.vocabulary) learner.language.vocabulary = {};
  const maxLearn = Math.floor((learner.phenotype?.fluid_intelligence ?? 0.5) * 3);
  for (const word of teacherWords.slice(0, maxLearn)) {
    if (!learner.language.vocabulary[word]) learner.language.vocabulary[word] = teacher.language.vocabulary[word];
  }
}

export function generateProtoWord(concept, groupId) { // exported for bootstrap seeding
  const seed = hashStr(concept + groupId);
  const c = 'bdfghjklmnprstvwz', v = 'aeiou';
  const len = 1 + (seed % 3);
  let word = '';
  for (let i = 0; i < len; i++) { word += c[(seed * (i+1) * 7) % c.length] + v[(seed * (i+1) * 13) % v.length]; }
  return word;
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const CORE_CONCEPTS = ['danger','food','water','fire','here','there','me','you','us','them','good','bad','hunt','eat','sleep','die','born','run','sun','moon','rain','dark','light','god','spirit','sky','earth','time'];

export function getLanguageSummary(population) {
  const stages = {};
  for (const ind of population.values()) {
    if (!ind.alive) continue;
    const s = ind.language?.stage_name ?? 'pre-linguistic';
    stages[s] = (stages[s] ?? 0) + 1;
  }
  return stages;
}

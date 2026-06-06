const LANGUAGE_STAGES = [
  { stage: 0, name: 'pre-linguistic',   foxp2_min: 0,    group_min: 1,  gen_min: 0  },
  { stage: 1, name: 'gestural',         foxp2_min: 0,    group_min: 3,  gen_min: 0  },
  { stage: 2, name: 'emotional-sounds', foxp2_min: 0.4,  group_min: 5,  gen_min: 2  },
  { stage: 3, name: 'proto-words',      foxp2_min: 0.6,  group_min: 10, gen_min: 10 },
  { stage: 4, name: 'syntax',           foxp2_min: 0.75, group_min: 20, gen_min: 20 },
  { stage: 5, name: 'abstract',         foxp2_min: 0.8,  group_min: 30, gen_min: 30 },
  { stage: 6, name: 'writing',          foxp2_min: 0.85, group_min: 50, gen_min: 50 },
];

// How many CORE_CONCEPTS to seed at each language stage upgrade
const VOCAB_SEED_AT_STAGE = { 3: 10, 4: 18, 5: 28, 6: 28 };

export function updateLanguageStage(individual, groupSize, generationCount, groupId = 'default') {
  const foxp2 = individual.phenotype.language_capacity;
  const currentStage = individual.language.stage;
  for (let i = LANGUAGE_STAGES.length - 1; i >= 0; i--) {
    const s = LANGUAGE_STAGES[i];
    if (foxp2 >= s.foxp2_min && groupSize >= s.group_min && generationCount >= s.gen_min) {
      if (i > currentStage) {
        const prevStage = currentStage;
        individual.language.stage = i;
        individual.language.stage_name = s.name;
        if (i >= 4) individual.language.grammar = true;
        if (i >= 6) individual.language.writing = true;
        // Seed vocabulary for newly accessible concepts at this stage
        const seedCount = VOCAB_SEED_AT_STAGE[i];
        if (seedCount) {
          const vocab = individual.language.vocabulary ?? {};
          for (const concept of CORE_CONCEPTS.slice(0, seedCount)) {
            if (!vocab[concept]) vocab[concept] = generateProtoWord(concept, groupId);
          }
          individual.language.vocabulary = vocab;
        }
        return { upgraded: true, prevStage, newStage: i, stageName: s.name };
      }
      break;
    }
  }
  return { upgraded: false };
}

export function learnFromTeacher(learner, teacher) {
  const teacherWords = Object.keys(teacher.language.vocabulary ?? {});
  if (teacherWords.length === 0) return;
  const maxLearn = Math.floor(learner.phenotype.fluid_intelligence * 3);
  for (const word of teacherWords.slice(0, maxLearn)) {
    if (!learner.language.vocabulary[word]) learner.language.vocabulary[word] = teacher.language.vocabulary[word];
  }
}

export function generateProtoWord(concept, groupId) {
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
    const s = ind.language.stage_name;
    stages[s] = (stages[s] ?? 0) + 1;
  }
  return stages;
}

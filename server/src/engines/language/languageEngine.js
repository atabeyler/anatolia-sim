// Language emergence engine — no developer-defined words or concepts.
// Sounds are random phoneme strings. Meaning emerges from repeated use in context.

const CONSONANTS = ['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z'];
const VOWELS     = ['a','e','i','o','u'];

const LANGUAGE_STAGES = [
  { stage: 0, name: 'pre-linguistic',   foxp2_min: 0,    group_min: 1,  gen_min: 0  },
  { stage: 1, name: 'gestural',         foxp2_min: 0,    group_min: 3,  gen_min: 0  },
  { stage: 2, name: 'emotional-sounds', foxp2_min: 0.4,  group_min: 5,  gen_min: 2  },
  { stage: 3, name: 'proto-words',      foxp2_min: 0.6,  group_min: 10, gen_min: 10 },
  { stage: 4, name: 'syntax',           foxp2_min: 0.75, group_min: 20, gen_min: 20 },
  { stage: 5, name: 'abstract',         foxp2_min: 0.8,  group_min: 30, gen_min: 30 },
  { stage: 6, name: 'writing',          foxp2_min: 0.85, group_min: 50, gen_min: 50 },
];

// Simulation event contexts — these are cognitive categories (substrate), not words.
// The SOUNDS that get associated with them are entirely random.
export const STIMULUS_CONTEXTS = ['food','danger','pain','death','birth','water','fire','mate','cold','dark'];

function randomSound() {
  const syllables = 1 + Math.floor(Math.random() * 3);
  let s = '';
  for (let i = 0; i < syllables; i++) {
    s += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    s += VOWELS[Math.floor(Math.random() * VOWELS.length)];
  }
  return s;
}

// ----- Language stage advancement (unchanged logic) -----

export function updateLanguageStage(individual, groupSize, generationCount) {
  const foxp2 = individual.phenotype.language_capacity;
  const currentStage = individual.language.stage;
  for (let i = LANGUAGE_STAGES.length - 1; i >= 0; i--) {
    const s = LANGUAGE_STAGES[i];
    if (foxp2 >= s.foxp2_min && groupSize >= s.group_min && generationCount >= s.gen_min) {
      if (i > currentStage) {
        individual.language.stage = i;
        individual.language.stage_name = s.name;
        if (i >= 4) individual.language.grammar = true;
        if (i >= 6) individual.language.writing = true;
        return { upgraded: true, newStage: i, stageName: s.name };
      }
      break;
    }
  }
  return { upgraded: false };
}

// ----- Natural vocalization -----

// An agent in stimulus context may emit a sound. Returns the sound string or null.
export function maybeVocalize(individual, context) {
  const stage = individual.language.stage;
  if (stage < 1) return null; // pre-linguistic: no vocalizations

  const foxp2 = individual.phenotype.language_capacity ?? 0.5;
  // Probability scales with FOXP2 and stage (more developed = more likely to vocalize)
  const baseProb = 0.04 + foxp2 * 0.08 + stage * 0.02;
  if (Math.random() > baseProb) return null;

  if (!individual.language.vocalizations) individual.language.vocalizations = {};
  const vocs = individual.language.vocalizations;

  // If this agent already has a sound they use for this context, prefer it (reinforcement)
  const known = Object.entries(vocs).filter(([, v]) => v.contexts[context] > 0);
  if (known.length > 0 && Math.random() < 0.75) {
    // Use the sound most associated with this context
    const [sound, data] = known.sort((a, b) =>
      (b[1].contexts[context] ?? 0) - (a[1].contexts[context] ?? 0)
    )[0];
    data.contexts[context] = (data.contexts[context] ?? 0) + 1;
    data.total = (data.total ?? 0) + 1;
    return sound;
  }

  // Generate a new random sound (no concept names, no hashing from English words)
  const sound = randomSound();
  if (!vocs[sound]) vocs[sound] = { contexts: {}, total: 0 };
  vocs[sound].contexts[context] = (vocs[sound].contexts[context] ?? 0) + 1;
  vocs[sound].total = (vocs[sound].total ?? 0) + 1;
  return sound;
}

// A nearby agent hears a sound in a given context and may absorb it.
export function hearVocalization(listener, sound, context) {
  const stage = listener.language.stage;
  if (stage < 1) return; // can't learn before gestural stage

  const foxp2 = listener.phenotype.language_capacity ?? 0.5;
  // Smarter agents learn more readily
  if (Math.random() > foxp2 * 0.6 + 0.1) return;

  if (!listener.language.vocalizations) listener.language.vocalizations = {};
  const vocs = listener.language.vocalizations;
  if (!vocs[sound]) vocs[sound] = { contexts: {}, total: 0 };
  vocs[sound].contexts[context] = (vocs[sound].contexts[context] ?? 0) + 1;
  vocs[sound].total = (vocs[sound].total ?? 0) + 1;
}

// ----- Old learnFromTeacher — kept for vocabulary field compatibility -----
// Now propagates vocalizations instead of vocabulary entries.

export function learnFromTeacher(learner, teacher) {
  if (!teacher.language?.vocalizations) return;
  const maxLearn = Math.max(1, Math.floor((learner.phenotype.fluid_intelligence ?? 0.5) * 4));
  let learned = 0;
  for (const [sound, data] of Object.entries(teacher.language.vocalizations)) {
    if (learned >= maxLearn) break;
    if (!learner.language.vocalizations) learner.language.vocalizations = {};
    if (!learner.language.vocalizations[sound]) {
      learner.language.vocalizations[sound] = { contexts: {}, total: 0 };
      for (const [ctx, cnt] of Object.entries(data.contexts)) {
        learner.language.vocalizations[sound].contexts[ctx] = Math.ceil(cnt * 0.5);
      }
      learner.language.vocalizations[sound].total = Math.ceil(data.total * 0.5);
      learned++;
    }
  }
}

// ----- Crystallised word count (for stats) -----
// A "word" = a sound used by 2+ agents for the same context.

export function getEmergentWordCount(population) {
  // sound → context → Set of agent ids
  const index = {};
  for (const ind of population.values()) {
    if (!ind.alive) continue;
    for (const [sound, data] of Object.entries(ind.language?.vocalizations ?? {})) {
      for (const [ctx, cnt] of Object.entries(data.contexts ?? {})) {
        if (cnt < 1) continue;
        if (!index[sound]) index[sound] = {};
        if (!index[sound][ctx]) index[sound][ctx] = new Set();
        index[sound][ctx].add(ind.id);
      }
    }
  }
  let words = 0;
  for (const ctxMap of Object.values(index)) {
    for (const agents of Object.values(ctxMap)) {
      if (agents.size >= 2) words++;
    }
  }
  return words;
}

// ----- Emergent lexicon snapshot (for dashboard / ARIA) -----
// Returns top shared sounds with their dominant context and speaker count.

export function getEmergentLexicon(population, limit = 30) {
  const index = {}; // sound → context → [agentId, ...]
  for (const ind of population.values()) {
    if (!ind.alive) continue;
    for (const [sound, data] of Object.entries(ind.language?.vocalizations ?? {})) {
      for (const [ctx, cnt] of Object.entries(data.contexts ?? {})) {
        if (cnt < 2) continue;
        if (!index[sound]) index[sound] = {};
        if (!index[sound][ctx]) index[sound][ctx] = [];
        index[sound][ctx].push(ind.id);
      }
    }
  }
  const words = [];
  for (const [sound, ctxMap] of Object.entries(index)) {
    for (const [ctx, agents] of Object.entries(ctxMap)) {
      if (agents.length >= 2) {
        words.push({ sound, context: ctx, speakers: agents.length });
      }
    }
  }
  words.sort((a, b) => b.speakers - a.speakers);
  return words.slice(0, limit);
}

export function getLanguageSummary(population) {
  const stages = {};
  for (const ind of population.values()) {
    if (!ind.alive) continue;
    const s = ind.language?.stage_name ?? 'pre-linguistic';
    stages[s] = (stages[s] ?? 0) + 1;
  }
  return stages;
}

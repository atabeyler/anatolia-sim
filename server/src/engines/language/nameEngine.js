/**
 * Procedural Name Engine
 *
 * Each simulation develops its own phonological profile from its world seed
 * (derived from founding coordinates + biome). Names emerge as language
 * stages advance — no pre-written name lists.
 *
 * Stage 0-1 : no name (pre-linguistic)
 * Stage 2   : 1-syllable vocalization  e.g. "Ka", "Ro"
 * Stage 3   : 2-syllable personal name e.g. "Karo", "Metu"
 * Stage 4+  : personal + clan marker   e.g. "Karo-Na", "Metu-Ruk"
 */

// Six consonant classes ordered by articulatory universality
const C_CLASSES = [
  ['m', 'n', 'ng', 'w'],     // nasals + approximants (most universal)
  ['p', 't', 'k', 'b'],      // stops
  ['d', 'g', 'r', 'l'],      // voiced stops + liquids
  ['s', 'z', 'sh', 'h'],     // sibilants + fricatives
  ['f', 'v', 'th', 'y'],     // labiodental + palatals
  ['ts', 'nd', 'mb', 'rl'],  // clusters (emerge in complex language)
];

// Four vowel systems — from minimal to rich
const V_SYSTEMS = [
  ['a', 'i', 'u'],
  ['a', 'e', 'i', 'o', 'u'],
  ['a', 'o', 'e', 'ai', 'ou'],
  ['a', 'i', 'u', 'an', 'el', 'ar'],
];

// Biome-influenced phonological tendencies (purely aesthetic)
const BIOME_C_BIAS = {
  mediterranean:    0,
  coastal:          1,
  tropical_rainforest: 2,
  tropical_savanna: 2,
  temperate_forest: 3,
  boreal_forest:    4,
  tundra:           4,
  mountain:         3,
  grassland:        1,
  desert:           0,
};

/**
 * Build a phonological profile for a simulation.
 * The profile is deterministic from the world seed so all individuals
 * in the same simulation share a consistent sound system.
 *
 * @param {number} phonologySeed  — integer stored in worldState.phonology_seed
 * @param {string} biome          — biome key for phoneme bias
 * @returns {{ consonants: string[], vowels: string[], clanSuffix: string[] }}
 */
export function buildPhonology(phonologySeed, biome = 'mediterranean') {
  const s = Math.abs(phonologySeed | 0);
  const biomeBias = BIOME_C_BIAS[biome] ?? 0;

  // Primary and secondary consonant class selection
  const c1 = C_CLASSES[(s + biomeBias) % C_CLASSES.length];
  const c2 = C_CLASSES[(s * 3 + biomeBias + 2) % C_CLASSES.length];
  // Tertiary class unlocked at stage 3+ (clusters/complex sounds)
  const c3 = C_CLASSES[(s * 7 + 1) % C_CLASSES.length];

  const vowels = V_SYSTEMS[(s * 5 + biomeBias) % V_SYSTEMS.length];

  // Clan suffixes are short (C+V) drawn from the tertiary class
  const clanSuffix = c3.slice(0, 3).map(c => c + vowels[0]);

  return {
    consonants: [...new Set([...c1, ...c2])],
    vowels,
    clanSuffix,
  };
}

/**
 * Derive a stable phonology seed from world coordinates.
 * Two simulations starting at different coords will sound different.
 */
export function derivePhonologySeed(lat, lon) {
  // Mix lat/lon into a stable integer in [0, 9999]
  return Math.abs(
    (Math.round(lat * 100) * 31 + Math.round(lon * 100) * 17 + 1277) % 10000
  );
}

/**
 * Generate a name for a newborn from the simulation's phonological profile.
 *
 * @param {object} phonology     — result of buildPhonology()
 * @param {number} languageStage — community's current max language stage
 * @returns {string|null}
 */
export function generateName(phonology, languageStage) {
  if (languageStage < 2) return null;

  const { consonants, vowels, clanSuffix } = phonology;

  function rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function syllable() {
    return rnd(consonants) + rnd(vowels);
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  if (languageStage < 3) {
    // Single vocalization — short and simple
    return capitalize(syllable());
  }

  if (languageStage < 4) {
    // Two-syllable personal name
    return capitalize(syllable() + syllable());
  }

  // Complex: personal name + clan identifier (hyphenated)
  const personal = capitalize(syllable() + syllable());
  const clan     = capitalize(rnd(clanSuffix));
  return `${personal}-${clan}`;
}

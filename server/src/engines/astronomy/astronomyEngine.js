// Astronomy Engine
const CEV = {
  lunar_cycle: { period_days: 29.5, observability: 0.9 },
  solstice: { period_days: 182.5, observability: 0.7 },
  equinox: { period_days: 182.5, observability: 0.6 },
  star_rising: { period_days: 365, observability: 0.5 },
  eclipse_solar: { period_days: 177.5, observability: 0.99 },
  eclipse_lunar: { period_days: 177.5, observability: 0.9 },
  planet_motion: { period_days: 687, observability: 0.4 },
  comet: { period_days: 3650, observability: 0.99, rare: true }
};

export const ASTRONOMY_KNOWLEDGE = {
  lunar_tracking: {
    requires_obs: ['lunar_cycle'],
    iq_min: 0.3,
    foxp2_min: 0.4
  },
  seasonal_calendar: {
    requires_obs: ['solstice', 'equinox'],
    iq_min: 0.45,
    foxp2_min: 0.5,
    requires_tech: ['calendar']
  },
  star_map: {
    requires_obs: ['star_rising', 'lunar_cycle'],
    iq_min: 0.55,
    foxp2_min: 0.55
  },
  eclipse_prediction: {
    requires_obs: ['eclipse_solar', 'eclipse_lunar', 'lunar_tracking'],
    iq_min: 0.65,
    foxp2_min: 0.65,
    requires_tech: ['mathematics_basic']
  },
  planetary_model: {
    requires_obs: ['planet_motion', 'star_map'],
    iq_min: 0.7,
    foxp2_min: 0.7,
    requires_tech: ['mathematics_basic', 'writing_system']
  }
};

const CDESC = {
  lunar_cycle: 'The moon completes another cycle of phases',
  solstice: 'The sun reaches its extreme position',
  equinox: 'Day and night are of equal length',
  star_rising: 'A prominent star rises at sunset',
  eclipse_solar: 'The sun is obscured — a solar eclipse',
  eclipse_lunar: 'The moon turns blood red — a lunar eclipse',
  planet_motion: 'A wandering star moves against the fixed stars',
  comet: 'A bright object with a tail crosses the sky'
};

const KDESC = {
  lunar_tracking: 'The phases of the moon can be predicted',
  seasonal_calendar: 'A calendar based on sun and moon positions is developed',
  star_map: 'Named star constellations guide navigation',
  eclipse_prediction: 'Solar and lunar eclipses can be predicted',
  planetary_model: 'A model explains the motion of wandering stars'
};

export function processAstronomyTick(population, observations, astronomyKnowledge, discoveredTechs, simDay) {
  const events = [];
  for (const [eid, ev] of Object.entries(CEV)) {
    if (ev.rare) {
      if (Math.random() > 0.001) continue;
      observations.add(eid);
      events.push({ type: 'celestial_observation', event_id: eid, day: simDay, importance: 'high', description: CDESC[eid] ?? eid });
      continue;
    }
    if (
      simDay > 0 &&
      simDay % Math.round(ev.period_days) < 1 &&
      Math.random() < ev.observability
    ) {
      observations.add(eid); // idempotent — Set handles first-occurrence tracking for knowledge unlocks
      events.push({
        type: 'celestial_observation',
        event_id: eid,
        day: simDay,
        importance: eid.includes('eclipse') ? 'high' : 'low',
        description: CDESC[eid] ?? eid
      });
    }
  }
  const obs = population.filter(
    i =>
      !i.is_dead &&
      i.life_stage !== 'INFANT' &&
      i.life_stage !== 'CHILD'
  );
  for (const o of obs) {
    const foxp2 = o.language?.foxp2_expression ?? 0;
    for (const [kid, k] of Object.entries(ASTRONOMY_KNOWLEDGE)) {
      if (
        astronomyKnowledge.has(kid) ||
        o.phenotype.fluid_intelligence < k.iq_min ||
        foxp2 < k.foxp2_min ||
        (k.requires_obs?.some(x => !observations.has(x))) ||
        (k.requires_tech?.some(t => !discoveredTechs.has(t)))
      ) continue;
      if (Math.random() < o.phenotype.curiosity * o.phenotype.fluid_intelligence * 0.0001) {
        astronomyKnowledge.add(kid);
        events.push({
          type: 'astronomy_discovery',
          knowledge_id: kid,
          discoverer_id: o.id,
          day: simDay,
          importance: k.iq_min > 0.6 ? 'high' : 'medium',
          description: KDESC[kid] ?? kid
        });
      }
    }
  }
  return events;
}

// Accumulate ALL known astronomy bonuses instead of returning the first match.
export function getAstronomyBonus(ak) {
  const b = {};
  if (ak.has('lunar_tracking'))    { b.navigation = (b.navigation ?? 0) + 0.10; }
  if (ak.has('seasonal_calendar')) { b.farming_efficiency = (b.farming_efficiency ?? 0) + 0.15; }
  if (ak.has('star_map'))          { b.navigation = (b.navigation ?? 0) + 0.20; b.seafaring = 0.20; }
  if (ak.has('eclipse_prediction')){ b.farming_efficiency = (b.farming_efficiency ?? 0) + 0.05; }
  if (ak.has('planetary_model'))   { b.navigation = (b.navigation ?? 0) + 0.10; b.innovation_rate = 0.10; }
  return b;
}

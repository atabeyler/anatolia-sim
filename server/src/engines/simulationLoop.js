// Main Simulation Loop — each tick = 1 simulation day

import { rollDeath } from './biology/mortality.js';
import { checkReproduction, attemptMating } from './biology/reproduction.js';
import { updateWorldState, computeResourcePressure } from './environment/environmentEngine.js';
import { buildPhonology } from './language/nameEngine.js';
import { updateLanguageStage, learnFromTeacher } from './language/languageEngine.js';
import { tryDiscoverTech } from './technology/technologyEngine.js';
import { getAge } from './biology/individual.js';
import { processGroupDynamics, assignGroupRoles } from './social/socialEngine.js';
import { gatherResources, consumeResources, produceGoods, attemptTrade, computeEconomicStats, initializeInventory } from './economy/economyEngine.js';
import { tryFormBelief, updateBeliefSpread, checkRitualEmergence } from './belief/beliefEngine.js';
import { processCultureTick } from './culture/cultureEngine.js';
import { processArtTick, applyArtEffects } from './art/artEngine.js';
import { processArchitectureTick, createSettlement } from './architecture/architectureEngine.js';
import { processLawTick } from './law/lawEngine.js';
import { processMicrobiomeTick, spreadInfection, updateGutMicrobiome, computeHealthStats } from './microbiome/microbiomeEngine.js';
import { initializePsychology, updateMentalState, processBonding, computePopulationPsychStats } from './psychology/psychologyEngine.js';
import { initializeEpigenome, inheritEpigenome, updateEpigenome } from './epigenetics/epigeneticsEngine.js';
import { processAstronomyTick } from './astronomy/astronomyEngine.js';

const SOCIAL_INTERACTION_RADIUS = 5;  // degrees (~500 km) — was 50 (causes O(n²) explosion)
const CHECKPOINT_INTERVAL = 100;

export class SimulationEngine {
  constructor(simulation) {
    this.simId = simulation.id;
    this.currentDay = simulation.current_day ?? 0;
    this.population = new Map();
    this.worldState = simulation.world_state;
    this.discoveredTechs = new Set(['foraging', 'stone_tools']);
    this.discoveredBeliefs = new Set();
    this.discoveredArts = new Set();
    this.celestialObservations = new Set();
    this.astronomyKnowledge = new Set();
    this.groups = [];
    this.settlements = [];
    this.events = [];
    this.generation = 0;
    this.running = false;
    this.speedMultiplier = simulation.speed_multiplier ?? 1;
    this.onTick = null;
    this.onCheckpoint = null;
    // Build phonological profile once — unique to this civilization's geography
    const ws = simulation.world_state ?? {};
    this.phonology = buildPhonology(ws.phonology_seed ?? 0, ws.biome ?? 'mediterranean');
  }

  load(individuals) {
    for (const ind of individuals) {
      if (!ind.inventory) ind.inventory = initializeInventory();
      if (!ind.psychology) initializePsychology(ind);
      if (!ind.epigenome) initializeEpigenome(ind);
      // Beliefs must be a Set in-memory; DB stores as array (Set doesn't JSON-serialize)
      ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);
      this.population.set(ind.id, ind);
    }
  }

  async start() {
    if (this.running) return;
    this.running = true;
    let fastBatch = 0;
    while (this.running) {
      const alive = [...this.population.values()].filter(i => !i.is_dead);
      if (alive.length === 0) { this.running = false; break; }
      await this.tick();
      if (this.speedMultiplier < 100) {
        fastBatch = 0;
        await sleep(1000 / this.speedMultiplier);
      } else {
        // At max speed: yield to event loop every 10 ticks so WebSocket/DB can breathe
        fastBatch++;
        if (fastBatch >= 10) {
          fastBatch = 0;
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }
  }

  pause() { this.running = false; }
  resume() { this.start(); }

  async tick() {
    try {
    const day = this.currentDay;
    for (const ind of this.population.values()) {
      ind.alive = !ind.is_dead;
      ind.age = day - (ind.birth_day ?? 0);
    }
    const alive = [...this.population.values()].filter(i => !i.is_dead);
    const tickEvents = [];

    // 0. Set age & life_stage on every individual (required by all engines)
    for (const ind of alive) {
      ind.age = day - ind.birth_day;
      const ay = ind.age / 365;
      ind.life_stage = ay < 2 ? 'INFANT' : ay < 12 ? 'CHILD' : ay < 18 ? 'ADOLESCENT' : ay < 45 ? 'ADULT' : 'ELDER';
    }

    // 1. Update world environment
    this.worldState.alive_count = alive.length;
    updateWorldState(this.worldState, day);
    const resourcePressure = computeResourcePressure(this.worldState, alive.length);

    // 2. Epigenetics & microbiome daily update
    for (const ind of alive) {
      updateEpigenome(ind, this.worldState, day);
      updateGutMicrobiome(ind, this.worldState);
    }

    // 3. Economy — gather resources, consume, produce goods
    for (const ind of alive) {
      const gathered = gatherResources(ind, this.worldState, this.discoveredTechs);
      if (!ind.inventory) ind.inventory = initializeInventory();
      for (const [res, qty] of Object.entries(gathered)) {
        ind.inventory[res] = (ind.inventory[res] ?? 0) + qty;
      }
      const { satiation, inv } = consumeResources(ind);
      ind.inventory = inv;
      ind.satiation = satiation;

      // Wire satiation → health.calories / hydration (gradual, not instant collapse)
      if (ind.health) {
        const targetCal  = Math.min(1, satiation * 1.3);
        const targetHyd  = Math.min(1, ((inv.water ?? 0) > 0.5 ? 0.95 : 0.4));
        ind.health.calories   = (ind.health.calories   ?? 1) * 0.97 + targetCal * 0.03;
        ind.health.hydration  = (ind.health.hydration  ?? 1) * 0.97 + targetHyd * 0.03;
      }

      const { produced, inv: prodInv } = produceGoods(ind, this.discoveredTechs);
      ind.inventory = prodInv;
      for (const [good, qty] of Object.entries(produced)) {
        ind.inventory[good] = (ind.inventory[good] ?? 0) + qty;
      }
    }

    // 4. Physiology — health, aging
    for (const ind of alive) {
      this.updatePhysiology(ind, resourcePressure);
    }

    // 4b. Movement — individuals wander on the map
    for (const ind of alive) {
      this.moveIndividual(ind);
    }
    // Infants travel with their mother
    for (const ind of alive) {
      if ((ind.age / 365) < 2 && ind.parent_1_id) {
        const mother = this.population.get(ind.parent_1_id);
        if (mother && !mother.is_dead) {
          ind.x = mother.x + (Math.random() - 0.5) * 0.005;
          ind.y = mother.y + (Math.random() - 0.5) * 0.005;
        }
      }
    }

    // 5. Psychology — mental state
    for (const ind of alive) {
      updateMentalState(ind, tickEvents, this.worldState, day);
    }

    // 6. Social groups
    const socialEvents = processGroupDynamics(alive, this.groups, day);
    tickEvents.push(...socialEvents);

    // Assign roles in each group
    for (const group of this.groups) {
      const members = alive.filter(i => group.member_ids.includes(i.id));
      assignGroupRoles(members, group);
    }

    // 7. Social interactions, mating, bonding, disease spread
    this.processSocialInteractions(alive, day, tickEvents);

    // 8. Reproduction — pass community lang stage + phonology for era-appropriate naming
    const communityLangStage = alive.length ? Math.max(...alive.map(i => i.language?.stage ?? 0)) : 0;
    const newborns = checkReproduction(this.population, day, this.simId, communityLangStage, this.phonology);
    for (const nb of newborns) {
      nb.inventory = initializeInventory();
      nb.beliefs = new Set(); // must be Set in-memory
      initializePsychology(nb);
      initializeEpigenome(nb);
      // Inherit epigenetics from parents
      const p1 = this.population.get(nb.parent_1_id);
      const p2 = this.population.get(nb.parent_2_id);
      if (p1 && p2) inheritEpigenome(nb, p1, p2);
      this.population.set(nb.id, nb);
      tickEvents.push({ type: 'birth', individual_id: nb.id, day, importance: 'low' });
      const nbLabel = nb.phenotype?.name ?? `${nb.sex === 'male' ? '♂' : '♀'}-${nb.id.slice(-4).toUpperCase()}`;
      this.logEvent(day, 'birth', `Born: ${nbLabel}`, { individual_id: nb.id }, 1);
    }

    // 9. Microbiome & disease outbreaks
    const microEvents = processMicrobiomeTick(alive, this.worldState, day);
    tickEvents.push(...microEvents);
    for (const ev of microEvents) {
      this.logEvent(day, 'epidemic', ev.description, ev, ev.importance === 'high' ? 5 : 3);
    }

    // 10. Death checks
    // Pass live count so mortality engine can apply small-group protection
    this.worldState.alive_count = alive.length;
    for (const ind of alive) {
      const cause = rollDeath(ind, day, this.worldState);
      if (cause) {
        ind.is_dead = true;
        ind.alive = false;
        ind.death_day = day;
        ind.death_cause = cause;
        // Free the surviving mate so they can re-pair
        if (ind.social?.mate_id) {
          const mate = this.population.get(ind.social.mate_id);
          if (mate && !mate.is_dead) {
            mate.social.has_mate = false;
            mate.social.mate_id = null;
          }
        }
        tickEvents.push({ type: 'death_of_kin', individual_id: ind.id, day });
        this.logEvent(day, 'death', `Individual died: ${cause}`, { individual_id: ind.id, cause }, 1);
      }
    }

    // Handle already-dead from conflict/disease marked earlier
    for (const ind of alive) {
      if (ind.is_dead && !ind.death_day) {
        ind.death_day = day;
        this.logEvent(day, 'death', `Individual died: ${ind.cause_of_death ?? 'unknown'}`, { individual_id: ind.id }, 1);
      }
    }

    // 11. Natural disaster
    if (this.worldState.natural_disaster) {
      this.processDisaster(this.worldState.natural_disaster, alive, day);
    }

    // 12. Language evolution
    const genCount = this.estimateGenerations();
    for (const ind of alive) {
      updateLanguageStage(ind, alive.length, genCount);
    }
    this.processLanguageLearning(alive);

    // 12b. Social learning: children near parents learn faster
    this.processFamilyLearning(alive, day, tickEvents);

    // 13. Technology discovery
    for (const ind of alive) {
      const discoveries = tryDiscoverTech(ind, this.discoveredTechs, this.worldState, day);
      for (const tech of discoveries) {
        tickEvents.push({ ...tech, type: 'discovery', individual_id: tech.discoverer_id });
        this.logEvent(day, 'technology', `Technology discovered: ${tech.tech_id}`, tech, 4);
      }
    }

    // 14. Belief formation & spread
    for (const ind of alive) {
      const beliefEvent = tryFormBelief(ind, this.discoveredBeliefs, this.discoveredTechs, this.worldState, day);
      if (beliefEvent) {
        tickEvents.push(beliefEvent);
        this.logEvent(day, 'belief', beliefEvent.description, beliefEvent, beliefEvent.importance === 'high' ? 4 : 2);
      }
    }
    updateBeliefSpread(alive, this.discoveredBeliefs, this.groups, day);
    for (const group of this.groups) {
      const ritualEvent = checkRitualEmergence(group, alive, this.discoveredBeliefs, day);
      if (ritualEvent) {
        tickEvents.push(ritualEvent);
        this.logEvent(day, 'ritual', ritualEvent.description ?? 'Ritual emerged', ritualEvent, 3);
      }
    }

    // 15. Culture
    const cultureEvents = processCultureTick(alive, this.groups, this.discoveredTechs, day);
    for (const ev of cultureEvents) {
      if (ev.importance !== 'low') this.logEvent(day, 'culture', ev.description ?? ev.meme_id, ev, 2);
    }
    tickEvents.push(...cultureEvents);

    // 16. Art
    const artEvents = processArtTick(alive, this.discoveredArts, this.discoveredTechs, this.worldState, day);
    for (const ev of artEvents) {
      tickEvents.push(ev);
      this.logEvent(day, 'art', ev.description, ev, ev.importance === 'high' ? 4 : 2);
    }
    for (const ind of alive) {
      applyArtEffects(ind, this.groups.find(g => g.member_ids?.includes(ind.id)), this.discoveredArts);
    }

    // 17. Architecture
    for (const settlement of this.settlements) {
      const { events: archEvents } = processArchitectureTick(settlement, alive, this.discoveredTechs, this.worldState, day);
      for (const ev of archEvents) {
        tickEvents.push(ev);
        this.logEvent(day, 'architecture', ev.description, ev, ev.importance === 'high' ? 4 : 2);
      }
    }
    // Create settlement for new groups
    for (const group of this.groups) {
      if (!this.settlements.find(s => s.group_id === group.id)) {
        this.settlements.push(createSettlement(group, this.worldState, day));
      }
    }

    // 18. Law & norms
    for (const group of this.groups) {
      const lawEvents = processLawTick(group, alive, this.discoveredTechs, day);
      for (const ev of lawEvents) {
        if (ev.importance !== 'low') this.logEvent(day, 'law', ev.description ?? ev.norm_id, ev, ev.importance === 'high' ? 4 : 2);
      }
      tickEvents.push(...lawEvents);
    }

    // 19. Astronomy
    const astroEvents = processAstronomyTick(alive, this.celestialObservations, this.astronomyKnowledge, this.discoveredTechs, day);
    for (const ev of astroEvents) {
      if (ev.importance !== 'low') this.logEvent(day, 'astronomy', ev.description, ev, ev.importance === 'high' ? 4 : 2);
    }

    // 20. Update human environmental impact
    this.worldState.human_impact = Math.min(1, alive.filter(i => !i.is_dead).length / 1000);

    // 21. Compute stats
    const currentAlive = [...this.population.values()].filter(i => !i.is_dead);
    const stats = this.computeStats(day, currentAlive);

    // 22. Checkpoint (fire-and-forget — never block the simulation loop)
    if (day % CHECKPOINT_INTERVAL === 0 && this.onCheckpoint) {
      this.onCheckpoint({
        sim_day: day,
        sim_year: Math.floor(day / 365),
        population_count: currentAlive.length,
        population_snapshot: currentAlive.map(compactIndividual),
        world_state: this.worldState,
        cultural_state: this.getCulturalState(currentAlive),
        tech_state: [...this.discoveredTechs],
        belief_state: [...this.discoveredBeliefs],
        art_state: [...this.discoveredArts],
        groups: this.groups.map(g => ({
          ...g,
          culture: g.culture ? [...g.culture] : [],
          norms: g.norms ? [...g.norms] : [],
        })),
        stats,
      }).catch(err => console.error('[SimulationEngine] checkpoint error:', err));
    }

    // 23. Broadcast
    if (this.onTick) {
      this.onTick({ day, stats, events: this.events.slice(-20) });
    }

    this.currentDay++;
    } catch (err) {
      console.error(`[SimulationEngine] tick() error on day ${this.currentDay}:`, err);
      this.currentDay++;
    }
  }

  moveIndividual(ind) {
    if (ind.is_dead) return;
    const ageYears = ind.age / 365;
    if (ageYears < 2) return; // handled by infant-follow logic

    // Base speed in degrees/day
    let speed;
    if (ageYears < 12)      speed = 0.012;
    else if (ageYears > 60) speed = 0.004;
    else                    speed = 0.02;

    if ((ind.satiation ?? 0.5) < 0.3) speed *= 1.6;
    if (ind.health?.pregnancy)        speed *= 0.4;

    // Persistent direction with slow random drift
    if (ind._moveAngle === undefined) ind._moveAngle = Math.random() * Math.PI * 2;
    ind._moveAngle += (Math.random() - 0.5) * 0.4;

    // ── Mate attraction: partners stay together ──────────────────────────────
    if (ind.social?.mate_id) {
      const mate = this.population.get(ind.social.mate_id);
      if (mate && !mate.is_dead) {
        const dx = (mate.x ?? 0) - (ind.x ?? 0);
        const dy = (mate.y ?? 0) - (ind.y ?? 0);
        const dist = Math.hypot(dx, dy);
        if (dist > 0.3) {
          const angleToMate = Math.atan2(dy, dx);
          // Blend current angle toward mate; stronger pull the further apart
          const pull = Math.min(1, dist / 3) * 0.7;
          ind._moveAngle = ind._moveAngle * (1 - pull) + angleToMate * pull;
        }
      }
    }

    // ── Child-parent attachment: ages 2–12 follow parent closely ────────────
    if (ageYears >= 2 && ageYears < 12) {
      const parent = this.population.get(ind.parent_1_id) ?? this.population.get(ind.parent_2_id);
      if (parent && !parent.is_dead) {
        const dx = (parent.x ?? 0) - (ind.x ?? 0);
        const dy = (parent.y ?? 0) - (ind.y ?? 0);
        const dist = Math.hypot(dx, dy);
        if (dist > 0.2) {
          const pull = Math.min(1, dist / 2) * 0.85;
          ind._moveAngle = Math.atan2(dy, dx) * pull + ind._moveAngle * (1 - pull);
        }
      }
    }

    // ── Adolescents (12–18): loosely attached to parents ────────────────────
    if (ageYears >= 12 && ageYears < 18) {
      const parent = this.population.get(ind.parent_1_id) ?? this.population.get(ind.parent_2_id);
      if (parent && !parent.is_dead) {
        const dx = (parent.x ?? 0) - (ind.x ?? 0);
        const dy = (parent.y ?? 0) - (ind.y ?? 0);
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          const pull = Math.min(1, dist / 8) * 0.4;
          ind._moveAngle = Math.atan2(dy, dx) * pull + ind._moveAngle * (1 - pull);
        }
      }
    }

    const step = speed * (0.6 + Math.random() * 0.8);
    ind.x = Math.max(-180, Math.min(180, (ind.x ?? 0) + Math.cos(ind._moveAngle) * step));
    ind.y = Math.max(-85,  Math.min(85,  (ind.y ?? 0) + Math.sin(ind._moveAngle) * step));
  }

  updatePhysiology(individual, resourcePressure) {
    if (!individual.health) individual.health = { hp: 0.8, calories: 0.6, hydration: 0.6 };
    const { health } = individual;

    // Satiation-based health update
    const satiationScore = individual.satiation ?? 0.5;
    if (satiationScore > 0.6) {
      health.hp = Math.min(1, health.hp + 0.001);
    } else if (satiationScore < 0.2) {
      health.hp = Math.max(0, health.hp - 0.003);
    }

    // Infection burden
    const infectionCount = individual.infections?.length ?? 0;
    if (infectionCount > 0) health.hp = Math.max(0, health.hp - 0.005 * infectionCount);

    // Psychological state affects physical health
    const stressLoad = individual.psychology?.stress_level ?? 0.3;
    health.hp = Math.max(0, health.hp - stressLoad * 0.0005);

    // Age-related decline
    const ageYears = individual.age / 365;
    if (ageYears > 50) health.hp = Math.max(0, health.hp - (ageYears - 50) * 0.00005);

    individual.health_score = health.hp;
  }

  processSocialInteractions(alive, day, tickEvents) {
    // Cap total pairs per tick to prevent O(n²) explosion at large populations
    const MAX_PAIRS = 300;
    let pairs = 0;
    outer: for (let i = 0; i < alive.length; i++) {
      const ind = alive[i];
      for (let j = i + 1; j < alive.length; j++) {
        if (pairs >= MAX_PAIRS) break outer;
        const other = alive[j];
        if (ind.is_dead || other.is_dead) continue;
        const dist = Math.hypot((ind.x ?? 0) - (other.x ?? 0), (ind.y ?? 0) - (other.y ?? 0));
        if (dist > SOCIAL_INTERACTION_RADIUS) continue;
        pairs++;

        // Mating attempt
        if (!ind.social?.mate_id && !other.social?.mate_id) {
          attemptMating(ind, other, day);
        }

        // Social bonding
        processBonding(ind, other, 'interaction');

        // Trade
        if (Math.random() < 0.05) {
          const tradeEvent = attemptTrade(ind, other, day);
          if (tradeEvent) tickEvents.push(tradeEvent);
        }

        // Disease spread
        if (ind.infections?.length && !other.infections?.length) {
          for (const inf of ind.infections) {
            spreadInfection(ind, other, inf.pathogen_id, day);
          }
        }
      }
    }
  }

  processLanguageLearning(alive) {
    for (const ind of alive) {
      if (!ind.language || ind.language.stage < 2) continue;
      const nearby = alive.filter(o =>
        o.id !== ind.id &&
        o.language?.stage > ind.language.stage &&
        Math.hypot((ind.x ?? 0) - (o.x ?? 0), (ind.y ?? 0) - (o.y ?? 0)) < SOCIAL_INTERACTION_RADIUS
      );
      if (nearby.length > 0) {
        const teacher = nearby[Math.floor(Math.random() * nearby.length)];
        learnFromTeacher(ind, teacher);
      }
    }
  }

  processFamilyLearning(alive, day, tickEvents) {
    for (const ind of alive) {
      const ageYears = ind.age / 365;
      if (ageYears < 3 || ageYears > 20) continue;

      const parent = this.population.get(ind.parent_1_id) ?? this.population.get(ind.parent_2_id);
      if (!parent || parent.is_dead) continue;

      const dist = Math.hypot((ind.x ?? 0) - (parent.x ?? 0), (ind.y ?? 0) - (parent.y ?? 0));
      if (dist > 2) continue; // must be physically close (< 2° ≈ 200 km)

      // Language learning from parent (faster than random encounter)
      if (parent.language?.stage > (ind.language?.stage ?? 0) && Math.random() < 0.1) {
        learnFromTeacher(ind, parent);
      }

      // Tech learning: parent's discovered techs boost child's discovery
      const discoveries = tryDiscoverTech(ind, this.discoveredTechs, this.worldState, day);
      for (const tech of discoveries) {
        tickEvents.push({ ...tech, type: 'discovery', individual_id: tech.discoverer_id });
        this.logEvent(day, 'technology', `Technology discovered: ${tech.tech_id}`, tech, 4);
      }
    }
  }

  processDisaster(disasters, alive, day) {
    const disasterList = Array.isArray(disasters) ? disasters : [disasters];
    for (const disaster of disasterList) {
      const { type, mortality_factor } = disaster;
      let deaths = 0;
      for (const ind of alive) {
        if (ind.is_dead) continue;
        if (Math.random() < mortality_factor) {
          ind.is_dead = true;
          ind.alive = false;
          ind.death_day = day;
          ind.death_cause = type;
          deaths++;
        }
      }
      if (deaths > 0) {
        this.logEvent(day, 'disaster', `${type} killed ${deaths} individuals`, { type, deaths, ...disaster }, 5);
      }
      this.worldState.recent_disaster = type;
    }
    // Clear after processing
    this.worldState.natural_disaster = null;
    // recent_disaster fades after a few days
    if (day % 10 === 0) this.worldState.recent_disaster = null;
  }

  estimateGenerations() {
    const oldest = Math.max(...[...this.population.values()].map(i => this.currentDay - (i.birth_day ?? 0)), 0);
    return Math.floor(oldest / (25 * 365));
  }

  getCulturalState(alive) {
    const langStages = {};
    for (const ind of alive) {
      const s = ind.language?.stage_name ?? 'pre-linguistic';
      langStages[s] = (langStages[s] ?? 0) + 1;
    }
    return { language_distribution: langStages };
  }

  computeStats(day, alive) {
    const ages = alive.map(i => getAge(i, day));
    const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const econStats = computeEconomicStats(alive);
    const psychStats = computePopulationPsychStats(alive);
    const healthStats = computeHealthStats(alive);

    return {
      day,
      year: Math.floor(day / 365),
      population: alive.length,
      total_ever: this.population.size,
      avg_age: Math.round(avgAge * 10) / 10,
      sex_ratio: alive.filter(i => i.sex === 'male').length / Math.max(1, alive.length),
      avg_intelligence: alive.reduce((s, i) => s + (i.phenotype?.fluid_intelligence ?? 0), 0) / Math.max(1, alive.length),
      technologies: this.discoveredTechs.size,
      beliefs: this.discoveredBeliefs.size,
      art_forms: this.discoveredArts.size,
      groups: this.groups.length,
      season: this.worldState.season,
      temperature: Math.round(this.worldState.temperature),
      food_abundance: Math.round(this.worldState.food_abundance * 100) / 100,
      water_abundance: Math.round((this.worldState.water_abundance ?? 0.7) * 100) / 100,
      biome: this.worldState.biome ?? 'mediterranean',
      has_disaster: !!(this.worldState.recent_disaster),
      births: Math.max(0, this.population.size - 2),
      deaths: Math.max(0, this.population.size - alive.length),
      word_count: new Set(alive.flatMap(i => Object.keys(i.language?.vocabulary ?? {}))).size,
      max_language_stage: Math.max(0, ...alive.map(i => i.language?.stage ?? 0)),
      mean_wealth: Math.round(econStats.mean_wealth * 100) / 100,
      gini: Math.round(econStats.gini * 100) / 100,
      happiness_index: Math.round(psychStats.happiness_index * 100) / 100,
      sick_rate: Math.round(healthStats.sick_rate * 100) / 100,
    };
  }

  logEvent(day, type, description, data = {}, importance = 1) {
    this.events.push({
      simulation_id: this.simId,
      sim_day: day,
      sim_year: Math.floor(day / 365),
      event_type: type,
      description,
      data,
      importance,
      created_at: new Date().toISOString(),
    });
    if (this.events.length > 1000) this.events.shift();
  }
}

function compactIndividual(ind) {
  return {
    id: ind.id,
    is_dead: ind.is_dead,
    sex: ind.sex,
    birth_day: ind.birth_day,
    death_day: ind.death_day,
    x: ind.x,
    y: ind.y,
    genome: ind.genome,
    phenotype: ind.phenotype,
    language_stage: ind.language?.stage,
    group_id: ind.group_id,
    parent_1_id: ind.parent_1_id,
    parent_2_id: ind.parent_2_id,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main Simulation Loop — each tick = 1 simulation day

import { rollDeath } from './biology/mortality.js';
import { checkReproduction } from './biology/reproduction.js';
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
const CHECKPOINT_INTERVAL = 365;

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
    this.onEvent = null;
    this.onCheckpoint = null;
    // Build phonological profile once — unique to this civilization's geography
    const ws = simulation.world_state ?? {};
    this.phonology = buildPhonology(ws.phonology_seed ?? 0, ws.biome ?? 'mediterranean');
  }

  load(individuals) {
    const groupMap = new Map();
    for (const ind of individuals) {
      if (!ind.inventory) ind.inventory = initializeInventory();
      if (!ind.psychology) initializePsychology(ind);
      if (!ind.epigenome) initializeEpigenome(ind);
      // Beliefs must be a Set in-memory; DB stores as array (Set doesn't JSON-serialize)
      ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);
      this.population.set(ind.id, ind);
      // Reconstruct groups from persisted social.group_id
      if (ind.group_id && !ind.is_dead) {
        if (!groupMap.has(ind.group_id)) {
          groupMap.set(ind.group_id, {
            id: ind.group_id, name: null, founder_id: null, leader_id: null,
            member_ids: [],
            territory: { x: ind.x ?? 0, y: ind.y ?? 0, radius: 0.3 },
            alliances: [], rival_ids: [],
            internal_tension: 0, prestige: 0.1, founded_day: 0,
          });
        }
        groupMap.get(ind.group_id).member_ids.push(ind.id);
      }
    }
    this.groups = [...groupMap.values()];
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

    // 4c. Mating urge — biological drive, builds daily
    for (const ind of alive) {
      this.updateMatingUrge(ind);
    }

    // 4b. Movement — compute band centroid once, then move each individual
    if (alive.length > 0) {
      this._bandCentroid = {
        x: alive.reduce((s, i) => s + (i.x ?? 0), 0) / alive.length,
        y: alive.reduce((s, i) => s + (i.y ?? 0), 0) / alive.length,
      };
    } else {
      this._bandCentroid = { x: this.worldState.longitude ?? 0, y: this.worldState.latitude ?? 0 };
    }
    for (const ind of alive) {
      this.moveIndividual(ind);
    }
    // Co-movement: children physically travel with their primary caregiver.
    // Snap strength is derived from the caregiver's parental_care phenotype (OXTR_01 x AVPR1A_01),
    // so this is genetics-driven — not a scripted rule. Founders pass high parental_care to
    // children via combineGametes; subsequent generations inherit it the same way.
    for (const ind of alive) {
      const ageYears = ind.age / 365;
      if (ageYears >= 15) continue; // teens move independently (centroid cohesion handles them)

      const p1 = this.population.get(ind.parent_1_id);
      const p2 = this.population.get(ind.parent_2_id);
      const p1care = (p1 && !p1.is_dead) ? (p1.phenotype?.parental_care ?? 0.5) : -1;
      const p2care = (p2 && !p2.is_dead) ? (p2.phenotype?.parental_care ?? 0.5) : -1;
      const caregiver = p1care >= p2care && p1care >= 0 ? p1
                      : p2care > p1care  && p2care >= 0 ? p2
                      : null;
      if (!caregiver) continue;

      const parentCare = caregiver.phenotype?.parental_care ?? 0.5;
      // snapStr: nearly 1.0 for infants, tapers to ~0 at age 14, scales with parental_care
      const ageBlend = Math.min(1, ageYears / 14);
      const snapStr  = Math.max(0, parentCare * (1 - ageBlend * 0.9));
      if (snapStr < 0.05) continue;

      const scatter = 0.003 + ageYears * 0.006;
      ind.x = caregiver.x * snapStr + ind.x * (1 - snapStr) + (Math.random() - 0.5) * scatter;
      ind.y = caregiver.y * snapStr + ind.y * (1 - snapStr) + (Math.random() - 0.5) * scatter;
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
      const p1Name = p1?.phenotype?.name ?? (p1 ? `${p1.sex === 'male' ? '♂' : '♀'}-${p1.id.slice(-4).toUpperCase()}` : '?');
      const p2Name = p2?.phenotype?.name ?? (p2 ? `${p2.sex === 'male' ? '♂' : '♀'}-${p2.id.slice(-4).toUpperCase()}` : '?');
      const birthLabel = nb.is_twin ? `Twin born: ${nbLabel}` : `Born: ${nbLabel}`;
      this.logEvent(day, 'birth', `${birthLabel} (${p1Name} & ${p2Name})`, { individual_id: nb.id, name: nbLabel, parent_1_name: p1Name, parent_2_name: p2Name, is_twin: nb.is_twin ?? false }, nb.is_twin ? 2 : 1);
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
        tickEvents.push({ type: 'death_of_kin', individual_id: ind.id, day });
        const deadName = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        this.logEvent(day, 'death', `${deadName} died: ${cause}`, { individual_id: ind.id, cause, name: deadName }, 1);
      }
    }

    // Handle already-dead from conflict/disease marked earlier
    for (const ind of alive) {
      if (ind.is_dead && !ind.death_day) {
        ind.death_day = day;
        const deadName2 = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        this.logEvent(day, 'death', `${deadName2} died: ${ind.death_cause ?? ind.cause_of_death ?? 'unknown'}`, { individual_id: ind.id, name: deadName2 }, 1);
      }
    }

    // 11. Weather event logging — log when weather type changes
    if (this.worldState.current_weather !== this._lastLoggedWeather) {
      const w = this.worldState.current_weather;
      if (w && w !== 'clear') {
        const WEATHER_NAMES = {
          rain: 'Yağmur', heavy_rain: 'Şiddetli yağmur', snow: 'Kar',
          blizzard: 'Tipi fırtınası', storm: 'Fırtına',
          heat_wave: 'Sıcak hava dalgası', drought: 'Kuraklık',
        };
        const label = WEATHER_NAMES[w] ?? w;
        const pct = Math.round((this.worldState.weather_intensity ?? 0.5) * 100);
        const severity = (w === 'blizzard' || w === 'drought') ? 4 : (w === 'storm' || w === 'heavy_rain') ? 3 : 2;
        this.logEvent(day, 'weather', `${label} başladı (%${pct} şiddet, ${this.worldState.weather_days_remaining} gün)`, { weather: w, intensity: this.worldState.weather_intensity }, severity);
      }
      this._lastLoggedWeather = this.worldState.current_weather;
    }

    // 12. Language evolution
    const genCount = this.estimateGenerations();
    for (const ind of alive) {
      const langResult = updateLanguageStage(ind, alive.length, genCount, ind.group_id ?? 'global');
      if (langResult?.upgraded) {
        const name = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        const stageName = langResult.stageName ?? ind.language?.stage_name ?? 'language';
        tickEvents.push({
          type: 'language',
          individual_id: ind.id,
          day,
          importance: langResult.newStage >= 4 ? 'high' : 'medium',
          stage: langResult.newStage,
          stage_name: stageName,
          name,
        });
        this.logEvent(
          day,
          'language',
          `${name} language stage advanced to ${stageName}`,
          { individual_id: ind.id, name, stage: langResult.newStage, stage_name: stageName },
          langResult.newStage >= 4 ? 3 : 2
        );
      }
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

    let speed;
    if (ageYears < 12)      speed = 0.008;
    else if (ageYears > 60) speed = 0.003;
    else                    speed = 0.010;

    speed *= (this.worldState.weather_move_mult ?? 1.0);
    if (ind.health?.pregnancy) speed *= 0.4;

    // ── Hayatta kalma stresi: temel ihtiyaçlar ne kadar karşılanmıyor ────────
    const cal = ind.health?.calories  ?? 0.7;
    const hyd = ind.health?.hydration ?? 0.7;
    const survivalStress = Math.min(1, Math.max(0,
      Math.max((0.45 - cal) / 0.45, (0.35 - hyd) / 0.35)
    ));
    if (survivalStress > 0.15) speed *= (1 + survivalStress * 0.9);

    if (ind._moveAngle === undefined) ind._moveAngle = Math.random() * Math.PI * 2;
    ind._moveAngle += (Math.random() - 0.5) * 0.25;

    if (ind.is_founder) {
      // ── Kurucular: sabit yuva çıpası ──────────────────────────────────────
      speed *= 0.08;
      const homeX = ind.home_x ?? (this.worldState.longitude ?? 0);
      const homeY = ind.home_y ?? (this.worldState.latitude  ?? 0);
      const hdx   = homeX - (ind.x ?? 0);
      const hdy   = homeY - (ind.y ?? 0);
      if (Math.hypot(hdx, hdy) > 0.005) {
        ind._moveAngle = Math.atan2(hdy, hdx) * 0.97 + ind._moveAngle * 0.03;
      }
    } else {
      // ── Bant uyumu: centroide çekim ──────────────────────────────────────
      const cx      = this._bandCentroid?.x ?? (this.worldState.longitude ?? 0);
      const cy      = this._bandCentroid?.y ?? (this.worldState.latitude  ?? 0);
      const bdx     = cx - (ind.x ?? 0);
      const bdy     = cy - (ind.y ?? 0);
      const bdist   = Math.hypot(bdx, bdy);
      const freeZone    = 0.3 + survivalStress * 1.2;
      const cohesionStr = Math.max(0.15, 0.88 - survivalStress * 0.65);
      if (bdist > freeZone) {
        const pull = Math.min(1, (bdist - freeZone) / 2) * cohesionStr;
        ind._moveAngle = Math.atan2(bdy, bdx) * pull + ind._moveAngle * (1 - pull);
      }

      // ── Hafıza temelli yiyecek arama ──────────────────────────────────────
      if ((ind.satiation ?? 0.5) > 0.72) {
        ind._goodFoodAngle = ind._moveAngle;
      } else if (survivalStress > 0.35 && ind._goodFoodAngle !== undefined) {
        const memPull = Math.min(0.55, survivalStress * 0.6);
        ind._moveAngle = ind._goodFoodAngle * memPull + ind._moveAngle * (1 - memPull);
      }

      // ── Çiftleşme dürtüsü: temel ihtiyaçlar karşılandığında devreye girer ─
      if (cal > 0.38 && hyd > 0.32 && !ind.health?.pregnancy
          && ageYears >= 13 && (ind.mating_urge ?? 0) > 0.65) {
        const oppSex = ind.sex === 'male' ? 'female' : 'male';
        let nearestDist = 10;
        let nearestPartner = null;
        for (const other of this.population.values()) {
          if (other.is_dead || other.id === ind.id || other.sex !== oppSex) continue;
          const otherAge = other.age / 365;
          if (otherAge < 13 || otherAge > 65 || other.health?.pregnancy) continue;
          const d = Math.hypot((other.x ?? 0) - (ind.x ?? 0), (other.y ?? 0) - (ind.y ?? 0));
          if (d < nearestDist) { nearestDist = d; nearestPartner = other; }
        }
        if (nearestPartner) {
          const pdx = (nearestPartner.x ?? 0) - (ind.x ?? 0);
          const pdy = (nearestPartner.y ?? 0) - (ind.y ?? 0);
          const urgePull = Math.min(0.72, ((ind.mating_urge - 0.65) / 0.35) * 0.65);
          ind._moveAngle = Math.atan2(pdy, pdx) * urgePull + ind._moveAngle * (1 - urgePull);
        }
      }
    }

    const step = speed * (0.5 + Math.random() * 0.8);
    ind.x = Math.max(-180, Math.min(180, (ind.x ?? 0) + Math.cos(ind._moveAngle) * step));
    ind.y = Math.max(-85,  Math.min(85,  (ind.y ?? 0) + Math.sin(ind._moveAngle) * step));

    // ── Kurucular: sert konum sınırı ──────────────────────────────────────────
    if (ind.is_founder && ind.home_x !== undefined) {
      const dx   = ind.x - ind.home_x;
      const dy   = ind.y - ind.home_y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.04) {
        ind.x = ind.home_x + (dx / dist) * 0.04;
        ind.y = ind.home_y + (dy / dist) * 0.04;
      }
    }
  }

  updatePhysiology(individual, resourcePressure) {
    if (!individual.health) individual.health = { hp: 0.8, calories: 0.6, hydration: 0.6 };
    const { health } = individual;
    // Founders stay perfectly healthy until age 60 — no sickness, injuries, hunger damage
    const ageYears = individual.age / 365;
    if (individual.is_founder && ageYears < 60) {
      health.hp = 1.0; health.calories = 1.0; health.hydration = 1.0;
      individual.health_score = 1.0; individual.satiation = 1.0;
      return;
    }

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
    if (ageYears > 50) health.hp = Math.max(0, health.hp - (ageYears - 50) * 0.00005);

    // Weather health effects
    const hpDelta = this.worldState.weather_hp_delta ?? 0;
    if (hpDelta < 0) {
      const ph = individual.phenotype ?? {};
      const endurance     = ph.physical_endurance  ?? 0.5;
      const resilience    = ph.stress_resilience   ?? 0.4;
      const metabolism    = ph.metabolism          ?? 0.5;
      // Cold tolerance (0–1): high endurance + resilience helps
      const coldTolerance = endurance * 0.5 + resilience * 0.3 + 0.2;
      // Heat tolerance (0–1): high metabolism + endurance helps
      const heatTolerance = metabolism * 0.3 + endurance * 0.4 + 0.3;

      if (this.worldState.weather_cold_risk) {
        const temp = this.worldState.temperature ?? 10;
        // Damage scales with how far below the individual's cold threshold the temp drops
        const coldThreshold = coldTolerance * 15 - 5; // roughly -5°C to +10°C range
        if (temp < coldThreshold) {
          const coldStress = Math.min(1, (coldThreshold - temp) / 30);
          health.hp = Math.max(0, health.hp + hpDelta * coldStress * (1.2 - coldTolerance));
        }
      } else if (this.worldState.weather_heat_risk) {
        const temp = this.worldState.temperature ?? 25;
        const heatThreshold = 28 + heatTolerance * 12; // roughly 28–40°C range
        if (temp > heatThreshold) {
          const heatStress = Math.min(1, (temp - heatThreshold) / 20);
          health.hp = Math.max(0, health.hp + hpDelta * heatStress * (1.2 - heatTolerance));
        }
      } else {
        // Non-temperature weather (storm, heavy_rain, drought) — resilience reduces impact
        health.hp = Math.max(0, health.hp + hpDelta * (1.0 - resilience * 0.5));
      }
    }

    individual.health_score = health.hp;
  }

  updateMatingUrge(ind) {
    if (ind.is_dead) return;
    const ageYears = ind.age / 365;

    // Ergenlik öncesi veya çok yaşlı — dürtü yok
    if (ageYears < 13 || ageYears > 72) { ind.mating_urge = 0; return; }

    // Hamilelikte sıfır
    if (ind.health?.pregnancy) { ind.mating_urge = 0; return; }

    if (ind.mating_urge === undefined) ind.mating_urge = Math.random() * 0.4;

    // Günlük birikim hızı
    let rate = 0.006; // ~170 günde 1'e ulaşır

    // Yaş etkisi: 18-35 en yüksek, sonra yavaşlar
    if (ageYears < 18)       rate *= 0.55;
    else if (ageYears < 35)  rate *= 1.2;
    else if (ageYears > 55)  rate *= 0.55;
    else if (ageYears > 65)  rate *= 0.25;

    // Sağlık etkisi: aç veya hasta → dürtü azalır
    const hp  = ind.health?.hp       ?? 0.8;
    const cal = ind.health?.calories ?? 0.7;
    if (hp < 0.35 || cal < 0.25)        rate *= 0.15;
    else if (hp > 0.7 && cal > 0.6)     rate *= 1.1;

    // Mevsim: ilkbahar ve yaz biraz artırır
    const season = this.worldState.season ?? 'spring';
    if (season === 'spring' || season === 'summer') rate *= 1.15;

    // Bireysel fenotip: fertilite yüksekse dürtü de yüksek
    const fertility = ind.phenotype?.fertility ?? 0.5;
    rate *= (0.65 + fertility * 0.7);

    // Psikolojik stres dürtüyü bastırır
    const stress = ind.psychology?.stress_level ?? 0.3;
    if (stress > 0.7) rate *= 0.4;

    ind.mating_urge = Math.min(1, (ind.mating_urge ?? 0) + rate);
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

      // Observational learning: children near high-care parents develop stronger parental bonding.
      // This is the "non-founder" transmission pathway — purely genetic inheritance + developmental
      // plasticity, no scripted drive. The phenotypic boost here stays with the individual for life
      // and shapes how they treat THEIR children (who are then kept close via the co-movement pass).
      if (ageYears >= 2 && ageYears < 15 && dist < 1.5 && ind.phenotype) {
        const parentCare = parent.phenotype?.parental_care ?? 0.5;
        if (parentCare > 0.55) {
          const currentCare = ind.phenotype.parental_care ?? 0.5;
          const gap = parentCare - currentCare;
          // Only pulls upward toward the parent's level — can't exceed 92% (some variation preserved)
          if (gap > 0) {
            ind.phenotype.parental_care = Math.min(0.92, currentCare + gap * 0.00008);
          }
          // Prime OXTR epigenetic mark (heritable for 2 generations via inheritEpigenome)
          if (ind.epigenome?.OXTR_METHYL) {
            ind.epigenome.OXTR_METHYL.methylation = Math.max(
              0.22,
              ind.epigenome.OXTR_METHYL.methylation - 0.000015
            );
          }
        }
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
      weather: this.worldState.current_weather ?? 'clear',
      weather_intensity: Math.round((this.worldState.weather_intensity ?? 0.5) * 100) / 100,
      births: Math.max(0, this.population.size - 2),
      deaths: Math.max(0, this.population.size - alive.length),
      word_count: new Set(alive.flatMap(i => Object.keys(i.language?.vocabulary ?? {}))).size,
      max_language_stage: Math.max(0, ...alive.map(i => i.language?.stage ?? 0)),
      mean_wealth: Math.round(econStats.mean_wealth * 100) / 100,
      gini: Math.round(econStats.gini * 100) / 100,
      happiness_index: Math.round(psychStats.happiness_index * 100) / 100,
      sick_rate: Math.round(healthStats.sick_rate * 100) / 100,
      epigenetics: (() => {
        const loci = ['HPA_AXIS', 'BDNF_PROMOTER', 'MAOA_REGULATION', 'LEPTIN_RESIST', 'OXTR_METHYL', 'IMMUNE_PRIMING'];
        const result = {};
        for (const id of loci) {
          const vals = alive.map(i => i.epigenome?.[id]?.methylation ?? 0.5);
          result[id] = Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length) * 100) / 100;
        }
        return result;
      })(),
      age_pyramid: (() => {
        const bands = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65+'];
        const counts = {};
        for (const b of bands) counts[b] = { male: 0, female: 0 };
        for (let idx = 0; idx < alive.length; idx++) {
          const age = Math.floor(ages[idx]);
          const b = age >= 65 ? '65+' : `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}`;
          if (counts[b]) counts[b][alive[idx].sex === 'male' ? 'male' : 'female']++;
        }
        return bands.map(b => ({ group: b, male: counts[b].male, female: counts[b].female }));
      })(),
      death_stats: (() => {
        const dead = [...this.population.values()].filter(i => i.is_dead && i.death_day != null && i.birth_day != null);
        if (!dead.length) return { count: 0, avg_age: null, infant_deaths: 0, child_deaths: 0, causes: {} };
        const deathAges = dead.map(i => (i.death_day - i.birth_day) / 365);
        const avgDeathAge = deathAges.reduce((a, b) => a + b, 0) / dead.length;
        const infantDeaths = deathAges.filter(a => a < 1).length;
        const childDeaths  = deathAges.filter(a => a >= 1 && a < 15).length;
        const causes = {};
        for (const i of dead) {
          const c = i.death_cause ?? i.cause_of_death ?? 'unknown';
          causes[c] = (causes[c] ?? 0) + 1;
        }
        return { count: dead.length, avg_age: Math.round(avgDeathAge * 10) / 10, infant_deaths: infantDeaths, child_deaths: childDeaths, causes };
      })(),
      founders: (() => {
        const all = [...this.population.values()].filter(i => i.is_founder);
        return all.map(i => ({
          sex: i.sex,
          age: Math.round(getAge(i, day)),
          alive: !i.is_dead,
          note: 'Kurucular tasarım gereği sabit konumdadır — aile bandının çıpasıdır',
        }));
      })(),
      movement_context: (() => {
        if (!alive.length) return null;
        const avgUrge   = alive.reduce((s, i) => s + (i.mating_urge ?? 0), 0) / alive.length;
        const avgCal    = alive.reduce((s, i) => s + (i.health?.calories ?? 0.7), 0) / alive.length;
        const avgHyd    = alive.reduce((s, i) => s + (i.health?.hydration ?? 0.7), 0) / alive.length;
        const cx = this._bandCentroid?.x ?? 0;
        const cy = this._bandCentroid?.y ?? 0;
        const avgDist   = alive.reduce((s, i) => s + Math.hypot((i.x??0)-cx, (i.y??0)-cy), 0) / alive.length;
        const dominant  = avgCal < 0.38 ? 'yiyecek arama' : avgHyd < 0.32 ? 'su arama' : avgUrge > 0.65 ? 'çiftleşme arayışı' : 'bant uyumu (birlikte kalma)';
        return {
          dominant_drive: dominant,
          avg_mating_urge: Math.round(avgUrge * 100) / 100,
          avg_calories: Math.round(avgCal * 100) / 100,
          avg_hydration: Math.round(avgHyd * 100) / 100,
          avg_dist_from_center_deg: Math.round(avgDist * 100) / 100,
        };
      })(),
    };
  }

  logEvent(day, type, description, data = {}, importance = 1) {
    const event = {
      simulation_id: this.simId,
      sim_day: day,
      sim_year: Math.floor(day / 365),
      event_type: type,
      description,
      data,
      importance,
      created_at: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > 1000) this.events.shift();
    if (this.onEvent) {
      Promise.resolve(this.onEvent(event)).catch(err => {
        console.error('[SimulationEngine] event persist error:', err);
      });
    }
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

// Main Simulation Loop — each tick = 1 simulation day

import { rollDeath } from './biology/mortality.js';
import { checkReproduction } from './biology/reproduction.js';
import { computeInbreedingCoefficient } from './biology/genome.js';
import { updateWorldState, computeResourcePressure } from './environment/environmentEngine.js';
import { buildPhonology } from './language/nameEngine.js';
import { updateLanguageStage, learnFromTeacher, updateFoxp2Expression, tryAcquireWordFromEnvironment, generateProtoWord, CORE_CONCEPTS } from './language/languageEngine.js';
import { TECH_TREE, learnTechFromObservation } from './technology/technologyEngine.js';
import { getAge, LIFE_STAGE } from './biology/individual.js';
import { processGroupDynamics, assignGroupRoles } from './social/socialEngine.js';
import { gatherResources, consumeResources, produceGoods, attemptTrade, computeEconomicStats, initializeInventory } from './economy/economyEngine.js';
import { tryFormBelief, updateBeliefSpread, checkRitualEmergence } from './belief/beliefEngine.js';
import { processCultureTick } from './culture/cultureEngine.js';
import { processArtTick, applyArtEffects } from './art/artEngine.js';
import { processArchitectureTick, createSettlement, checkSettlementOvercrowding } from './architecture/architectureEngine.js';
import { processLawTick } from './law/lawEngine.js';
import { processMicrobiomeTick, spreadInfection, updateGutMicrobiome, computeHealthStats } from './microbiome/microbiomeEngine.js';
import { initializePsychology, updateMentalState, processBonding, computePopulationPsychStats } from './psychology/psychologyEngine.js';
import { initializeEpigenome, updateEpigenome } from './epigenetics/epigeneticsEngine.js';
import { processAstronomyTick, getAstronomyBonus } from './astronomy/astronomyEngine.js';
import { isOnLand } from '../utils/landMask.js';
import { computeSocialOrder } from './law/lawEngine.js';
import { updateConsciousness } from './consciousness/consciousnessEngine.js';
import { selectAction } from './agent/decisionEngine.js';
import { accumulateExperience, checkTechEmergence } from './agent/activityEngine.js';

// 2 degrees ≈ 220 km — more realistic for prehistoric band territory; was 5 (~500 km)
const SOCIAL_INTERACTION_RADIUS = 2;
const CHECKPOINT_INTERVAL = 90;

// Spatial grid for O(n) neighbour lookups instead of O(n²) full scans.
// Cell size equals the interaction radius so a 3×3 neighbourhood covers all
// pairs within R (diagonal reach = √2×R > R, no false negatives possible).
function buildSpatialGrid(individuals, cellSize = SOCIAL_INTERACTION_RADIUS) {
  const grid = new Map();
  for (const ind of individuals) {
    const key = `${Math.floor((ind.x ?? 0) / cellSize)},${Math.floor((ind.y ?? 0) / cellSize)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(ind);
  }
  return grid;
}

function getNeighbours(ind, grid, cellSize = SOCIAL_INTERACTION_RADIUS) {
  const cx = Math.floor((ind.x ?? 0) / cellSize);
  const cy = Math.floor((ind.y ?? 0) / cellSize);
  const result = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = grid.get(`${cx + dx},${cy + dy}`);
      if (bucket) result.push(...bucket);
    }
  }
  return result.filter(o => o.id !== ind.id);
}

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
    this._todayBirths = 0;
    this._todayDeaths = 0;
    this.totalBirths = 0;
    this.totalDeaths = 0;

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
      // known_techs must be a Set in-memory; restore from persisted array
      ind.known_techs = new Set(Array.isArray(ind.known_techs) ? ind.known_techs : []);
      // Prevent re-logging deaths that already happened before this restart
      if (ind.is_dead) ind._death_logged = true;
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

    // Restore counters from loaded state — otherwise resumed simulations show 0.
    this.totalDeaths = [...this.population.values()].filter(i => i.is_dead).length;
    this.totalBirths = [...this.population.values()].filter(i => !i.is_founder).length;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    let ticksSinceBroadcast = 0;
    while (this.running) {
      // Throttle broadcast frequency at high speeds to keep all panels in sync
      const spd = this.speedMultiplier;
      const broadcastEvery = spd <= 20 ? 1 : spd <= 50 ? 2 : spd <= 100 ? 5 : 10;
      this._broadcastThisTick = (ticksSinceBroadcast % broadcastEvery === 0);
      ticksSinceBroadcast++;

      await this.tick();

      // Always yield to the event loop so pause/speed changes take effect immediately.
      if (spd < 100) {
        await sleep(1000 / spd);
      } else {
        // At max speed we still yield every tick so HTTP actions (speed/pause/terminate)
        // can be processed promptly instead of waiting behind a long burst.
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  pause() { this.running = false; }
  resume() { this.start(); }

  async tick() {
    if (!this.running) return;
    try {
    this._todayBirths = 0;
    this._todayDeaths = 0;
    const day = this.currentDay;
    for (const ind of this.population.values()) {
      ind.alive = !ind.is_dead;
      ind.age = day - (ind.birth_day ?? 0);
    }
    const alive = [...this.population.values()].filter(i => !i.is_dead);
    if (alive.length === 0) { this.running = false; return; }
    await new Promise(resolve => setImmediate(resolve));
    const tickEvents = [];
    // Built once per tick; used by tech observation, language learning, and social interactions.
    const spatialGrid = buildSpatialGrid(alive);

    // 0. Each individual selects their action for this tick based on their own needs.
    for (const ind of alive) {
      ind._currentAction = selectAction(ind, this.worldState);
    }

    // 0b. Set age & life_stage on every individual (required by all engines)
    for (const ind of alive) {
      ind.age = day - (ind.birth_day ?? 0);
      const ay = ind.age / 365;
      ind.life_stage = ay < LIFE_STAGE.CHILD.minAge ? 'INFANT'
        : ay < LIFE_STAGE.ADOLESCENT.minAge ? 'CHILD'
        : ay < LIFE_STAGE.ADULT.minAge ? 'ADOLESCENT'
        : ay < LIFE_STAGE.ELDER.minAge ? 'ADULT' : 'ELDER';
    }

    // 1. Update world environment
    this.worldState.alive_count = alive.length;
    updateWorldState(this.worldState, day);
    const resourcePressure = computeResourcePressure(this.worldState, alive.length);

    // 1b. Natural disaster check — low-probability random events per biome
    if (alive.length >= 4 && !this.worldState.natural_disaster) {
      const disasterChance = this._naturalDisasterProbability(this.worldState);
      if (Math.random() < disasterChance) {
        const disaster = this._pickNaturalDisaster(this.worldState);
        if (disaster) {
          this.worldState.natural_disaster = disaster;
          this.logEvent(day, 'disaster', `Natural disaster: ${disaster.type}`, disaster, 5);
        }
      }
    }
    if (this.worldState.natural_disaster) {
      this.processDisaster(this.worldState.natural_disaster, alive, day);
    }
    // recent_disaster fades after 120 days (meaningful grace period for belief formation)
    if (this.worldState.recent_disaster && day - (this.worldState.recent_disaster_day ?? 0) > 120) {
      this.worldState.recent_disaster = null;
    }

    // 2. Epigenetics & microbiome daily update
    for (const ind of alive) {
      updateEpigenome(ind, this.worldState, day);
      updateGutMicrobiome(ind, this.worldState);
    }

    // 2b. Apply astronomy bonuses to world state (farming efficiency, navigation)
    const astroBonus = getAstronomyBonus(this.astronomyKnowledge);
    this.worldState.farming_bonus = astroBonus.farming_efficiency ?? 0;
    this.worldState.navigation_bonus = astroBonus.navigation ?? 0;

    // 2c. Soil health — derived from average microbiome diversity
    const avgMBDiv = alive.reduce((s, i) => s + (i.microbiome?.diversity ?? 0.5), 0) / Math.max(1, alive.length);
    this.worldState.soil_health = 0.3 + avgMBDiv * 0.7;

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
    // Pre-cache fertile individuals once per tick to avoid O(N²) mating search
    this._fertileMales = alive.filter(i => i.sex === 'male' && i.age / 365 >= 15 && i.age / 365 <= 65 && !i.health?.pregnancy);
    this._fertileFemales = alive.filter(i => i.sex === 'female' && i.age / 365 >= 15 && i.age / 365 <= 50 && !i.health?.pregnancy);
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

    // 4c. Tüm korkular zamanla azalır (unutma / yeniden uyum)
    for (const ind of alive) {
      if ((ind._waterFear ?? 0) > 0) {
        ind._waterFear = Math.max(0, ind._waterFear - 0.0005);   // ~2000 gün
      }
      if (ind._fears) {
        for (const key of Object.keys(ind._fears)) {
          if (ind._fears[key] > 0) {
            // Afet/yırtıcı korkusu daha yavaş azalır; kıtlık/hastalık daha hızlı
            const decayRate = (key === 'predator' || key === 'disaster') ? 0.0003
                            : (key === 'scarcity' || key === 'infection')  ? 0.001
                            : 0.0005;
            ind._fears[key] = Math.max(0, ind._fears[key] - decayRate);
          }
        }
      }
    }

    // 4d. Su deneyimi ve gözlemsel yüzme öğrenimi
    // _waterExperience: 0→1 arası birikimli değer, genomda değil bellekte.
    // Suda hayatta kalan bireyler deneyim kazanır; ebeveynini izleyen çocuklar
    // gözlemsel öğrenmeyle bu deneyimin küçük bir kısmını edinir.
    for (const ind of alive) {
      if (ind._inWater) {
        // Her suda geçen tick'te biraz deneyim kazanır (çok yavaş)
        ind._waterExperience = Math.min(1, (ind._waterExperience ?? 0) + 0.002);
      }
    }
    // Gözlemsel öğrenme: ebeveyn sudan yeni çıktıysa (önceki tick'te suda, şimdi değil),
    // yakındaki çocukları bunu görür ve bir miktar deneyim edinir.
    for (const ind of alive) {
      const wasInWater = ind._wasInWater ?? false;
      const nowOnLand  = !ind._inWater;
      if (wasInWater && nowOnLand) {
        // Bu birey sudan çıktı — yakındaki gençler gözlem kazanır (spatial grid ile O(n·k))
        for (const other of getNeighbours(ind, spatialGrid)) {
          if (other.id === ind.id) continue;
          const otherAge = (other.age ?? 0) / 365;
          if (otherAge > 20) continue;
          const dist = Math.hypot((other.x ?? 0) - (ind.x ?? 0), (other.y ?? 0) - (ind.y ?? 0));
          if (dist > 1.5) continue;
          const isChild = other.parent_1_id === ind.id || other.parent_2_id === ind.id;
          const gain = isChild ? 0.003 : 0.0005;
          other._waterExperience = Math.min(1, (other._waterExperience ?? 0) + gain);
        }
      }
      ind._wasInWater = ind._inWater;
    }

    // 5. Psychology — mental state
    for (const ind of alive) {
      updateMentalState(ind, tickEvents, this.worldState, day);
    }

    // 5b. Consciousness update — see engines/consciousness/consciousnessEngine.js
    for (const ind of alive) {
      updateConsciousness(ind);
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
    this.processSocialInteractions(alive, day, tickEvents, spatialGrid);

    // 8. Reproduction — pass community lang stage + phonology for era-appropriate naming
    const communityLangStage = alive.length ? Math.max(...alive.map(i => i.language?.stage ?? 0)) : 0;
    const newborns = checkReproduction(this.population, day, this.simId, communityLangStage, this.phonology);
    for (const nb of newborns) {
      nb.inventory = initializeInventory();
      nb.beliefs = new Set(); // must be Set in-memory
      nb.known_techs = new Set();
      initializePsychology(nb);
      const p1 = this.population.get(nb.parent_1_id);
      const p2 = this.population.get(nb.parent_2_id);
      // Yenidoğan ebeveynin grubunu miras alır — yoksa izolasyon stresi ve bilinç cezası oluşur
      const parentGroupId = p1?.group_id ?? p2?.group_id ?? null;
      if (parentGroupId) {
        nb.group_id = parentGroupId;
        if (nb.social) nb.social.group_id = parentGroupId;
        const parentGroup = this.groups.find(g => g.id === parentGroupId);
        if (parentGroup && !parentGroup.member_ids.includes(nb.id)) {
          parentGroup.member_ids.push(nb.id);
        }
      }
      this.population.set(nb.id, nb);
      nb.inbreeding_coeff = computeInbreedingCoefficient(nb, this.population);
      this._todayBirths++;
      this.totalBirths++;
      tickEvents.push({ type: 'birth', individual_id: nb.id, day, importance: 'low' });
      const nbLabel = nb.phenotype?.name ?? `${nb.sex === 'male' ? '♂' : '♀'}-${nb.id.slice(-4).toUpperCase()}`;
      const p1Name = p1?.phenotype?.name ?? (p1 ? `${p1.sex === 'male' ? '♂' : '♀'}-${p1.id.slice(-4).toUpperCase()}` : '?');
      const p2Name = p2?.phenotype?.name ?? (p2 ? `${p2.sex === 'male' ? '♂' : '♀'}-${p2.id.slice(-4).toUpperCase()}` : '?');
      const birthLabel = nb.is_twin ? `Twin born: ${nbLabel}` : `Born: ${nbLabel}`;
      this.logEvent(day, 'birth', `${birthLabel} (${p1Name} & ${p2Name})`, { individual_id: nb.id, name: nbLabel, parent_1_name: p1Name, parent_2_name: p2Name, is_twin: nb.is_twin ?? false }, nb.is_twin ? 2 : 1);
      // Log death event for newborns lost to birth complications
      if (nb.is_dead) {
        nb._death_logged = true;
        this._todayDeaths++;
        this.totalDeaths++;
        this.logEvent(day, 'death', `${nbLabel} died: birth_complications`, { individual_id: nb.id, cause: 'birth_complications', name: nbLabel }, 1);
      }
    }

    // 9. Microbiome & disease outbreaks
    const microEvents = processMicrobiomeTick(alive, this.worldState, day);
    tickEvents.push(...microEvents);
    for (const ev of microEvents) {
      this.logEvent(day, 'epidemic', ev.description, ev, ev.importance === 'high' ? 5 : 3);
    }

    // 10. Death checks
    if (!this.running) return;
    await new Promise(resolve => setImmediate(resolve));
    // Pass live count so mortality engine can apply small-group protection
    this.worldState.alive_count = alive.length;
    for (const ind of alive) {
      // Guard: skip anyone already killed earlier this tick (microbiome, conflict, disaster).
      // Without this, rollDeath runs on a stale alive[] and can double-count deaths
      // or overwrite a specific cause (e.g. 'disease_wound_infection') with a generic one.
      if (ind.is_dead) continue;
      const cause = rollDeath(ind, day, this.worldState);
      if (cause) {
        ind.is_dead = true;
        ind.alive = false;
        ind.death_day = day;
        ind.death_cause = cause;
        this._todayDeaths++;
        this.totalDeaths++;
        // Grief event — her grup üyesine ve yakın akrabaya ayrı ayrı gönderilir
        // (psychologyEngine sadece kendi individual_id'sine sahip event'leri işler)
        for (const survivor of alive) {
          if (survivor.is_dead || survivor.id === ind.id) continue;
          const sameGroup = survivor.group_id && survivor.group_id === ind.group_id;
          const isKin = survivor.parent_1_id === ind.id || survivor.parent_2_id === ind.id
                     || ind.parent_1_id === survivor.id || ind.parent_2_id === survivor.id;
          const dist = Math.hypot((survivor.x ?? 0) - (ind.x ?? 0), (survivor.y ?? 0) - (ind.y ?? 0));
          if (sameGroup || isKin || dist < 2) {
            tickEvents.push({ type: 'death_of_kin', individual_id: survivor.id, deceased_id: ind.id, day });
          }
        }
        const deadName = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        this.logEvent(day, 'death', `${deadName} died: ${cause}`, { individual_id: ind.id, cause, name: deadName }, 1);
        ind._death_logged = true;

        // Tanıklık korkusu — gözlemsel öğrenme, gen değil.
        // Her ölüm nedeni yakındaki bireylerde farklı bir korku izlenimi bırakır.
        this._applyDeathWitnessFear(ind, cause, alive);
      }
    }

    // Handle already-dead from conflict/disease/disaster/birth-complications marked earlier
    for (const ind of alive) {
      if (ind.is_dead && !ind._death_logged) {
        ind._death_logged = true;
        ind.death_day = ind.death_day ?? day;
        this._todayDeaths++;
        this.totalDeaths++;
        const deadName2 = ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
        this.logEvent(day, 'death', `${deadName2} died: ${ind.death_cause ?? ind.cause_of_death ?? 'unknown'}`, { individual_id: ind.id, cause: ind.death_cause ?? ind.cause_of_death ?? 'unknown', name: deadName2 }, 1);
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
        // Vocabulary grows organically via tryAcquireWordFromEnvironment (step 12d below).
        // No scripted word injection here — words emerge from genetics + foxp2 expression only.
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
    this.processLanguageLearning(alive, spatialGrid);

    // 12b. Social learning: children near parents learn faster
    this.processFamilyLearning(alive, day, tickEvents);

    // 12c. FOXP2 expression — grows through social language use (developmental plasticity)
    for (const ind of alive) {
      const groupSize = ind.group_id
        ? alive.filter(o => o.group_id === ind.group_id && o.id !== ind.id).length
        : 0;
      updateFoxp2Expression(ind, groupSize);
    }

    // 12d. Organic vocabulary acquisition — individuals coin words from their environment
    for (const ind of alive) {
      if ((ind.language?.stage ?? 0) < 2) continue;
      const unknownConcepts = CORE_CONCEPTS.filter(c => !ind.language.vocabulary?.[c]);
      if (unknownConcepts.length === 0) continue;
      const concept = unknownConcepts[Math.floor(Math.random() * Math.min(4, unknownConcepts.length))];
      tryAcquireWordFromEnvironment(ind, concept, ind.group_id ?? 'global');
    }

    // 13. Technology emergence — accumulate physical experience, then check deterministic thresholds
    for (const ind of alive) {
      accumulateExperience(ind, this.worldState);
      const emerged = checkTechEmergence(ind, this.discoveredTechs);
      for (const techId of emerged) {
        const ev = { tech_id: techId, discoverer_id: ind.id, discovery_day: day, x: ind.x, y: ind.y };
        tickEvents.push({ ...ev, type: 'discovery', individual_id: ind.id });
        this.logEvent(day, 'technology', `Technology discovered: ${techId}`, ev, 4);
      }
    }

    // 13b. Technology observational learning — nearby individuals learn from each other
    for (const ind of alive) {
      if ((ind.phenotype?.fluid_intelligence ?? 0) < 0.2) continue;
      const nearby = getNeighbours(ind, spatialGrid).filter(o =>
        Math.hypot((o.x ?? 0) - (ind.x ?? 0), (o.y ?? 0) - (ind.y ?? 0)) < SOCIAL_INTERACTION_RADIUS
      );
      learnTechFromObservation(ind, nearby, this.discoveredTechs);
    }

    // 14. Belief formation & spread
    for (const ind of alive) {
      const beliefEvent = tryFormBelief(ind, this.discoveredBeliefs, this.discoveredTechs, this.worldState, day);
      if (beliefEvent) {
        tickEvents.push(beliefEvent);
        this.logEvent(day, 'belief', beliefEvent.description, beliefEvent, beliefEvent.importance === 'high' ? 4 : 2);
      }
    }
    const spreadEvents = updateBeliefSpread(alive, this.discoveredBeliefs, this.groups, day);
    tickEvents.push(...spreadEvents);
    for (const group of this.groups) {
      const ritualEvent = checkRitualEmergence(group, alive, this.discoveredBeliefs, day);
      if (ritualEvent) {
        tickEvents.push(ritualEvent);
        this.logEvent(day, 'ritual', ritualEvent.description ?? 'Ritual emerged', ritualEvent, 3);
      }
    }

    // 15. Culture
    if (!this.running) return;
    await new Promise(resolve => setImmediate(resolve));
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
      const groupSize = alive.filter(i => i.group_id === settlement.group_id).length;
      const crowdEv = checkSettlementOvercrowding(settlement, groupSize, day);
      if (crowdEv) {
        tickEvents.push(crowdEv);
        this.logEvent(day, 'architecture', crowdEv.description, crowdEv, 3);
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
      // Update social order metric — affects trade willingness and cooperation signals
      group.social_order = computeSocialOrder(group);
    }

    // 19. Astronomy
    const astroEvents = processAstronomyTick(alive, this.celestialObservations, this.astronomyKnowledge, this.discoveredTechs, day);
    for (const ev of astroEvents) {
      if (ev.importance !== 'low') this.logEvent(day, 'astronomy', ev.description, ev, ev.importance === 'high' ? 4 : 2);
    }

    // 19b. Social narrative events (communication, activity, sleep)
    const narrativeEvents = this.processSocialNarrative(alive, day);
    for (const ev of narrativeEvents) {
      this.logEvent(day, ev.type, ev.description, ev.data ?? {}, ev.importance ?? 1);
    }

    // 20. Update human environmental impact
    this.worldState.human_impact = Math.min(1, alive.filter(i => !i.is_dead).length / 1000);

    // 21. Compute stats
    const currentAlive = alive.filter(i => !i.is_dead);
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

    // 23. Broadcast (throttled at high speeds)
    if (this.onTick && this._broadcastThisTick !== false) {
      this.onTick({ day, stats, events: this.events.slice(-20) });
    }

    this.currentDay++;
    } catch (err) {
      console.error(`[SimulationEngine] tick() error on day ${this.currentDay}:`, err);
      this.currentDay++;
    }
  }

  // Generate narrative social events: communication, inner activity, sleep
  processSocialNarrative(alive, day) {
    const events = [];
    const pName = ind => ind.phenotype?.name ?? `${ind.sex === 'male' ? '♂' : '♀'}-${ind.id.slice(-4).toUpperCase()}`;
    const CONCEPT_TR = {
      danger:'tehlike', food:'yiyecek', water:'su', fire:'ateş',
      here:'burada', there:'orada', me:'ben', you:'sen', us:'biz', them:'onlar',
      good:'iyi', bad:'kötü', hunt:'av', eat:'yemek', sleep:'uyku',
      die:'ölüm', born:'doğum', run:'koş', sun:'güneş', moon:'ay',
      rain:'yağmur', dark:'karanlık', light:'ışık', god:'tanrı', spirit:'ruh',
      sky:'gökyüzü', earth:'toprak', time:'zaman',
    };

    // --- Communication: individuals with language.stage >= 1 signal nearby group members ---
    // ~3% of alive fire per tick to keep volume manageable
    for (const ind of alive) {
      if (Math.random() > 0.03) continue;
      if ((ind.language?.stage ?? 0) < 1) continue;

      const groupMembers = alive.filter(o =>
        o.id !== ind.id &&
        o.group_id === ind.group_id &&
        Math.hypot((o.x ?? 0) - (ind.x ?? 0), (o.y ?? 0) - (ind.y ?? 0)) < 2
      );
      if (groupMembers.length === 0) continue;

      const target = groupMembers[Math.floor(Math.random() * groupMembers.length)];
      const vocab = ind.language?.vocabulary ?? {};
      const concepts = Object.keys(vocab);

      // Pick concept based on need
      let concept = concepts[Math.floor(Math.random() * concepts.length)] ?? 'food';
      const satiation = ind.satiation ?? 0.5;
      const hydration = ind.health?.hydration ?? 0.5;
      const stress = ind.psychology?.stress_level ?? 0;
      if (satiation < 0.3 && vocab['food']) concept = 'food';
      else if (hydration < 0.3 && vocab['water']) concept = 'water';
      else if (stress > 0.7 && vocab['danger']) concept = 'danger';

      const word = vocab[concept] ?? null;
      const isSound = (ind.language?.stage ?? 0) >= 2;
      const name = pName(ind);
      const targetName = pName(target);
      const conceptTr = CONCEPT_TR[concept] ?? concept;

      let desc;
      if (word) {
        desc = isSound
          ? `${name}, ${targetName}'a "${word}" dedi — ${conceptTr}`
          : `${name}, ${targetName}'a "${word}" jesti yaptı — ${conceptTr}`;
      } else {
        desc = isSound
          ? `${name}, ${targetName}'a ses çıkardı`
          : `${name}, ${targetName}'a işaret etti`;
      }

      events.push({ type: 'communication', description: desc, importance: 1,
        data: { sender_id: ind.id, receiver_id: target.id, concept, word } });
    }

    // --- Inner activity: periodic narrative (~2% of alive per tick) ---
    for (const ind of alive) {
      if (Math.random() > 0.02) continue;

      const name = pName(ind);
      const ageYears = Math.floor((ind.age ?? 0) / 365);
      const mentalState = ind.psychology?.mental_state ?? 'calm';
      const satiation = ind.satiation ?? 0.5;
      const hydration = ind.health?.hydration ?? 0.5;
      const pregnant = ind.health?.pregnancy;

      let activity;
      if (satiation < 0.25)  activity = 'yiyecek arıyor';
      else if (hydration < 0.25) activity = 'su kaynağı arıyor';
      else if (pregnant)     activity = 'doğuma hazırlanıyor';
      else if (mentalState === 'grieving') activity = 'yas tutuyor';
      else if (mentalState === 'excited')  activity = 'dinç ve aktif';
      else if ((ind.mating_urge ?? 0) > 0.8) activity = 'eş arıyor';
      else {
        const dir = (ind._dx ?? 0) > 0.001 ? 'doğuya' : (ind._dx ?? 0) < -0.001 ? 'batıya' : 'çevresinde';
        activity = `${dir} doğru ilerliyor`;
      }

      events.push({ type: 'activity', importance: 1,
        description: `${name} (${ageYears} yaş, ${mentalState}): ${activity}`,
        data: { individual_id: ind.id } });
    }

    // --- Sleep: log when individual goes to rest (energy exhaustion) ---
    for (const ind of alive) {
      const satiation = ind.satiation ?? 0.5;
      const wellbeing = ind.psychology?.wellbeing ?? 0.5;
      const tiredNow = satiation < 0.1 || (wellbeing < 0.15 && satiation < 0.25);
      if (tiredNow && !ind._was_sleeping) {
        ind._was_sleeping = true;
        const name = pName(ind);
        events.push({ type: 'sleep', importance: 1,
          description: `${name} tükendi ve uyudu (enerji: %${Math.round(satiation * 100)})`,
          data: { individual_id: ind.id, satiation, wellbeing } });
      } else if (!tiredNow) {
        ind._was_sleeping = false;
      }
    }

    return events;
  }

  // Shortest-path angle interpolation — avoids the ±π wrapping bug
  // where linear blending of e.g. +3 and -3 gives 0 (opposite direction).
  _lerpAngle(from, to, t) {
    let diff = to - from;
    while (diff >  Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return from + diff * t;
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
    ind._moveAngle = ((ind._moveAngle + (Math.random() - 0.5) * 0.25) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    if (ind.is_founder) {
      // Kurucular hafif hareket edebilir — home'a çekim kuvvetiyle kısıtlıdır.
      // Sert sınır aşağıdaki blokta uygulanır (max 0.04° drift).
      const hx = ind.home_x ?? ind.x;
      const hy = ind.home_y ?? ind.y;
      const hdx = hx - (ind.x ?? 0);
      const hdy = hy - (ind.y ?? 0);
      const hdist = Math.hypot(hdx, hdy);
      if (hdist > 0.015) {
        const pull = Math.min(0.7, (hdist - 0.015) / 0.04);
        ind._moveAngle = this._lerpAngle(ind._moveAngle, Math.atan2(hdy, hdx), pull);
      }
    }
    {
      // ── Bant uyumu: centroide çekim ──────────────────────────────────────
      const cx      = this._bandCentroid?.x ?? (this.worldState.longitude ?? 0);
      const cy      = this._bandCentroid?.y ?? (this.worldState.latitude  ?? 0);
      const bdx     = cx - (ind.x ?? 0);
      const bdy     = cy - (ind.y ?? 0);
      const bdist   = Math.hypot(bdx, bdy);
      const predatorFear  = ind._fears?.predator ?? 0;
      const disasterFear  = ind._fears?.disaster  ?? 0;
      const panicLevel    = Math.max(predatorFear, disasterFear);
      // Yırtıcı/afet korkusu: sürüye daha yakın kalma (freeZone küçülür, kohezyon artar)
      const freeZone    = Math.max(0.05, 0.3 + survivalStress * 1.2 - panicLevel * 0.25);
      const cohesionStr = Math.min(0.98, Math.max(0.15, 0.88 - survivalStress * 0.65 + panicLevel * 0.3));
      if (bdist > freeZone) {
        const pull = Math.min(1, (bdist - freeZone) / 2) * cohesionStr;
        ind._moveAngle = this._lerpAngle(ind._moveAngle, Math.atan2(bdy, bdx), pull);
      }

      // ── Hafıza temelli yiyecek arama ──────────────────────────────────────
      if ((ind.satiation ?? 0.5) > 0.72) {
        ind._goodFoodAngle = ind._moveAngle;
      } else if ((survivalStress > 0.35 || (ind._fears?.scarcity ?? 0) > 0.2) && ind._goodFoodAngle !== undefined) {
        const scarcityBoost = Math.min(0.2, (ind._fears?.scarcity ?? 0) * 0.3);
        const memPull = Math.min(0.70, survivalStress * 0.6 + scarcityBoost);
        ind._moveAngle = this._lerpAngle(ind._moveAngle, ind._goodFoodAngle, memPull);
      }

      // ── Çiftleşme dürtüsü: temel ihtiyaçlar karşılandığında devreye girer ─
      if (cal > 0.38 && hyd > 0.32 && !ind.health?.pregnancy
          && ageYears >= 13 && (ind.mating_urge ?? 0) > 0.65) {
        const oppSex = ind.sex === 'male' ? 'female' : 'male';
        let nearestDist = 10;
        let nearestPartner = null;
        const candidates = oppSex === 'female' ? (this._fertileFemales ?? []) : (this._fertileMales ?? []);
        for (const other of candidates) {
          if (other.id === ind.id) continue;
          const d = Math.hypot((other.x ?? 0) - (ind.x ?? 0), (other.y ?? 0) - (ind.y ?? 0));
          if (d < nearestDist) { nearestDist = d; nearestPartner = other; }
        }
        if (nearestPartner) {
          const pdx = (nearestPartner.x ?? 0) - (ind.x ?? 0);
          const pdy = (nearestPartner.y ?? 0) - (ind.y ?? 0);
          const urgePull = Math.min(0.72, ((ind.mating_urge - 0.65) / 0.35) * 0.65);
          ind._moveAngle = this._lerpAngle(ind._moveAngle, Math.atan2(pdy, pdx), urgePull);
        }
      }
    }

    // ── Su korkusu: boğulmaya tanık olan birey suya yönelmekten kaçınır.
    //    _waterFear zamanla azalır; kaçınma gücü korkuya orantılı. ────────────
    if ((ind._waterFear ?? 0) > 0.05 && !ind._inWater && ind._lastLandX !== undefined) {
      const step0 = speed * 0.7; // bir sonraki adımın tahmini pozisyonu
      const testX = (ind.x ?? 0) + Math.cos(ind._moveAngle) * step0;
      const testY = (ind.y ?? 0) + Math.sin(ind._moveAngle) * step0;
      if (!isOnLand(testY, testX)) {
        // Gidilecek yön su — kaçınma açısı hesapla (son kara pozisyonuna)
        const ldx = (ind._lastLandX ?? ind.x ?? 0) - (ind.x ?? 0);
        const ldy = (ind._lastLandY ?? ind.y ?? 0) - (ind.y ?? 0);
        const avoidPull = Math.min(0.95, ind._waterFear ?? 0);
        ind._moveAngle = this._lerpAngle(ind._moveAngle, Math.atan2(ldy, ldx), avoidPull);
      }
    }

    // ── Su panik içgüdüsü: HP %60'ın altına düşünce en son bilinen kara
    //    yönüne dönme. Bu bir gen değil — acı/tehlike farkındalığı. ───────────
    if (ind._inWater && (ind.health?.hp ?? 1) < 0.6 && ind._lastLandX !== undefined) {
      const ldx = ind._lastLandX - (ind.x ?? 0);
      const ldy = ind._lastLandY - (ind.y ?? 0);
      const panicPull = Math.min(0.9, (0.6 - (ind.health?.hp ?? 1)) * 3);
      ind._moveAngle = this._lerpAngle(ind._moveAngle, Math.atan2(ldy, ldx), panicPull);
    }

    const step = speed * (0.5 + Math.random() * 0.8);
    const prevX = ind.x ?? 0;
    const prevY = ind.y ?? 0;
    const nextX = Math.max(-180, Math.min(180, prevX + Math.cos(ind._moveAngle) * step));
    const nextY = Math.max(-85,  Math.min(85,  prevY + Math.sin(ind._moveAngle) * step));

    const nextInWater = !isOnLand(nextY, nextX);
    if (nextInWater && !ind._inWater) {
      // Hard rollback: don't step into water from land. Flip angle away from water.
      ind._moveAngle = (ind._moveAngle + Math.PI + (Math.random() - 0.5) * 0.8) % (Math.PI * 2);
      ind.x = prevX;
      ind.y = prevY;
      ind._inWater = false;
      if (ind._lastLandX === undefined) { ind._lastLandX = prevX; ind._lastLandY = prevY; }
    } else {
      ind.x = nextX;
      ind.y = nextY;
      // Track water state; remember last land position for panic-return logic
      const nowInWater = nextInWater;
      if (!nowInWater) {
        ind._lastLandX = ind.x;
        ind._lastLandY = ind.y;
      }
      ind._inWater = nowInWater;
    }

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
    const ageYears = individual.age / 365;

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

    // Drowning: being in water drains HP. Rate is reduced by accumulated water
    // experience (_waterExperience) gained through survival and observation —
    // no swimming gene, purely behavioural memory.
    if (individual._inWater) {
      const ageYears  = (individual.age ?? 0) / 365;
      const ageFactor = ageYears < 5 ? 2.0 : ageYears > 60 ? 1.5 : 1.0;
      const skill     = Math.min(1, individual._waterExperience ?? 0);
      // Fully experienced swimmer still takes 15% of base damage — water is never safe
      const drownRate = 0.020 * (1 - skill * 0.85) * ageFactor;
      health.hp = Math.max(0, health.hp - drownRate);
      health.calories  = Math.max(0, (health.calories  ?? 0.5) - 0.004 * (1 - skill * 0.5));
      health.hydration = Math.min(1, (health.hydration ?? 0.5) + 0.01);
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

  processSocialInteractions(alive, day, tickEvents, grid) {
    const MAX_PAIRS = 300;
    let pairs = 0;
    const seen = new Set();
    for (const ind of alive) {
      if (pairs >= MAX_PAIRS) break;
      if (ind.is_dead) continue;
      for (const other of getNeighbours(ind, grid)) {
        if (pairs >= MAX_PAIRS) break;
        if (other.is_dead) continue;
        const pairKey = ind.id < other.id ? `${ind.id}:${other.id}` : `${other.id}:${ind.id}`;
        if (seen.has(pairKey)) continue;
        const dist = Math.hypot((ind.x ?? 0) - (other.x ?? 0), (ind.y ?? 0) - (other.y ?? 0));
        if (dist > SOCIAL_INTERACTION_RADIUS) continue;
        seen.add(pairKey);
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

  processLanguageLearning(alive, grid) {
    for (const ind of alive) {
      if (!ind.language || ind.language.stage < 2) continue;
      const nearby = getNeighbours(ind, grid).filter(o =>
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

      // Note: epigenetic effects of parental care are mediated exclusively through the
      // child's own stress and satiation signals fed into updateEpigenome each tick.
      // Direct epigenome writes on non-founders are forbidden by the Cardinal Rule.

      // Experience accumulation and tech emergence run in the main tick for all alive individuals.
    }
  }

  // Base daily probability of a natural disaster (per biome/weather)
  _naturalDisasterProbability(ws) {
    if (ws.quarantine_mode) return 0;
    const biomeRisk = {
      mediterranean: 0.0003, coastal: 0.0005, tropical_rainforest: 0.0006,
      tropical_savanna: 0.0005, temperate_forest: 0.0003, boreal_forest: 0.0002,
      tundra: 0.0002, mountain: 0.0007, grassland: 0.0003, desert: 0.0004,
    };
    let base = biomeRisk[ws.biome] ?? 0.0003;
    // Drought/blizzard weather increases fire/freeze risk
    if (ws.current_weather === 'drought') base *= 2;
    if (ws.current_weather === 'blizzard') base *= 1.5;
    return base;
  }

  // Pick a disaster type appropriate to the current biome/weather
  _pickNaturalDisaster(ws) {
    const biome = ws.biome ?? 'mediterranean';
    const weather = ws.current_weather ?? 'clear';
    const candidates = [];
    if (['mountain', 'coastal', 'temperate_forest'].includes(biome)) candidates.push({ type: 'earthquake', mortality_factor: 0.08 });
    if (['coastal', 'tropical_rainforest', 'tropical_savanna'].includes(biome) || weather === 'heavy_rain') candidates.push({ type: 'flood', mortality_factor: 0.07 });
    if (['desert', 'grassland', 'mediterranean'].includes(biome) || weather === 'drought') candidates.push({ type: 'wildfire', mortality_factor: 0.05 });
    if (['tundra', 'boreal_forest'].includes(biome) || weather === 'blizzard') candidates.push({ type: 'blizzard_disaster', mortality_factor: 0.06 });
    // Generic fallback
    candidates.push({ type: 'drought_event', mortality_factor: 0.03 });
    return candidates[Math.floor(Math.random() * candidates.length)];
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
          ind._death_logged = true;
          deaths++;
          this._todayDeaths++;
          this.totalDeaths++;
        }
      }
      if (deaths > 0) {
        this.logEvent(day, 'disaster', `${type} killed ${deaths} individuals`, { type, deaths, ...disaster }, 5);
      }
      // Afeti yaşayan tüm hayatta kalanlar tanık sayılır — uzaklık fark etmez
      // çünkü doğal afetler bölgesel olaylar.
      for (const ind of alive) {
        if (ind.is_dead) continue;
        if (!ind._fears) ind._fears = {};
        // Yumuşatılmış birikme: mevcut korkuyu azaltarak üstüne ekler, 1.0'a kilitlenmez
        ind._fears.disaster = Math.min(1, (ind._fears.disaster ?? 0) * 0.6 + 0.5);
        // Sel/deprem tipi afetler ek su/yer korkusu yaratır
        if (type === 'flood') {
          ind._waterFear = Math.min(1, (ind._waterFear ?? 0) + 0.3);
        }
      }
      this.worldState.recent_disaster = type;
      this.worldState.recent_disaster_day = day;
    }
    // Clear after processing
    this.worldState.natural_disaster = null;
  }

  // Tanıklık korkusu — her ölüm nedeni için yakındaki bireylere uygun korku uygular.
  // 2° (~200 km) yarıçap, akrabalar daha güçlü etkilenir.
  _applyDeathWitnessFear(dead, cause, alive) {
    const WITNESS_RADIUS = 2.0;
    for (const witness of alive) {
      if (witness.id === dead.id || witness.is_dead) continue;
      const dist = Math.hypot((witness.x ?? 0) - (dead.x ?? 0), (witness.y ?? 0) - (dead.y ?? 0));
      if (dist > WITNESS_RADIUS) continue;

      const isKin = witness.parent_1_id === dead.id || witness.parent_2_id === dead.id
                 || dead.parent_1_id === witness.id || dead.parent_2_id === witness.id;
      const proximity = Math.max(0, 1 - dist / WITNESS_RADIUS);
      const base = isKin ? proximity * 0.7 : proximity * 0.4;

      if (!witness._fears) witness._fears = {};

      switch (cause) {
        case 'drowning':
          // Su korkusu — moveIndividual'da su yönünü bastırır
          witness._waterFear = Math.min(1, (witness._waterFear ?? 0) + base);
          break;
        case 'predator':
          // Yırtıcı korkusu — grup kohezyon artar, hız yükselir
          witness._fears.predator = Math.min(1, (witness._fears.predator ?? 0) + base);
          break;
        case 'conflict':
          // Şiddet korkusu — tanınan saldırgandan kaçınma, stres artar
          witness._fears.conflict = Math.min(1, (witness._fears.conflict ?? 0) + base * 0.8);
          break;
        case 'starvation':
        case 'dehydration':
          // Kıtlık korkusu — yiyecek arama güdüsü güçlenir
          witness._fears.scarcity = Math.min(1, (witness._fears.scarcity ?? 0) + base * 0.5);
          break;
        case 'infection':
          // Hastalık korkusu — hasta bireylere yaklaşmaktan kaçınma
          witness._fears.infection = Math.min(1, (witness._fears.infection ?? 0) + base * 0.4);
          break;
        default:
          // Genel travma — stres artışı
          witness._fears.general = Math.min(1, (witness._fears.general ?? 0) + base * 0.3);
      }
    }
  }

  estimateGenerations() {
    const ages = [...this.population.values()].map(i => this.currentDay - (i.birth_day ?? 0));
    const oldest = ages.length > 0 ? Math.max(...ages) : 0;
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
      total_techs: Object.keys(TECH_TREE).length,
      beliefs: this.discoveredBeliefs.size,
      art_forms: this.discoveredArts.size,
      groups: this.groups.length,
      social_order: this.groups.length ? Math.round(this.groups.reduce((s, g) => s + (g.social_order ?? 0), 0) / this.groups.length * 100) / 100 : 0,
      astronomy_knowledge: this.astronomyKnowledge.size,
      season: this.worldState.season,
      temperature: Math.round(this.worldState.temperature),
      food_abundance: Math.round(this.worldState.food_abundance * 100) / 100,
      water_abundance: Math.round((this.worldState.water_abundance ?? 0.7) * 100) / 100,
      biome: this.worldState.biome ?? 'mediterranean',
      has_disaster: !!(this.worldState.recent_disaster),
      weather: this.worldState.current_weather ?? 'clear',
      weather_intensity: Math.round((this.worldState.weather_intensity ?? 0.5) * 100) / 100,
      births: this.totalBirths,
      deaths: this.totalDeaths,
      word_count: new Set(alive.flatMap(i => Object.keys(i.language?.vocabulary ?? {}))).size,
      max_language_stage: Math.max(0, ...alive.map(i => i.language?.stage ?? 0)),
      avg_consciousness: Math.round(alive.reduce((s, i) => s + (i.mind?.consciousness ?? 0), 0) / Math.max(1, alive.length) * 1000) / 1000,
      max_tom_stage: Math.max(0, ...alive.map(i => i.psychology?.theory_of_mind ?? 0)),
      tech_progress: {},
      qol_index: (() => {
        const c = alive.reduce((s, i) => s + (i.mind?.consciousness ?? 0), 0) / Math.max(1, alive.length);
        const langStg = alive.reduce((s, i) => s + (i.language?.stage ?? 0), 0) / Math.max(1, alive.length);
        const hp = alive.reduce((s, i) => s + (i.health_score ?? 0.5), 0) / Math.max(1, alive.length);
        const wb = alive.reduce((s, i) => s + (i.psychology?.wellbeing ?? 0.5), 0) / Math.max(1, alive.length);
        return Math.round((c * 0.3 + (langStg / 6) * 0.2 + hp * 0.3 + wb * 0.2) * 1000) / 1000;
      })(),
      mean_wealth: Math.round(econStats.mean_wealth * 100) / 100,
      gini: Math.round(econStats.gini * 100) / 100,
      happiness_index: Math.round(psychStats.happiness_index * 100) / 100,
      sick_rate: Math.round(healthStats.sick_rate * 100) / 100,
      epigenetics: (() => {
        const loci = ['HPA_AXIS', 'BDNF_PROMOTER', 'MAOA_REGULATION', 'LEPTIN_RESIST', 'INSULIN_SENS', 'AVP_REGULATION', 'OXTR_METHYL', 'IMMUNE_PRIMING'];
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
  // Ensure group_id is mirrored into social so it survives DB round-trip
  const social = { ...(ind.social ?? {}), group_id: ind.group_id ?? ind.social?.group_id ?? null };
  return {
    id: ind.id,
    is_dead: ind.is_dead,
    sex: ind.sex,
    birth_day: ind.birth_day,
    death_day: ind.death_day,
    death_cause: ind.death_cause ?? null,
    x: ind.x,
    y: ind.y,
    genome: ind.genome,
    phenotype: ind.phenotype,
    epigenome: ind.epigenome ?? {},
    health: ind.health ?? {},
    mind: ind.mind ?? {},
    social,
    skills: ind.skills ?? [],
    beliefs: ind.beliefs instanceof Set ? [...ind.beliefs] : (Array.isArray(ind.beliefs) ? ind.beliefs : []),
    known_techs: ind.known_techs instanceof Set ? [...ind.known_techs] : (Array.isArray(ind.known_techs) ? ind.known_techs : []),
    language: ind.language ?? {},
    memory: ind.memory ?? {},
    parent_1_id: ind.parent_1_id,
    parent_2_id: ind.parent_2_id,
    // Volatile in-memory state — preserved in snapshot for live engine reload
    group_id: ind.group_id ?? null,
    language_stage: ind.language?.stage ?? 0,
    satiation: ind.satiation ?? 1,
    mating_urge: ind.mating_urge ?? 0,
    inbreeding_coeff: ind.inbreeding_coeff ?? 0,
    age: ind.age ?? 0,
    is_founder: ind.is_founder ?? false,
    inventory: ind.inventory ?? null,
    psychology: ind.psychology ?? null,
    _waterFear: ind._waterFear ?? null,
    _fears: ind._fears ?? null,
    _waterExperience: ind._waterExperience ?? null,
    home_x: ind.home_x ?? null,
    home_y: ind.home_y ?? null,
    _goodFoodAngle: ind._goodFoodAngle ?? null,
    _currentAction: ind._currentAction  ?? null,
    _experience:    ind._experience     ?? null,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

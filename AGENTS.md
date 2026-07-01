# Anatolia-Sim — AGENTS.md

## Project Purpose

Agent-based civilization simulator. Two DNA-engineered founding individuals are placed in a world; the experiment tests whether their descendants can develop consciousness, language, technology, belief systems, and civilization through genetic inheritance and observational learning only.

## Cardinal Rule

> No individual other than the two founders may be given any behavior except through genetic inheritance and observational learning.

This rule must never be violated. Before adding any logic that sets a property or triggers a behavior on a non-founder individual, ask: does this happen because of a gene they inherited, or something they observed or learned? If neither, it is forbidden.

## Architecture

- Stack: Rust backend (`rust/sim-core` + `rust/sim-server`) + React 18 + TypeScript
- Simulation: `rust/sim-core` + `rust/sim-server` — runtime loop and DB-backed tick orchestration
- Client: `client/src/` — Vite + Tailwind, panels in `components/panels/`
- Desktop: Tauri shell that launches the Rust server locally
- Deploy: Render.com, auto-deploy on `main` push with native Rust binary

## Key Engine Files

| File | Purpose |
|---|---|
| `rust/sim-core/src/biology/genome.rs` | 32-locus Mendelian inheritance, stress-scaled mutation |
| `rust/sim-core/src/biology/individual.rs` | `create_founder()`, `create_child()`, volatile field init |
| `rust/sim-core/src/biology/mortality.rs` | Daily death risk, death causes |
| `rust/sim-core/src/biology/reproduction.rs` | Conception probability, MHC bonus, twin/triplet logic |
| `rust/sim-core/src/consciousness.rs` | `update_consciousness()` — sole entry point |
| `rust/sim-core/src/language.rs` | FOXP2 expression, 7-stage emergence, vocabulary |
| `rust/sim-core/src/belief.rs` | 6 belief archetypes, ritual emergence |
| `rust/sim-core/src/technology.rs` | Tech tree, cumulative learning |
| `rust/sim-core/src/culture.rs` | Cultural memes, spread |
| `rust/sim-core/src/art.rs` | 12 art forms, wellbeing bonus |
| `rust/sim-core/src/law.rs` | 13 norms, enforcement, exile |
| `rust/sim-core/src/architecture.rs` | 12 structure types, settlements |
| `rust/sim-core/src/astronomy.rs` | 8 celestial events, 5 knowledge types |
| `rust/sim-core/src/epigenetics.rs` | 8 methylation loci, heritability-weighted inheritance |
| `rust/sim-core/src/social.rs` | Groups, 6 roles, fission, intergroup conflict |
| `rust/sim-core/src/economy.rs` | 12 resources, 11 goods, trade, Gini coefficient |
| `rust/sim-core/src/environment.rs` | 10 biomes, 8 weather types, worldState |
| `rust/sim-core/src/psychology.rs` | Mental states, ToM (0–3), attachment, trauma |
| `rust/sim-core/src/microbiome.rs` | 9 pathogens, transmission modes, immunity |
| `rust/sim-core/src/tick.rs` | Main tick orchestrator |

## Simulation State (SimulationEngine)

```js
this.population       // Map<id, individual>
this.discoveredTechs  // Set<techId>
this.discoveredBeliefs// Set<beliefId>
this.discoveredArts   // Set<artId>
this.techProgress     // Map<techId, float>  — fires discovery at >= 1.0
this.groups           // array — .culture and .norms are Sets
this.worldState       // environment object (see Biomes section)
```

## Individual Object — Key Fields

### Persistent (saved to DB)
```js
id, simulation_id, birth_day, death_day, alive, is_dead, sex
x, y                  // lon/lat degrees
genome                // 32-locus object
phenotype             // ~50 computed traits (see Phenotype Traits)
epigenome             // 8-locus methylation map
health                // { hp, calories, hydration, disease_resistance, pregnancy, injuries }
mind                  // { consciousness, fluid_intelligence, belief_capacity, ... }
social                // { group_id, relationships, reputation, status, mate_id, ... }
skills, beliefs       // beliefs: Set in memory, Array in DB
language              // { stage, foxp2_expression, vocabulary, grammar, writing }
memory                // { social[], events[], knowledge[] }
psychology            // { mental_state, wellbeing, stress_level, trauma_events, ... }
inventory             // { resource_id: quantity }
parent_1_id, parent_2_id, inbreeding_coeff
is_founder, home_x, home_y, group_id
```

### Volatile (in-memory only — packed into mind._volatile on checkpoint)
```js
_waterFear            // 0-1, decays 0.0005/day (~2000 days to forget)
_waterExperience      // 0-1, gained while in water or observing others exit water
_fears                // { predator, disaster, scarcity, infection, conflict, general }
_inWater, _wasInWater // boolean — current/previous tick water state
_lastLandX, _lastLandY// last known land position (for panic-return)
_moveAngle            // current movement direction (radians)
_goodFoodAngle        // memory of good foraging direction
satiation             // 0-1, derived from calories+hydration
mating_urge           // 0-1, accumulates daily
age                   // sim days since birth (recomputed but cached)
```

## Consciousness Formula

Implemented exclusively in `rust/sim-core/src/consciousness.rs`.
Cardinal rule: no other code may directly set `ind.mind.consciousness`.

```
baseRate      = max(potential * 0.001, 0.00015)
langBonus     = (lang_stage / 6) * 0.0005
socialBonus   = 0.0002  (if ind is in a group, else 0)
tomBonus      = (theory_of_mind / 3) * 0.0003
stressPenalty = stress_level * 0.0003

Delta   = baseRate + langBonus + socialBonus + tomBonus - stressPenalty
ceiling = min(1, consciousness_potential * 1.2)
```

`theory_of_mind` lives in `ind.psychology.theory_of_mind` (0–3), advanced by `updateMentalState()` in psychologyEngine.

## FOXP2 Expression

- Newborns: `language_capacity * 0.1`
- Founders: `language_capacity * 0.7`
- Growth per tick: `socialGain = min(groupSize, 10) * 0.000015`; `stagingGain = 0.000005` if stage > 0
- ~1290 days to reach 50% expression (language_capacity=0.5, group of 10, stage>0); ~1330 days for stage-0 or solitary individuals (no stagingGain, socialGain capped at 1)

## Language Stages

| Stage | Name | foxp2_min | group_min | gen_min | Notes |
|-------|------|-----------|-----------|---------|-------|
| 0 | pre-linguistic | 0.00 | 1 | 0 | — |
| 1 | gestural | 0.00 | 3 | 0 | — |
| 2 | emotional-sounds | 0.40 | 5 | 1 | — |
| 3 | proto-words | 0.55 | 8 | 4 | 28 core concepts unlocked |
| 4 | syntax | 0.65 | 15 | 8 | grammar enabled |
| 5 | abstract | 0.72 | 25 | 15 | — |
| 6 | writing | 0.80 | 40 | 25 | writing enabled |

28 core concepts: `danger food water fire here there me you us them good bad hunt eat sleep die born run sun moon rain dark light god spirit sky earth time`

## Theory of Mind (Psychology)

Tracked in `ind.psychology.theory_of_mind` (0–3). Advances via `updateMentalState()`.

| Level | lang_stage | consciousness | IQ | Prob/tick |
|-------|-----------|--------------|-----|-----------|
| 1 | ≥ 1 | — | > 0.30 | 0.003 |
| 2 | ≥ 2 | > 0.02 | > 0.40 | 0.001 |
| 3 | ≥ 3 | > 0.10 | > 0.55 | 0.0004 |

## Psychology

```
Mental states: calm, content, excited, anxious, grieving, depressed
Attachment:    secure, anxious, avoidant  (set at birth from oxytocin_sensitivity)
trauma_anxiety: accumulated in ps.trauma_anxiety — NEVER mutate phenotype.anxiety
ToM bonus feeds consciousness formula directly
```

## QoL Index

```
QoL = consciousness*0.3 + (lang_stage/6)*0.2 + health_score*0.3 + wellbeing*0.2
```

## Reproduction

```
Conception = (fertility * ageFactor + mhcBonus - inbreedPenalty*0.5) * 0.07
  ageFactor: <18→0.3, 18-20→0.7, 35-40→0.6, >40→0.2
  mhcBonus: (|IMMUNE_01_diff| + |IMMUNE_02_diff|) / 2 * 0.2

Twin chance     = 0.003 + (fertility - 0.3) * 0.07
Triplet chance  = twinChance * 0.1
Mother mortality= max(0.002, 0.06 * (1 - health_resilience) * factor)
Neonatal risk   = max(0.005, motherRisk * 0.6)
```

## Death Causes

`drowning | dehydration | starvation | infection | old_age | predator | conflict | trauma | genetic_disease | birth_complications`

Water drowning risk: +0.05/tick × (1 - waterExperience). Inbreeding coeff > 0.25 → baseRisk × 1.5.

## Biomes

| Biome | Temp range | Food | Water | Predator |
|-------|-----------|------|-------|---------|
| tropical_rainforest | 22–30°C | 0.90 | 0.95 | 0.40 |
| tropical_savanna | 20–32°C | 0.70 | 0.50 | 0.50 |
| desert | 5–45°C | 0.20 | 0.10 | 0.20 |
| mediterranean | 8–30°C | 0.75 | 0.65 | 0.20 |
| temperate_forest | -5–25°C | 0.70 | 0.75 | 0.25 |
| grassland | -10–30°C | 0.60 | 0.40 | 0.35 |
| boreal_forest | -30–20°C | 0.50 | 0.70 | 0.30 |
| tundra | -40–10°C | 0.20 | 0.60 | 0.20 |
| mountain | -20–15°C | 0.40 | 0.80 | 0.30 |
| coastal | 5–25°C | 0.85 | 0.90 | 0.15 |

8 weather types: `clear rain heavy_rain snow blizzard storm heat_wave drought`

## Technology Tree (26 techs)

**Tier 0:** `fire_making stone_tools foraging`
**Tier 1:** `hunting_spear shelter_basic water_container animal_trap clothing_basic swimming`
**Tier 2:** `fishing plant_cultivation animal_herding food_preservation bow_arrow`
**Tier 3:** `pottery weaving metallurgy_copper writing_system calendar mathematics_basic`
**Tier 4:** `architecture_stone wheel irrigation sailing metallurgy_iron`

## Beliefs (6 archetypes)

| Belief | lang_min | IQ_min | foxp2_min | Prerequisites |
|--------|---------|--------|-----------|--------------|
| animism | 1 | 0.0 | 0.30 | — |
| ancestor_cult | 2 | 0.3 | 0.40 | — |
| shamanism | 2 | 0.4 | 0.50 | — |
| polytheism | 3 | 0.5 | 0.60 | pottery |
| monotheism | 4 | 0.6 | 0.65 | writing_system + mathematics_basic |
| philosophical | 4 | 0.7 | 0.70 | writing_system + mathematics_basic |

## Cultural Memes (18)

**Stage 1–2:** `shared_greeting mourning_ritual food_sharing_norm reciprocity_norm gender_roles age_hierarchy gift_exchange`
**Stage 3–4:** `body_decoration storytelling music_drumming dance_ritual naming_ceremony marriage_ceremony seasonal_festival taboo_system trade_ceremony`
**Stage 5:** `written_myth legal_code`

## Art Forms (12)

**Visual:** `cave_painting sculpture pottery_decoration textile_pattern architecture_art`
**Music:** `rhythmic_percussion vocal_melody flute_bone string_instrument`
**Narrative:** `oral_story epic_poem written_story`

## Laws / Norms (13)

**Stage 1:** `reciprocity no_theft incest_taboo`
**Stage 2:** `elder_respect hospitality blood_feud communal_work`
**Stage 3:** `leader_arbitration property_rights punishment_exile`
**Stage 4:** `written_law tax_system contract_law`

## Architecture (12 structure types)

**Tier 0:** `cave_dwelling lean_to`
**Tier 1:** `pit_house post_frame_hut storage_pit`
**Tier 2:** `mud_brick_house granary defensive_wall`
**Tier 3:** `stone_temple stone_house marketplace city_wall`

## Astronomy

8 celestial events: `lunar_cycle solstice equinox star_rising eclipse_solar eclipse_lunar planet_motion comet`
5 knowledge types: `lunar_tracking seasonal_calendar star_map eclipse_prediction planetary_model`

## Economy

12 resources: `food water stone wood clay flint hide bone copper_ore iron_ore salt obsidian`
11 goods: `stone_tool spear bow pottery clothing rope dried_food copper_tool iron_tool woven_cloth ceramic_vessel`

Trade: two individuals exchange surplus based on needs and reputation. Gini coefficient computed per tick.

## Microbiome / Disease (9 pathogens)

| Pathogen | Mortality | Transmission |
|----------|----------|-------------|
| intestinal_parasite | 5% | water/food |
| cholera_like | 30% | water |
| respiratory_common | 2% | airborne |
| pneumonia_like | 15% | airborne |
| plague_like | 40% | airborne (rare) |
| malaria_like | 10% | vector |
| fever_tick | 8% | vector |
| wound_infection | 12% | contact |
| fungal_skin | 1% | contact |

## Epigenetics (8 loci)

| Locus | Trait | Reversible | Heritability |
|-------|-------|-----------|-------------|
| HPA_AXIS | stress responsiveness | yes | 0.30 |
| BDNF_PROMOTER | learning plasticity | yes | 0.20 |
| MAOA_REGULATION | aggression control | no | 0.40 |
| LEPTIN_RESIST | metabolism | yes | 0.50 |
| INSULIN_SENS | health resilience | yes | 0.35 |
| OXTR_METHYL | oxytocin sensitivity | yes | 0.45 |
| AVP_REGULATION | vasopressin sensitivity | yes | 0.30 |
| IMMUNE_PRIMING | immune strength | no | 0.60 |

Cardinal rule clarification: methylation responses are pre-programmed by the genome; the environment triggers a genetically encoded mechanism. Code touching epigenome outside of `rust/sim-core/src/epigenetics.rs` still requires review.

## Genome — 32 Loci & Phenotype Traits

### Loci
`BDNF_01 COMT_01 DTNBP1_01 NRG1_01 DISC1_01` (intelligence)
`FOXP2_01 CNTNAP2_01` (language)
`OXTR_01 SLC6A4_01 DRD4_01 MAOA_01` (social/emotional)
`NRXN1_01 SHANK3_01 RELN_01` (consciousness)
`HEIGHT_01 HEIGHT_02 HEIGHT_03 STRENGTH_01 METABOLISM_01 IMMUNE_01 IMMUNE_02` (physical)
`TERT_01 APOE_01` (longevity)
`DRD2_01 AVPR1A_01 ACTN3_01 ADRA2B_01 CACNA1C_01` (motivation/bonding/memory)
`FSHR_01` (fertility)
`HERC2_01 MC1R_01 SLC24A5_01` (appearance)

### Key Phenotype Traits (computed by `computePhenotype()`)
`fluid_intelligence working_memory conscientiousness learning_rate neural_plasticity`
`language_capacity language_learning`
`social_bonding social_drive oxytocin_sensitivity empathy cooperation altruism parental_care`
`aggression dominance curiosity risk_tolerance innovation artistic_sense independence xenophobia`
`serotonin stress_resilience health_resilience anxiety`
`physical_strength physical_endurance endurance metabolism immune_strength`
`height_factor muscle_fiber_type memory_consolidation novelty_seeking`
`consciousness_potential belief_capacity self_awareness religiosity`
`fertility max_lifespan`
`eye_color hair_color skin_tone`

### Founder Genome Defaults (God Mode only)
```
OXTR_01(0.82/0.82)  AVPR1A_01(0.78/0.78)
FOXP2_01(0.90/0.88) CNTNAP2_01(0.82/0.80)
BDNF_01(0.80/0.78)  COMT_01(0.78/0.76)   DTNBP1_01(0.80/0.78)
NRXN1_01(0.82/0.80) SHANK3_01(0.80/0.78) RELN_01(0.80/0.78)
IMMUNE_01(0.88/0.85) IMMUNE_02(0.85/0.82) TERT_01(0.85/0.85) APOE_01(0.80/0.80)
DRD4_01(0.75/0.75)  DRD2_01(0.75/0.72)
STRENGTH_01(0.78/0.75) ACTN3_01(0.76/0.74)
```

## God Mode Restriction

`genetic_boost` only applies to founders (`ind.is_founder === true`). Never boost non-founder genomes directly. Founders also receive `_waterFear: 0.35` as pre-existing adult experience (God Mode exemption).

## Social System

6 group roles: `LEADER ELDER WARRIOR GATHERER HEALER MEMBER`
6 relationship types: `KIN MATE ALLY RIVAL NEUTRAL OUTGROUP`
Features: group fission on dissent, leadership contests, intergroup conflict.

## Movement System

Movement angle is influenced (in order) by: survival stress (hunger/thirst) → band centroid cohesion → food memory → mating drive → water fear avoidance. Behavioral, not physics-based. `_lastLandX/Y` enables panic-return when HP < 0.6 in water.

## Fear / Learned Behavior

- `_waterFear` decays at 0.0005/tick (~2000 days to zero). Avoidance activates when fear > 0.05.
- Death witnessing: kin death → `+0.7 * proximity` to relevant fear; nearby death → `+0.4 * proximity`.
- Disaster/flood → `_waterFear + 0.3`; predator death → `predator fear`; drowning → `_waterFear + 0.3`.
- `_waterFear` is inherited: child starts with `(parent1._waterFear + parent2._waterFear) / 2 * 0.45`.

## Client Panels (27)

**Core:** `PopulationPyramidPanel StatsPanel PopulationPanel DetailPanel EventsPanel`
**Scientific:** `BiologyPanel LanguagePanel EnvironmentPanel EpigeneticsPanel PsychologyPanel BeliefPanel CulturePanel TechnologyPanel`
**Advanced:** `SocialPanel EconomyPanel ArchitecturePanel LawPanel AstronomyPanel ArtPanel MicrobiomePanel`
**Experimental:** `HypothesisPanel GodPanel GenealogyPanel AnalysisPanel TimeMachinePanel ReportPanel`

## API Routes

```
/api/auth        — login, register
/api/simulations — create, start, pause, get state, checkpoint, time machine
/api/god         — founder interventions (God Mode)
/api/aria        — AI hypothesis evaluation
/api/analysis    — statistical analysis
/api/admin       — seed-admin
```

## Common Patterns

```js
// Safe phenotype access
const iq = individual.phenotype?.fluid_intelligence ?? 0.5;

// Safe age access
const ageYears = (individual.age ?? 0) / 365;

// Tech discovery (cumulative)
tryDiscoverTech(ind, this.discoveredTechs, this.worldState, day, this.techProgress);

// Beliefs are Sets in memory, arrays in DB
ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);

// Volatile field access (may be missing after DB load)
const fear = ind._waterFear ?? 0;
const fears = ind._fears ?? {};

// Trauma anxiety — never mutate phenotype.anxiety
ps.trauma_anxiety = Math.min((ps.trauma_anxiety ?? 0) + delta, 0.7);
const effectiveAnxiety = Math.min(1, (p.anxiety ?? 0.3) + (ps.trauma_anxiety ?? 0));
```

## Dev Commands

```bash
# Rust server (port 3001)
cd rust && cargo run -p sim-server

# Client (port 5173)
cd client && npm run dev

# Admin seed (after migration)
curl -X POST http://localhost:3001/api/admin/seed-admin \
  -H "x-seed-token: $ADMIN_SEED_TOKEN" \
  -H "Content-Type: application/json"
```

## Branch Strategy

All development directly on `main` → push → Render auto-deploys.

# Anatolia-Sim

**An agent-based civilization simulator built around a single scientific question:**

> If two DNA-engineered founding individuals are released into a simulated world, can their descendants independently develop consciousness, language, technology, belief systems, and civilization through nothing but genetic inheritance and observational learning?

No individual other than the two founders is ever directly programmed. Every behavior that emerges in subsequent generations must arise from the same two mechanisms that drive real human evolution: **genetic transmission** and **social/observational learning**.

---

## Core Hypothesis

The simulation tests whether emergent complexity — language stages, consciousness, cultural norms, religion, law, art, astronomy — can arise from a minimal genetic seed without any scripted shortcuts for non-founder individuals.

Founders carry precisely tuned alleles across 32 gene loci (FOXP2, BDNF, NRXN1, OXTR, …). Every child inherits through Mendelian recombination with ~2 mutations per gamete (~4 per child). Phenotypes — intelligence, curiosity, aggression, language capacity, consciousness potential — flow entirely from the genome.

---

## Architecture

The simulation runs 17 concurrent engines per tick (1 tick = 1 simulation day):

| Engine | Purpose |
|---|---|
| **Biology** | Aging, mortality, reproduction, life stages |
| **Genome** | 32-locus Mendelian inheritance, stress-scaled mutation |
| **Epigenetics** | Heritable methylation (BDNF, HPA axis, OXTR, immune priming) |
| **Microbiome** | Gut diversity, infection spread, soil health coupling |
| **Language** | FOXP2 expression growth, 7-stage emergence, organic vocabulary |
| **Consciousness** | Genetics × language × social context, gated by potential |
| **Psychology** | Wellbeing, stress, theory of mind (0–3), grief, attachment |
| **Technology** | Cumulative discovery, 25 techs across 5 tiers (0–4) |
| **Belief** | Proto-beliefs → animism → polytheism → monotheism |
| **Culture** | Meme spread scaled by group consciousness |
| **Art** | 12 art forms, consciousness micro-boost |
| **Architecture** | Settlement building, labor pool, overcrowding events |
| **Law** | Norm emergence, social order, norm violations |
| **Astronomy** | Celestial observations, calendar, eclipse prediction |
| **Social** | Group dynamics, leadership contests, inter-group conflict |
| **Economy** | Foraging, trade, Gini coefficient, soil-health farming |
| **Environment** | Biome, seasons, weather, natural disasters |

---

## Key Mechanics

### FOXP2 Expression
Language capacity is not hardcoded. Each individual's `foxp2_expression` starts at 10% of their genetic ceiling at birth and grows through social group interaction. Founders start at 70% (adult-level). Language stages (0–6: pre-linguistic → writing) unlock only when expression thresholds, group size, and generation count are all met.

### Emergent Consciousness
`mind.consciousness` accumulates daily from:
```
Δ = consciousness_potential × 0.0001 + (lang_stage/6) × 0.00005 + social_bonus + (ToM/3) × 0.00003 − stress_penalty
```
Hard ceiling: `consciousness_potential × 1.2` — individuals with low genetic potential cannot reach full consciousness regardless of environment.

### Stress-Scaled Mutation
When parental `BDNF_PROMOTER` methylation is elevated (famine signal), `createGamete()` applies a higher mutation probability to offspring gametes — modeling epigenetically-mediated transgenerational stress response.

### Soil Health
Microbiome diversity → `worldState.soil_health` → plant cultivation yield. A civilization that degrades its gut flora through stress and disease will find its farming less productive.

### Quality of Life Index
```
QoL = consciousness×0.3 + (lang_stage/6)×0.2 + health×0.3 + wellbeing×0.2
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Simulation** | Node.js (ES modules), agent-based loop |
| **API** | Express, JWT auth, WebSocket (live stats) |
| **Database** | PostgreSQL (checkpoints, events, conversations) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **AI** | Anthropic Claude (hypothesis testing, individual conversations) |
| **Deploy** | Render.com (auto-deploy on main push) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
git clone https://github.com/atabeyler/anatolia-sim.git
cd anatolia-sim

# Server
cd server && npm install
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY

# Client
cd ../client && npm install
```

### Database Setup

```bash
cd server
npm run db:migrate
```

Then seed the admin account via API (requires `ADMIN_SEED_TOKEN` from `.env`):

```bash
curl -X POST http://localhost:3001/api/admin/seed-admin \
  -H "x-seed-token: YOUR_ADMIN_SEED_TOKEN" \
  -H "Content-Type: application/json"
```

### Run Locally

```bash
# Terminal 1 — API server (port 3001)
cd server && npm run dev

# Terminal 2 — React client (port 5173)
cd client && npm run dev
```

Open `http://localhost:5173`, create a simulation, configure your two founding individuals, and press **Start**.

---

## Simulation Controls

- **God Mode** — Trigger earthquakes, floods, epidemics, volcanic eruptions, meteors; toggle quarantine mode to suppress disasters; speak to individuals in their current language stage
- **Hypothesis Test** — State any hypothesis in natural language; Claude evaluates it against live simulation data
- **Time Machine** — Jump to any historical checkpoint
- **Genealogy** — Visualize the founder family tree across generations
- **AI Analysis** — Generate narrative summaries of civilization progress

---

## Panels

| Panel | Shows |
|---|---|
| Population | Age pyramid, sex ratio, births/deaths |
| Biology | Health, consciousness, theory of mind |
| Language | Stage, phonology, dialect divergence |
| Technology | Discovery tree with progress bars |
| Belief | Proto-beliefs → archetypes → spread |
| Culture | Meme emergence, cultural prestige |
| Psychology | Wellbeing, stress, happiness index |
| Epigenetics | Methylation levels (HPA, BDNF, OXTR, …) |
| Genealogy | Family tree from any root individual |
| Hypothesis | AI-powered hypothesis testing |

---

## Scientific Background

The project draws on:

- **FOXP2** — The "language gene"; expression drives communication stage progression
- **Theory of Mind** — Numeric 0–3 scale; gates social complexity and belief formation
- **Epigenetic inheritance** — BDNF, HPA axis, and OXTR methylation are heritable across 2 generations with configurable heritability coefficients
- **Inbreeding coefficient** — Computed from shared grandparents; elevated inbreeding reduces phenotype fitness
- **Cultural transmission fidelity** — Meme spread rate scales with group consciousness, modeling the observation that more cognitively complex societies transmit culture more faithfully

---

## Project Notes

> No individual other than the two founders may be given any behavior except through genetic inheritance and observational learning. This constraint is the entire point of the experiment.

---

## License

MIT

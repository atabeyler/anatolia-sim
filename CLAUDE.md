# Anatolia-Sim — CLAUDE.md

## Project Purpose

Agent-based civilization simulator. Two DNA-engineered founding individuals are placed in a world; the experiment tests whether their descendants can develop consciousness, language, technology, and civilization through **genetic inheritance and observational learning only**.

## Cardinal Rule

> No individual other than the two founders may be given any behavior except through genetic inheritance and observational learning.

This rule must never be violated. Before adding any logic that sets a property or triggers a behavior on a non-founder individual, ask: does this happen because of a gene they inherited, or something they observed/learned? If neither, it is forbidden.

## Architecture

- **Stack**: Node.js (ES modules) + Express API + React 18 + TypeScript + PostgreSQL
- **Simulation**: `server/src/engines/simulationLoop.js` — 17 engines per tick (1 tick = 1 sim day)
- **Client**: `client/src/` — Vite + Tailwind, panels in `components/panels/`
- **Deploy**: Render.com, auto-deploy on `main` push

## Key Engine Files

| File | Purpose |
|---|---|
| `engines/biology/genome.js` | 32-locus Mendelian inheritance, stress-scaled mutation |
| `engines/biology/individual.js` | createFounder(), createChild() |
| `engines/language/languageEngine.js` | FOXP2 expression, 7-stage emergence (stages 0–6) |
| `engines/consciousness/consciousnessEngine.js` | updateConsciousness() — sole entry point for consciousness changes |
| `engines/belief/beliefEngine.js` | Proto-beliefs → archetypes |
| `engines/technology/technologyEngine.js` | Cumulative techProgress Map |
| `engines/culture/cultureEngine.js` | Consciousness-scaled meme spread |
| `engines/epigenetics/epigeneticsEngine.js` | Methylation inheritance |
| `engines/social/socialEngine.js` | Groups, leadership, conflict |
| `engines/economy/economyEngine.js` | Gathering, trade, soil health |
| `engines/simulationLoop.js` | Main tick orchestrator |

## Simulation State

- `this.population` — `Map<id, individual>`
- `this.discoveredTechs` — `Set<techId>`
- `this.discoveredBeliefs` — `Set<beliefId>`
- `this.discoveredArts` — `Set<artId>`
- `this.techProgress` — `Map<techId, float>` (cumulative, fires at ≥ 1.0)
- `this.groups` — array of group objects (`.culture` and `.norms` are Sets)
- `this.worldState` — environment (biome, season, temperature, soil_health, …)

## Consciousness Formula

Implemented exclusively in `engines/consciousness/consciousnessEngine.js`.
Cardinal rule: **no other code may directly set `ind.mind.consciousness`.**

```
baseRate      = max(potential × 0.001, 0.00015)
langBonus     = (lang_stage / 6) × 0.0005
socialBonus   = 0.0002  (if ind is in a group, else 0)
tomBonus      = (theory_of_mind / 3) × 0.0003
stressPenalty = stress_level × 0.0003

Δ = baseRate + langBonus + socialBonus + tomBonus − stressPenalty
ceiling = min(1, consciousness_potential × 1.2)
```

## FOXP2 Expression

- Newborns: `language_capacity × 0.1`
- Founders: `language_capacity × 0.7`
- Grows via `updateFoxp2Expression(ind, groupMemberCount)` each tick

## QoL Index

```
QoL = consciousness×0.3 + (lang_stage/6)×0.2 + health_score×0.3 + wellbeing×0.2
```

## Epigenetic Updates — Cardinal Rule Clarification

`updateEpigenome()` modifies methylation levels on non-founder individuals in response to
stress, nutrition, and isolation. This is **permitted** under the cardinal rule because:
methylation responses are pre-programmed by the genome (the gene encodes the sensitivity
to environmental signals). The environment triggers a genetically-encoded mechanism —
it does not inject external behavior. Code touching epigenome outside of
`epigeneticsEngine.js` still requires review.

## God Mode Restriction

`genetic_boost` only applies to founders (`ind.is_founder === true`). Never boost non-founder genomes directly.

## Common Patterns

```js
// Safe phenotype access (may be undefined)
const iq = individual.phenotype?.fluid_intelligence ?? 0.5;

// Safe age access
const ageYears = (individual.age ?? 0) / 365;

// Tech discovery (cumulative)
tryDiscoverTech(ind, this.discoveredTechs, this.worldState, day, this.techProgress);

// Beliefs are Sets in memory, arrays in DB
ind.beliefs = new Set(Array.isArray(ind.beliefs) ? ind.beliefs : []);
```

## Dev Commands

```bash
# Server (port 3001)
cd server && npm run dev

# Client (port 5173)
cd client && npm run dev

# DB migration
cd server && npm run db:migrate

# Admin seed (after migration)
curl -X POST http://localhost:3001/api/admin/seed-admin \
  -H "x-seed-token: $ADMIN_SEED_TOKEN" \
  -H "Content-Type: application/json"
```

## Branch Strategy

All development on feature branches → PR → squash merge to `main` → Render auto-deploys.

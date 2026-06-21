// Worker thread: processes a batch of individuals through independent per-individual phases.
// Runs concurrently with other workers on separate CPU cores.

import { parentPort } from 'worker_threads';
import { selectAction } from './agent/decisionEngine.js';
import { updateEpigenome } from './epigenetics/epigeneticsEngine.js';
import { updateGutMicrobiome } from './microbiome/microbiomeEngine.js';
import { updateMentalState } from './psychology/psychologyEngine.js';
import { updateConsciousness } from './consciousness/consciousnessEngine.js';
import { accumulateExperience } from './agent/activityEngine.js';
import { gatherResources, consumeResources, produceGoods } from './economy/economyEngine.js';

parentPort.on('message', ({ individuals, worldState, discoveredTechs, day }) => {
  const techSet = new Set(discoveredTechs);
  const events = [];

  for (const ind of individuals) {
    // Restore Sets from transferred arrays
    ind.beliefs    = new Set(ind.beliefs    ?? []);
    ind.known_techs = new Set(ind.known_techs ?? []);

    // ── 0. Action selection ──────────────────────────────────────────────────
    ind._currentAction = selectAction(ind, worldState);
    if (!ind._behaviorCounts) ind._behaviorCounts = {};
    ind._behaviorCounts[ind._currentAction] = (ind._behaviorCounts[ind._currentAction] ?? 0) + 1;

    // ── 2. Epigenetics & microbiome ─────────────────────────────────────────
    updateEpigenome(ind, worldState, day);
    updateGutMicrobiome(ind, worldState);

    // ── 3. Economy (adults ≥ 2 yr; infants handled in main thread) ──────────
    const ageYears = (ind.age ?? 0) / 365;
    if (ageYears >= 2) {
      const gathered = gatherResources(ind, worldState, techSet);
      for (const [res, qty] of Object.entries(gathered)) {
        ind.inventory[res] = (ind.inventory[res] ?? 0) + qty;
      }
      const { satiation, inv } = consumeResources(ind);
      ind.inventory = inv;
      ind.satiation = satiation;
      if (ind.health) {
        const targetCal = Math.min(1, satiation * 1.3);
        const targetHyd = Math.min(1, (inv.water ?? 0) > 0.5 ? 0.95 : 0.4);
        ind.health.calories  = (ind.health.calories  ?? 1) * 0.97 + targetCal * 0.03;
        ind.health.hydration = (ind.health.hydration ?? 1) * 0.97 + targetHyd * 0.03;
      }
      const { produced, inv: prodInv } = produceGoods(ind, techSet);
      ind.inventory = prodInv;
      for (const [good, qty] of Object.entries(produced)) {
        ind.inventory[good] = (ind.inventory[good] ?? 0) + qty;
      }
    }

    // ── 5. Psychology ────────────────────────────────────────────────────────
    const indEvents = [];
    updateMentalState(ind, indEvents, worldState, day);
    events.push(...indEvents);

    // ── 5b. Consciousness ────────────────────────────────────────────────────
    updateConsciousness(ind);

    // ── 13. Experience accumulation ──────────────────────────────────────────
    accumulateExperience(ind, worldState);

    // Serialize Sets back to plain arrays for structured-clone transfer
    ind.beliefs     = [...ind.beliefs];
    ind.known_techs = [...ind.known_techs];
  }

  parentPort.postMessage({ deltas: individuals, events });
});

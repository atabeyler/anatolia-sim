import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { geminiChat } from '../../utils/gemini.js';
import { simulationManager } from '../simulationManager.js';
import { getAge } from '../../engines/biology/individual.js';

const router = Router();

const SIM_ARCHITECTURE = `
SIMULATION ARCHITECTURE (design decisions — know these precisely):
- Founders (is_founder=true): Anchored to their starting coordinates. They do NOT move. This is an intentional design decision — they hold the center of the family band.
- Other individuals: Attracted toward the group centroid; founder positions naturally pull this centroid toward the home point.
- Movement priorities: Hunger/thirst > band cohesion > mating drive.
- mating_urge: Accumulates daily; resets on mating; 0 during pregnancy; does not affect movement until basic needs are met.
- No monogamy. Any nearby compatible individual can mate.
- Infant mortality: ~8%/year (age 0-1). A protection mechanism is active for small groups.
- If inbreeding_coeff > 0.25, death risk increases by 50% — close-relative mating is problematic.
`;

function buildEngineContext(engine) {
  if (!engine) return 'Simulation is not currently running.';

  const day = engine.currentDay;
  const allInds = [...engine.population.values()];
  const alive   = allInds.filter(i => !i.is_dead);
  const dead    = allInds.filter(i => i.is_dead && i.birth_day != null);

  // ── World state ──────────────────────────────────────────────────────────
  const ws = engine.worldState ?? {};
  const worldLine = `World: Biome=${ws.biome}, Season=${ws.season}, ` +
    `Temperature=${Math.round(ws.temperature ?? 0)}°C, ` +
    `Food=${((ws.food_abundance ?? 0) * 100).toFixed(0)}%, ` +
    `Water=${((ws.water_abundance ?? 0) * 100).toFixed(0)}%, ` +
    `Weather=${ws.current_weather ?? 'clear'} (intensity ${Math.round((ws.weather_intensity ?? 0.5) * 100)}%)`;

  // ── Population summary ────────────────────────────────────────────────────
  const avgAge = alive.length
    ? (alive.reduce((s, i) => s + getAge(i, day), 0) / alive.length).toFixed(1)
    : 0;
  const popLine = `Population: ${alive.length} alive / ${allInds.length} total born, ` +
    `Year: ${Math.floor(day / 365)}, Average age: ${avgAge}, ` +
    `Male: ${alive.filter(i => i.sex === 'male').length}, Female: ${alive.filter(i => i.sex === 'female').length}`;

  // ── Death statistics ─────────────────────────────────────────────────────
  let deathLine = 'Deaths: None yet';
  if (dead.length) {
    const ages = dead.map(i => (i.death_day - i.birth_day) / 365);
    const avg  = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const inf  = ages.filter(a => a < 1).length;
    const ch   = ages.filter(a => a >= 1 && a < 15).length;
    const causes = {};
    for (const i of dead) { const c = i.death_cause ?? i.cause_of_death ?? 'unknown'; causes[c] = (causes[c] ?? 0) + 1; }
    const topCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, v]) => `${k}:${v}`).join(', ');
    deathLine = `Deaths: ${dead.length} total, Average age at death: ${avg} years, ` +
      `Infant (<1 year): ${inf}, Child (1-15 years): ${ch}, Causes: ${topCauses}`;
  }

  // ── Founders ─────────────────────────────────────────────────────────────
  const founders = allInds.filter(i => i.is_founder);
  const foundersLine = founders.length
    ? 'Founders (fixed position, do not move):\n' + founders.map(f => {
        const age = Math.round(getAge(f, day));
        return `  - ${f.sex === 'male' ? 'Male' : 'Female'} founder, age ${age}, ` +
          `${f.is_dead ? `DEAD (${f.death_cause ?? '?'}, age ${Math.round((f.death_day - f.birth_day) / 365)})` : 'alive'}, ` +
          `position: (${(f.x ?? 0).toFixed(2)}°, ${(f.y ?? 0).toFixed(2)}°)`;
      }).join('\n')
    : 'No founders found';

  // ── Individual list ───────────────────────────────────────────────────────
  const MAX_IND = 60;
  const indsToShow = alive.slice(0, MAX_IND);
  const indLines = indsToShow.map(i => {
    const age    = Math.round(getAge(i, day));
    const name   = i.phenotype?.name ?? `${i.sex === 'male' ? '♂' : '♀'}-${i.id.slice(-4).toUpperCase()}`;
    const hp     = Math.round((i.health?.hp ?? 1) * 100);
    const cal    = Math.round((i.health?.calories ?? 1) * 100);
    const urge   = Math.round((i.mating_urge ?? 0) * 100);
    const preg   = i.health?.pregnancy ? ' [PREGNANT]' : '';
    const found  = i.is_founder ? ' [FOUNDER-FIXED]' : '';
    const grp    = i.group_id ? ` [group:${i.group_id.slice(-4)}]` : '';
    const stress = Math.min(1, Math.max(0,
      Math.max((0.45 - (i.health?.calories ?? 0.7)) / 0.45, (0.35 - (i.health?.hydration ?? 0.7)) / 0.35)
    ));
    const drive  = stress > 0.4 ? 'seeking food/water' : urge > 65 ? 'seeking mate' : 'in band';
    return `  ${name} | ${i.sex === 'male' ? 'M' : 'F'} age:${age} hp:${hp}% cal:${cal}% mating-urge:${urge}%${preg}${found}${grp} → ${drive}`;
  });
  const indSection = `Individuals (${alive.length} alive${alive.length > MAX_IND ? `, showing first ${MAX_IND}` : ''}):\n` +
    indLines.join('\n');

  // ── Groups ───────────────────────────────────────────────────────────────
  let groupLine = 'Groups: None yet';
  if (engine.groups?.length) {
    groupLine = 'Groups:\n' + engine.groups.map(g => {
      const members = alive.filter(i => g.member_ids?.includes(i.id));
      return `  - Group ${g.id.slice(-4)}: ${members.length} members, ` +
        `center (${(g.territory?.x ?? 0).toFixed(1)}°, ${(g.territory?.y ?? 0).toFixed(1)}°)`;
    }).join('\n');
  }

  // ── Technology / belief / art ─────────────────────────────────────────────
  const techLine  = `Technologies (${engine.discoveredTechs?.size ?? 0}): ${[...(engine.discoveredTechs ?? [])].join(', ') || 'none'}`;
  const beliefLine = `Beliefs (${engine.discoveredBeliefs?.size ?? 0}): ${[...(engine.discoveredBeliefs ?? [])].slice(0, 10).join(', ') || 'none'}`;

  // ── Recent events ────────────────────────────────────────────────────────
  const recentEvents = (engine.events ?? []).slice(-30).reverse()
    .map(e => `  Y${e.sim_year} [${e.event_type}] ${e.description}`)
    .join('\n');

  // ── Movement context ─────────────────────────────────────────────────────
  const cx = alive.reduce((s, i) => s + (i.x ?? 0), 0) / Math.max(1, alive.length);
  const cy = alive.reduce((s, i) => s + (i.y ?? 0), 0) / Math.max(1, alive.length);
  const avgCal  = alive.reduce((s, i) => s + (i.health?.calories ?? 0.7), 0) / Math.max(1, alive.length);
  const avgUrge = alive.reduce((s, i) => s + (i.mating_urge ?? 0), 0) / Math.max(1, alive.length);
  const dominant = avgCal < 0.38 ? 'foraging' : avgUrge > 0.65 ? 'seeking mate' : 'band cohesion';
  const moveLine = `Movement: Dominant drive="${dominant}", avg.calories=${(avgCal * 100).toFixed(0)}%, ` +
    `avg.mating-urge=${(avgUrge * 100).toFixed(0)}%, ` +
    `band center=(${cx.toFixed(2)}°, ${cy.toFixed(2)}°)`;

  return [worldLine, popLine, deathLine, '', foundersLine, '', indSection, '', groupLine, '',
    techLine, beliefLine, moveLine, '', 'Last 30 events:', recentEvents].join('\n');
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message } = req.body;
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const response = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 800,
      system: `You are an expert AI assistant analyzing the ANATOLIA-SIM civilization simulation.\n\n${SIM_ARCHITECTURE}\n\nCURRENT SIMULATION DATA:\n${context}\n\nProvide your response in English — concise, precise, and data-driven. You know the architectural design decisions.`,
      user: message,
    });
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Wilson score 95% confidence interval for a proportion p observed over n independent events.
function wilsonCI(p, n) {
  if (n <= 0) return [0, 1];
  const z = 1.96;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, +(centre - margin).toFixed(3)), Math.min(1, +(centre + margin).toFixed(3))];
}

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { hypothesis, events: clientEvents } = req.body;
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const text = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${SIM_ARCHITECTURE}\n${context}`,
      user: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"n_evidence":integer,"reasoning":"..."}`,
    });
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    // Compute Wilson score 95% CI from confidence and evidence count.
    // n_evidence is the number of observed events the LLM considers relevant;
    // fall back to total events sent if the LLM didn't report it.
    const n = (typeof json.n_evidence === 'number' && json.n_evidence > 0)
      ? json.n_evidence
      : (Array.isArray(clientEvents) ? clientEvents.length : 20);
    const [ci_lower, ci_upper] = wilsonCI(json.confidence ?? 0.5, n);
    res.json({ ...json, ci_lower, ci_upper, n_evidence: n });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hypothesis test failed' });
  }
});

export default router;

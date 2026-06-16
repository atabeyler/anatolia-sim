import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { geminiChat } from '../../utils/gemini.js';
import { simulationManager } from '../simulationManager.js';
import { getAge } from '../../engines/biology/individual.js';

const router = Router();

const LANGUAGE_NAMES = {
  tr: 'Turkish',
  en: 'English',
  de: 'German',
  fr: 'French',
  ar: 'Arabic',
};

function normalizeLang(lang) {
  return LANGUAGE_NAMES[lang] ? lang : 'en';
}

function languageInstruction(lang) {
  const code = normalizeLang(lang);
  const name = LANGUAGE_NAMES[code];
  return `Respond ONLY in ${name}. Do not switch languages. Translate all headings, explanations, findings, warnings, and reasoning into ${name}. Keep IDs, names, gene symbols, numbers, and raw event codes unchanged.`;
}

const SIM_ARCHITECTURE = `
SIMULATION ARCHITECTURE:
- Founders are fixed reference individuals by design.
- Non-founder behavior must emerge from inherited traits, environment, observation, and simulation state.
- Movement prioritizes basic survival, group cohesion, and social needs.
- Population, technology, belief, culture, health, events, and group data are live simulation outputs.
- Be skeptical: distinguish engine facts from UI/event-description ambiguity.
`;

function buildEngineContext(engine) {
  if (!engine) return 'Simulation is not currently running.';

  const day = engine.currentDay;
  const allInds = [...engine.population.values()];
  const alive = allInds.filter(i => !i.is_dead);
  const dead = allInds.filter(i => i.is_dead && i.birth_day != null);
  const ws = engine.worldState ?? {};

  const worldLine = `World: biome=${ws.biome}, season=${ws.season}, temp=${Math.round(ws.temperature ?? 0)}C, food=${((ws.food_abundance ?? 0) * 100).toFixed(0)}%, water=${((ws.water_abundance ?? 0) * 100).toFixed(0)}%, weather=${ws.current_weather ?? 'clear'}`;

  const avgAge = alive.length ? (alive.reduce((s, i) => s + getAge(i, day), 0) / alive.length).toFixed(1) : 0;
  const popLine = `Population: alive=${alive.length}, total_born=${allInds.length}, year=${Math.floor(day / 365)}, avg_age=${avgAge}, male=${alive.filter(i => i.sex === 'male').length}, female=${alive.filter(i => i.sex === 'female').length}`;

  let deathLine = 'Deaths: none';
  if (dead.length) {
    const ages = dead.map(i => (i.death_day - i.birth_day) / 365);
    const avg = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const causes = {};
    for (const i of dead) {
      const c = i.death_cause ?? i.cause_of_death ?? 'unknown';
      causes[c] = (causes[c] ?? 0) + 1;
    }
    const topCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ');
    deathLine = `Deaths: count=${dead.length}, avg_age=${avg}, causes=${topCauses}`;
  }

  const founders = allInds.filter(i => i.is_founder);
  const foundersLine = founders.length
    ? 'Founders:\n' + founders.map(f => {
        const age = Math.round(getAge(f, day));
        return `  - id=${f.id}, sex=${f.sex}, age=${age}, status=${f.is_dead ? 'dead' : 'alive'}, pos=(${(f.x ?? 0).toFixed(2)},${(f.y ?? 0).toFixed(2)})`;
      }).join('\n')
    : 'Founders: none';

  const MAX_IND = 60;
  const indLines = alive.slice(0, MAX_IND).map(i => {
    const age = Math.round(getAge(i, day));
    const name = i.phenotype?.name ?? `${i.sex === 'male' ? 'M' : 'F'}-${i.id.slice(-4).toUpperCase()}`;
    const hp = Math.round((i.health?.hp ?? 1) * 100);
    const cal = Math.round((i.health?.calories ?? 1) * 100);
    const preg = i.health?.pregnancy ? ' pregnant=true' : '';
    const found = i.is_founder ? ' founder=true' : '';
    const grp = i.group_id ? ` group=${i.group_id.slice(-4)}` : '';
    return `  ${name} | id=${i.id} sex=${i.sex} age=${age} hp=${hp}% calories=${cal}%${preg}${found}${grp}`;
  });
  const indSection = `Individuals (${alive.length} alive${alive.length > MAX_IND ? `, showing ${MAX_IND}` : ''}):\n${indLines.join('\n')}`;

  let groupLine = 'Groups: none';
  if (engine.groups?.length) {
    groupLine = 'Groups:\n' + engine.groups.map(g => {
      const members = alive.filter(i => g.member_ids?.includes(i.id));
      return `  - group=${g.id.slice(-4)} members=${members.length}`;
    }).join('\n');
  }

  const techLine = `Technologies (${engine.discoveredTechs?.size ?? 0}): ${[...(engine.discoveredTechs ?? [])].join(', ') || 'none'}`;
  const beliefLine = `Beliefs (${engine.discoveredBeliefs?.size ?? 0}): ${[...(engine.discoveredBeliefs ?? [])].slice(0, 10).join(', ') || 'none'}`;
  const recentEvents = (engine.events ?? []).slice(-30).reverse().map(e => `  Y${e.sim_year} [${e.event_type}] ${e.description}`).join('\n');

  return [worldLine, popLine, deathLine, '', foundersLine, '', indSection, '', groupLine, '', techLine, beliefLine, '', 'Last 30 events:', recentEvents].join('\n');
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message, lang } = req.body;
    const activeLang = normalizeLang(lang);
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const response = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 800,
      system: `You are an expert AI assistant analyzing the ANATOLIA-SIM civilization simulation.\n${languageInstruction(activeLang)}\n\n${SIM_ARCHITECTURE}\nCURRENT SIMULATION DATA:\n${context}\n\nBe concise, precise, skeptical, and data-driven.`,
      user: message,
    });
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

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
    const { hypothesis, events: clientEvents, lang } = req.body;
    const activeLang = normalizeLang(lang);
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const llmText = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${languageInstruction(activeLang)}\n\n${SIM_ARCHITECTURE}\nCURRENT SIMULATION DATA:\n${context}`,
      user: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"n_evidence":integer,"reasoning":"..."}\nThe verdict keys must stay in English; the reasoning value must be in ${LANGUAGE_NAMES[activeLang]}.`,
    });
    const match = llmText.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: activeLang === 'tr' ? 'Yetersiz veri.' : 'Insufficient data.' };
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

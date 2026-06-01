import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { openrouterChat } from '../../utils/openrouter.js';

const router = Router();

function buildContext(stats, events) {
  return `Simulation state - Year: ${stats?.year ?? '?'}, Population: ${stats?.population ?? '?'}, ` +
    `Tech: ${stats?.technologies ?? 0}, Beliefs: ${stats?.beliefs ?? 0}, Art: ${stats?.art_forms ?? 0}, ` +
    `Groups: ${stats?.groups ?? 0}, Gini: ${stats?.gini ?? 0}, Happiness: ${((stats?.happiness_index ?? 0.5) * 100).toFixed(0)}%, ` +
    `Sick: ${((stats?.sick_rate ?? 0) * 100).toFixed(0)}%, Season: ${stats?.season ?? 'spring'}, Temp: ${stats?.temperature ?? 20}C\n` +
    `Recent events:\n${(events ?? []).slice(0, 12).map(e => `- Y${e.sim_year} [${e.event_type}] ${e.description}`).join('\n')}`;
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message, stats, events } = req.body;
    const response = await openrouterChat({
      model: process.env.OPENROUTER_ANALYSIS_MODEL || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
      max_tokens: 800,
      system: `Sen ANATOLIA-SIM medeniyet simulasyonunu analiz eden uzman bir yapay zeka asistansin.\n\n${buildContext(stats, events)}\n\nYaniti kisa, net ve veriye dayali ver.`,
      user: message,
    });
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { hypothesis, stats, events } = req.body;
    const text = await openrouterChat({
      model: process.env.OPENROUTER_ANALYSIS_MODEL || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
      max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${buildContext(stats, events)}`,
      user: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"reasoning":"..."}`,
    });
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hypothesis test failed' });
  }
});

export default router;

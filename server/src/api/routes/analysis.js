import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildContext(stats, events) {
  return `Simulation state — Year: ${stats?.year ?? '?'}, Population: ${stats?.population ?? '?'}, ` +
    `Tech: ${stats?.technologies ?? 0}, Beliefs: ${stats?.beliefs ?? 0}, Art: ${stats?.art_forms ?? 0}, ` +
    `Groups: ${stats?.groups ?? 0}, Gini: ${stats?.gini ?? 0}, Happiness: ${((stats?.happiness_index ?? 0.5) * 100).toFixed(0)}%, ` +
    `Sick: ${((stats?.sick_rate ?? 0) * 100).toFixed(0)}%, Season: ${stats?.season ?? 'spring'}, Temp: ${stats?.temperature ?? 20}°C\n` +
    `Recent events:\n${(events ?? []).slice(0, 12).map(e => `- Y${e.sim_year} [${e.event_type}] ${e.description}`).join('\n')}`;
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message, stats, events } = req.body;
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7', max_tokens: 800,
      system: `Sen ANATOLİA-SİM MEDENİYET simülasyonunu analiz eden uzman bir yapay zeka asistanısın. Proje: RST Q-Nation 200120401018. Simülasyon verilerine tam erişimin var. Bilimsel, tarafsız ve detaylı analizler yaparsın. Simülasyon hipotezi, evrimsel biyoloji, popülasyon genetiği ve sosyal bilimler konusunda uzmansın. Hem Türkçe hem İngilizce akıcı biçimde yanıt verirsin — kullanıcının dilinde yanıtla.\n\n${buildContext(stats, events)}\n\nYanıtları kısa, net ve veriye dayalı tut.`,
      messages: [{ role: 'user', content: message }],
    });
    res.json({ response: response.content[0].text });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Analysis failed' }); }
});

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { hypothesis, stats, events } = req.body;
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7', max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${buildContext(stats, events)}`,
      messages: [{ role: 'user', content: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"reasoning":"..."}` }],
    });
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    res.json(json);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Hypothesis test failed' }); }
});

export default router;

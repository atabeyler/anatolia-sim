import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import OpenAI from 'openai';

const router = Router();


function buildContext(stats, events) {
  return `Simulation state — Year: ${stats?.year ?? '?'}, Population: ${stats?.population ?? '?'}, ` +
    `Tech: ${stats?.technologies ?? 0}, Beliefs: ${stats?.beliefs ?? 0}, Art: ${stats?.art_forms ?? 0}, ` +
    `Groups: ${stats?.groups ?? 0}, Gini: ${stats?.gini ?? 0}, Happiness: ${((stats?.happiness_index ?? 0.5) * 100).toFixed(0)}%, ` +
    `Sick: ${((stats?.sick_rate ?? 0) * 100).toFixed(0)}%, Season: ${stats?.season ?? 'spring'}, Temp: ${stats?.temperature ?? 20}°C\n` +
    `Recent events:\n${(events ?? []).slice(0, 12).map(e => `- Y${e.sim_year} [${e.event_type}] ${e.description}`).join('\n')}`;
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GROQ_API_KEY not configured' });
    const { message, stats, events } = req.body;
    const client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', maxRetries: 0, defaultHeaders: { 'HTTP-Referer': 'https://anatolia-sim.onrender.com', 'X-Title': 'ANATOLIA-SIM' } });
    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 800,
      messages: [
        { role: 'system', content: `Sen ANATOLİA-SİM MEDENİYET simülasyonunu analiz eden uzman bir yapay zeka asistanısın. Simülasyon verilerine tam erişimin var. Bilimsel, tarafsız ve detaylı analizler yaparsın. Hem Türkçe hem İngilizce akıcı biçimde yanıt verirsin — kullanıcının dilinde yanıtla.\n\n${buildContext(stats, events)}\n\nYanıtları kısa, net ve veriye dayalı tut.` },
        { role: 'user', content: message },
      ],
    });
    res.json({ response: completion.choices[0].message.content ?? '' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Analysis failed' }); }
});

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GROQ_API_KEY not configured' });
    const { hypothesis, stats, events } = req.body;
    const client = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', maxRetries: 0, defaultHeaders: { 'HTTP-Referer': 'https://anatolia-sim.onrender.com', 'X-Title': 'ANATOLIA-SIM' } });
    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `You are a scientist evaluating hypotheses about a civilization simulation.\n${buildContext(stats, events)}` },
        { role: 'user', content: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"reasoning":"..."}` },
      ],
    });
    const text = completion.choices[0].message.content ?? '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    res.json(json);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Hypothesis test failed' }); }
});

export default router;

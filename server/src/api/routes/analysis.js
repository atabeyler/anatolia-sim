import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    const { message, stats, events } = req.body;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Sen ANATOLİA-SİM MEDENİYET simülasyonunu analiz eden uzman bir yapay zeka asistanısın. Simülasyon verilerine tam erişimin var. Bilimsel, tarafsız ve detaylı analizler yaparsın. Hem Türkçe hem İngilizce akıcı biçimde yanıt verirsin — kullanıcının dilinde yanıtla.\n\n${buildContext(stats, events)}\n\nYanıtları kısa, net ve veriye dayalı tut.`,
      generationConfig: { maxOutputTokens: 800 },
    });
    const result = await model.generateContent(message);
    res.json({ response: result.response.text() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Analysis failed' }); }
});

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    const { hypothesis, stats, events } = req.body;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are a scientist evaluating hypotheses about a civilization simulation.\n${buildContext(stats, events)}`,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 600,
      },
    });
    const result = await model.generateContent(
      `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"reasoning":"..."}`
    );
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    res.json(json);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Hypothesis test failed' }); }
});

export default router;

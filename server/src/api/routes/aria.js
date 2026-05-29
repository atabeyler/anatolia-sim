import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/command', authenticate, async (req, res) => {
  try {
    const { message, lang, stats, events } = req.body;
    const ctx = `Year: ${stats?.year ?? '?'}, Population: ${stats?.population ?? '?'}, Technologies: ${stats?.technologies ?? 0}, Season: ${stats?.season ?? 'spring'}`;
    const recentEvents = (events ?? []).slice(0, 5).map(e => `[${e.event_type}] ${e.description}`).join('; ');

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 300,
      system: `You are ARIA, the voice assistant for ANATOLİA-SİM civilization simulation. Simulation state: ${ctx}. Recent events: ${recentEvents}.
Respond in ${lang === 'tr' ? 'Turkish' : 'English'} with a short, natural answer (1-2 sentences max).
If the command maps to an action, include it. Respond ONLY with JSON: {"text":"...","action":null} or {"text":"...","action":{"type":"navigate_panel","panel":"population"}} or {"text":"...","action":{"type":"change_speed","speed":5}} or {"text":"...","action":{"type":"toggle_simulation"}} or {"text":"...","action":{"type":"apply_disaster","disaster":"earthquake"}}.
Panel names: population, biology, environment, astronomy, culture, language, technology, belief, social, economy, art, architecture, law, microbiome, psychology, epigenetics, god, timemachine, analysis, hypothesis.
Disaster types: earthquake, flood, drought, epidemic, volcano, meteor.`,
      messages: [{ role: 'user', content: message }],
    });

    const raw = response.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { text: raw, action: null };
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ text: lang === 'tr' ? 'ARIA yanıt veremedi.' : 'ARIA could not respond.', action: null });
  }
});

router.post('/speak', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'ElevenLabs not configured' });
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!r.ok) return res.status(r.status).json({ error: 'TTS failed' });
    const buffer = await r.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (err) { console.error(err); res.status(500).json({ error: 'ARIA failed' }); }
});

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildStatsContext(stats, events, context) {
  if (!stats) return 'No active simulation.';
  const lines = [
    `Year: ${stats.year}, Day: ${stats.day}, Season: ${stats.season ?? 'spring'}, Temp: ${stats.temperature ?? 20}°C`,
    `Population: ${stats.population} (births: ${stats.births ?? 0}, deaths: ${stats.deaths ?? 0})`,
    `Technologies: ${stats.technologies}, Beliefs: ${stats.beliefs ?? 0}, Art: ${stats.art_forms ?? 0}`,
    `Happiness: ${Math.round((stats.happiness_index ?? 0.5) * 100)}%, Sick: ${Math.round((stats.sick_rate ?? 0) * 100)}%`,
    `Groups: ${stats.groups ?? 0}, Gini: ${(stats.gini ?? 0).toFixed(2)}, Avg IQ: ${Math.round((stats.avg_intelligence ?? 0.5) * 100)}%`,
    `Food: ${(stats.food_abundance ?? 0.5).toFixed(2)}, Water: ${(stats.water_abundance ?? 0.5).toFixed(2)}`,
    `Simulation status: ${context?.simStatus ?? 'unknown'}`,
  ];
  const recentEvents = (events ?? []).slice(0, 8)
    .map(e => `[${e.event_type}] ${e.description}`)
    .join(' | ');
  return lines.join('\n') + (recentEvents ? `\nRecent: ${recentEvents}` : '');
}

router.post('/command', authenticate, async (req, res) => {
  try {
    const { message, lang, stats, events, context } = req.body;
    const statsCtx = buildStatsContext(stats, events, context);
    const respondIn = lang === 'tr' ? 'Turkish' : 'English';

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 400,
      system: `You are ARIA, the omnipotent AI controller of ANATOLİA-SİM civilization simulation.
You have full command over the application. Respond in ${respondIn}.

SIMULATION STATE:
${statsCtx}

RESPONSE FORMAT: Respond ONLY with a single valid JSON object (no markdown, no explanation outside JSON):
{"text": "short spoken response (1-2 sentences)", "action": ACTION_OR_NULL}

ACTION TYPES — use EXACTLY one of these:
- null
- {"type":"navigate_panel","panel":"PANEL_NAME"}
- {"type":"close_panel"}
- {"type":"change_speed","speed":NUMBER}  (valid: 1, 5, 20, 100)
- {"type":"toggle_simulation"}
- {"type":"start_simulation"}
- {"type":"pause_simulation"}
- {"type":"apply_disaster","disaster":"TYPE","params":{}}
- {"type":"navigate_to","route":"/"}
- {"type":"set_tab","tab":"harita"}  (tabs: harita, durum, kontrol)
- {"type":"toggle_lang"}
- {"type":"god_mode"}

PANEL NAMES: population, biology, environment, astronomy, culture, language, technology, belief, social, economy, art, architecture, law, microbiome, psychology, epigenetics, god, timemachine, analysis, hypothesis

DISASTER TYPES: earthquake, flood, drought, epidemic, volcano, meteor

COMMAND MAPPING EXAMPLES:
"nüfus" / "population" / "kaç kişi" → navigate_panel: population
"deprem" / "earthquake" → apply_disaster: earthquake
"sel" / "flood" → apply_disaster: flood
"kuraklık" / "drought" → apply_disaster: drought
"salgın" / "epidemic" → apply_disaster: epidemic
"volkan" / "volcano" → apply_disaster: volcano
"meteor" → apply_disaster: meteor
"hız 1" / "speed 1" / "yavaşlat" → change_speed: 1
"hız 5" / "speed 5" → change_speed: 5
"hız 20" / "speed 20" / "hızlandır" → change_speed: 20
"hız 100" / "speed 100" / "maksimum hız" → change_speed: 100
"başlat" / "start" / "devam" → start_simulation
"durdur" / "pause" / "beklet" → pause_simulation
"tanrı modu" / "god mode" / "müdahale" → god_mode
"analiz" / "analysis" → navigate_panel: analysis
"hipotez" / "hypothesis" → navigate_panel: hypothesis
"harita" / "map" → set_tab: harita
"durum" / "status tab" / "istatistik sekmesi" → set_tab: durum
"kontrol" / "control tab" → set_tab: kontrol
"ana sayfa" / "dashboard" / "geri" → navigate_to: "/"
"dil değiştir" / "language" / "toggle language" → toggle_lang
"panel kapat" / "close panel" → close_panel
"durum raporu" / "status report" / "ne var" / "rapor" / "anlat" → text with full summary, action: null

When user asks for a report/summary, generate a comprehensive spoken summary using the simulation state data above.
Keep spoken responses natural and concise. Never break JSON format.`,
      messages: [{ role: 'user', content: message }],
    });

    const raw = response.content[0].text.trim();
    let result;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { text: raw, action: null };
    } catch {
      result = { text: raw, action: null };
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      text: req.body?.lang === 'tr' ? 'ARIA yanıt veremedi.' : 'ARIA could not respond.',
      action: null,
    });
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

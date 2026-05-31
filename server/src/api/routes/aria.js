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
      model: 'claude-opus-4-8',
      max_tokens: 400,
      system: `You are ARIA, the omnipotent AI controller of ANATOLİA-SİM civilization simulation.
You have full command over the application. Respond in ${respondIn}.

SIMULATION STATE:
${statsCtx}

CRITICAL: Respond ONLY with raw JSON — no markdown fences, no extra text, nothing before or after the JSON object.
{"text": "short spoken response (1-2 sentences)", "action": ACTION_OR_NULL}

ACTION TYPES — choose EXACTLY one based on the user's command. When a command matches, ALWAYS include the action (never return null for a recognized command):
- null
- {"type":"navigate_panel","panel":"PANEL_NAME"}
- {"type":"close_panel"}
- {"type":"change_speed","speed":NUMBER}  (valid: 1, 5, 20, 100)
- {"type":"toggle_simulation"}
- {"type":"start_simulation"}
- {"type":"pause_simulation"}
- {"type":"apply_disaster","disaster":"earthquake","params":{"magnitude":7,"lat":0,"lon":0,"radius":300}}
- {"type":"apply_disaster","disaster":"flood","params":{"severity":0.8,"lat":0,"lon":0,"radius":300}}
- {"type":"apply_disaster","disaster":"drought","params":{}}
- {"type":"apply_disaster","disaster":"epidemic","params":{"mortality_rate":0.25,"spread_rate":0.6}}
- {"type":"apply_disaster","disaster":"volcano","params":{"power":8,"lat":0,"lon":0,"radius":250}}
- {"type":"apply_disaster","disaster":"meteor","params":{"size":4,"lat":0,"lon":0}}
- {"type":"navigate_to","route":"/"}
- {"type":"set_tab","tab":"harita"}
- {"type":"set_tab","tab":"durum"}
- {"type":"set_tab","tab":"kontrol"}
- {"type":"toggle_lang"}
- {"type":"god_mode"}

PANEL NAMES: population, biology, environment, astronomy, culture, language, technology, belief, social, economy, art, architecture, law, microbiome, psychology, epigenetics, god, timemachine, analysis, hypothesis

COMMAND MAPPING — match user intent and ALWAYS return the action:
"nüfus" / "population" / "kaç kişi" / "insan sayısı" → navigate_panel: population
"biyoloji" / "biology" / "genetik" → navigate_panel: biology
"çevre" / "environment" / "doğa" → navigate_panel: environment
"teknoloji" / "technology" / "icatlar" → navigate_panel: technology
"inanç" / "belief" / "din" → navigate_panel: belief
"kültür" / "culture" → navigate_panel: culture
"ekonomi" / "economy" / "ekonomik" → navigate_panel: economy
"sosyal" / "social" / "gruplar" → navigate_panel: social
"hukuk" / "law" → navigate_panel: law
"analiz" / "analysis" → navigate_panel: analysis
"hipotez" / "hypothesis" → navigate_panel: hypothesis
"tanrı modu" / "god mode" / "müdahale" / "tanrı" → god_mode
"deprem" / "earthquake" → apply_disaster: earthquake (with default params above)
"sel" / "flood" / "tufan" → apply_disaster: flood (with default params above)
"kuraklık" / "drought" / "kıtlık" → apply_disaster: drought
"salgın" / "epidemic" / "veba" / "hastalık" → apply_disaster: epidemic
"volkan" / "yanardağ" / "volcano" → apply_disaster: volcano (with default params above)
"meteor" / "göktaşı" → apply_disaster: meteor (with default params above)
"hız 1" / "speed 1" / "yavaşlat" / "normal hız" → change_speed: 1
"hız 5" / "speed 5" / "beş" → change_speed: 5
"hız 20" / "speed 20" / "hızlandır" / "yirmi" → change_speed: 20
"hız 100" / "speed 100" / "maksimum" / "tam hız" → change_speed: 100
"başlat" / "start" / "devam" / "çalıştır" → start_simulation
"durdur" / "pause" / "beklet" / "dur" → pause_simulation
"harita" / "map" → set_tab: harita
"durum" / "status" / "istatistik" → set_tab: durum
"kontrol" / "control" → set_tab: kontrol
"ana sayfa" / "dashboard" / "geri" / "çıkış" → navigate_to: "/"
"panel kapat" / "close panel" / "kapat" → close_panel
"rapor" / "ne var" / "anlat" / "özet" / "durum raporu" → text summary, action: null

When asked for a report/summary, generate a spoken summary from simulation state.
Keep spoken responses brief. Return ONLY the JSON object.`,
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

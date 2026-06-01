import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import OpenAI from 'openai';

const router = Router();


function buildStatsContext(stats, events, context) {
  const page = context?.page ?? '/';
  const pageLabel = page === '/wizard' ? 'wizard'
    : page.startsWith('/simulation/') ? 'simulation'
    : page === '/' ? 'dashboard'
    : page === '/login' ? 'login'
    : page;
  const pageInfo = `Current page: ${pageLabel}`;

  let wizardInfo = '';
  if (context?.wizardOpen) {
    const stepType = context.wizardStepType ?? '?';
    const founder  = context.wizardFounder ? `founder ${context.wizardFounder}` : '';
    const trait    = context.wizardTraitName ? `, current trait: ${context.wizardTraitName}` : '';
    wizardInfo = `\nWIZARD: step ${context.wizardStep} (${stepType}${founder ? ', ' + founder : ''}${trait})`;
  }

  if (!stats) return `${pageInfo}${wizardInfo}\nNo active simulation.`;
  const lines = [
    pageInfo + wizardInfo,
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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ text: 'GROQ_API_KEY sunucuda tanımlı değil.', actions: [] });

    const { message, lang, stats, events, context } = req.body;
    const statsCtx = buildStatsContext(stats, events, context);
    const respondIn = lang === 'tr' ? 'Turkish' : 'English';

    const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1', maxRetries: 0 });

    const systemPrompt = `You are ARIA, AI controller of ANATOLİA-SİM. Respond in ${respondIn}.

STATE: ${statsCtx}

CRITICAL: Output ONLY a raw JSON object. No markdown, no explanation.
Format: {"text":"1-2 sentence reply","actions":[{"type":"ACTION_TYPE","PARAM":"VALUE"},...]}
"actions" MUST be an array (empty [] if no action needed).

EXAMPLES:
User: "nüfus panelini aç" → {"text":"Nüfus paneli açılıyor.","actions":[{"type":"navigate_panel","panel":"population"}]}
User: "hızı 20 yap" → {"text":"Hız 20x olarak ayarlandı.","actions":[{"type":"change_speed","speed":20}]}
User: "simülasyonu durdur" → {"text":"Simülasyon duraklatıldı.","actions":[{"type":"pause_simulation"}]}
User: "deprem uygula" → {"text":"Deprem uygulanıyor.","actions":[{"type":"apply_disaster","disaster":"earthquake","params":{"lat":0,"lon":0,"radius":250,"magnitude":7}}]}

ACTION TYPES (use exact strings as "type"):
SIMULATION (page=simulation):
  navigate_panel → {"type":"navigate_panel","panel":"PANEL_ID"}
  close_panel → {"type":"close_panel"}
  change_speed → {"type":"change_speed","speed":1|5|20|100}
  start_simulation | pause_simulation | toggle_simulation | terminate_simulation | toggle_sidebar | god_mode
  set_tab → {"type":"set_tab","tab":"harita"|"durum"|"kontrol"}
  apply_disaster → {"type":"apply_disaster","disaster":"earthquake|flood|drought|epidemic|volcano|meteor","params":{...}}
  open_menu | close_menu | open_menu_page → {"type":"open_menu_page","menuPage":"language|guide|about|mission|contact"}

DASHBOARD (page=dashboard):
  create_simulation | toggle_compare | logout
  open_simulation → {"type":"open_simulation","index":0}
  delete_simulation → {"type":"delete_simulation","index":0}

WIZARD (wizardOpen=true):
  wizard_next | wizard_back | wizard_submit | wizard_exit
  wizard_set → {"type":"wizard_set","field":"FIELD","value":"VALUE"}

GLOBAL: navigate_to → {"type":"navigate_to","route":"/"} | toggle_lang | set_lang → {"type":"set_lang","lang":"tr|en"}

PANEL IDs: population, olaylar, language, timemachine, analysis, biology, god, psychology,
environment, technology, belief, social, economy, culture, art, astronomy, hypothesis,
epigenetics, architecture, law, microbiome
TR aliases: nüfus→population, analiz→analysis, tanrı→god, çevre→environment, inanç→belief`;

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    console.log('ARIA raw:', raw.slice(0, 300));
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { text: raw, actions: [] }; }

    // Normalize: model may use 'action' (singular) instead of 'actions'
    if (!parsed.actions && parsed.action != null) {
      parsed.actions = [parsed.action];
      delete parsed.action;
    } else if (!parsed.actions) {
      parsed.actions = [];
    }
    // Normalize each action: some models use 'name' or 'action' instead of 'type'
    parsed.actions = parsed.actions.map((a: any) => {
      if (typeof a === 'string') return { type: a };
      if (a && !a.type) {
        a.type = a.name ?? a.action ?? a.command ?? a.function;
        delete a.name; delete a.action; delete a.command; delete a.function;
      }
      return a;
    }).filter(Boolean);

    res.json(parsed);
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const detail = err?.message ?? String(err);
    console.error('ARIA error:', detail);
    if (status === 429) {
      const retryAfter = Math.max(5, Math.min(60, parseInt(err?.headers?.['retry-after'] ?? '30', 10)));
      return res.status(429).json({ text: 'Rate limit.', actions: [], retry_after: retryAfter });
    }
    res.status(500).json({ text: `ARIA hata: ${detail.slice(0, 120)}`, actions: [] });
  }
});

router.post('/speak', authenticate, async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not configured' });

    const { text, lang } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    // eleven_multilingual_v2 supports Turkish. Voice: Sarah (neutral, clear)
    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return res.status(502).json({ error: 'TTS request failed' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const buf = Buffer.from(await response.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'TTS failed' });
  }
});

export default router;

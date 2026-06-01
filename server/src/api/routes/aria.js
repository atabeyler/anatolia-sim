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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ text: 'OPENAI_API_KEY sunucuda tanimli degil.', actions: [] });

    const { message, lang, stats, events, context } = req.body;
    const statsCtx = buildStatsContext(stats, events, context);
    const respondIn = lang === 'tr' ? 'Turkish' : 'English';

    const client = new OpenAI({ apiKey, maxRetries: 0 });

    const page = context?.page ?? '/';
    const isWizard = !!context?.wizardOpen;
    const isSim = page.startsWith('/simulation/');
    const isDash = page === '/';

    const systemPrompt = `ARIA, ANATOLİA-SİM controller. Reply in ${respondIn}. Output ONLY JSON: {"text":"short reply","actions":[...]}
STATE: ${statsCtx}
${isWizard ? `WIZARD step=${context.wizardStep} type=${context.wizardStepType}${context.wizardFounder ? ' founder='+context.wizardFounder : ''}${context.wizardTraitName ? ' trait='+context.wizardTraitName : ''}
Actions: wizard_next|wizard_back|wizard_submit|wizard_exit|wizard_set{"type":"wizard_set","field":"F","value":"V","founder":1|2}
Fields: sim_name|sim_latitude|sim_longitude|founder_name|founder_age|founder_sex(male/female)|founder_height(cm str)|founder_weight(kg str)|founder_eye(brown/hazel/green/blue)|founder_hair(black/dark/brown/light/blond/red)|founder_skin(fair/light/olive/tan/brown/dark)|current_trait(0-100 str)
TR traits: zeka=fluid_intelligence merak=curiosity dil=language_capacity öğrenme=learning_rate disiplin=conscientiousness stres=stress_resilience risk=risk_tolerance inovasyon=innovation sanat=artistic_sense empati=empathy işbirliği=cooperation liderlik=dominance güç=physical_strength dayanıklılık=endurance bağışıklık=immune_strength üreme=fertility uzun_ömür=longevity` : ''}
${isSim ? `SIM actions: navigate_panel{"panel":"ID"}|close_panel|change_speed{"speed":N}|start_simulation|pause_simulation|toggle_simulation|terminate_simulation|toggle_sidebar|god_mode|set_tab{"tab":"harita/durum/kontrol"}|apply_disaster{"disaster":"earthquake/flood/drought/epidemic/volcano/meteor","params":{}}|open_menu|close_menu|open_menu_page{"menuPage":"language/guide/about"}
Panels: population(nüfus) olaylar language timemachine analysis(analiz) biology god(tanrı) psychology environment(çevre) technology belief(inanç) social economy culture art astronomy hypothesis epigenetics architecture law microbiome` : ''}
${isDash ? `DASH actions: create_simulation|open_simulation{"index":0}|delete_simulation{"index":0}|toggle_compare|logout` : ''}
GLOBAL: navigate_to{"route":"/"}|toggle_lang|set_lang{"lang":"tr/en"}`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 250,
    });

    const raw = completion.choices[0].message.content ?? '{}';
    console.log('ARIA raw:', raw.slice(0, 300));
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { text: raw, actions: [] };
    }

    // Normalize: model may use 'action' (singular) instead of 'actions'
    if (!parsed.actions && parsed.action != null) {
      parsed.actions = [parsed.action];
      delete parsed.action;
    } else if (!parsed.actions) {
      parsed.actions = [];
    }
    // Normalize each action: some models use 'name' or 'action' instead of 'type'
    parsed.actions = parsed.actions.map((a) => {
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
    const errorBody = err?.error ?? err?.response?.data;
    console.error('ARIA error status:', status, 'detail:', detail, 'body:', JSON.stringify(errorBody)?.slice(0, 200));
    if (status === 429) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? err?.headers?.get?.('retry-after') ?? '60', 10);
      return res.status(429).json({ text: `Rate limit (${retryAfter}s)`, actions: [], retry_after: retryAfter });
    }
    res.status(500).json({ text: `ARIA hata [${status ?? '?'}]: ${detail.slice(0, 120)}`, actions: [] });
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
      console.error('ElevenLabs error:', response.status, err);
      return res.status(502).json({ error: `ElevenLabs ${response.status}: ${err.slice(0, 300)}` });
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

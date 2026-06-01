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
    if (!apiKey) return res.status(503).json({ text: 'OPENAI_API_KEY sunucuda tanımlı değil.', actions: [] });

    const { message, lang, stats, events, context } = req.body;
    const statsCtx = buildStatsContext(stats, events, context);
    const respondIn = lang === 'tr' ? 'Turkish' : 'English';

    const client = new OpenAI({ apiKey });

    const systemPrompt = `You are ARIA, AI controller of ANATOLİA-SİM. Respond in ${respondIn}.

STATE: ${statsCtx}

OUTPUT: JSON only. {"text":"1-2 sentences","actions":[...]}
actions is ALWAYS an array. Combine multiple requests into one array.

SIMULATION actions (page=simulation):
navigate_panel(panel) | close_panel | change_speed(speed:1/5/20/100)
start_simulation | pause_simulation | toggle_simulation
toggle_sidebar | terminate_simulation
open_menu | open_menu_page(menuPage:language/guide/about/mission/contact) | close_menu
apply_disaster(disaster:earthquake/flood/drought/epidemic/volcano/meteor, params:{magnitude?,severity?,mortality_rate?,spread_rate?,power?,size?,lat,lon,radius})
set_tab(tab:harita/durum/kontrol) | god_mode

DASHBOARD actions (page=dashboard):
create_simulation | open_simulation(index:0) | toggle_compare
delete_simulation(index:0) | logout
open_menu | open_menu_page(menuPage:...) | close_menu

WIZARD actions (wizardOpen=true):
wizard_next | wizard_back | wizard_submit | wizard_exit
wizard_set(field,value[,founder:1/2])

WIZARD fields: sim_name, sim_latitude, sim_longitude,
founder_name, founder_age, founder_sex(male/female), founder_height(cm),
founder_eye(brown/hazel/green/blue), founder_hair(black/dark/brown/light/blond/red),
founder_skin(fair/light/olive/tan/brown/dark),
current_trait(0-100 = current step), or any trait ID(0-100):
fluid_intelligence, curiosity, language_capacity, learning_rate, conscientiousness,
self_awareness, stress_resilience, risk_tolerance, innovation, artistic_sense,
empathy, social_bonding, aggression, cooperation, dominance,
physical_strength, endurance, immune_strength, fertility, longevity
Trait value: "80", "yüzde 80", "0.8" all mean 80. founder:1/2 if specified.

GLOBAL: navigate_to(route:"/") | toggle_lang | set_lang(lang:tr/en/de/fr/ar) | logout

PANELS (TR→id): nüfus→population, olaylar→olaylar, dil→language, geçmiş→timemachine,
analiz→analysis, mutasyon→biology, tanrı→god, akıl→psychology, çevre→environment,
teknoloji→technology, inanç→belief, sosyal→social, ekonomi→economy, kültür→culture,
sanat→art, astronomi→astronomy, hipotez→hypothesis, epigenetik→epigenetics,
mimari→architecture, hukuk→law, mikrobiyom→microbiome

Return ONLY the JSON object.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { text: raw, actions: [] }; }

    if (!parsed.actions && parsed.action != null) {
      parsed.actions = [parsed.action];
      delete parsed.action;
    } else if (!parsed.actions) {
      parsed.actions = [];
    }

    res.json(parsed);
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    const detail = err?.message ?? String(err);
    console.error('ARIA error:', detail);
    if (status === 429) {
      return res.status(429).json({ text: 'Çok fazla istek. Birkaç saniye bekleyip tekrar deneyin.', actions: [] });
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

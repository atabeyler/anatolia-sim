import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { geminiChat } from '../../utils/gemini.js';

const router = Router();

const LANGUAGE_NAMES = {
  tr: 'Turkish',
  en: 'English',
  de: 'German',
  fr: 'French',
  ar: 'Arabic',
};

const LANGUAGE_LOCALES = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  ar: 'ar',
};

function resolveLangCode(lang) {
  return LANGUAGE_NAMES[lang] ? lang : 'en';
}

function resolveLanguageName(lang) {
  return LANGUAGE_NAMES[resolveLangCode(lang)] ?? 'English';
}

function sanitizeText(s) {
  return String(s ?? '')
    .replace(/\u0000/g, '')
    .trim();
}

function parseAriaJson(raw) {
  const safe = sanitizeText(raw);
  const candidates = [];

  candidates.push(safe);
  const fenced = safe.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const objMatch = safe.match(/\{[\s\S]*\}/);
  if (objMatch?.[0]) candidates.push(objMatch[0]);

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // try lightweight quote-fix for malformed single-quote JSON
      try {
        const fixed = c
          .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*?)'/g, ': "$1"');
        return JSON.parse(fixed);
      } catch {}
    }
  }

  return { text: safe, actions: [] };
}

function normalizeText(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function inferFallbackActions(message, context) {
  const msg = normalizeText(message);
  const actions = [];
  const page = context?.page ?? '/';
  const isWizard = !!context?.wizardOpen || page === '/wizard';
  const isSim = page.startsWith('/simulation/');
  const isDash = page === '/' || page === '/dashboard';

  if (isWizard) {
    if (/(devam|ileri|next|continue|ilerle)/.test(msg)) actions.push({ type: 'wizard_next' });
    if (/(geri|back|onceki)/.test(msg)) actions.push({ type: 'wizard_back' });
    if (/(baslat|onayla|submit|launch|tamamla)/.test(msg)) actions.push({ type: 'wizard_submit' });
    if (/(cik|iptal|exit|vazgec)/.test(msg)) actions.push({ type: 'wizard_exit' });
  }

  if (isDash) {
    if (/(yeni simulasyon|simulasyon olustur|create simulation|yeni sim|simulasyon baslat|yeni oyun)/.test(msg)) actions.push({ type: 'create_simulation' });
    if (/(simulasyonu ac|open simulation|ilk simulasyon)/.test(msg)) actions.push({ type: 'open_simulation', index: 0 });
    if (/(karsilastir|compare)/.test(msg)) actions.push({ type: 'toggle_compare' });
  }

  if (isSim) {
    if (/(nufus|population)/.test(msg)) actions.push({ type: 'navigate_panel', panel: 'population' });
    else if (/(biyoloji|genetik|biology)/.test(msg)) actions.push({ type: 'navigate_panel', panel: 'biology' });
    else if (/(analiz|analysis)/.test(msg)) actions.push({ type: 'navigate_panel', panel: 'analysis' });
    else if (/(hipotez|hypothesis)/.test(msg)) actions.push({ type: 'navigate_panel', panel: 'hypothesis' });
    if (/(hiz 1|normal hiz)/.test(msg)) actions.push({ type: 'change_speed', speed: 1 });
    if (/(hiz 5)/.test(msg)) actions.push({ type: 'change_speed', speed: 5 });
    if (/(hiz 20|hizlandir)/.test(msg)) actions.push({ type: 'change_speed', speed: 20 });
    if (/(hiz 100|maksimum)/.test(msg)) actions.push({ type: 'change_speed', speed: 100 });
    if (/(baslat|start|devam)/.test(msg)) actions.push({ type: 'start_simulation' });
    if (/(durdur|pause|beklet)/.test(msg)) actions.push({ type: 'pause_simulation' });
  }

  if (/(ana sayfa|dashboard|home)/.test(msg)) actions.push({ type: 'navigate_to', route: '/' });
  if (/(login|giris)/.test(msg)) actions.push({ type: 'navigate_to', route: '/login' });
  if (/(dil degistir|language|lang)/.test(msg)) actions.push({ type: 'toggle_lang' });

  return actions;
}


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
    const { message, lang, stats, events, context } = req.body;
    const statsCtx = buildStatsContext(stats, events, context);
    const langCode = resolveLangCode(lang);
    const respondIn = resolveLanguageName(langCode);

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

    const raw = await geminiChat({
      model: process.env.GEMINI_COMMAND_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      system: systemPrompt,
      user: message,
      max_tokens: 250,
    });

    const preview = sanitizeText(raw).slice(0, 300);
    console.log('ARIA raw preview:', preview);
    const parsed = parseAriaJson(raw);
    const rawLooksLikeReasoning = /we need to output json|according to state|so we should respond/i.test(String(raw));

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
    }).filter((a) => a && a.type);

    if (typeof parsed.text !== 'string') parsed.text = '';
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (parsed.actions.length === 0 || rawLooksLikeReasoning) {
      const fallback = inferFallbackActions(message, context);
        if (fallback.length > 0) {
          parsed.actions = fallback;
        if (!parsed.text) parsed.text = langCode === 'tr' ? 'Tamam, komutu uyguluyorum.' : 'Okay, applying command.';
        }
      }

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

router.post('/inner-voice', authenticate, async (req, res) => {
  try {
    const { individual, simYear, simStats, lang } = req.body;
    if (!individual) return res.status(400).json({ error: 'No individual provided' });

    const langCode = resolveLangCode(lang);
    const respondIn = resolveLanguageName(langCode);

    const ind = individual;
    const c = ind.mind?.consciousness ?? 0;
    const stress = ind.mind?.stress ?? 0;
    const ph = ind.phenotype ?? {};
    const ps = ind.psychology ?? {};
    const health = ind.health ?? {};
    const langStage = ind.language?.stage ?? 0;
    const age = parseFloat(ind.age_years ?? 0);
    const role = ind.group_role ?? 'member';
    const isFounder = ind.is_founder || ind.founder;
    const isDead = ind.is_dead || ind.alive === false;

    const consciousnessDesc =
      c < 0.03 ? 'near-zero (pure reflexive survival)' :
      c < 0.08 ? 'very low (basic sensations and instincts)' :
      c < 0.15 ? 'low (proto-emotions, vague feelings)' :
      c < 0.25 ? 'emerging (rudimentary self-awareness)' :
      c < 0.45 ? 'moderate (emotional awareness, simple plans)' :
      c < 0.70 ? 'high (self-reflection, complex emotions)' :
      'very high (deep introspection, existential thought)';

    const langDesc =
      langStage <= 1 ? 'no language (only grunts/signals)' :
      langStage <= 2 ? 'proto-language (simple sounds)' :
      langStage <= 3 ? 'basic language (short phrases)' :
      langStage <= 4 ? 'developing language' :
      langStage <= 5 ? 'fluent language' : 'complex language';

    const system = `You are simulating the inner monologue of a prehistoric human in Anatolia, year ${simYear ?? '?'} of a simulation.
This individual: age ${age.toFixed(0)}, sex ${ind.sex ?? 'unknown'}, role ${role}${isFounder ? ' (FOUNDER)' : ''}${isDead ? ' (DECEASED)' : ''}.
Consciousness level: ${(c * 100).toFixed(0)}% — ${consciousnessDesc}.
Language: ${langDesc}.
Stress: ${(stress * 100).toFixed(0)}%. Health: ${(health.current_health ?? 0.8).toFixed(2)}.
Psychology: theory_of_mind=${ps.theory_of_mind ?? 0}/3, mental_state=${ps.mental_state ?? 'neutral'}.
Phenotype: curiosity=${(ph.curiosity ?? 0.5).toFixed(2)}, empathy=${(ph.empathy ?? 0.5).toFixed(2)}, creativity=${(ph.creativity ?? 0.5).toFixed(2)}, fear=${(ph.fear ?? 0.5).toFixed(2)}.

RULES:
- Write ONLY the raw inner thought, no quotes, no narration.
- Match consciousness level: near-zero = purely sensory fragments; very high = philosophical reflection.
- Write in ${respondIn}.
- Max 2 sentences. Keep it visceral and authentic to the era.
- No modern concepts. No meta-commentary. Just the thought itself.`;

    const thought = await geminiChat({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      system,
      user: 'Generate the inner thought.',
      max_tokens: 120,
      temperature: 0.9,
    });

    res.json({ thought: thought.replace(/^["']|["']$/g, '').trim() });
  } catch (err) {
    console.error('Inner voice error:', err?.message);
    const status = err?.status ?? 500;
    const msg = status === 429
      ? 'AI kota doldu, lütfen biraz bekleyin.'
      : status >= 500
        ? 'AI şu an yanıt vermiyor, tekrar deneyin.'
        : (err?.message ?? 'Hata');
    res.status(status).json({ error: msg });
  }
});

export default router;

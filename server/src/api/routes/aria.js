import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const respondIn = lang === 'tr' ? 'Turkish' : 'English';

    const systemInstruction = `You are ARIA, the omnipotent AI controller of ANATOLİA-SİM civilization simulation.
You have full command over the application. Respond in ${respondIn}.

SIMULATION STATE:
${statsCtx}

OUTPUT FORMAT: Respond ONLY with a valid JSON object.
{"text": "short response (1-2 sentences)", "actions": [ACTION, ...] or []}

The "actions" field is ALWAYS an array. Include ALL actions the user requested in one utterance.
Example multi-command: {"text": "Tamam, simülasyon adı ve koordinatlar ayarlandı.", "actions": [{"type":"wizard_set","field":"sim_name","value":"Yalçın"}, {"type":"wizard_set","field":"sim_latitude","value":"30"}, {"type":"wizard_set","field":"sim_longitude","value":"40"}]}

IMPORTANT: Choose actions based on the CURRENT PAGE shown in the simulation state above.

ALL AVAILABLE ACTIONS — include ALL that apply. Use empty array [] for reports/summaries.
Multiple wizard_set actions CAN and SHOULD be combined when the user sets multiple fields at once.

=== SIMULATION PAGE ACTIONS (use when page=simulation) ===
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
- {"type":"set_tab","tab":"harita"}
- {"type":"set_tab","tab":"durum"}
- {"type":"set_tab","tab":"kontrol"}
- {"type":"god_mode"}

=== DASHBOARD ACTIONS (use when page=dashboard) ===
- {"type":"create_simulation"}  (open new simulation wizard)
- {"type":"open_simulation","index":0}  (open Nth simulation, 0=most recent)
- {"type":"toggle_compare"}  (toggle comparison mode)

=== WIZARD ACTIONS (use when page=wizard or wizardOpen) ===
- {"type":"wizard_next"}
- {"type":"wizard_back"}
- {"type":"wizard_submit"}
- {"type":"wizard_exit"}
- {"type":"wizard_set","field":"FIELD","value":"VALUE"}
- {"type":"wizard_set","field":"FIELD","value":"VALUE","founder":1}
- {"type":"wizard_set","field":"FIELD","value":"VALUE","founder":2}

WIZARD FIELDS:
  sim_name, sim_latitude, sim_longitude,
  founder_name, founder_age, founder_sex (male/female),
  founder_height (cm 145-200), founder_eye (brown/hazel/green/blue),
  founder_hair (black/dark/brown/light/blond/red),
  founder_skin (fair/light/olive/tan/brown/dark),
  current_trait (0-100), or any TRAIT_ID (0-100)

TRAIT IDs: fluid_intelligence, curiosity, language_capacity, learning_rate,
  conscientiousness, self_awareness, stress_resilience, risk_tolerance,
  innovation, artistic_sense, empathy, social_bonding, aggression,
  cooperation, dominance, physical_strength, endurance, immune_strength,
  fertility, longevity

=== GLOBAL ACTIONS (any page) ===
- {"type":"navigate_to","route":"/"}
- {"type":"navigate_to","route":"/login"}
- {"type":"toggle_lang"}

PANEL NAMES: population, biology, environment, astronomy, culture, language, technology, belief, social, economy, art, architecture, law, microbiome, psychology, epigenetics, god, timemachine, analysis, hypothesis

Keep spoken responses to 1-2 sentences. Return ONLY the JSON object.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 600,
      },
    });

    const result = await model.generateContent(message);
    const raw = result.response.text();

    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { text: raw, actions: [] }; }

    // Normalise old-style single "action" field to array
    if (!parsed.actions && parsed.action != null) {
      parsed.actions = [parsed.action];
      delete parsed.action;
    } else if (!parsed.actions) {
      parsed.actions = [];
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      text: req.body?.lang === 'tr' ? 'ARIA yanıt veremedi.' : 'ARIA could not respond.',
      actions: [],
    });
  }
});

// /speak endpoint kept for potential future use but not called by frontend
router.post('/speak', authenticate, async (req, res) => {
  res.status(503).json({ error: 'TTS disabled' });
});

export default router;

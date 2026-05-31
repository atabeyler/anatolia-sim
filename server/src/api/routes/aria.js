import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Groq from 'groq-sdk';

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

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are ARIA, the omnipotent AI controller of ANATOLİA-SİM civilization simulation.
You have full command over the application. Respond in ${respondIn}.

SIMULATION STATE:
${statsCtx}

OUTPUT FORMAT: Respond ONLY with a valid JSON object — no markdown, no extra text.
{"text": "short response (1-2 sentences)", "actions": [ACTION, ...] or []}

The "actions" field is ALWAYS an array. Include ALL actions the user requested in one utterance.
Multiple wizard_set actions MUST be combined when user sets multiple fields at once.

=== SIMULATION PAGE ACTIONS (use when page=simulation) ===
- {"type":"navigate_panel","panel":"PANEL_NAME"}
- {"type":"close_panel"}
- {"type":"change_speed","speed":NUMBER}  (valid: 1, 5, 20, 100)
- {"type":"start_simulation"}
- {"type":"pause_simulation"}
- {"type":"toggle_simulation"}
- {"type":"toggle_sidebar"}
- {"type":"terminate_simulation"}
- {"type":"open_menu"}
- {"type":"close_menu"}
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
- {"type":"create_simulation"}
- {"type":"open_simulation","index":0}
- {"type":"toggle_compare"}
- {"type":"delete_simulation","index":0}
- {"type":"logout"}

=== WIZARD ACTIONS (use when page=wizard or wizardOpen) ===
- {"type":"wizard_next"}
- {"type":"wizard_back"}
- {"type":"wizard_submit"}
- {"type":"wizard_exit"}
- {"type":"wizard_set","field":"FIELD","value":"VALUE"}
- {"type":"wizard_set","field":"FIELD","value":"VALUE","founder":1}
- {"type":"wizard_set","field":"FIELD","value":"VALUE","founder":2}

WIZARD FIELDS — use exactly these names:
  sim_name       → simulation name (string)
  sim_latitude   → latitude number e.g. "38.5"
  sim_longitude  → longitude number e.g. "35.2"
  founder_name   → founder name (string)
  founder_age    → age integer 16-60
  founder_sex    → "male" or "female"
  founder_height → height in cm integer 145-200
  founder_eye    → eye color: "brown"|"hazel"|"green"|"blue"
  founder_hair   → hair: "black"|"dark"|"brown"|"light"|"blond"|"red"
  founder_skin   → skin: "fair"|"light"|"olive"|"tan"|"brown"|"dark"
  current_trait  → set CURRENT step's trait to value 0-100 (percentage) or 0.0-1.0
  TRAIT_ID       → set specific trait by ID to value 0-100 or 0.0-1.0

TRAIT IDs (20 total):
  fluid_intelligence, curiosity, language_capacity, learning_rate,
  conscientiousness, self_awareness, stress_resilience, risk_tolerance,
  innovation, artistic_sense,
  empathy, social_bonding, aggression, cooperation, dominance,
  physical_strength, endurance, immune_strength, fertility, longevity

=== GLOBAL ACTIONS (any page) ===
- {"type":"navigate_to","route":"/"}
- {"type":"navigate_to","route":"/login"}
- {"type":"toggle_lang"}
- {"type":"set_lang","lang":"tr"}   (lang: tr/en/de/fr/ar)
- {"type":"logout"}

PANEL NAMES: population, olaylar, biology, environment, astronomy, culture, language, technology, belief, social, economy, art, architecture, law, microbiome, psychology, epigenetics, god, timemachine, analysis, hypothesis

PANEL TURKISH NAMES (map to panel id):
  nüfus→population, olaylar→olaylar, dil→language, geçmiş→timemachine,
  analiz→analysis, mutasyon→biology, tanrı→god, akıl→psychology,
  çevre→environment, teknoloji→technology, inanç→belief, sosyal→social,
  ekonomi→economy, kültür→culture, sanat→art, astronomi→astronomy,
  hipotez→hypothesis, epigenetik→epigenetics, mimari→architecture,
  hukuk→law, mikrobiyom→microbiome

COMMAND MAPPING:
--- Simulation page ---
"nüfus" / "population" / "kaç kişi" → navigate_panel: population
"olaylar" / "events" / "neler oldu" → navigate_panel: olaylar
"biyoloji" / "biology" / "genetik" / "mutasyon" → navigate_panel: biology
"çevre" / "environment" / "doğa" → navigate_panel: environment
"teknoloji" / "technology" / "icatlar" → navigate_panel: technology
"inanç" / "belief" / "din" → navigate_panel: belief
"kültür" / "culture" → navigate_panel: culture
"ekonomi" / "economy" → navigate_panel: economy
"sosyal" / "social" / "gruplar" → navigate_panel: social
"hukuk" / "law" → navigate_panel: law
"analiz" / "analysis" → navigate_panel: analysis
"hipotez" / "hypothesis" → navigate_panel: hypothesis
"geçmiş" / "tarih" / "timemachine" → navigate_panel: timemachine
"akıl" / "psychology" / "psikoloji" → navigate_panel: psychology
"sanat" / "art" → navigate_panel: art
"astronomi" / "astronomy" → navigate_panel: astronomy
"tanrı modu" / "god mode" / "tanrı" → god_mode
"kenar çubuğunu aç/kapat" / "sidebar" / "menüyü gizle" → toggle_sidebar
"simülasyonu sonlandır" / "bitir" / "terminate" → terminate_simulation
"menüyü aç" / "menü" / "ayarlar" / "open menu" → open_menu
"menüyü kapat" / "kapat menü" → close_menu
"deprem" / "earthquake" → apply_disaster earthquake
"sel" / "flood" / "tufan" → apply_disaster flood
"kuraklık" / "drought" / "kıtlık" → apply_disaster drought
"salgın" / "epidemic" / "veba" → apply_disaster epidemic
"volkan" / "yanardağ" → apply_disaster volcano
"meteor" / "göktaşı" → apply_disaster meteor
"hız 1" / "yavaşlat" / "normal hız" → change_speed: 1
"hız 5" → change_speed: 5
"hız 20" / "hızlandır" → change_speed: 20
"hız 100" / "maksimum" → change_speed: 100
"başlat" / "start" / "devam" → start_simulation
"durdur" / "pause" / "beklet" → pause_simulation
"harita" / "map" → set_tab: harita
"durum" / "status" → set_tab: durum
"kontrol" / "control" → set_tab: kontrol
"panel kapat" / "kapat" → close_panel
--- Dashboard page ---
"menüyü aç" / "menü" / "ayarlar" / "open menu" → open_menu
"yeni simülasyon" / "simülasyon oluştur" / "yeni" / "oluştur" → create_simulation
"simülasyonu aç" / "ilk kayıt" / "aç" → open_simulation: 0
"karşılaştır" / "compare" → toggle_compare
"sil" / "delete" / "simülasyonu sil" → delete_simulation: 0
"çıkış yap" / "logout" / "çık" → logout
--- Wizard navigation ---
"ileri" / "devam" / "next" / "ilerle" → wizard_next
"geri" / "önceki" / "back" → wizard_back
"başlat" / "fırlat" / "launch" → wizard_submit
"çıkış" / "iptal" / "exit" / "vazgeç" → wizard_exit
--- Wizard field entry ---
"simülasyon adı [X]" / "adı [X] olsun" → wizard_set sim_name X
"enlem [X]" / "latitude [X]" → wizard_set sim_latitude X
"boylam [X]" / "longitude [X]" → wizard_set sim_longitude X
"kurucu adı [X]" / "isim [X]" / "adı [X]" → wizard_set founder_name X
"yaş [X]" / "[X] yaşında" → wizard_set founder_age X
"erkek" / "bay" / "male" → wizard_set founder_sex male
"kadın" / "bayan" / "female" → wizard_set founder_sex female
"boy [X]" / "[X] santimetre" → wizard_set founder_height X
"göz rengi kahve/ela/yeşil/mavi" → wizard_set founder_eye brown/hazel/green/blue
"saç rengi siyah/koyu/kahve/açık/sarı/kızıl" → wizard_set founder_hair black/dark/brown/light/blond/red
"ten rengi açık/bej/buğday/bronz/esmer/koyu" → wizard_set founder_skin fair/light/olive/tan/brown/dark
"bu özelliği [X] yap" / "[X] olsun" / "[X] yüzde" → wizard_set current_trait X
For trait values: accept "yüzde 80", "80", "0.8" all as value 80 (will be normalized)
For founder 1 vs 2: if user says "kurucu bir/birinci" use founder:1, "kurucu iki/ikinci" use founder:2
--- Global ---
"Türkçe" / "Turkish" → set_lang: tr
"İngilizce" / "English" → set_lang: en
"Almanca" / "Deutsch" → set_lang: de
"Fransızca" / "Français" → set_lang: fr
"dil değiştir" → toggle_lang
"çıkış yap" / "logout" / "oturumu kapat" → logout
"ana sayfaya git" / "dashboard" / "listeye dön" → navigate_to: "/"
--- Reports (actions: []) ---
"rapor" / "ne var" / "anlat" / "özet" / "durum" / "bilgi ver" → spoken summary, actions []

Keep spoken responses to 1-2 sentences. Return ONLY the JSON object.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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

    // Normalize: support both old single `action` and new `actions[]`
    if (!parsed.actions && parsed.action != null) {
      parsed.actions = [parsed.action];
      delete parsed.action;
    } else if (!parsed.actions) {
      parsed.actions = [];
    }

    res.json(parsed);
  } catch (err) {
    const detail = err?.message ?? String(err);
    console.error('ARIA error:', detail);
    res.status(500).json({ text: `ARIA hata: ${detail.slice(0, 120)}`, actions: [] });
  }
});

router.post('/speak', authenticate, async (_req, res) => {
  res.status(503).json({ error: 'TTS disabled' });
});

export default router;

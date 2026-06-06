import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { geminiChat } from '../../utils/gemini.js';
import { simulationManager } from '../simulationManager.js';
import { getAge } from '../../engines/biology/individual.js';

const router = Router();

const SIM_ARCHITECTURE = `
SİMÜLASYON MİMARİSİ (tasarım kararları — bunları kesin olarak bil):
- Kurucular (is_founder=true): Başlangıç koordinatlarına sabitlenmiş çıpalardır. Hareket ETMEZLER. Bu kasıtlı tasarım kararıdır — aile bandının merkezini tutarlar.
- Diğer bireyler: Grubun ağırlık merkezine (centroid) çekilir; kurucuların konumu bu centroidi doğal olarak ev noktasına çeker.
- Hareket öncelikleri: Açlık/susuzluk > bant uyumu > çiftleşme dürtüsü.
- mating_urge: Günlük birikir; çiftleşince sıfırlanır; hamilelikte 0; temel ihtiyaçlar karşılanmadan hareketi etkilemez.
- Tek eşlilik (monogami) yoktur. Yakındaki herhangi bir uygun birey ile çiftleşilebilir.
- Bebek ölüm oranı: ~%8/yıl (0-1 yaş). Küçük gruplarda koruma mekanizması devrededir.
- inbreeding_coeff > 0.25 ise ölüm riski %50 artar — yakın akraba çiftleşmeleri sorunludur.
`;

function buildEngineContext(engine) {
  if (!engine) return 'Simülasyon şu an çalışmıyor.';

  const day = engine.currentDay;
  const allInds = [...engine.population.values()];
  const alive   = allInds.filter(i => !i.is_dead);
  const dead    = allInds.filter(i => i.is_dead && i.birth_day != null);

  // ── Dünya durumu ─────────────────────────────────────────────────────────
  const ws = engine.worldState ?? {};
  const worldLine = `Dünya: Biyom=${ws.biome}, Mevsim=${ws.season}, ` +
    `Sıcaklık=${Math.round(ws.temperature ?? 0)}°C, ` +
    `Yiyecek=${((ws.food_abundance ?? 0) * 100).toFixed(0)}%, ` +
    `Su=${((ws.water_abundance ?? 0) * 100).toFixed(0)}%, ` +
    `Hava=${ws.current_weather ?? 'clear'} (şiddet %${Math.round((ws.weather_intensity ?? 0.5) * 100)})`;

  // ── Nüfus özeti ──────────────────────────────────────────────────────────
  const avgAge = alive.length
    ? (alive.reduce((s, i) => s + getAge(i, day), 0) / alive.length).toFixed(1)
    : 0;
  const popLine = `Nüfus: ${alive.length} hayatta / ${allInds.length} toplam doğan, ` +
    `Yıl: ${Math.floor(day / 365)}, Ortalama yaş: ${avgAge}, ` +
    `Erkek: ${alive.filter(i => i.sex === 'male').length}, Dişi: ${alive.filter(i => i.sex === 'female').length}`;

  // ── Ölüm istatistikleri ──────────────────────────────────────────────────
  let deathLine = 'Ölüm: Henüz yok';
  if (dead.length) {
    const ages = dead.map(i => (i.death_day - i.birth_day) / 365);
    const avg  = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    const inf  = ages.filter(a => a < 1).length;
    const ch   = ages.filter(a => a >= 1 && a < 15).length;
    const causes = {};
    for (const i of dead) { const c = i.death_cause ?? 'unknown'; causes[c] = (causes[c] ?? 0) + 1; }
    const topCauses = Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([k, v]) => `${k}:${v}`).join(', ');
    deathLine = `Ölümler: ${dead.length} toplam, Ortalama ölüm yaşı: ${avg} yıl, ` +
      `Bebek (<1 yıl): ${inf}, Çocuk (1-15 yıl): ${ch}, Nedenler: ${topCauses}`;
  }

  // ── Kurucular ────────────────────────────────────────────────────────────
  const founders = allInds.filter(i => i.is_founder);
  const foundersLine = founders.length
    ? 'Kurucular (sabit konumda, hareket etmezler):\n' + founders.map(f => {
        const age = Math.round(getAge(f, day));
        return `  - ${f.sex === 'male' ? 'Erkek' : 'Dişi'} kurucu, yaş ${age}, ` +
          `${f.is_dead ? `ÖLMÜŞ (${f.death_cause ?? '?'}, yaş ${Math.round((f.death_day - f.birth_day) / 365)})` : 'hayatta'}, ` +
          `konum: (${(f.x ?? 0).toFixed(2)}°, ${(f.y ?? 0).toFixed(2)}°)`;
      }).join('\n')
    : 'Kurucu bulunamadı';

  // ── Bireyler listesi ─────────────────────────────────────────────────────
  const MAX_IND = 60;
  const indsToShow = alive.slice(0, MAX_IND);
  const indLines = indsToShow.map(i => {
    const age    = Math.round(getAge(i, day));
    const name   = i.phenotype?.name ?? `${i.sex === 'male' ? '♂' : '♀'}-${i.id.slice(-4).toUpperCase()}`;
    const hp     = Math.round((i.health?.hp ?? 1) * 100);
    const cal    = Math.round((i.health?.calories ?? 1) * 100);
    const urge   = Math.round((i.mating_urge ?? 0) * 100);
    const preg   = i.health?.pregnancy ? ' [HAMİLE]' : '';
    const found  = i.is_founder ? ' [KURUCU-SABİT]' : '';
    const grp    = i.group_id ? ` [grup:${i.group_id.slice(-4)}]` : '';
    const stress = Math.min(1, Math.max(0,
      Math.max((0.45 - (i.health?.calories ?? 0.7)) / 0.45, (0.35 - (i.health?.hydration ?? 0.7)) / 0.35)
    ));
    const drive  = stress > 0.4 ? 'yiyecek/su arıyor' : urge > 65 ? 'çiftleşme arayışı' : 'bantta';
    return `  ${name} | ${i.sex === 'male' ? 'E' : 'D'} yaş:${age} hp:${hp}% kalori:${cal}% çiftleşme-dürtüsü:${urge}%${preg}${found}${grp} → ${drive}`;
  });
  const indSection = `Bireyler (${alive.length} hayatta${alive.length > MAX_IND ? `, ilk ${MAX_IND} gösteriliyor` : ''}):\n` +
    indLines.join('\n');

  // ── Gruplar ──────────────────────────────────────────────────────────────
  let groupLine = 'Gruplar: Henüz yok';
  if (engine.groups?.length) {
    groupLine = 'Gruplar:\n' + engine.groups.map(g => {
      const members = alive.filter(i => g.member_ids?.includes(i.id));
      return `  - Grup ${g.id.slice(-4)}: ${members.length} üye, ` +
        `merkez (${(g.territory?.x ?? 0).toFixed(1)}°, ${(g.territory?.y ?? 0).toFixed(1)}°)`;
    }).join('\n');
  }

  // ── Teknoloji / inanç / sanat ─────────────────────────────────────────────
  const techLine  = `Teknolojiler (${engine.discoveredTechs?.size ?? 0}): ${[...(engine.discoveredTechs ?? [])].join(', ') || 'yok'}`;
  const beliefLine = `İnançlar (${engine.discoveredBeliefs?.size ?? 0}): ${[...(engine.discoveredBeliefs ?? [])].slice(0, 10).join(', ') || 'yok'}`;

  // ── Son olaylar ──────────────────────────────────────────────────────────
  const recentEvents = (engine.events ?? []).slice(-30).reverse()
    .map(e => `  Y${e.sim_year} [${e.event_type}] ${e.description}`)
    .join('\n');

  // ── Hareket bağlamı ──────────────────────────────────────────────────────
  const cx = alive.reduce((s, i) => s + (i.x ?? 0), 0) / Math.max(1, alive.length);
  const cy = alive.reduce((s, i) => s + (i.y ?? 0), 0) / Math.max(1, alive.length);
  const avgCal  = alive.reduce((s, i) => s + (i.health?.calories ?? 0.7), 0) / Math.max(1, alive.length);
  const avgUrge = alive.reduce((s, i) => s + (i.mating_urge ?? 0), 0) / Math.max(1, alive.length);
  const dominant = avgCal < 0.38 ? 'yiyecek arama' : avgUrge > 0.65 ? 'çiftleşme arayışı' : 'bant uyumu';
  const moveLine = `Hareket: Baskın dürtü="${dominant}", ort.kalori=${(avgCal * 100).toFixed(0)}%, ` +
    `ort.çiftleşme-dürtüsü=${(avgUrge * 100).toFixed(0)}%, ` +
    `bant merkezi=(${cx.toFixed(2)}°, ${cy.toFixed(2)}°)`;

  return [worldLine, popLine, deathLine, '', foundersLine, '', indSection, '', groupLine, '',
    techLine, beliefLine, moveLine, '', 'Son 30 olay:', recentEvents].join('\n');
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message } = req.body;
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const response = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 800,
      system: `Sen ANATOLIA-SIM medeniyet simulasyonunu analiz eden uzman bir yapay zeka asistansin.\n\n${SIM_ARCHITECTURE}\n\nMEVCUT SİMÜLASYON VERİSİ:\n${context}\n\nYaniti Turkce, kisa, net ve veriye dayali ver. Mimari tasarim kararlarini biliyorsun.`,
      user: message,
    });
    res.json({ response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

router.post('/:simId/hypothesis', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { hypothesis } = req.body;
    const engine = simulationManager.getEngine(req.params.simId);
    const context = buildEngineContext(engine);
    const text = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${SIM_ARCHITECTURE}\n${context}`,
      user: `Evaluate: "${hypothesis}"\nRespond JSON only: {"verdict":"supported"|"refuted"|"inconclusive","confidence":0.0-1.0,"reasoning":"..."}`,
    });
    const match = text.match(/\{[\s\S]*\}/);
    const json = match ? JSON.parse(match[0]) : { verdict: 'inconclusive', confidence: 0.5, reasoning: 'Insufficient data.' };
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hypothesis test failed' });
  }
});

export default router;

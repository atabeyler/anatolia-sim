import { Router } from 'express';
import { authenticate, requireSimulationOwner } from '../middleware/auth.js';
import { geminiChat } from '../../utils/gemini.js';

const router = Router();

const SIM_ARCHITECTURE = `
SİMÜLASYON MİMARİSİ (tasarım kararları):
- Kurucular (is_founder=true): Başlangıç koordinatlarına sabitlenmiş çıpalardır, hareket etmezler. Bu kasıtlı bir tasarım kararıdır — aile bandının merkezini sabitlerler.
- Diğer tüm bireyler: Grubun ağırlık merkezine (centroid) doğru çekilir, kurucuların konumu bu centroidi doğal olarak ev noktasına çeker.
- Hareket öncelikleri: Açlık/susuzluk > bant uyumu > çiftleşme dürtüsü. Temel ihtiyaçlar karşılanmadan çiftleşme hareketi devreye girmez.
- Çiftleşme dürtüsü (mating_urge): Her bireyde günlük birikir, çiftleşince sıfırlanır, hamilelikte 0 olur. Tek eşlilik yoktur.
- Bebek ölüm oranı: ~%14/yıl (0-1 yaş), yüksek görünse de küçük gruplar için koruma mekanizması devrededir.
- Akrabalık katsayısı (inbreeding_coeff) > 0.25 ise ölüm riski %50 artar.
`;

function buildContext(stats, events) {
  const ds = stats?.death_stats;
  let deathLine = '';
  if (ds?.count > 0) {
    const causeSummary = Object.entries(ds.causes ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    deathLine = `\nÖlüm istatistikleri - Toplam: ${ds.count}, Ortalama ölüm yaşı: ${ds.avg_age} yıl, ` +
      `Bebek ölümleri (<1 yıl): ${ds.infant_deaths}, Çocuk ölümleri (1-15 yıl): ${ds.child_deaths}, ` +
      `Nedenler: ${causeSummary || 'kayıt yok'}`;
  } else {
    deathLine = '\nÖlüm istatistikleri - Henüz ölüm yok';
  }

  const foundersLine = (stats?.founders ?? []).length > 0
    ? '\nKurucular: ' + stats.founders.map(f =>
        `${f.sex === 'male' ? 'Erkek' : 'Dişi'} kurucu, yaş ${f.age}, ${f.alive ? 'hayatta (sabit konumda — tasarım gereği hareket etmez)' : 'ölmüş'}`
      ).join(' | ')
    : '';

  const mc = stats?.movement_context;
  const moveLine = mc
    ? `\nHareket durumu - Baskın dürtü: ${mc.dominant_drive}, Çiftleşme dürtüsü ort: ${mc.avg_mating_urge}, ` +
      `Ortalama kalori: ${mc.avg_calories}, Ortalama su: ${mc.avg_hydration}, ` +
      `Merkezden ort. uzaklık: ${mc.avg_dist_from_center_deg}°`
    : '';

  return `Simülasyon durumu - Yıl: ${stats?.year ?? '?'}, Nüfus: ${stats?.population ?? '?'}, ` +
    `Toplam doğan: ${stats?.total_ever ?? '?'}, ` +
    `Teknoloji: ${stats?.technologies ?? 0}, İnanç: ${stats?.beliefs ?? 0}, Sanat: ${stats?.art_forms ?? 0}, ` +
    `Grup: ${stats?.groups ?? 0}, Gini: ${stats?.gini ?? 0}, Mutluluk: ${((stats?.happiness_index ?? 0.5) * 100).toFixed(0)}%, ` +
    `Hasta oranı: ${((stats?.sick_rate ?? 0) * 100).toFixed(0)}%, Mevsim: ${stats?.season ?? 'spring'}, Sıcaklık: ${stats?.temperature ?? 20}°C` +
    foundersLine + moveLine + deathLine + '\n' +
    `Son olaylar:\n${(events ?? []).slice(0, 12).map(e => `- Y${e.sim_year} [${e.event_type}] ${e.description}`).join('\n')}`;
}

router.post('/:simId', authenticate, requireSimulationOwner, async (req, res) => {
  try {
    const { message, stats, events } = req.body;
    const response = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 800,
      system: `Sen ANATOLIA-SIM medeniyet simulasyonunu analiz eden uzman bir yapay zeka asistansin.\n\n${SIM_ARCHITECTURE}\n\n${buildContext(stats, events)}\n\nYaniti Turkce, kisa, net ve veriye dayali ver. Mimari tasarim kararlarini biliyorsun, yanlis tahmin yapma.`,
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
    const { hypothesis, stats, events } = req.body;
    const text = await geminiChat({
      model: process.env.GEMINI_ANALYSIS_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      max_tokens: 600,
      system: `You are a scientist evaluating hypotheses about a civilization simulation.\n${buildContext(stats, events)}`,
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

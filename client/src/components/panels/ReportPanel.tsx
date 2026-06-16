import { useState, useRef } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Download, FileJson, FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { text, type LangCode } from '../../utils/i18n';

export default function ReportPanel() {
  const { currentSim, accessToken, lang, stats, events } = useSimStore();
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 4000); }

  async function downloadJSON() {
    if (!currentSim || !accessToken) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/simulations/${currentSim.id}/report`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anatolia-sim-${currentSim.name ?? currentSim.id}-Y${stats?.year ?? 0}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash(text(lang as LangCode, { en: '✓ JSON downloaded.', tr: '✓ JSON indirildi.' }));
    } catch {
      flash(text(lang as LangCode, { en: '✗ Download failed.', tr: '✗ İndirme başarısız.' }));
    }
    setLoading(false);
  }

  async function buildReportHtml(): Promise<string> {
    const sim = currentSim!;
    const { data: r } = await axios.get(`/api/simulations/${sim.id}/report`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

      const S = r.current_stats ?? {};
      const localeMap: Record<string, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', ar: 'ar-SA' };
      const now = new Date().toLocaleString(localeMap[lang] ?? 'en-US');
      const rt = (tr: string, en: string, de?: string, fr?: string, ar?: string) => {
        if (lang === 'tr') return tr;
        if (lang === 'de') return de ?? en;
        if (lang === 'fr') return fr ?? en;
        if (lang === 'ar') return ar ?? en;
        return en;
      };
      const th = (s: string) => `<th style="border:1px solid #bbb;padding:4px 6px;background:#f0f0f0;font-size:11px;text-align:left;">${s}</th>`;
      const td = (s: unknown) => `<td style="border:1px solid #ddd;padding:3px 6px;font-size:11px;">${s != null ? String(s) : '—'}</td>`;
      const tr2 = (...cells: unknown[]) => `<tr>${cells.map(td).join('')}</tr>`;
      const sec = (title: string) => `<h2 style="font-size:14px;border-bottom:2px solid #333;padding-bottom:4px;margin:24px 0 8px 0;">${title}</h2>`;
      const tbl = (headers: string[], rows: string) =>
        `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr>${headers.map(th).join('')}</tr>${rows}</table>`;
      const pct = (v: number|null|undefined) => v != null ? `${Math.round(v*100)}%` : '—';
      const coord = (v: number|null|undefined) => v != null ? v.toFixed(4) : '—';

      // Population history rows (every 4th checkpoint to keep compact — annual)
      const popHistory = (r.population_history ?? [])
        .filter((_: unknown, i: number) => i % 4 === 0 || i === (r.population_history.length - 1));

      const deathByCause = r.death_statistics?.by_cause ?? {};
      const deathTotal = r.death_statistics?.total ?? 0;
      const deathByAge = r.death_statistics?.by_age_group ?? {};

      // Auto-generated intro stats
      const totalYears = r.simulation?.current_year ?? S.year ?? 0;
      const totalEver  = (r.individuals ?? []).length;
      const peakPop    = (r.population_history ?? []).reduce((mx: number, c: Record<string,unknown>) => Math.max(mx, (c.population as number) ?? 0), 0);
      const langStageNamesMap: Record<string, string[]> = {
        tr: ['dil öncesi', 'jest dili', 'proto-dil', 'sözel dil', 'karmaşık dil', 'sembolik dil'],
        en: ['pre-linguistic', 'gestural', 'proto-language', 'verbal', 'complex language', 'symbolic'],
        de: ['vorsprachlich', 'Gestik', 'Protosprache', 'verbal', 'komplexe Sprache', 'symbolisch'],
        fr: ['prélinguistique', 'gestuelle', 'proto-langage', 'verbal', 'langage complexe', 'symbolique'],
        ar: ['ما قبل اللغة', 'إيمائي', 'لغة أولية', 'لفظي', 'لغة معقدة', 'رمزي'],
      };
      const langStageNames = langStageNamesMap[lang] ?? langStageNamesMap.en;
      const langStageName  = langStageNames[S.max_language_stage ?? 0] ?? '?';
      const totalMigDist   = (r.migration_history ?? []).reduce((s: number, m: Record<string,unknown>) => s + ((m.distance_km as number) ?? 0), 0);
      const epicCount  = (r.notable_events ?? []).filter((e: Record<string,unknown>) => e.event_type === 'epidemic').length;
      const disCount   = (r.notable_events ?? []).filter((e: Record<string,unknown>) => e.event_type === 'disaster').length;
      const deadAvgAge = (() => {
        const dead = (r.individuals ?? []).filter((i: Record<string,unknown>) => i.is_dead && i.age_at_death != null);
        if (!dead.length) return null;
        return Math.round(dead.reduce((s: number, i: Record<string,unknown>) => s + (i.age_at_death as number), 0) / dead.length * 10) / 10;
      })();

      const introMap: Record<string, string> = {
        tr: `Bu rapor, ANATOLİA-SİM evrimsel medeniyet simülasyonunda "${r.simulation?.name ?? sim.id}" adıyla oluşturulan medeniyetin ${totalYears} yıllık tarihsel kaydını içermektedir. Simülasyon ${r.simulation?.start_latitude ?? '?'}° enlem, ${r.simulation?.start_longitude ?? '?'}° boylamda, ${r.simulation?.biome ?? '?'} biome'unda başlatılmıştır.\n\nMedeniyet tarihi boyunca toplam ${totalEver} birey doğmuş, nüfus en yüksek ${peakPop} kişiye ulaşmıştır. Topluluk ${(r.technology_timeline ?? []).length} teknoloji ve ${(r.belief_timeline ?? []).length} inanç geliştirmiş; dil ${langStageName} aşamasına ilerlemiştir. ${deathTotal} ölümün gerçekleştiği bu süreçte ortalama ölüm yaşı ${deadAvgAge ?? '?'} yıl olarak hesaplanmıştır${epicCount > 0 ? `; ${epicCount} salgın ve ${disCount} doğal afet kaydedilmiştir` : ''}. ${totalMigDist > 0 ? `Bant toplamda yaklaşık ${totalMigDist} km yer değiştirmiştir.` : ''}`,
        en: `This report contains the ${totalYears}-year historical record of the civilization "${r.simulation?.name ?? sim.id}" created in the ANATOLİA-SİM evolutionary civilization simulation. The simulation was initialized at latitude ${r.simulation?.start_latitude ?? '?'}°, longitude ${r.simulation?.start_longitude ?? '?'}° in the ${r.simulation?.biome ?? '?'} biome.\n\nThroughout its history, a total of ${totalEver} individuals were born, with peak population reaching ${peakPop}. The civilization developed ${(r.technology_timeline ?? []).length} technologies and ${(r.belief_timeline ?? []).length} beliefs; language progressed to the ${langStageName} stage. Of the ${deathTotal} deaths recorded, the average age at death was ${deadAvgAge ?? '?'} years${epicCount > 0 ? `; ${epicCount} epidemic(s) and ${disCount} disaster(s) occurred` : ''}. ${totalMigDist > 0 ? `The band migrated approximately ${totalMigDist} km in total.` : ''}`,
        de: `Dieser Bericht enthält die ${totalYears}-jährige historische Aufzeichnung der Zivilisation „${r.simulation?.name ?? sim.id}", die in der ANATOLİA-SİM-Evolutionssimulation erstellt wurde. Die Simulation wurde bei ${r.simulation?.start_latitude ?? '?'}° Breite, ${r.simulation?.start_longitude ?? '?'}° Länge im Biom „${r.simulation?.biome ?? '?'}" gestartet.\n\nInsgesamt wurden ${totalEver} Individuen geboren, die Höchstbevölkerung betrug ${peakPop}. Die Zivilisation entwickelte ${(r.technology_timeline ?? []).length} Technologien und ${(r.belief_timeline ?? []).length} Glaubenssätze; die Sprache erreichte die Stufe ${langStageName}. Von den ${deathTotal} Todesfällen betrug das durchschnittliche Sterbealter ${deadAvgAge ?? '?'} Jahre${epicCount > 0 ? `; ${epicCount} Epidemie(n) und ${disCount} Katastrophe(n) wurden verzeichnet` : ''}. ${totalMigDist > 0 ? `Die Gruppe wanderte insgesamt ca. ${totalMigDist} km.` : ''}`,
        fr: `Ce rapport contient l'enregistrement historique de ${totalYears} ans de la civilisation « ${r.simulation?.name ?? sim.id} » créée dans la simulation ANATOLİA-SİM. La simulation a été initialisée à ${r.simulation?.start_latitude ?? '?'}° de latitude, ${r.simulation?.start_longitude ?? '?'}° de longitude dans le biome « ${r.simulation?.biome ?? '?'} ».\n\nAu total, ${totalEver} individus sont nés, la population maximale atteignant ${peakPop}. La civilisation a développé ${(r.technology_timeline ?? []).length} technologies et ${(r.belief_timeline ?? []).length} croyances ; le langage a progressé jusqu'au stade ${langStageName}. Sur les ${deathTotal} décès enregistrés, l'âge moyen au décès était de ${deadAvgAge ?? '?'} ans${epicCount > 0 ? ` ; ${epicCount} épidémie(s) et ${disCount} catastrophe(s) ont eu lieu` : ''}. ${totalMigDist > 0 ? `Le groupe a migré d'environ ${totalMigDist} km au total.` : ''}`,
        ar: `يحتوي هذا التقرير على السجل التاريخي لـ ${totalYears} عامًا من حضارة "${r.simulation?.name ?? sim.id}" التي أُنشئت في محاكاة ANATOLİA-SİM. بدأت المحاكاة عند خط عرض ${r.simulation?.start_latitude ?? '?'}° وخط طول ${r.simulation?.start_longitude ?? '?'}° في منطقة ${r.simulation?.biome ?? '?'}.\n\nوُلد ما مجموعه ${totalEver} فردًا، وبلغ الحد الأقصى للسكان ${peakPop}. طورت الحضارة ${(r.technology_timeline ?? []).length} تقنية و${(r.belief_timeline ?? []).length} معتقدًا؛ وتقدمت اللغة إلى مرحلة ${langStageName}. من أصل ${deathTotal} حالة وفاة مسجلة، كان متوسط العمر عند الوفاة ${deadAvgAge ?? '?'} عامًا${epicCount > 0 ? `؛ جرى تسجيل ${epicCount} وباء و${disCount} كارثة` : ''}. ${totalMigDist > 0 ? `هاجرت المجموعة ما يقارب ${totalMigDist} كم إجمالاً.` : ''}`,
      };
      const intro = introMap[lang] ?? introMap.en;

      // ── SVG Chart Helpers ──────────────────────────────────────────────────
      const popChartSvg = (() => {
        const data = popHistory as Record<string, unknown>[];
        if (data.length < 2) return '';
        const W = 680, H = 180, PL = 42, PR = 16, PT = 14, PB = 32;
        const maxP = Math.max(...data.map(d => (d.population as number) ?? 0), 1);
        const minY = (data[0]?.year as number) ?? 0;
        const maxY = (data[data.length - 1]?.year as number) ?? 1;
        const xS = (y: number) => PL + ((y - minY) / Math.max(1, maxY - minY)) * (W - PL - PR);
        const yS = (p: number) => PT + (H - PT - PB) * (1 - p / maxP);
        const pts = data.map(d => `${xS(d.year as number).toFixed(1)},${yS(d.population as number).toFixed(1)}`).join(' ');
        const area = `${xS(minY)},${H - PB} ${pts} ${xS(maxY)},${H - PB}`;
        const grids = [0, 0.25, 0.5, 0.75, 1].map(f => {
          const v = Math.round(maxP * f); const y = yS(v).toFixed(1);
          return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.8"/>
                  <text x="${PL - 4}" y="${(parseFloat(y) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#9ca3af">${v}</text>`;
        }).join('');
        const step = Math.max(1, Math.floor(data.length / 8));
        const xLbls = data.filter((_, i) => i % step === 0 || i === data.length - 1).map(d =>
          `<text x="${xS(d.year as number).toFixed(1)}" y="${H - PB + 13}" text-anchor="middle" font-size="9" fill="#9ca3af">${d.year}</text>`).join('');
        const dots = data.map(d =>
          `<circle cx="${xS(d.year as number).toFixed(1)}" cy="${yS(d.population as number).toFixed(1)}" r="2.5" fill="#f59e0b"/>`).join('');
        return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${W}" height="${H}" fill="#fafafa" rx="6"/>
          ${grids}
          <polygon points="${area}" fill="#f59e0b" fill-opacity="0.12"/>
          <polyline points="${pts}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round"/>
          ${dots}
          <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#d1d5db"/>
          <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="#d1d5db"/>
          ${xLbls}
        </svg>`;
      })();

      const deathCauseChartSvg = (() => {
        const entries = Object.entries(deathByCause).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10);
        if (!entries.length) return '';
        const maxV = Math.max(...entries.map(([, v]) => v as number), 1);
        const W = 680, BH = 18, GAP = 5, PL = 170, PR = 60, PT = 8;
        const H = PT + entries.length * (BH + GAP);
        const bars = entries.map(([cause, count], i) => {
          const y = PT + i * (BH + GAP);
          const bw = ((count as number) / maxV) * (W - PL - PR);
          const pctStr = deathTotal ? ` (${Math.round((count as number) / deathTotal * 100)}%)` : '';
          return `<text x="${PL - 6}" y="${y + BH - 4}" text-anchor="end" font-size="10" fill="#374151">${cause.replace(/_/g, ' ')}</text>
                  <rect x="${PL}" y="${y}" width="${bw.toFixed(1)}" height="${BH}" fill="#ef4444" fill-opacity="0.75" rx="3"/>
                  <text x="${PL + bw + 5}" y="${y + BH - 4}" font-size="10" fill="#374151">${count}${pctStr}</text>`;
        }).join('');
        return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#fafafa" rx="6"/>${bars}</svg>`;
      })();

      const ageChartSvg = (() => {
        const groups = [
          { label: '0–1', val: deathByAge.infant_0_1 ?? 0, color: '#ef4444' },
          { label: '1–15', val: deathByAge.child_1_15 ?? 0, color: '#f97316' },
          { label: '15–30', val: deathByAge.young_adult_15_30 ?? 0, color: '#eab308' },
          { label: '30–50', val: deathByAge.adult_30_50 ?? 0, color: '#22c55e' },
          { label: '50+', val: deathByAge.elder_50plus ?? 0, color: '#3b82f6' },
        ];
        const maxV = Math.max(...groups.map(g => g.val), 1);
        const BW = 52, GAP = 16, PL = 20, PT = 10, PB = 28, H = 150;
        const W = PL * 2 + groups.length * (BW + GAP) - GAP;
        const bars = groups.map((g, i) => {
          const x = PL + i * (BW + GAP);
          const bh = ((g.val / maxV) * (H - PT - PB));
          const y = H - PB - bh;
          const pct = deathTotal ? Math.round(g.val / deathTotal * 100) : 0;
          return `<rect x="${x}" y="${y.toFixed(1)}" width="${BW}" height="${bh.toFixed(1)}" fill="${g.color}" fill-opacity="0.8" rx="4"/>
                  <text x="${x + BW / 2}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#374151" font-weight="bold">${g.val}</text>
                  <text x="${x + BW / 2}" y="${H - PB + 13}" text-anchor="middle" font-size="9" fill="#6b7280">${g.label}</text>
                  <text x="${x + BW / 2}" y="${H - PB + 23}" text-anchor="middle" font-size="8" fill="#9ca3af">${pct}%</text>`;
        }).join('');
        return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${W}" height="${H}" fill="#fafafa" rx="6"/>
          <line x1="${PL}" y1="${H - PB}" x2="${W - PL}" y2="${H - PB}" stroke="#d1d5db"/>
          ${bars}
        </svg>`;
      })();

      // ── CSS & Layout helpers ───────────────────────────────────────────────
      const secColor = (title: string, color: string, icon: string) =>
        `<div style="margin:28px 0 10px 0;padding:8px 14px;background:${color}18;border-left:4px solid ${color};border-radius:0 6px 6px 0;">
           <span style="font-size:15px;font-weight:bold;color:${color};">${icon} ${title}</span>
         </div>`;
      const styledTbl = (headers: string[], rows: string, hdrColor: string) => {
        const ths = headers.map(h => `<th style="padding:6px 8px;background:${hdrColor};color:#fff;font-size:10px;text-align:left;font-weight:600;">${h}</th>`).join('');
        return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>${ths}</tr>${rows}</table>`;
      };
      const stRow = (cells: unknown[], i: number) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        return `<tr style="background:${bg};">${cells.map(c => `<td style="padding:4px 8px;font-size:10px;border-bottom:1px solid #f0f0f0;">${c != null ? String(c) : '—'}</td>`).join('')}</tr>`;
      };
      const statCard = (label: string, value: string, color: string) =>
        `<div style="flex:1;background:${color}12;border:1px solid ${color}30;border-radius:8px;padding:12px 14px;min-width:120px;">
           <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">${label}</div>
           <div style="font-size:20px;font-weight:bold;color:${color};">${value}</div>
         </div>`;
      const badge = (text: string, color: string) =>
        `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}40;border-radius:12px;padding:2px 10px;font-size:10px;margin:2px;">${text}</span>`;

      const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
<title>ANATOLİA-SİM — ${sim.name ?? sim.id}</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1f2937;margin:0;font-size:12px;line-height:1.5;}
  @media print{body{margin:0;}}
</style></head><body>

<!-- ═══ KAPAK SAYFASI ═══ -->
<div style="background:#0d1b2a;color:#fff;padding:64px 52px;min-height:1060px;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <div style="font-size:10px;letter-spacing:5px;text-transform:uppercase;color:#64748b;margin-bottom:52px;">
      ANATOLİA-SİM &middot; EVOLUTIONARY CIVILIZATION ENGINE
    </div>
    <div style="font-size:56px;font-weight:900;letter-spacing:3px;line-height:1;color:#f59e0b;margin-bottom:6px;">ANATOLİA</div>
    <div style="font-size:56px;font-weight:900;letter-spacing:3px;line-height:1;color:#fff;margin-bottom:16px;">SİM</div>
    <div style="font-size:18px;color:#94a3b8;letter-spacing:2px;margin-bottom:40px;">${rt('MEDENİYET RAPORU','CIVILIZATION REPORT')}</div>
    <div style="font-size:30px;font-weight:700;color:#f1f5f9;border-top:1px solid #334155;border-bottom:1px solid #334155;padding:14px 0;margin-bottom:36px;">
      ${r.simulation?.name ?? sim.id}
    </div>
    <div style="display:flex;gap:32px;flex-wrap:wrap;">
      <div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Biome</div>
        <div style="font-size:14px;color:#e2e8f0;font-weight:600;">${r.simulation?.biome ?? '?'}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${rt('Koordinatlar','Coordinates')}</div>
        <div style="font-size:14px;color:#e2e8f0;font-weight:600;">${r.simulation?.start_latitude ?? '?'}°, ${r.simulation?.start_longitude ?? '?'}°</div>
      </div>
      <div>
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${rt('Süre','Duration')}</div>
        <div style="font-size:14px;color:#e2e8f0;font-weight:600;">${totalYears} ${rt('yıl','yr')} · ${r.simulation?.current_day ?? S.day ?? '?'} ${rt('gün','days')}</div>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:32px;flex-wrap:wrap;">
      ${statCard(rt('Zirve Nüfus','Peak Pop.'), String(peakPop), '#f59e0b')}
      ${statCard(rt('Toplam Birey','Total Lived'), String(totalEver), '#38bdf8')}
      ${statCard(rt('Teknoloji','Technologies'), String((r.technology_timeline ?? []).length), '#34d399')}
      ${statCard(rt('Toplam Ölüm','Total Deaths'), String(deathTotal), '#f87171')}
    </div>
  </div>
  <div style="font-size:10px;color:#475569;border-top:1px solid #1e293b;padding-top:12px;margin-top:40px;">
    Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. &copy; 2026 &middot; RST Q-Nation 200120401018 &nbsp;&nbsp;|&nbsp;&nbsp; ${rt('Oluşturuldu','Generated')}: ${now}
  </div>
</div>

<!-- ═══ İÇERİK SAYFASI ═══ -->
<div style="padding:40px 44px;">

${r.simulation?.intervened ? `<!-- MÜDAHALELİ KOŞU UYARISI -->
<div style="background:#fef3c7;border:2px solid #d97706;border-radius:8px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:flex-start;gap:16px;">
  <div style="font-size:28px;line-height:1;">⚠️</div>
  <div>
    <div style="font-weight:bold;color:#92400e;font-size:13px;margin-bottom:6px;">${rt('MÜDAHALELİ DENEY KOŞUSU','GOD MODE INTERVENTION DETECTED')}</div>
    <div style="color:#78350f;font-size:11px;line-height:1.7;">${rt('Bu simülasyonda God Mode müdahalesi kullanılmıştır. Bu koşu doğal hipotez verisi değildir; rapordaki istatistikler deneysel kontrol grubu verisi olarak kullanılmamalıdır.','God Mode interventions were applied during this simulation run. This is not a clean natural-hypothesis dataset; statistics in this report should not be used as experimental control data.')
    }</div>
  </div>
</div>` : ''}

<!-- GİRİŞ -->
${secColor(rt('Giriş','Introduction'), '#475569', '📋')}
<div style="background:#f8fafc;border-radius:8px;padding:18px 22px;font-size:12px;line-height:1.9;color:#374151;white-space:pre-wrap;border:1px solid #e2e8f0;">${intro}</div>

<!-- ANLIK DURUM -->
${secColor(rt('Anlık Durum','Current Snapshot'), '#6366f1', '📊')}
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
  ${statCard(rt('Nüfus','Population'), String(S.population ?? '—'), '#6366f1')}
  ${statCard(rt('Ort. Yaş','Avg Age'), S.avg_age ? S.avg_age + ' yr' : '—', '#8b5cf6')}
  ${statCard(rt('Mutluluk','Happiness'), pct(S.happiness_index), '#10b981')}
  ${statCard('Gini', String(S.gini ?? '—'), '#f59e0b')}
  ${statCard(rt('Zeka','Intelligence'), pct(S.avg_intelligence), '#3b82f6')}
  ${statCard('QoL', String(S.qol_index ?? '—'), '#06b6d4')}
</div>
${styledTbl(
  [rt('Gösterge','Metric'), rt('Değer','Value'), rt('Gösterge','Metric'), rt('Değer','Value')],
  (() => {
    const rows2 = [
      [rt('Besin Bolluğu','Food Abundance'), pct(S.food_abundance), rt('Su Bolluğu','Water Abundance'), pct(S.water_abundance)],
      [rt('Hastalık Oranı','Sick Rate'), pct(S.sick_rate), rt('Sıcaklık','Temperature'), S.temperature ? S.temperature + '°C' : '—'],
      [rt('Dil Aşaması','Lang Stage'), S.max_language_stage, rt('Kelime Sayısı','Word Count'), S.word_count],
      [rt('Teknoloji','Technologies'), S.technologies, rt('İnanç','Beliefs'), S.beliefs],
      [rt('Sanat','Art Forms'), S.art_forms, rt('Gruplar','Groups'), S.groups],
      [rt('Mevsim','Season'), S.season, rt('Hava','Weather'), S.weather ?? '—'],
      [rt('Toplam Doğum','Total Births'), S.births, rt('Toplam Ölüm','Total Deaths'), S.deaths],
    ];
    return rows2.map((r2, i) => stRow(r2, i)).join('');
  })(),
  '#6366f1'
)}

<!-- NÜFUS TARİHİ -->
${secColor(rt('Nüfus Tarihi','Population History'), '#f59e0b', '📈')}
<div style="margin-bottom:12px;">${popChartSvg}</div>
${styledTbl(
  [rt('Yıl','Year'), rt('Nüfus','Pop'), rt('Ort.Yaş','Avg Age'), rt('Mutluluk','Happiness'), 'Gini',
   rt('Besin','Food'), rt('Su','Water'), rt('Konum','Location'), rt('Hareket Sebebi','Move Reason'), rt('Hava','Weather')],
  popHistory.map((c: Record<string,unknown>, i: number) => stRow([
    c.year, c.population, c.avg_age ? c.avg_age + 'yr' : '—',
    pct(c.happiness_index as number|undefined), c.gini,
    pct(c.food_abundance as number|undefined), pct(c.water_abundance as number|undefined),
    (c.centroid_x != null) ? coord(c.centroid_x as number) + ',' + coord(c.centroid_y as number) : '—',
    c.dominant_drive ?? '—', c.weather ?? '—',
  ], i)).join(''),
  '#d97706'
)}

<!-- TEKNOLOJİ ZAMAN ÇİZELGESİ -->
${secColor(rt('Teknoloji Zaman Çizelgesi','Technology Timeline'), '#3b82f6', '⚙️')}
<div style="margin-bottom:10px;">
  ${(r.technology_timeline as Record<string,unknown>[] ?? []).map(e => badge(String(e.name ?? '?'), '#3b82f6')).join('')}
</div>
${r.technology_timeline?.length ? styledTbl(
  [rt('Yıl','Year'), rt('Teknoloji','Technology'), rt('Keşif Sebebi','Discovery Reason'), rt('Nüfus','Pop'), rt('Mevsim','Season'), rt('Hava','Weather')],
  (r.technology_timeline as Record<string,unknown>[]).map((e, i) => stRow([
    e.year, e.name, e.trigger_reason ?? '—', e.population, e.season, e.weather
  ], i)).join(''),
  '#2563eb'
) : '<p style="color:#9ca3af;font-size:11px;padding:8px;">—</p>'}

<!-- İNANÇ & KÜLTÜR -->
${secColor(rt('İnanç & Kültür Zaman Çizelgesi','Belief & Culture Timeline'), '#8b5cf6', '🌀')}
<div style="margin-bottom:10px;">
  ${(r.belief_timeline as Record<string,unknown>[] ?? []).map(e => badge(String(e.name ?? '?'), '#8b5cf6')).join('')}
  ${(r.art_timeline as Record<string,unknown>[] ?? []).map(e => badge(String(e.name ?? '?'), '#ec4899')).join('')}
</div>
${(r.belief_timeline?.length || r.art_timeline?.length) ? styledTbl(
  [rt('Yıl','Year'), rt('Tür','Type'), rt('İsim','Name'), rt('Oluşum Sebebi','Reason'), rt('Nüfus','Pop'), rt('Mevsim','Season')],
  [
    ...(r.belief_timeline as Record<string,unknown>[] ?? []).map((e, i) => stRow([e.year, rt('İnanç','Belief'), e.name, e.trigger_reason ?? '—', e.population, e.season], i)),
    ...(r.art_timeline as Record<string,unknown>[] ?? []).map((e, i) => stRow([e.year, e.type, e.name, '—', '—', '—'], i + (r.belief_timeline?.length ?? 0))),
  ].join(''),
  '#7c3aed'
) : '<p style="color:#9ca3af;font-size:11px;padding:8px;">—</p>'}

<!-- GÖÇ TARİHİ -->
${secColor(rt('Göç Tarihi','Migration History'), '#10b981', '🧭')}
${r.migration_history?.length ? styledTbl(
  [rt('Yıl','Year'), rt('Mesafe','Distance'), rt('Göç Sebebi','Reason'), rt('Önceki','From'), rt('Yeni','To'), rt('Besin','Food'), rt('Su','Water'), rt('Mevsim','Season')],
  (r.migration_history as Record<string,unknown>[]).map((e, i) => {
    const from = e.from as Record<string,number>|undefined;
    const to   = e.to   as Record<string,number>|undefined;
    return stRow([
      e.year, e.distance_km ? e.distance_km + ' km' : '—', e.reason ?? '—',
      from ? coord(from.x) + ',' + coord(from.y) : '—',
      to   ? coord(to.x)   + ',' + coord(to.y)   : '—',
      pct(e.food_abundance as number|undefined), pct(e.water_abundance as number|undefined), e.season,
    ], i);
  }).join(''),
  '#059669'
) : `<p style="color:#9ca3af;font-size:11px;padding:8px;">${rt('Göç kaydı bulunamadı — yeni checkpoint\'lerden itibaren toplanacak.','No migration records yet — will accumulate from future checkpoints.','Keine Migrationsdaten vorhanden.','Aucune donnée de migration.','لا توجد سجلات هجرة بعد.')}</p>`}

<!-- ÖLÜM İSTATİSTİKLERİ -->
${secColor(rt('Ölüm İstatistikleri','Death Statistics'), '#ef4444', '💀')}
<div style="display:flex;gap:12px;margin-bottom:10px;">
  ${statCard(rt('Toplam Ölüm','Total Deaths'), String(deathTotal), '#ef4444')}
  ${statCard(rt('Ort. Ölüm Yaşı','Avg Death Age'), deadAvgAge != null ? deadAvgAge + ' yr' : '—', '#f97316')}
  ${statCard(rt('Bebek Ölümü','Infant Deaths'), String(deathByAge.infant_0_1 ?? 0), '#fbbf24')}
</div>
<div style="margin-bottom:14px;">${deathCauseChartSvg}</div>
<div style="display:flex;gap:20px;align-items:flex-start;">
  <div style="flex:2;">
  <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;">${rt('Nedene Göre','By Cause')}</div>
  ${styledTbl(
    [rt('Sebep','Cause'), rt('Sayı','Count'), '%'],
    Object.entries(deathByCause).sort(([,a],[,b]) => (b as number) - (a as number))
      .map(([cause, count], i) => stRow([cause.replace(/_/g,' '), count, deathTotal ? Math.round((count as number)/deathTotal*100)+'%' : '—'], i))
      .join('') || stRow([rt('Veri yok','No data'),'',''], 0),
    '#dc2626'
  )}
  </div>
  <div style="flex:1;">
  <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;">${rt('Yaş Grubuna Göre','By Age')}</div>
  <div>${ageChartSvg}</div>
  </div>
</div>

<!-- ÖNEMLİ OLAYLAR -->
${secColor(rt('Önemli Olaylar (önem ≥ 3)','Notable Events (importance ≥ 3)'), '#f97316', '⚡')}
${r.notable_events?.length ? styledTbl(
  [rt('Yıl','Year'), rt('Gün','Day'), rt('Tür','Type'), rt('Açıklama','Description')],
  (r.notable_events as Record<string,unknown>[]).map((e, i) => stRow([e.sim_year, e.sim_day, e.event_type, e.description], i)).join(''),
  '#ea580c'
) : '<p style="color:#9ca3af;font-size:11px;padding:8px;">—</p>'}

<!-- BİREYLER -->
${secColor(rt('Bireyler','Individuals'), '#64748b', '👥')}
${r.individuals?.length ? styledTbl(
  [rt('İsim','Name'), rt('Cin.','Sex'), rt('Kurucu','Fnd'), rt('Doğum Yılı','Born'), rt('Ölüm Yılı','Died'), rt('Ölüm Yaşı','Age@Death'), rt('Ölüm Sebebi','Cause'), rt('Zeka','IQ')],
  (r.individuals as Record<string,unknown>[]).map((ind, i) => stRow([
    ind.name, ind.sex === 'male' ? '♂' : '♀', ind.is_founder ? '★' : '',
    ind.birth_year,
    ind.is_dead ? ind.death_year : rt('(yaşıyor)','(alive)'),
    ind.age_at_death ?? (ind.is_dead ? '—' : ''),
    ind.death_cause ?? (ind.is_dead ? '—' : ''),
    ind.intelligence != null ? Math.round((ind.intelligence as number)*100)+'%' : '—',
  ], i)).join(''),
  '#475569'
) : '<p style="color:#9ca3af;font-size:11px;padding:8px;">—</p>'}

<div style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;">
  Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. &copy; 2026 &middot; RST Q-Nation 200120401018
</div>
</div>
</body></html>`;

    return html;
  }

  async function printReport() {
    if (!currentSim || !accessToken) return;
    setPdfLoading(true);
    try {
      const html = await buildReportHtml();
      const w = window.open('', '_blank', 'width=900,height=1000');
      if (!w) { flash(text(lang as LangCode, { en: '✗ Popup blocked.', tr: '✗ Popup engellendi.' })); setPdfLoading(false); return; }
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    } catch {
      flash(text(lang as LangCode, { en: '✗ Failed.', tr: '✗ Başarısız.' }));
    }
    setPdfLoading(false);
  }

  async function downloadPDF() {
    if (!currentSim || !accessToken) return;
    setPdfLoading(true);
    try {
      const html = await buildReportHtml();
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;';
      container.innerHTML = html;
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      document.body.removeChild(container);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;
      let posY = 0;
      while (posY < imgH) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -posY, imgW, imgH);
        posY += pageH;
      }
      const fname = `anatolia-sim-${currentSim.name ?? currentSim.id}-Y${stats?.year ?? 0}.pdf`;
      pdf.save(fname);
      flash(text(lang as LangCode, { en: '✓ PDF downloaded.', tr: '✓ PDF indirildi.' }));
    } catch (err) {
      console.error(err);
      flash(text(lang as LangCode, { en: '✗ PDF generation failed.', tr: '✗ PDF oluşturulamadı.' }));
    }
    setPdfLoading(false);
  }

  return (
    <DetailPanel panelId="report" title="Report" titleTr="Rapor">
      <div className="bg-sim-surface rounded-lg p-3 mb-4">
        <p className="text-sim-muted text-sm italic">
          {text(lang as LangCode, {
            en: 'Export the current simulation state as a JSON file or print a formatted PDF report.',
            tr: 'Mevcut simülasyon durumunu JSON dosyası olarak dışa aktarın veya biçimlendirilmiş PDF raporu yazdırın.',
          })}
        </p>
      </div>

      {msg && (
        <div className="bg-sim-accent/20 border border-sim-accent/40 rounded px-3 py-2 text-sm text-sim-text mb-3">
          {msg}
        </div>
      )}

      <div className="space-y-3">
        {/* JSON */}
        <div className="bg-sim-surface rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileJson size={16} className="text-sim-accent" />
            <span className="text-sim-text text-sm font-semibold">JSON</span>
          </div>
          <p className="text-sim-muted text-sm mb-3">
            {text(lang as LangCode, {
              en: 'Full simulation data: stats, events, checkpoints, technologies, beliefs.',
              tr: 'Tam simülasyon verisi: istatistikler, olaylar, kontrol noktaları, teknolojiler, inançlar.',
            })}
          </p>
          <button
            onClick={downloadJSON}
            disabled={loading || !currentSim}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-sim-accent/50 bg-sim-accent/10 hover:bg-sim-accent/25 text-sim-accent transition-colors text-sm font-share-tech disabled:opacity-50"
          >
            <Download size={14} className={loading ? 'animate-bounce' : ''} />
            {loading ? text(lang as LangCode, { en: 'Preparing…', tr: 'Hazırlanıyor…' }) : text(lang as LangCode, { en: 'Download JSON', tr: 'JSON İndir' })}
          </button>
        </div>

        {/* PDF */}
        <div className="bg-sim-surface rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={16} className="text-orange-400" />
            <span className="text-sim-text text-sm font-semibold">PDF</span>
          </div>
          <p className="text-sim-muted text-sm mb-3">
            {text(lang as LangCode, {
              en: 'Generates and downloads a .pdf file directly — no dialog needed.',
              tr: 'Kapak + giriş + tüm bölümler dahil .pdf dosyası olarak indirir.',
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={pdfLoading || !currentSim}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-orange-400/50 bg-orange-400/10 hover:bg-orange-400/25 text-orange-400 transition-colors text-sm font-share-tech disabled:opacity-50"
            >
              <FileDown size={14} className={pdfLoading ? 'animate-bounce' : ''} />
              {pdfLoading ? text(lang as LangCode, { en: 'Generating…', tr: 'Oluşturuluyor…' }) : text(lang as LangCode, { en: 'Download PDF', tr: 'PDF İndir' })}
            </button>
            <button
              onClick={printReport}
              disabled={!currentSim}
              title={text(lang as LangCode, { en: 'Open Print View', tr: 'Yazdırma Görünümünü Aç' })}
              className="px-3 py-2 rounded border border-orange-400/30 bg-orange-400/5 hover:bg-orange-400/15 text-orange-400/70 transition-colors text-sm disabled:opacity-50"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Current snapshot */}
      {stats && (
        <div className="mt-4 border-t border-sim-border/30 pt-3">
          <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
            {text(lang as LangCode, { en: 'Current Snapshot', tr: 'Anlık Görüntü' })}
          </h4>
          <div className="space-y-1">
            {[
              [text(lang as LangCode, { en: 'Year', tr: 'Yıl' }), stats.year],
              [text(lang as LangCode, { en: 'Population', tr: 'Nüfus' }), stats.population.toLocaleString()],
              [text(lang as LangCode, { en: 'Technologies', tr: 'Teknoloji' }), stats.technologies],
              [text(lang as LangCode, { en: 'Beliefs', tr: 'İnanç' }), stats.beliefs],
              [text(lang as LangCode, { en: 'Language Stage', tr: 'Dil Aşaması' }), stats.max_language_stage],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between text-sm border-b border-sim-border/20 py-0.5">
                <span className="text-sim-muted">{l}</span>
                <span className="text-sim-text font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DetailPanel>
  );
}

import { useState, useRef } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Download, FileJson, FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

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
      flash(t(lang, '✓ JSON downloaded.', '✓ JSON indirildi.'));
    } catch {
      flash(t(lang, '✗ Download failed.', '✗ İndirme başarısız.'));
    }
    setLoading(false);
  }

  function printReport() {
    if (!stats || !currentSim) return;
    const recentEvents = events.slice(0, 30);
    const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"><title>ANATOLİA-SİM — ${currentSim.name ?? currentSim.id}</title>
<style>body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:40px;font-size:13px;}h1{font-size:20px;border-bottom:2px solid #111;padding-bottom:8px;}h2{font-size:15px;margin-top:24px;border-bottom:1px solid #999;padding-bottom:4px;}table{width:100%;border-collapse:collapse;margin-top:8px;}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left;}th{background:#f0f0f0;font-weight:bold;}.meta{color:#555;font-size:12px;}.event{margin:3px 0;}@media print{body{margin:20px;}}</style>
</head><body>
<h1>ANATOLİA-SİM ${t(lang,'Civilization Report','Medeniyet Raporu')}</h1>
<p class="meta">${t(lang,'Simulation','Simülasyon')}: <strong>${currentSim.name??currentSim.id}</strong> &nbsp;|&nbsp; ${t(lang,'Generated','Oluşturuldu')}: ${new Date().toLocaleString(lang==='tr'?'tr-TR':'en-US')} &nbsp;|&nbsp; ${t(lang,'Year','Yıl')} ${stats.year} · ${t(lang,'Day','Gün')} ${stats.day}</p>
<h2>${t(lang,'Population Statistics','Nüfus İstatistikleri')}</h2>
<table><tr><th>${t(lang,'Metric','Gösterge')}</th><th>${t(lang,'Value','Değer')}</th></tr>
${[[t(lang,'Population','Nüfus'),stats.population.toLocaleString()],[t(lang,'Average Age','Ortalama Yaş'),`${stats.avg_age} yr`],[t(lang,'Avg Intelligence','Ort. Zeka'),`${(stats.avg_intelligence*100).toFixed(1)}%`],[t(lang,'Technologies','Teknolojiler'),stats.technologies],[t(lang,'Beliefs','İnançlar'),stats.beliefs],[t(lang,'Art Forms','Sanat Formları'),stats.art_forms],[t(lang,'Social Groups','Sosyal Gruplar'),stats.groups],[t(lang,'Gini Coefficient','Gini Katsayısı'),stats.gini],[t(lang,'Happiness Index','Mutluluk İndeksi'),`${((stats as any).happiness_index*100).toFixed(0)}%`],[t(lang,'Sick Rate','Hastalık Oranı'),`${(stats.sick_rate*100).toFixed(1)}%`],[t(lang,'Food Abundance','Besin Bolluğu'),`${(stats.food_abundance*100).toFixed(0)}%`],[t(lang,'Water Abundance','Su Bolluğu'),`${((stats.water_abundance??0)*100).toFixed(0)}%`],[t(lang,'Season','Mevsim'),stats.season],[t(lang,'Temperature','Sıcaklık'),`${stats.temperature}°C`],[t(lang,'Language Stage','Dil Aşaması'),stats.max_language_stage],[t(lang,'Word Count','Kelime Sayısı'),stats.word_count]].map(([l,v])=>`<tr><td>${l}</td><td>${v}</td></tr>`).join('')}
</table>
<h2>${t(lang,'Recent Events','Son Olaylar')}</h2>
${recentEvents.map(ev=>`<div class="event">Y${ev.sim_year} G${ev.sim_day} [${ev.event_type}] ${ev.description??''}</div>`).join('')}
<p class="meta" style="margin-top:32px;border-top:1px solid #ccc;padding-top:8px;">Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 · RST Q-Nation 200120401018</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  async function downloadPDF() {
    if (!currentSim || !accessToken) return;
    setPdfLoading(true);
    try {
      const { data: r } = await axios.get(`/api/simulations/${currentSim.id}/report`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const S = r.current_stats ?? {};
      const TR = lang === 'tr';
      const now = new Date().toLocaleString(TR ? 'tr-TR' : 'en-US');
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
      const langStageNames = ['dil öncesi', 'jest dili', 'proto-dil', 'sözel dil', 'karmaşık dil', 'sembolik dil'];
      const langStageName  = langStageNames[S.max_language_stage ?? 0] ?? '?';
      const totalMigDist   = (r.migration_history ?? []).reduce((s: number, m: Record<string,unknown>) => s + ((m.distance_km as number) ?? 0), 0);
      const epicCount  = (r.notable_events ?? []).filter((e: Record<string,unknown>) => e.event_type === 'epidemic').length;
      const disCount   = (r.notable_events ?? []).filter((e: Record<string,unknown>) => e.event_type === 'disaster').length;
      const deadAvgAge = (() => {
        const dead = (r.individuals ?? []).filter((i: Record<string,unknown>) => i.is_dead && i.age_at_death != null);
        if (!dead.length) return null;
        return Math.round(dead.reduce((s: number, i: Record<string,unknown>) => s + (i.age_at_death as number), 0) / dead.length * 10) / 10;
      })();

      const introTR = `Bu rapor, ANATOLİA-SİM evrimsel medeniyet simülasyonunda "${r.simulation?.name ?? currentSim.id}" adıyla oluşturulan medeniyetin ${totalYears} yıllık tarihsel kaydını içermektedir. Simülasyon ${r.simulation?.start_latitude ?? '?'}° enlem, ${r.simulation?.start_longitude ?? '?'}° boylamda, ${r.simulation?.biome ?? '?'} biome'unda başlatılmıştır.

Medeniyet tarihi boyunca toplam ${totalEver} birey doğmuş, nüfus en yüksek ${peakPop} kişiye ulaşmıştır. Topluluk ${(r.technology_timeline ?? []).length} teknoloji ve ${(r.belief_timeline ?? []).length} inanç geliştirmiş; dil ${langStageName} aşamasına ilerlemiştir. ${deathTotal} ölümün gerçekleştiği bu süreçte ortalama ölüm yaşı ${deadAvgAge ?? '?'} yıl olarak hesaplanmıştır${epicCount > 0 ? `; ${epicCount} salgın ve ${disCount} doğal afet kaydedilmiştir` : ''}. ${totalMigDist > 0 ? `Bant toplamda yaklaşık ${totalMigDist} km yer değiştirmiştir.` : ''}`;

      const introEN = `This report contains the ${totalYears}-year historical record of the civilization "${r.simulation?.name ?? currentSim.id}" created in the ANATOLİA-SİM evolutionary civilization simulation. The simulation was initialized at latitude ${r.simulation?.start_latitude ?? '?'}°, longitude ${r.simulation?.start_longitude ?? '?'}° in the ${r.simulation?.biome ?? '?'} biome.

Throughout its history, a total of ${totalEver} individuals were born, with peak population reaching ${peakPop}. The civilization developed ${(r.technology_timeline ?? []).length} technologies and ${(r.belief_timeline ?? []).length} beliefs; language progressed to the ${langStageName} stage. Of the ${deathTotal} deaths recorded, the average age at death was ${deadAvgAge ?? '?'} years${epicCount > 0 ? `; ${epicCount} epidemic(s) and ${disCount} disaster(s) occurred` : ''}. ${totalMigDist > 0 ? `The band migrated approximately ${totalMigDist} km in total.` : ''}`;

      const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
<title>ANATOLİA-SİM — ${currentSim.name ?? currentSim.id}</title>
<style>
  body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:0;font-size:12px;line-height:1.5;}
  .page{padding:40px;box-sizing:border-box;}
  .cover{display:flex;flex-direction:column;justify-content:space-between;min-height:1050px;padding:60px 50px;border-bottom:3px solid #111;}
  .cover-brand{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#555;margin-bottom:60px;}
  .cover-title{font-size:48px;font-weight:bold;letter-spacing:2px;line-height:1.1;margin-bottom:8px;}
  .cover-subtitle{font-size:20px;color:#444;margin-bottom:40px;letter-spacing:1px;}
  .cover-simname{font-size:28px;border-top:2px solid #111;border-bottom:2px solid #111;padding:12px 0;margin-bottom:30px;}
  .cover-meta{font-size:12px;color:#333;line-height:2;}
  .cover-footer{font-size:10px;color:#777;border-top:1px solid #ccc;padding-top:12px;margin-top:40px;}
  h1{font-size:22px;border-bottom:3px solid #111;padding-bottom:10px;margin:0 0 6px 0;}
  h2{font-size:14px;border-bottom:2px solid #333;padding-bottom:4px;margin:24px 0 8px 0;}
  .intro-box{background:#f8f8f8;border-left:4px solid #333;padding:16px 20px;margin-bottom:20px;font-size:12px;line-height:1.8;white-space:pre-wrap;}
  .meta{color:#555;font-size:11px;margin-bottom:20px;}
  @media print{body{margin:0;}}
</style></head><body>

<!-- KAPAK SAYFASI -->
<div class="cover">
  <div>
    <div class="cover-brand">ANATOLİA-SİM · Evolutionary Civilization Engine</div>
    <div class="cover-title">ANATOLİA<br>SİM</div>
    <div class="cover-subtitle">${TR ? 'Medeniyet Raporu' : 'Civilization Report'}</div>
    <div class="cover-simname"><strong>${r.simulation?.name ?? currentSim.id}</strong></div>
    <div class="cover-meta">
      <div><strong>${TR?'Koordinatlar':'Coordinates'}</strong> &nbsp; ${r.simulation?.start_latitude ?? '?'}° ${(r.simulation?.start_latitude??0) >= 0 ? 'K':'G'}, &nbsp;${r.simulation?.start_longitude ?? '?'}° ${(r.simulation?.start_longitude??0) >= 0 ? 'D':'B'}</div>
      <div><strong>Biome</strong> &nbsp; ${r.simulation?.biome ?? '?'}</div>
      <div><strong>${TR?'Simülasyon Süresi':'Duration'}</strong> &nbsp; ${totalYears} ${TR?'yıl':'years'} &nbsp;(${r.simulation?.current_day ?? S.day ?? '?'} ${TR?'gün':'days'})</div>
      <div><strong>${TR?'Zirve Nüfus':'Peak Population'}</strong> &nbsp; ${peakPop} ${TR?'birey':'individuals'}</div>
      <div><strong>${TR?'Toplam Birey':'Total Ever Lived'}</strong> &nbsp; ${totalEver}</div>
      <div><strong>${TR?'Oluşturuldu':'Generated'}</strong> &nbsp; ${now}</div>
    </div>
  </div>
  <div class="cover-footer">Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 · RST Q-Nation 200120401018</div>
</div>

<!-- GİRİŞ -->
<div class="page">
<h2>${TR ? 'Giriş' : 'Introduction'}</h2>
<div class="intro-box">${TR ? introTR : introEN}</div>

<!-- ANLIK DURUM -->
${sec(TR?'Anlık Durum (Son Checkpoint)':'Current Snapshot')}
${tbl(
  [TR?'Gösterge':'Metric', TR?'Değer':'Value'],
  [
    tr2(TR?'Nüfus':'Population', S.population),
    tr2(TR?'Ortalama Yaş':'Avg Age', S.avg_age ? `${S.avg_age} yr` : '—'),
    tr2(TR?'Ortalama Zeka':'Avg Intelligence', pct(S.avg_intelligence)),
    tr2(TR?'Teknoloji Sayısı':'Technologies', S.technologies),
    tr2(TR?'İnanç Sayısı':'Beliefs', S.beliefs),
    tr2(TR?'Sanat Formları':'Art Forms', S.art_forms),
    tr2(TR?'Sosyal Gruplar':'Social Groups', S.groups),
    tr2(TR?'Gini Katsayısı':'Gini Coefficient', S.gini),
    tr2(TR?'Mutluluk İndeksi':'Happiness Index', pct(S.happiness_index)),
    tr2(TR?'Hastalık Oranı':'Sick Rate', pct(S.sick_rate)),
    tr2(TR?'Besin Bolluğu':'Food Abundance', pct(S.food_abundance)),
    tr2(TR?'Su Bolluğu':'Water Abundance', pct(S.water_abundance)),
    tr2(TR?'Mevsim':'Season', S.season),
    tr2(TR?'Sıcaklık':'Temperature', S.temperature ? `${S.temperature}°C` : '—'),
    tr2(TR?'Dil Aşaması':'Language Stage', S.max_language_stage),
    tr2(TR?'Kelime Sayısı':'Word Count', S.word_count),
    tr2(TR?'Toplam Doğum':'Total Births', S.births),
    tr2(TR?'Toplam Ölüm':'Total Deaths', S.deaths),
    tr2('QoL Index', S.qol_index),
  ].join('')
)}

<!-- NÜFUS TARİHİ -->
${sec(TR?'Nüfus Tarihi (Yıllık)':'Population History (Annual)')}
${tbl(
  [TR?'Yıl':'Year', TR?'Nüfus':'Pop', TR?'Ort.Yaş':'Avg Age', TR?'Mutluluk':'Happiness', 'Gini',
   TR?'Besin':'Food', TR?'Su':'Water', TR?'Teknoloji':'Tech', TR?'İnanç':'Belief',
   TR?'Konum (X,Y)':'Location (X,Y)', TR?'Hareket Sebebi':'Movement Reason', TR?'Hava':'Weather'],
  popHistory.map((c: Record<string, unknown>) => tr2(
    c.year, c.population, c.avg_age ? `${c.avg_age}yr` : '—',
    pct(c.happiness_index as number|undefined), c.gini,
    pct(c.food_abundance as number|undefined), pct(c.water_abundance as number|undefined),
    c.technologies, c.beliefs,
    (c.centroid_x != null || c.centroid_y != null) ? `${coord(c.centroid_x as number|undefined)},${coord(c.centroid_y as number|undefined)}` : '—',
    c.dominant_drive ?? '—', c.weather ?? '—'
  )).join('')
)}

<!-- TEKNOLOJİ ZAMAN ÇİZELGESİ -->
${sec(TR?'Teknoloji Zaman Çizelgesi':'Technology Timeline')}
${r.technology_timeline?.length ? tbl(
  [TR?'Yıl':'Year', TR?'Teknoloji':'Technology', TR?'Keşif Sebebi':'Discovery Reason',
   TR?'Besin':'Food', TR?'Su':'Water', TR?'Nüfus':'Pop', TR?'Mevsim':'Season', TR?'Hava':'Weather'],
  (r.technology_timeline as Record<string, unknown>[]).map(e => tr2(
    e.year, e.name,
    e.trigger_reason ?? '—',
    pct(e.food_abundance as number|undefined), pct(e.water_abundance as number|undefined),
    e.population, e.season, e.weather
  )).join('')
) : '<p style="color:#888;font-size:11px;">—</p>'}

<!-- İNANÇ & KÜLTÜR ZAMAN ÇİZELGESİ -->
${sec(TR?'İnanç & Kültür Zaman Çizelgesi':'Belief & Culture Timeline')}
${(r.belief_timeline?.length || r.art_timeline?.length) ? tbl(
  [TR?'Yıl':'Year', TR?'Tür':'Type', TR?'İsim':'Name', TR?'Oluşum Sebebi':'Formation Reason',
   TR?'Nüfus':'Pop', TR?'Mevsim':'Season', TR?'Hava':'Weather'],
  [
    ...(r.belief_timeline as Record<string, unknown>[] ?? []).map(e => tr2(
      e.year, TR?'İnanç':'Belief', e.name,
      e.trigger_reason ?? '—', e.population, e.season, e.weather
    )),
    ...(r.art_timeline as Record<string, unknown>[] ?? []).map(e => tr2(
      e.year, e.type, e.name, '—', '—', '—', '—'
    )),
  ].join('')
) : '<p style="color:#888;font-size:11px;">—</p>'}

<!-- GÖÇ TARİHİ -->
${sec(TR?'Göç Tarihi':'Migration History')}
${r.migration_history?.length ? tbl(
  [TR?'Yıl':'Year', TR?'Mesafe':'Distance', TR?'Göç Sebebi':'Migration Reason',
   TR?'Önceki Konum':'From', TR?'Yeni Konum':'To',
   TR?'Besin':'Food', TR?'Su':'Water', TR?'Mevsim':'Season', TR?'Hava':'Weather'],
  (r.migration_history as Record<string, unknown>[]).map(e => {
    const from = e.from as Record<string,number>|undefined;
    const to = e.to as Record<string,number>|undefined;
    return tr2(
      e.year, e.distance_km ? `${e.distance_km} km` : '—', e.reason ?? '—',
      from ? `${coord(from.x)},${coord(from.y)}` : '—',
      to   ? `${coord(to.x)},${coord(to.y)}` : '—',
      pct(e.food_abundance as number|undefined), pct(e.water_abundance as number|undefined),
      e.season, e.weather
    );
  }).join('')
) : `<p style="color:#888;font-size:11px;">${TR?'Kayıt yok — göç verisi yeni checkpoint\'lerden itibaren toplanacak.':'No records — migration data will accumulate from future checkpoints.'}</p>`}

<!-- ÖLÜM İSTATİSTİKLERİ -->
${sec(TR?'Ölüm İstatistikleri':'Death Statistics')}
<div style="display:flex;gap:20px;">
<div style="flex:1;">
<strong style="font-size:11px;">${TR?'Nedene Göre':'By Cause'}</strong>
${tbl(
  [TR?'Sebep':'Cause', TR?'Sayı':'Count', '%'],
  Object.entries(deathByCause).sort(([,a],[,b]) => (b as number)-(a as number))
    .map(([cause, count]) => tr2(cause, count as number, deathTotal ? `${Math.round((count as number)/deathTotal*100)}%` : '—'))
    .join('') || tr2(TR?'Veri yok':'No data','','')
)}
</div>
<div style="flex:1;">
<strong style="font-size:11px;">${TR?'Yaş Grubuna Göre':'By Age Group'}</strong>
${tbl(
  [TR?'Yaş Grubu':'Age Group', TR?'Sayı':'Count', '%'],
  [
    tr2('0–1 (bebek)', deathByAge.infant_0_1, deathTotal ? `${Math.round((deathByAge.infant_0_1??0)/deathTotal*100)}%` : '—'),
    tr2('1–15 (çocuk)', deathByAge.child_1_15, deathTotal ? `${Math.round((deathByAge.child_1_15??0)/deathTotal*100)}%` : '—'),
    tr2('15–30 (genç)', deathByAge.young_adult_15_30, deathTotal ? `${Math.round((deathByAge.young_adult_15_30??0)/deathTotal*100)}%` : '—'),
    tr2('30–50 (yetişkin)', deathByAge.adult_30_50, deathTotal ? `${Math.round((deathByAge.adult_30_50??0)/deathTotal*100)}%` : '—'),
    tr2('50+ (yaşlı)', deathByAge.elder_50plus, deathTotal ? `${Math.round((deathByAge.elder_50plus??0)/deathTotal*100)}%` : '—'),
  ].join('')
)}
</div>
</div>

<!-- ÖNEMLİ OLAYLAR -->
${sec(TR?'Önemli Olaylar (önem ≥ 3)':'Notable Events (importance ≥ 3)')}
${r.notable_events?.length ? tbl(
  [TR?'Yıl':'Year', TR?'Gün':'Day', TR?'Tür':'Type', TR?'Açıklama':'Description'],
  (r.notable_events as Record<string, unknown>[]).map(e => tr2(e.sim_year, e.sim_day, e.event_type, e.description)).join('')
) : '<p style="color:#888;font-size:11px;">—</p>'}

<!-- BİREYLER -->
${sec(TR?'Bireyler':'Individuals')}
${r.individuals?.length ? tbl(
  [TR?'İsim':'Name', TR?'Cin.':'Sex', TR?'Kurucu':'Fnd', TR?'Doğum Yılı':'Born', TR?'Ölüm Yılı':'Died',
   TR?'Ölüm Yaşı':'Age@Death', TR?'Ölüm Sebebi':'Cause', TR?'Zeka':'IQ'],
  (r.individuals as Record<string, unknown>[]).map(i => tr2(
    i.name, i.sex === 'male' ? '♂' : '♀', i.is_founder ? '✓' : '',
    i.birth_year, i.is_dead ? i.death_year : TR?'(yaşıyor)':'(alive)',
    i.age_at_death ?? (i.is_dead ? '—' : ''), i.death_cause ?? (i.is_dead ? '—' : ''),
    i.intelligence != null ? `${Math.round((i.intelligence as number)*100)}%` : '—'
  )).join('')
) : '<p style="color:#888;font-size:11px;">—</p>'}

<p style="margin-top:32px;border-top:1px solid #ccc;padding-top:8px;color:#555;font-size:10px;">
  Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 · RST Q-Nation 200120401018
</p>
</div>
</body></html>`;

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

      const fname = `anatolia-sim-${currentSim.name ?? currentSim.id}-Y${r.simulation?.current_year ?? S.year ?? 0}.pdf`;
      pdf.save(fname);
      flash(t(lang, '✓ PDF downloaded.', '✓ PDF indirildi.'));
    } catch (err) {
      console.error(err);
      flash(t(lang, '✗ PDF generation failed.', '✗ PDF oluşturulamadı.'));
    }
    setPdfLoading(false);
  }

  return (
    <DetailPanel panelId="report" title="Report" titleTr="Rapor">
      <div className="bg-sim-surface rounded-lg p-3 mb-4">
        <p className="text-sim-muted text-sm italic">
          {t(lang,
            'Export the current simulation state as a JSON file or print a formatted PDF report.',
            'Mevcut simülasyon durumunu JSON dosyası olarak dışa aktarın veya biçimlendirilmiş PDF raporu yazdırın.'
          )}
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
            {t(lang,
              'Full simulation data: stats, events, checkpoints, technologies, beliefs.',
              'Tam simülasyon verisi: istatistikler, olaylar, kontrol noktaları, teknolojiler, inançlar.'
            )}
          </p>
          <button
            onClick={downloadJSON}
            disabled={loading || !currentSim}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-sim-accent/50 bg-sim-accent/10 hover:bg-sim-accent/25 text-sim-accent transition-colors text-sm font-share-tech disabled:opacity-50"
          >
            <Download size={14} className={loading ? 'animate-bounce' : ''} />
            {loading ? t(lang, 'Preparing…', 'Hazırlanıyor…') : t(lang, 'Download JSON', 'JSON İndir')}
          </button>
        </div>

        {/* PDF */}
        <div className="bg-sim-surface rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={16} className="text-orange-400" />
            <span className="text-sim-text text-sm font-semibold">PDF</span>
          </div>
          <p className="text-sim-muted text-sm mb-3">
            {t(lang,
              'Generates and downloads a .pdf file directly — no dialog needed.',
              'Kapak + giriş + tüm bölümler dahil .pdf dosyası olarak indirir.'
            )}
          </p>
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || !currentSim}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-orange-400/50 bg-orange-400/10 hover:bg-orange-400/25 text-orange-400 transition-colors text-sm font-share-tech disabled:opacity-50"
          >
            <FileDown size={14} className={pdfLoading ? 'animate-bounce' : ''} />
            {pdfLoading ? t(lang, 'Generating…', 'Oluşturuluyor…') : t(lang, 'Download PDF', 'PDF İndir')}
          </button>
        </div>

        {/* Print */}
        <div className="bg-sim-surface rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Printer size={16} className="text-sim-muted" />
            <span className="text-sim-text text-sm font-semibold">{t(lang, 'Print', 'Yazdır')}</span>
          </div>
          <p className="text-sim-muted text-sm mb-3">
            {t(lang,
              'Opens a print-ready page in a new tab. Use browser Print → Save as PDF.',
              'Yeni sekmede yazdırmaya hazır sayfa açar. Tarayıcıdan Yazdır → PDF kaydet seçilebilir.'
            )}
          </p>
          <button
            onClick={printReport}
            disabled={!stats || !currentSim}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-sim-border/50 bg-sim-border/10 hover:bg-sim-border/20 text-sim-muted transition-colors text-sm font-share-tech disabled:opacity-50"
          >
            <Printer size={14} />
            {t(lang, 'Open Print View', 'Yazdırma Görünümünü Aç')}
          </button>
        </div>
      </div>

      {/* Current snapshot */}
      {stats && (
        <div className="mt-4 border-t border-sim-border/30 pt-3">
          <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
            {t(lang, 'Current Snapshot', 'Anlık Görüntü')}
          </h4>
          <div className="space-y-1">
            {[
              [t(lang,'Year','Yıl'), stats.year],
              [t(lang,'Population','Nüfus'), stats.population.toLocaleString()],
              [t(lang,'Technologies','Teknoloji'), stats.technologies],
              [t(lang,'Beliefs','İnanç'), stats.beliefs],
              [t(lang,'Language Stage','Dil Aşaması'), stats.max_language_stage],
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

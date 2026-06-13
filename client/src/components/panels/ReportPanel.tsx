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
    if (!stats || !currentSim) return;
    setPdfLoading(true);
    try {
      const recentEvents = events.slice(0, 30);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;color:#111;font-family:Courier New,monospace;font-size:13px;padding:40px;box-sizing:border-box;';
      container.innerHTML = `
        <h1 style="font-size:20px;border-bottom:2px solid #111;padding-bottom:8px;margin:0 0 8px 0;">ANATOLİA-SİM ${t(lang, 'Civilization Report', 'Medeniyet Raporu')}</h1>
        <p style="color:#555;font-size:12px;margin:0 0 16px 0;">
          ${t(lang, 'Simulation', 'Simülasyon')}: <strong>${currentSim.name ?? currentSim.id}</strong> &nbsp;|&nbsp;
          ${t(lang, 'Generated', 'Oluşturuldu')}: ${new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} &nbsp;|&nbsp;
          ${t(lang, 'Year', 'Yıl')} ${stats.year} · ${t(lang, 'Day', 'Gün')} ${stats.day}
        </p>
        <h2 style="font-size:15px;border-bottom:1px solid #999;padding-bottom:4px;margin:0 0 8px 0;">${t(lang, 'Population Statistics', 'Nüfus İstatistikleri')}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><th style="border:1px solid #ccc;padding:4px 8px;background:#f0f0f0;text-align:left;">${t(lang,'Metric','Gösterge')}</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f0f0f0;text-align:left;">${t(lang,'Value','Değer')}</th></tr>
          ${[
            [t(lang,'Population','Nüfus'), stats.population.toLocaleString()],
            [t(lang,'Average Age','Ortalama Yaş'), `${stats.avg_age} yr`],
            [t(lang,'Avg Intelligence','Ort. Zeka'), `${(stats.avg_intelligence*100).toFixed(1)}%`],
            [t(lang,'Technologies','Teknolojiler'), stats.technologies],
            [t(lang,'Beliefs','İnançlar'), stats.beliefs],
            [t(lang,'Art Forms','Sanat Formları'), stats.art_forms],
            [t(lang,'Social Groups','Sosyal Gruplar'), stats.groups],
            [t(lang,'Gini Coefficient','Gini Katsayısı'), stats.gini],
            [t(lang,'Happiness Index','Mutluluk İndeksi'), `${((stats as any).happiness_index*100).toFixed(0)}%`],
            [t(lang,'Sick Rate','Hastalık Oranı'), `${(stats.sick_rate*100).toFixed(1)}%`],
            [t(lang,'Food Abundance','Besin Bolluğu'), `${(stats.food_abundance*100).toFixed(0)}%`],
            [t(lang,'Water Abundance','Su Bolluğu'), `${((stats.water_abundance??0)*100).toFixed(0)}%`],
            [t(lang,'Season','Mevsim'), stats.season],
            [t(lang,'Temperature','Sıcaklık'), `${stats.temperature}°C`],
            [t(lang,'Language Stage','Dil Aşaması'), stats.max_language_stage],
            [t(lang,'Word Count','Kelime Sayısı'), stats.word_count],
          ].map(([l,v]) => `<tr><td style="border:1px solid #ccc;padding:4px 8px;">${l}</td><td style="border:1px solid #ccc;padding:4px 8px;">${v}</td></tr>`).join('')}
        </table>
        <h2 style="font-size:15px;border-bottom:1px solid #999;padding-bottom:4px;margin:0 0 8px 0;">${t(lang,'Recent Events','Son Olaylar')}</h2>
        ${recentEvents.map(ev => `<div style="margin:3px 0;font-size:12px;">Y${ev.sim_year} G${ev.sim_day} [${ev.event_type}] ${ev.description??''}</div>`).join('')}
        <p style="margin-top:32px;border-top:1px solid #ccc;padding-top:8px;color:#555;font-size:11px;">
          Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 · RST Q-Nation 200120401018
        </p>`;
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

      const fname = `anatolia-sim-${currentSim.name ?? currentSim.id}-Y${stats.year}.pdf`;
      pdf.save(fname);
      flash(t(lang, '✓ PDF downloaded.', '✓ PDF indirildi.'));
    } catch {
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
              'Generates and downloads a formatted PDF report directly.',
              'Biçimlendirilmiş PDF raporunu doğrudan oluşturur ve indirir.'
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadPDF}
              disabled={pdfLoading || !stats || !currentSim}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded border border-orange-400/50 bg-orange-400/10 hover:bg-orange-400/25 text-orange-400 transition-colors text-sm font-share-tech disabled:opacity-50"
            >
              <FileDown size={14} className={pdfLoading ? 'animate-bounce' : ''} />
              {pdfLoading ? t(lang, 'Generating…', 'Oluşturuluyor…') : t(lang, 'Download PDF', 'PDF İndir')}
            </button>
            <button
              onClick={printReport}
              disabled={!stats || !currentSim}
              title={t(lang, 'Print', 'Yazdır')}
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

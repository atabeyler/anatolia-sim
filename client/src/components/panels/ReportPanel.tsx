import { useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Download, Printer, FileJson } from 'lucide-react';

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

export default function ReportPanel() {
  const { currentSim, accessToken, lang, stats, events } = useSimStore();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

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
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>ANATOLİA-SİM — ${currentSim.name ?? currentSim.id}</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #fff; color: #111; margin: 40px; font-size: 13px; }
    h1 { font-size: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #999; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td, th { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .meta { color: #555; font-size: 12px; }
    .event { margin: 3px 0; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>ANATOLİA-SİM ${t(lang, 'Civilization Report', 'Medeniyet Raporu')}</h1>
  <p class="meta">
    ${t(lang, 'Simulation', 'Simülasyon')}: <strong>${currentSim.name ?? currentSim.id}</strong> &nbsp;|&nbsp;
    ${t(lang, 'Generated', 'Oluşturuldu')}: ${new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} &nbsp;|&nbsp;
    ${t(lang, 'Year', 'Yıl')} ${stats.year} · ${t(lang, 'Day', 'Gün')} ${stats.day}
  </p>

  <h2>${t(lang, 'Population Statistics', 'Nüfus İstatistikleri')}</h2>
  <table>
    <tr><th>${t(lang, 'Metric', 'Gösterge')}</th><th>${t(lang, 'Value', 'Değer')}</th></tr>
    <tr><td>${t(lang, 'Population', 'Nüfus')}</td><td>${stats.population.toLocaleString()}</td></tr>
    <tr><td>${t(lang, 'Average Age', 'Ortalama Yaş')}</td><td>${stats.avg_age} yr</td></tr>
    <tr><td>${t(lang, 'Avg Intelligence', 'Ort. Zeka')}</td><td>${(stats.avg_intelligence * 100).toFixed(1)}%</td></tr>
    <tr><td>${t(lang, 'Technologies', 'Teknolojiler')}</td><td>${stats.technologies}</td></tr>
    <tr><td>${t(lang, 'Beliefs', 'İnançlar')}</td><td>${stats.beliefs}</td></tr>
    <tr><td>${t(lang, 'Art Forms', 'Sanat Formları')}</td><td>${stats.art_forms}</td></tr>
    <tr><td>${t(lang, 'Social Groups', 'Sosyal Gruplar')}</td><td>${stats.groups}</td></tr>
    <tr><td>${t(lang, 'Gini Coefficient', 'Gini Katsayısı')}</td><td>${stats.gini}</td></tr>
    <tr><td>${t(lang, 'Happiness Index', 'Mutluluk İndeksi')}</td><td>${((stats as any).happiness_index * 100).toFixed(0)}%</td></tr>
    <tr><td>${t(lang, 'Sick Rate', 'Hastalık Oranı')}</td><td>${(stats.sick_rate * 100).toFixed(1)}%</td></tr>
    <tr><td>${t(lang, 'Food Abundance', 'Besin Bolluğu')}</td><td>${(stats.food_abundance * 100).toFixed(0)}%</td></tr>
    <tr><td>${t(lang, 'Water Abundance', 'Su Bolluğu')}</td><td>${((stats.water_abundance ?? 0) * 100).toFixed(0)}%</td></tr>
    <tr><td>${t(lang, 'Season', 'Mevsim')}</td><td>${stats.season}</td></tr>
    <tr><td>${t(lang, 'Temperature', 'Sıcaklık')}</td><td>${stats.temperature}°C</td></tr>
    <tr><td>${t(lang, 'Language Stage', 'Dil Aşaması')}</td><td>${stats.max_language_stage}</td></tr>
    <tr><td>${t(lang, 'Word Count', 'Kelime Sayısı')}</td><td>${stats.word_count}</td></tr>
  </table>

  <h2>${t(lang, 'Recent Events', 'Son Olaylar')}</h2>
  ${recentEvents.map(ev => `<div class="event">Y${ev.sim_year} G${ev.sim_day} [${ev.event_type}] ${ev.description ?? ''}</div>`).join('')}

  <p class="meta" style="margin-top:32px; border-top:1px solid #ccc; padding-top:8px;">
    Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 · RST Q-Nation 200120401018
  </p>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
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
            <Printer size={16} className="text-orange-400" />
            <span className="text-sim-text text-sm font-semibold">PDF</span>
          </div>
          <p className="text-sim-muted text-sm mb-3">
            {t(lang,
              'Opens a print-ready report in a new window. Use browser "Print → Save as PDF".',
              'Yeni pencerede yazdırmaya hazır rapor açar. Tarayıcıdan "Yazdır → PDF olarak kaydet" kullanın.'
            )}
          </p>
          <button
            onClick={printReport}
            disabled={!stats || !currentSim}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-orange-400/50 bg-orange-400/10 hover:bg-orange-400/25 text-orange-400 transition-colors text-sm font-share-tech disabled:opacity-50"
          >
            <Printer size={14} />
            {t(lang, 'Print / Save as PDF', 'Yazdır / PDF Kaydet')}
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

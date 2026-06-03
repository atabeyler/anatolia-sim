import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { useState, useEffect, useRef } from 'react';
import { BarChart2, X } from 'lucide-react';

type Metric = 'pop' | 'food' | 'water' | 'happiness';

const METRICS: { key: Metric; label: string; labelTr: string; color: string }[] = [
  { key: 'pop',       label: 'Population', labelTr: 'Nüfus',    color: '#4f6ef7' },
  { key: 'food',      label: 'Food',       labelTr: 'Besin',    color: '#4ecb71' },
  { key: 'water',     label: 'Water',      labelTr: 'Su',       color: '#7dd3fc' },
  { key: 'happiness', label: 'Happiness',  labelTr: 'Mutluluk', color: '#ff8ab0' },
];

function GaugeBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, value * 100);
  return (
    <div className="mb-1.5">
      <div className="flex justify-between items-center mb-0.5">
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#6a9a78', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, transition: 'width 0.7s ease', boxShadow: `0 0 4px ${color}80` }} />
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { stats, sidebarExpanded, lang } = useSimStore();
  const [open, setOpen] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<Set<Metric>>(new Set(['pop', 'food']));
  const [history, setHistory] = useState<any[]>([]);
  const lastYear = useRef(-1);

  useEffect(() => {
    if (!stats || stats.year === lastYear.current) return;
    lastYear.current = stats.year;
    setHistory(h => [
      ...h,
      {
        year: stats.year,
        pop: stats.population,
        food: Math.round(stats.food_abundance * 100),
        water: Math.round((stats.water_abundance ?? 0) * 100),
        happiness: Math.round(((stats as any).happiness_index ?? 0) * 100),
      },
    ].slice(-80));
  }, [stats?.year]);

  function toggleMetric(key: Metric) {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sidebarW = sidebarExpanded ? 180 : 44;
  const panelW = Math.min(296, window.innerWidth - sidebarW - 24);

  return (
    <>
      {/* Floating toggle button — bottom-right */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: open ? 'rgba(79,110,247,0.25)' : 'rgba(0,232,135,0.15)',
          border: `1px solid ${open ? '#4f6ef7' : '#00e887'}`,
          color: open ? '#4f6ef7' : '#00e887',
          boxShadow: open
            ? '0 0 16px rgba(79,110,247,0.4), 0 4px 20px rgba(0,0,0,0.6)'
            : '0 0 16px rgba(0,232,135,0.3), 0 4px 20px rgba(0,0,0,0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}
        title={lang === 'tr' ? 'Nüfus Telemetrisi' : 'Population Telemetry'}
      >
        {open ? <X size={18} /> : <BarChart2 size={18} />}
      </button>

      {/* Animated panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          right: 16,
          zIndex: 39,
          width: panelW,
          background: 'rgba(2,6,4,0.96)',
          border: '1px solid rgba(79,110,247,0.4)',
          borderRadius: 4,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(79,110,247,0.1)',
          padding: '12px 14px',
          fontFamily: 'Share Tech Mono, monospace',
          // Slide + fade animation
          transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), opacity 0.18s ease',
        }}
      >
        {/* Corner accents */}
        <span style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid rgba(79,110,247,0.8)', borderLeft: '2px solid rgba(79,110,247,0.8)' }} />
        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid rgba(79,110,247,0.8)', borderRight: '2px solid rgba(79,110,247,0.8)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 3, height: 14, background: '#4f6ef7', boxShadow: '0 0 6px rgba(79,110,247,0.8)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#4f6ef7', letterSpacing: '0.22em', fontWeight: 700 }}>
            {lang === 'tr' ? 'NÜFUS TELEMETRİSİ' : 'POPULATION TELEMETRY'}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: stats ? '#00e887' : '#4a4a4a', boxShadow: stats ? '0 0 6px #00e887' : 'none', animation: stats ? 'pulse 1.5s infinite' : 'none' }} />
          <span style={{ fontSize: 10, color: stats ? '#00e887' : '#4a4a4a', letterSpacing: '0.1em' }}>LIVE</span>
        </div>

        {/* Metric toggles */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {METRICS.map(m => (
            <button key={m.key} onClick={() => toggleMetric(m.key)}
              style={{
                flex: 1, padding: '2px 0', fontSize: 10, border: `1px solid ${activeMetrics.has(m.key) ? m.color : 'rgba(255,255,255,0.1)'}`,
                color: activeMetrics.has(m.key) ? m.color : '#4a6a5a',
                background: activeMetrics.has(m.key) ? `${m.color}15` : 'transparent',
                cursor: 'pointer', borderRadius: 2, letterSpacing: '0.04em', transition: 'all 0.15s',
                fontFamily: 'Share Tech Mono, monospace',
              }}>
              {lang === 'tr' ? m.labelTr : m.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {history.length > 1 ? (
          <div style={{ marginBottom: 10 }}>
            <ResponsiveContainer width="100%" height={72}>
              <LineChart data={history}>
                <XAxis dataKey="year" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#07071a', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 2, fontSize: 11, fontFamily: 'Share Tech Mono' }}
                  labelStyle={{ color: '#6070a0' }}
                  formatter={(val: any, name: string) => {
                    const m = METRICS.find(x => x.key === name);
                    return [name === 'pop' ? Number(val).toLocaleString() : `${val}%`, lang === 'tr' ? m?.labelTr : m?.label];
                  }}
                />
                {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
                  <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(160,200,180,0.4)', letterSpacing: '0.1em' }}>
              {lang === 'tr' ? 'VERİ BEKLENIYOR…' : 'AWAITING DATA…'}
            </span>
          </div>
        )}

        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            { l: lang === 'tr' ? 'NÜFUS' : 'POP',   v: stats ? stats.population.toLocaleString() : '—', c: '#4f6ef7' },
            { l: lang === 'tr' ? 'ORT YAŞ' : 'AGE', v: stats ? `${stats.avg_age.toFixed(1)} yr` : '—',   c: '#e0e0f0' },
            { l: lang === 'tr' ? 'ZEKA' : 'INTEL',  v: stats ? `${(stats.avg_intelligence * 100).toFixed(0)}%` : '—', c: '#d4a838' },
            { l: lang === 'tr' ? 'TEKNOLOJİ' : 'TECH', v: stats?.technologies ?? '—',                    c: '#4ecb71' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: 'rgba(4,4,15,0.8)', border: '1px solid rgba(255,255,255,0.07)', padding: '5px 8px', borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: '#4a6a5a', letterSpacing: '0.1em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 14, color: c, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Gauge bars */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
          <GaugeBar label={lang === 'tr' ? 'BESİN' : 'FOOD'} value={stats?.food_abundance ?? 0} color="#4ecb71" />
          <GaugeBar label={lang === 'tr' ? 'SU' : 'WATER'} value={stats?.water_abundance ?? 0} color="#7dd3fc" />
          <GaugeBar label={lang === 'tr' ? 'MUTLULUK' : 'HAPPINESS'} value={(stats as any)?.happiness_index ?? 0} color="#ff8ab0" />
        </div>
      </div>
    </>
  );
}

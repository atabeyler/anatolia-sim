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
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-share-tech text-sm tracking-widest text-sim-muted">{label}</span>
        <span className="font-share-tech text-sm" style={{ color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1 bg-sim-border/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, color, unit }: { label: string; value: string | number; color: string; unit?: string }) {
  return (
    <div className="relative p-2 border border-sim-border/50 hover:border-sim-accent/40 transition-colors"
      style={{ background: 'rgba(4,4,15,0.8)', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
      <div className="font-share-tech text-sm text-sim-muted tracking-widest mb-1">{label}</div>
      <div className="font-orbitron text-base font-bold" style={{ color, textShadow: `0 0 12px ${color}88` }}>
        {value}{unit ?? ''}
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

  const panelW = Math.min(308, window.innerWidth - (sidebarExpanded ? 180 : 44) - 24);

  return (
    <>
      {/* Click-outside backdrop */}
      {open && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 38 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 40,
          width: 44, height: 44, borderRadius: '50%',
          background: open ? 'rgba(79,110,247,0.25)' : 'rgba(0,232,135,0.15)',
          border: `1px solid ${open ? '#4f6ef7' : '#00e887'}`,
          color: open ? '#4f6ef7' : '#00e887',
          boxShadow: open
            ? '0 0 16px rgba(79,110,247,0.4), 0 4px 20px rgba(0,0,0,0.6)'
            : '0 0 16px rgba(0,232,135,0.3), 0 4px 20px rgba(0,0,0,0.6)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease', backdropFilter: 'blur(8px)',
        }}
        title={lang === 'tr' ? 'Nüfus Telemetrisi' : 'Population Telemetry'}
      >
        {open ? <X size={18} /> : <BarChart2 size={18} />}
      </button>

      {/* Animated panel */}
      <div
        onClick={e => e.stopPropagation()}
        className="hud-panel"
        style={{
          position: 'absolute', bottom: 72, right: 16, zIndex: 39,
          width: panelW, padding: '12px 14px',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), opacity 0.18s ease',
        }}
      >
        <span className="hud-corner-tr" />
        <span className="hud-corner-bl" />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sim-accent/30 to-transparent pointer-events-none"
          style={{ animation: 'hud-scan 5s ease-in-out infinite' }} />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
          <span className="font-orbitron text-sm font-semibold tracking-[0.25em] text-sim-accent">
            {lang === 'tr' ? 'NÜFUS TELEMETRİSİ' : 'POPULATION TELEMETRY'}
          </span>
          <div className="flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
          <span className="font-share-tech text-sm text-sim-green tracking-widest">LIVE</span>
          <button onClick={() => setOpen(false)} style={{ marginLeft: 4, background: 'transparent', border: 'none', color: '#3a6040', cursor: 'pointer', lineHeight: 0, padding: 2 }}>
            <X size={13} />
          </button>
        </div>

        {/* Metric toggle buttons */}
        <div className="flex gap-1 mb-2">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => toggleMetric(m.key)}
              className="flex-1 text-sm py-0.5 rounded border transition-all font-share-tech"
              style={{
                borderColor: activeMetrics.has(m.key) ? m.color : 'rgba(255,255,255,0.1)',
                color: activeMetrics.has(m.key) ? m.color : '#4a6a5a',
                background: activeMetrics.has(m.key) ? `${m.color}15` : 'transparent',
              }}>
              {lang === 'tr' ? m.labelTr : m.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {history.length > 1 ? (
          <div className="mb-3">
            <ResponsiveContainer width="100%" height={72}>
              <LineChart data={history}>
                <XAxis dataKey="year" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#07071a', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 2, fontSize: 12, fontFamily: 'Share Tech Mono' }}
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
          <div className="h-16 flex items-center justify-center mb-3">
            <span className="font-share-tech text-sm text-sim-muted/50 tracking-widest animate-pulse">
              {lang === 'tr' ? 'VERİ BEKLENIYOR…' : 'AWAITING DATA…'}
            </span>
          </div>
        )}

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <StatBox label={lang === 'tr' ? 'NÜFUS' : 'POPULATION'} value={stats ? stats.population.toLocaleString() : '—'} color="#4f6ef7" />
          <StatBox label={lang === 'tr' ? 'ORT. YAŞ' : 'AVG AGE'} value={stats ? stats.avg_age.toFixed(1) : '—'} unit={stats ? ' yr' : ''} color="#e0e0f0" />
          <StatBox label={lang === 'tr' ? 'ZEKA' : 'INTEL'} value={stats ? `${(stats.avg_intelligence * 100).toFixed(0)}` : '—'} unit={stats ? '%' : ''} color="#d4a838" />
          <StatBox label={lang === 'tr' ? 'TEKNOLOJİ' : 'TECH'} value={stats?.technologies ?? '—'} color="#4ecb71" />
        </div>

        {/* Gauge bars */}
        <div className="border-t border-sim-border/30 pt-3">
          <GaugeBar label={lang === 'tr' ? 'BESİN' : 'FOOD'} value={stats?.food_abundance ?? 0} color="#4ecb71" />
          <GaugeBar label={lang === 'tr' ? 'SU' : 'WATER'} value={stats?.water_abundance ?? 0} color="#7dd3fc" />
          <GaugeBar label={lang === 'tr' ? 'MUTLULUK' : 'HAPPINESS'} value={(stats as any)?.happiness_index ?? 0} color="#ff8ab0" />
        </div>
      </div>
    </>
  );
}

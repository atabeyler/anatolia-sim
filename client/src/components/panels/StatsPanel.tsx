import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { useState, useEffect, useRef } from 'react';

type Metric = 'pop' | 'food' | 'water' | 'happiness';

const METRICS: { key: Metric; label: string; labelTr: string; color: string }[] = [
  { key: 'pop',      label: 'Population', labelTr: 'Nüfus',    color: '#4f6ef7' },
  { key: 'food',     label: 'Food',       labelTr: 'Besin',    color: '#4ecb71' },
  { key: 'water',    label: 'Water',      labelTr: 'Su',       color: '#7dd3fc' },
  { key: 'happiness',label: 'Happiness',  labelTr: 'Mutluluk', color: '#ff8ab0' },
];

function GaugeBar({ label, value, color, max }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / (max ?? 1)) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-share-tech text-sm tracking-widest text-sim-muted">{label}</span>
        <span className="font-share-tech text-sm" style={{ color }}>{typeof max === 'number' ? value.toLocaleString() : `${(value * 100).toFixed(0)}%`}</span>
      </div>
      <div className="h-1 bg-sim-border/60 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 relative"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, color, unit }: any) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setDisp(value);
  }, [value]);

  return (
    <div className="relative p-2 border border-sim-border/50 hover:border-sim-accent/40 transition-colors"
      style={{ background: 'rgba(4,4,15,0.8)', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
      <div className="font-share-tech text-sm text-sim-muted tracking-widest mb-1">{label}</div>
      <div className="font-orbitron text-base font-bold" style={{ color, textShadow: `0 0 12px ${color}88` }}>
        {disp}{unit ?? ''}
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { stats, sidebarExpanded, lang } = useSimStore();
  const leftOffset = sidebarExpanded ? 176 : 48;
  const [history, setHistory] = useState<any[]>([]);
  const [activeMetrics, setActiveMetrics] = useState<Set<Metric>>(new Set(['pop', 'food']));
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

  if (!stats) return null;

  function toggleMetric(key: Metric) {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="absolute z-30" style={{
      bottom: isMobile ? 8 : 28,
      left: leftOffset + 8,
      width: Math.min(isMobile ? 260 : 304, window.innerWidth - leftOffset - 16),
    }}>
      <div className="hud-panel relative overflow-hidden" style={{ padding: '12px 14px' }}>
        <span className="hud-corner-tr" />
        <span className="hud-corner-bl" />

        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sim-accent/30 to-transparent pointer-events-none"
          style={{ animation: 'hud-scan 5s ease-in-out infinite' }} />

        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
          <span className="font-orbitron text-sm font-semibold tracking-[0.25em] text-sim-accent">
            {lang === 'tr' ? 'NÜFUS TELEMETRİSİ' : 'POPULATION TELEMETRY'}
          </span>
          <div className="flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
          <span className="font-share-tech text-sm text-sim-green tracking-widest">LIVE</span>
        </div>

        {/* Metric toggle buttons */}
        <div className="flex gap-1 mb-2">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className="text-xs px-1.5 py-0.5 rounded border transition-all font-share-tech"
              style={{
                borderColor: activeMetrics.has(m.key) ? m.color : 'rgba(255,255,255,0.1)',
                color: activeMetrics.has(m.key) ? m.color : '#4a6a5a',
                background: activeMetrics.has(m.key) ? `${m.color}15` : 'transparent',
              }}
            >
              {lang === 'tr' ? m.labelTr : m.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {history.length > 1 ? (
          <div className="mb-3">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={history}>
                <XAxis dataKey="year" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#07071a', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 2, fontSize: 11, fontFamily: 'Share Tech Mono' }}
                  labelStyle={{ color: '#6070a0' }}
                  formatter={(val: any, name: string) => {
                    const m = METRICS.find(x => x.key === name);
                    const label = lang === 'tr' ? m?.labelTr : m?.label;
                    return [name === 'pop' ? val.toLocaleString() : `${val}%`, label];
                  }}
                />
                {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
                  <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} dot={false} strokeWidth={1.5} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center mb-3">
            <span className="font-share-tech text-sm text-sim-muted/50 tracking-widest animate-pulse">
              {lang === 'tr' ? 'VERİ TOPLANÜYOR…' : 'COLLECTING DATA…'}
            </span>
          </div>
        )}

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <StatBox label={lang === 'tr' ? 'NÜFUS' : 'POPULATION'} value={stats.population.toLocaleString()} color="#4f6ef7" />
          <StatBox label={lang === 'tr' ? 'ORT. YAŞ' : 'AVG AGE'} value={stats.avg_age.toFixed(1)} unit=" yr" color="#e0e0f0" />
          <StatBox label={lang === 'tr' ? 'ZEKA' : 'INTELLIGENCE'} value={`${(stats.avg_intelligence * 100).toFixed(0)}`} unit="%" color="#d4a838" />
          <StatBox label={lang === 'tr' ? 'TEKNOLOJİ' : 'TECH LEVEL'} value={stats.technologies} color="#4ecb71" />
        </div>

        {/* Bars */}
        <div className="border-t border-sim-border/30 pt-3">
          <GaugeBar label={lang === 'tr' ? 'BESİN BOLLUĞU' : 'FOOD ABUNDANCE'} value={stats.food_abundance} color="#4ecb71" />
          <GaugeBar label={lang === 'tr' ? 'SU BOLLUĞU' : 'WATER ABUNDANCE'} value={stats.water_abundance ?? 0} color="#7dd3fc" />
          {(stats as any).happiness_index !== undefined && (
            <GaugeBar label={lang === 'tr' ? 'MUTLULUK' : 'HAPPINESS'} value={(stats as any).happiness_index} color="#ff8ab0" />
          )}
        </div>
      </div>
    </div>
  );
}

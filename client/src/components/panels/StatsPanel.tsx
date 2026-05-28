import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { useState, useEffect, useRef } from 'react';

function GaugeBar({ label, value, color, max }: { label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / (max ?? 1)) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="font-share-tech text-xs tracking-widest text-sim-muted">{label}</span>
        <span className="font-share-tech text-xs" style={{ color }}>{typeof max === 'number' ? value.toLocaleString() : `${(value * 100).toFixed(0)}%`}</span>
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
      <div className="font-share-tech text-xs text-sim-muted tracking-widest mb-1">{label}</div>
      <div className="font-orbitron text-base font-bold" style={{ color, textShadow: `0 0 12px ${color}88` }}>
        {disp}{unit ?? ''}
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { stats } = useSimStore();
  const [history, setHistory] = useState<any[]>([]);
  const lastYear = useRef(-1);

  useEffect(() => {
    if (!stats || stats.year === lastYear.current) return;
    lastYear.current = stats.year;
    setHistory(h => [...h, { year: stats.year, pop: stats.population, age: Math.round(stats.avg_age) }].slice(-80));
  }, [stats?.year]);

  if (!stats) return null;

  return (
    <div className="absolute left-16 bottom-4 w-76 z-30" style={{ width: 304 }}>
      <div className="hud-panel relative overflow-hidden" style={{ padding: '12px 14px' }}>
        <span className="hud-corner-tr" />
        <span className="hud-corner-bl" />

        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sim-accent/30 to-transparent pointer-events-none"
          style={{ animation: 'hud-scan 5s ease-in-out infinite' }} />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
          <span className="font-orbitron text-xs font-semibold tracking-[0.25em] text-sim-accent">POPULATION TELEMETRY</span>
          <div className="flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
          <span className="font-share-tech text-xs text-sim-green tracking-widest">LIVE</span>
        </div>

        {/* Chart */}
        {history.length > 1 ? (
          <div className="mb-3">
            <ResponsiveContainer width="100%" height={64}>
              <LineChart data={history}>
                <XAxis dataKey="year" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#07071a', border: '1px solid rgba(79,110,247,0.3)', borderRadius: 2, fontSize: 10, fontFamily: 'Share Tech Mono' }}
                  labelStyle={{ color: '#6070a0' }}
                  itemStyle={{ color: '#4f6ef7' }}
                />
                <Line type="monotone" dataKey="pop" stroke="#4f6ef7" dot={false} strokeWidth={1.5}
                  strokeShadow="0 0 6px #4f6ef7" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center mb-3">
            <span className="font-share-tech text-xs text-sim-muted/50 tracking-widest animate-pulse">COLLECTING DATA…</span>
          </div>
        )}

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <StatBox label="POPULATION" value={stats.population.toLocaleString()} color="#4f6ef7" />
          <StatBox label="AVG AGE" value={stats.avg_age.toFixed(1)} unit=" yr" color="#e0e0f0" />
          <StatBox label="INTELLIGENCE" value={`${(stats.avg_intelligence * 100).toFixed(0)}`} unit="%" color="#d4a838" />
          <StatBox label="TECH LEVEL" value={stats.technologies} color="#4ecb71" />
        </div>

        {/* Bars */}
        <div className="border-t border-sim-border/30 pt-3">
          <GaugeBar label="FOOD ABUNDANCE" value={stats.food_abundance} color="#4ecb71" />
          <GaugeBar label="AVG INTEL" value={stats.avg_intelligence} color="#d4a838" />
          {(stats as any).happiness_index !== undefined && (
            <GaugeBar label="HAPPINESS" value={(stats as any).happiness_index} color="#00d4ff" />
          )}
        </div>
      </div>
    </div>
  );
}

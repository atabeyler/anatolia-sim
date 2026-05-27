import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { useState, useEffect, useRef } from 'react';

export default function StatsPanel() {
  const { stats } = useSimStore();
  const [history, setHistory] = useState<any[]>([]);
  const lastYear = useRef(-1);
  useEffect(() => {
    if (!stats || stats.year === lastYear.current) return;
    lastYear.current = stats.year;
    setHistory(h => [...h, { year: stats.year, population: stats.population, avgAge: Math.round(stats.avg_age) }].slice(-100));
  }, [stats?.year]);
  if (!stats) return null;
  return (
    <div className="absolute left-16 bottom-4 w-80 panel-glass rounded-lg p-4 z-30">
      <p className="text-xs font-semibold text-sim-muted mb-3 uppercase tracking-wider">Population</p>
      {history.length > 1 ? (
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={history}><XAxis dataKey="year" hide /><YAxis hide />
            <Tooltip contentStyle={{ background: '#111128', border: '1px solid #1e1e3a', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#7070a0' }} itemStyle={{ color: '#4f6ef7' }} />
            <Line type="monotone" dataKey="population" stroke="#4f6ef7" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : <div className="h-20 flex items-center justify-center text-xs text-sim-muted">Collecting data…</div>}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {[{label:'Population',value:stats.population.toLocaleString(),color:'text-sim-accent'},{label:'Avg Age',value:`${stats.avg_age.toFixed(1)}y`,color:'text-sim-text'},{label:'Intelligence',value:`${(stats.avg_intelligence*100).toFixed(0)}%`,color:'text-sim-gold'},{label:'Technologies',value:stats.technologies,color:'text-sim-green'}].map(m => (
          <div key={m.label} className="bg-sim-border/50 rounded p-2"><p className="text-xs text-sim-muted">{m.label}</p><p className={`text-sm font-semibold font-mono ${m.color}`}>{m.value}</p></div>
        ))}
      </div>
    </div>
  );
}

import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function EconomyPanel() {
  const { stats, events, lang } = useSimStore();

  const meanWealth = (stats as any)?.mean_wealth ?? 0;
  const gini = (stats as any)?.gini ?? 0;

  const tradeEvents = events.filter(e => e.event_type === 'trade');

  const resourceData = [
    { name: 'Food', value: 60 },
    { name: 'Water', value: 50 },
    { name: 'Stone', value: 20 },
    { name: 'Wood', value: 35 },
    { name: 'Clay', value: 10 },
  ];

  return (
    <DetailPanel panelId="economy" title="Economy" titleTr="Ekonomi">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className="text-sim-gold font-bold text-lg">{meanWealth.toFixed(1)}</div>
          <div className="text-sim-muted text-sm">{lang === 'en' ? 'Mean Wealth' : 'Ort. Servet'}</div>
        </div>
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className={`font-bold text-lg ${gini > 0.5 ? 'text-red-400' : gini > 0.3 ? 'text-yellow-400' : 'text-green-400'}`}>
            {gini.toFixed(2)}
          </div>
          <div className="text-sim-muted text-sm">{lang === 'en' ? 'Gini Index' : 'Gini Endeksi'}</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Resource Distribution' : 'Kaynak Dağılımı'}
        </h4>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={resourceData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#888' }} />
            <YAxis tick={{ fontSize: 12, fill: '#888' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f1117', border: '1px solid #2a2a3a', fontSize: 12 }}
            />
            <Bar dataKey="value" fill="#7c3aed" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Economic Model' : 'Ekonomi Modeli'}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {lang === 'en'
            ? 'Barter driven by surplus detection. Altruism gene × cooperation → trade frequency. Gini measures inequality from specialization.'
            : 'Takasa dayalı takas fazla tespiti ile yönlendirilir. Özgecilik geni × iş birliği → ticaret sıklığı.'}
        </p>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Trade Log' : 'Ticaret Günlüğü'}
        </h4>
        {tradeEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {lang === 'en' ? 'No trade events yet.' : 'Henüz ticaret olayı yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {tradeEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-yellow-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

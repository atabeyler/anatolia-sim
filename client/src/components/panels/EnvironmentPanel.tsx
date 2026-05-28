import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const SEASON_COLORS: Record<string, string> = {
  spring: 'text-green-400',
  summer: 'text-yellow-400',
  autumn: 'text-orange-400',
  winter: 'text-blue-400',
};

export default function EnvironmentPanel() {
  const { stats, events, lang } = useSimStore();

  const season = stats?.season ?? 'spring';
  const temp = stats?.temperature ?? 20;
  const food = stats?.food_abundance ?? 0.5;

  const disasterEvents = events.filter(e => e.event_type === 'disaster');

  return (
    <DetailPanel panelId="environment" title="Environment" titleTr="Çevre">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className={`font-bold text-lg capitalize ${SEASON_COLORS[season] ?? 'text-sim-text'}`}>
            {lang === 'en' ? season : {
              spring: 'İlkbahar', summer: 'Yaz', autumn: 'Sonbahar', winter: 'Kış'
            }[season] ?? season}
          </div>
          <div className="text-sim-muted text-xs">{lang === 'en' ? 'Season' : 'Mevsim'}</div>
        </div>
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className={`font-bold text-lg ${temp > 35 ? 'text-red-400' : temp < 0 ? 'text-blue-400' : 'text-sim-text'}`}>
            {temp}°C
          </div>
          <div className="text-sim-muted text-xs">{lang === 'en' ? 'Temperature' : 'Sıcaklık'}</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Food Abundance' : 'Yiyecek Bolluğu'}
        </h4>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-3 bg-sim-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                food > 0.6 ? 'bg-green-500' : food > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${food * 100}%` }}
            />
          </div>
          <span className="text-sim-text font-mono text-xs w-10">{(food * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Biome' : 'Biyom'}
        </h4>
        <p className="text-sim-muted text-xs italic">
          {lang === 'en' ? 'Determined by starting coordinates.' : 'Başlangıç koordinatlarına göre belirlenir.'}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Disaster History' : 'Afet Tarihi'}
        </h4>
        {disasterEvents.length === 0 ? (
          <p className="text-sim-muted italic text-xs">
            {lang === 'en' ? 'No disasters recorded.' : 'Kayıtlı afet yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {disasterEvents.map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-red-400 font-mono text-xs">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-xs">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Possible Disasters' : 'Olası Afetler'}
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {['Earthquake', 'Drought', 'Flood', 'Epidemic', 'Volcano', 'Frost'].map(d => (
            <div key={d} className="text-xs text-sim-muted bg-sim-surface rounded px-2 py-1">{d}</div>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}

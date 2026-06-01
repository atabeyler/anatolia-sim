import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Telescope } from 'lucide-react';

const KNOWLEDGE_ITEMS = [
  { id: 'lunar_tracking', label: 'Lunar Tracking', labelTr: 'Ay Takibi', icon: '🌙' },
  { id: 'seasonal_calendar', label: 'Seasonal Calendar', labelTr: 'Mevsimsel Takvim', icon: '📅' },
  { id: 'star_map', label: 'Star Map', labelTr: 'Yıldız Haritası', icon: '⭐' },
  { id: 'eclipse_prediction', label: 'Eclipse Prediction', labelTr: 'Tutulma Tahmini', icon: '🌑' },
  { id: 'planetary_model', label: 'Planetary Model', labelTr: 'Gezegen Modeli', icon: '🪐' },
];

export default function AstronomyPanel() {
  const { events, lang } = useSimStore();

  const astroEvents = events.filter(e => e.event_type === 'astronomy');
  const discoveries = astroEvents.filter(e => e.description?.includes('can be predicted') || e.description?.includes('developed'));

  return (
    <DetailPanel panelId="astronomy" title="Astronomy" titleTr="Astronomi">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-center gap-3">
        <Telescope size={24} className="text-blue-400" />
        <div>
          <div className="text-blue-400 font-bold text-lg">{discoveries.length}</div>
          <div className="text-sim-muted text-sm">
            {lang === 'en' ? 'Astronomical Discoveries' : 'Astronomik Keşifler'}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Knowledge Tree' : 'Bilgi Ağacı'}
        </h4>
        <div className="space-y-1.5">
          {KNOWLEDGE_ITEMS.map(item => {
            const discovered = discoveries.some(e => e.description?.toLowerCase().includes(item.id.replace('_', ' ')));
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded ${discovered ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-sim-surface/30 opacity-50'}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className={`text-sm ${discovered ? 'text-sim-text' : 'text-sim-muted'}`}>
                  {lang === 'en' ? item.label : item.labelTr}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Observable Events' : 'Gözlemlenebilir Olaylar'}
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {['Lunar cycles', 'Solstices', 'Equinoxes', 'Star risings', 'Eclipses', 'Comets'].map(ev => (
            <div key={ev} className="text-sm text-sim-muted bg-sim-surface rounded px-2 py-1">{ev}</div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Observation Log' : 'Gözlem Günlüğü'}
        </h4>
        {astroEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {lang === 'en' ? 'No astronomical events recorded.' : 'Kayıtlı astronomi olayı yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {astroEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-blue-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

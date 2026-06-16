import { translateEventDescription, text, type LangCode } from '../../utils/i18n';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Telescope } from 'lucide-react';

const KNOWLEDGE_ITEMS = [
  { id: 'lunar_tracking', label: { tr: 'Ay Takibi', en: 'Lunar Tracking', de: 'Mondverfolgung', fr: 'Suivi lunaire', ar: 'تتبع القمر' }, icon: '🌙' },
  { id: 'seasonal_calendar', label: { tr: 'Mevsimsel Takvim', en: 'Seasonal Calendar', de: 'Saisonkalender', fr: 'Calendrier saisonnier', ar: 'التقويم الموسمي' }, icon: '📆' },
  { id: 'star_map', label: { tr: 'Yıldız Haritası', en: 'Star Map', de: 'Sternenkarte', fr: 'Carte des étoiles', ar: 'خريطة النجوم' }, icon: '⭐' },
  { id: 'eclipse_prediction', label: { tr: 'Tutulma Tahmini', en: 'Eclipse Prediction', de: 'Finsternis-Vorhersage', fr: 'Prédiction d\'éclipse', ar: 'التنبؤ بالكسوف' }, icon: '🌑' },
  { id: 'planetary_model', label: { tr: 'Gezegen Modeli', en: 'Planetary Model', de: 'Planetenmodell', fr: 'Modèle planétaire', ar: 'النموذج الكوكبي' }, icon: '🪐' },
];

const OBSERVABLES: { tr: string; en: string; de: string; fr: string; ar: string }[] = [
  { tr: 'Ay döngüleri', en: 'Lunar cycles', de: 'Mondzyklen', fr: 'Cycles lunaires', ar: 'دورات القمر' },
  { tr: 'Gündönümleri', en: 'Solstices', de: 'Sonnenwenden', fr: 'Solstices', ar: 'الانقلابات الشمسية' },
  { tr: 'Ekinokslar', en: 'Equinoxes', de: 'Tagundnachtgleichen', fr: 'Équinoxes', ar: 'الاعتدالات' },
  { tr: 'Yıldız doğuşları', en: 'Star risings', de: 'Sternaufgänge', fr: 'Levers d\'étoiles', ar: 'شروق النجوم' },
  { tr: 'Tutulmalar', en: 'Eclipses', de: 'Finsternisse', fr: 'Éclipses', ar: 'الكسوف والخسوف' },
  { tr: 'Kuyruklu yıldızlar', en: 'Comets', de: 'Kometen', fr: 'Comètes', ar: 'المذنبات' },
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
            {text(lang as LangCode, { tr: 'Astronomik Keşifler', en: 'Astronomical Discoveries', de: 'Astronomische Entdeckungen', fr: 'Découvertes astronomiques', ar: 'اكتشافات فلكية' })}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { tr: 'Bilgi Ağacı', en: 'Knowledge Tree', de: 'Wissensbaum', fr: 'Arbre des connaissances', ar: 'شجرة المعرفة' })}
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
                  {text(lang as LangCode, item.label)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { tr: 'Gözlemlenebilir Olaylar', en: 'Observable Events', de: 'Beobachtbare Ereignisse', fr: 'Événements observables', ar: 'الأحداث القابلة للرصد' })}
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {OBSERVABLES.map(obs => (
            <div key={obs.en} className="text-sm text-sim-muted bg-sim-surface rounded px-2 py-1">
              {text(lang as LangCode, obs)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {text(lang as LangCode, { tr: 'Gözlem Günlüğü', en: 'Observation Log', de: 'Beobachtungsprotokoll', fr: 'Journal d\'observation', ar: 'سجل الرصد' })}
        </h4>
        {astroEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {text(lang as LangCode, { tr: 'Kayıtlı astronomi olayı yok.', en: 'No astronomical events recorded.', de: 'Keine astronomischen Ereignisse aufgezeichnet.', fr: 'Aucun événement astronomique enregistré.', ar: 'لا توجد أحداث فلكية مسجلة.' })}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {astroEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-blue-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', lang as LangCode, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

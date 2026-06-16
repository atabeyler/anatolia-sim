import { translateEventDescription, type LangCode } from '../../utils/i18n';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Building2 } from 'lucide-react';

const STRUCTURE_ICONS: Record<string, string> = {
  cave_dwelling: '🪨', lean_to: '🏕️', pit_house: '🏠', post_frame_hut: '🛖',
  storage_pit: '🪣', mud_brick_house: '🧱', granary: '🌾', defensive_wall: '🏰',
  stone_temple: '⛩️', stone_house: '🏛️', marketplace: '🏪', city_wall: '🧱',
};

const STRUCTURE_TR: Record<string, string> = {
  cave_dwelling:  'Mağara Konutu', lean_to:        'Sığınak',
  pit_house:      'Çukur Ev',      post_frame_hut: 'Direkli Kulübe',
  storage_pit:    'Depo Çukuru',   mud_brick_house:'Kerpiç Ev',
  granary:        'Tahıl Ambarı',  defensive_wall: 'Savunma Duvarı',
  stone_temple:   'Taş Tapınak',   stone_house:    'Taş Ev',
  marketplace:    'Pazar Yeri',    city_wall:      'Şehir Surları',
};

const TIER_LABEL = ['Natural', 'Simple', 'Permanent', 'Urban'];
const TIER_LABEL_TR = ['Doğal', 'Basit', 'Kalıcı', 'Kentsel'];

function t(lang: string, enStr: string, trStr: string, deStr = enStr, frStr = enStr, arStr = enStr) {
  if (lang === 'tr') return trStr;
  if (lang === 'de') return deStr;
  if (lang === 'fr') return frStr;
  if (lang === 'ar') return arStr;
  return enStr;
}

export default function ArchitecturePanel() {
  const { events, lang } = useSimStore();

  const archEvents = events.filter(e => e.event_type === 'architecture');
  const builtStructures = archEvents.map(e => {
    const match = e.description?.match(/a (.+)$/);
    return match ? match[1].replace(/ /g, '_') : null;
  }).filter(Boolean) as string[];
  const uniqueStructures = [...new Set(builtStructures)];

  return (
    <DetailPanel panelId="architecture" title="Architecture" titleTr="Mimari">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-center gap-3">
        <Building2 size={24} className="text-orange-400" />
        <div>
          <div className="text-orange-400 font-bold text-lg">{uniqueStructures.length}</div>
          <div className="text-sim-muted text-sm">
            {t(lang, 'Structure Types Built', 'İnşa Edilen Yapı Türleri')}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Built Structures', 'İnşa Edilmiş Yapılar')}
        </h4>
        {uniqueStructures.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {t(lang, 'No structures built yet.', 'Henüz yapı inşa edilmedi.')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {uniqueStructures.map(s => (
              <div key={s} className="flex items-center gap-1.5 bg-sim-surface rounded p-1.5">
                <span>{STRUCTURE_ICONS[s] ?? '🏗️'}</span>
                <span className="text-sm text-sim-text capitalize">
                  {t(lang, s.replace(/_/g, ' '), STRUCTURE_TR[s] ?? s.replace(/_/g, ' '))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Available Structures', 'Mevcut Yapılar')}
        </h4>
        <div className="space-y-2">
          {[0, 1, 2, 3].map(tier => (
            <div key={tier}>
              <div className="text-sm text-sim-muted mb-1">
                {t(lang, `Tier ${tier}: ${TIER_LABEL[tier]}`, `Seviye ${tier}: ${TIER_LABEL_TR[tier]}`)}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(STRUCTURE_ICONS)
                  .slice(tier * 3, tier * 3 + 3)
                  .map(([id, icon]) => (
                    <div key={id} className="text-sm bg-sim-surface/50 rounded px-1.5 py-0.5 text-sim-muted">
                      {icon} {t(lang, id.replace(/_/g, ' '), STRUCTURE_TR[id] ?? id.replace(/_/g, ' '))}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Construction Log', 'İnşaat Günlüğü')}
        </h4>
        {archEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {t(lang, 'No construction yet.', 'Henüz inşaat yok.')}
          </p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {archEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-orange-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', lang as LangCode, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const MEME_STAGES: Record<string, number> = {
  shared_greeting: 1, mourning_ritual: 1, food_sharing_norm: 1,
  reciprocity_norm: 2, gender_roles: 2, age_hierarchy: 2, gift_exchange: 2,
  body_decoration: 3, storytelling: 3, music_drumming: 3, dance_ritual: 3, naming_ceremony: 3,
  marriage_ceremony: 4, seasonal_festival: 4, taboo_system: 4, trade_ceremony: 4,
  written_myth: 5, legal_code: 5,
};

const STAGE_COLORS = ['', '#6b8e23', '#4682b4', '#9370db', '#daa520', '#cd853f'];

const MEME_LABELS_TR: Record<string, string> = {
  shared_greeting: 'Ortak selamlaşma',
  mourning_ritual: 'Yas ritüeli',
  food_sharing_norm: 'Yiyecek paylaşımı normu',
  reciprocity_norm: 'Karşılıklılık normu',
  gender_roles: 'Toplumsal cinsiyet rolleri',
  age_hierarchy: 'Yaş hiyerarşisi',
  gift_exchange: 'Hediye alışverişi',
  body_decoration: 'Vücut süsleme',
  storytelling: 'Hikâye anlatımı',
  music_drumming: 'Müzik ve davul',
  dance_ritual: 'Dans ritüeli',
  naming_ceremony: 'Ad verme töreni',
  marriage_ceremony: 'Evlilik töreni',
  seasonal_festival: 'Mevsim festivali',
  taboo_system: 'Tabu sistemi',
  trade_ceremony: 'Ticaret töreni',
  written_myth: 'Yazılı mit',
  legal_code: 'Hukuk kodu',
};

function translateDescription(desc: string, lang: string) {
  if (lang !== 'tr') return desc;
  let result = desc;
  for (const [key, value] of Object.entries(MEME_LABELS_TR)) {
    result = result.split(key.replace(/_/g, ' ')).join(value);
  }
  return result;
}

export default function CulturePanel() {
  const { events, lang } = useSimStore();

  const cultureEvents = events.filter(e => e.event_type === 'culture' || e.event_type === 'ritual');
  const artEvents = events.filter(e => e.event_type === 'art');

  const totalMemes = cultureEvents.filter(e => e.event_type === 'culture').length;
  const totalArts = artEvents.length;

  return (
    <DetailPanel panelId="culture" title="Culture" titleTr="Kültür">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className="text-purple-400 font-bold text-lg">{totalMemes}</div>
          <div className="text-sim-muted text-sm">{lang === 'en' ? 'Cultural Memes' : 'Kültürel Memler'}</div>
        </div>
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <div className="text-pink-400 font-bold text-lg">{totalArts}</div>
          <div className="text-sim-muted text-sm">{lang === 'en' ? 'Art Forms' : 'Sanat Formları'}</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Meme Stages' : 'Mem Aşamaları'}
        </h4>
        {[1, 2, 3, 4, 5].map(stage => {
          const stageMemes = Object.entries(MEME_STAGES).filter(([, s]) => s === stage);
          const emerged = stageMemes.filter(([id]) =>
            cultureEvents.some(e => e.description?.toLowerCase().includes(id.replace(/_/g, ' ')))
          );
          return (
            <div key={stage} className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                <span className="text-sm text-sim-muted">
                  {lang === 'en' ? `Stage ${stage}` : `Aşama ${stage}`} ({emerged.length}/{stageMemes.length})
                </span>
              </div>
              <div className="h-1.5 bg-sim-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(emerged.length / stageMemes.length) * 100}%`,
                    backgroundColor: STAGE_COLORS[stage],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Culture Events' : 'Kültür Olayları'}
        </h4>
        {cultureEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {lang === 'en' ? 'No culture events yet.' : 'Henüz kültür olayı yok.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {cultureEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-purple-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateDescription(ev.description, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

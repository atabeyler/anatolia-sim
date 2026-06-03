import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { translateEventDescription, type LangCode } from '../../utils/i18n';

const LANGUAGE_STAGES = [
  { id: 0, name: 'Pre-linguistic',  nameTr: 'Dil Öncesi',      desc: 'No symbolic communication',        descTr: 'Sembolik iletişim yok',               color: '#555' },
  { id: 1, name: 'Gestural',        nameTr: 'Jestsel',          desc: 'Pointing, body language',           descTr: 'İşaret, beden dili',                  color: '#8b7355' },
  { id: 2, name: 'Emotional Sound', nameTr: 'Duygusal Ses',     desc: 'Shared emotional vocalizations',    descTr: 'Ortak duygusal sesler',               color: '#6b8e23' },
  { id: 3, name: 'Proto-Words',     nameTr: 'Proto-Kelimeler',  desc: 'Consistent sound-meaning pairs',    descTr: 'Tutarlı ses-anlam eşleşmeleri',       color: '#4682b4' },
  { id: 4, name: 'Syntax',          nameTr: 'Sözdizimi',        desc: 'Grammar emerges',                   descTr: 'Dilbilgisi ortaya çıkıyor',            color: '#9370db' },
  { id: 5, name: 'Abstract',        nameTr: 'Soyut',            desc: 'Concepts beyond immediate world',   descTr: 'Anlık dünyayı aşan kavramlar',        color: '#cd853f' },
  { id: 6, name: 'Writing',         nameTr: 'Yazı',             desc: 'Symbolic recording of language',    descTr: 'Dilin sembolik kaydı',                color: '#daa520' },
];

export default function LanguagePanel() {
  const { stats, events, lang } = useSimStore();

  const currentStage = Math.max(0, Math.min(6, stats?.max_language_stage ?? 0));
  const langEvents = events.filter(e => e.event_type === 'language' || e.event_type === 'word' || e.event_type?.includes?.('language'));

  return (
    <DetailPanel panelId="language" title="Language" titleTr="Dil">
      <div className="bg-sim-surface rounded-lg p-3 mb-2">
        <div className="text-sim-muted text-sm mb-1">{lang === 'en' ? 'Current Stage' : 'Mevcut Aşama'}</div>
        <div className="text-sim-gold font-bold text-base">
          Stage {currentStage}: {lang === 'en' ? LANGUAGE_STAGES[currentStage].name : LANGUAGE_STAGES[currentStage].nameTr}
        </div>
        <div className="text-sim-muted text-sm mt-1">{lang === 'tr' ? LANGUAGE_STAGES[currentStage].descTr : LANGUAGE_STAGES[currentStage].desc}</div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Stage Progression' : 'Aşama İlerlemesi'}
        </h4>
        <div className="space-y-2">
          {LANGUAGE_STAGES.map(stage => {
            const isReached = stage.id <= currentStage;
            const isCurrent = stage.id === currentStage;
            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3 p-2 rounded ${
                  isCurrent ? 'bg-sim-accent/20 border border-sim-accent/40' :
                  isReached ? 'bg-sim-surface/50' : 'opacity-40'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: isReached ? stage.color : '#333' }}
                />
                <div>
                  <div className={`text-sm font-medium ${isReached ? 'text-sim-text' : 'text-sim-muted'}`}>
                    {lang === 'en' ? stage.name : stage.nameTr}
                  </div>
                  <div className="text-sim-muted text-sm">{lang === 'tr' ? stage.descTr : stage.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Language Events' : 'Dil Olayları'}
        </h4>
        {langEvents.length === 0 ? (
          <p className="text-sim-muted italic">{lang === 'en' ? 'No language events yet.' : 'Henüz dil olayı yok.'}</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {langEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="text-sim-muted text-sm py-0.5 border-b border-sim-border/30">
                {translateEventDescription(ev.description ?? '', lang as LangCode, ev)}
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

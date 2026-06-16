import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Flame } from 'lucide-react';
import { translateEventDescription, text, type LangCode } from '../../utils/i18n';

const BELIEF_INFO: Record<string, { stage: number; name: string; nameTr: string; desc: string; descTr: string; color: string }> = {
  animism:        { stage: 1, name: 'Animism',        nameTr: 'Animizm',           desc: 'Spirits in all living things',      descTr: 'Her canlıda ruhlar var',             color: '#6b8e23' },
  ancestor_cult:  { stage: 2, name: 'Ancestor Cult',  nameTr: 'Ata Kültü',         desc: 'Ancestor spirits guide the living', descTr: 'Ata ruhları rehberlik eder',         color: '#8b7355' },
  shamanism:      { stage: 2, name: 'Shamanism',       nameTr: 'Şamanizm',          desc: 'Shamans commune with spirits',      descTr: 'Şamanlar ruhlarla iletişir',        color: '#9370db' },
  polytheism:     { stage: 3, name: 'Polytheism',      nameTr: 'Çok Tanrıcılık',    desc: 'Multiple deities',                  descTr: 'Çok tanrılılık',                    color: '#daa520' },
  monotheism:     { stage: 4, name: 'Monotheism',      nameTr: 'Tek Tanrıcılık',    desc: 'One all-powerful deity',            descTr: 'Tek güçlü tanrı',                   color: '#4682b4' },
  philosophical:  { stage: 4, name: 'Philosophical',   nameTr: 'Felsefi Düşünce',   desc: 'Abstract reasoning about cosmos',   descTr: 'Kozmos üzerine soyut düşünce',      color: '#cd853f' },
};

export default function BeliefPanel() {
  const { events, lang } = useSimStore();
  const t = (tr: string, en: string, de = en, fr = en, ar = en) => text(lang as LangCode, { tr, en, de, fr, ar });

  const beliefEvents = events.filter(e => e.event_type === 'belief' || e.event_type === 'ritual');
  const discoveredBeliefs = new Set(
    beliefEvents
      .filter(e => e.event_type === 'belief')
      .map(e => e.description?.match(/\w+/g)?.[0] ?? '')
  );

  return (
    <DetailPanel panelId="belief" title="Belief" titleTr="İnanç">
      <div className="bg-sim-surface rounded-lg p-3 mb-2 text-center">
        <Flame size={24} className="text-orange-400 mx-auto mb-1" />
        <div className="text-sim-gold font-bold text-lg">{discoveredBeliefs.size}</div>
        <div className="text-sim-muted text-sm">
          {t('Ortaya çıkan inanç sistemleri', 'Belief systems emerged', 'Aufgetauchte Glaubenssysteme', 'Systèmes de croyances apparus', 'الأنظمة العقدية الناشئة')}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t('İnanç Arketipleri', 'Belief Archetypes', 'Glaubensarchetypen', 'Archétypes de croyances', 'نماذج المعتقدات')}
        </h4>
        <div className="space-y-1.5">
          {Object.entries(BELIEF_INFO).map(([id, info]) => {
            const discovered = discoveredBeliefs.has(id) || beliefEvents.some(e =>
              e.description?.toLowerCase().includes(id.replace('_', ' '))
            );
            return (
              <div
                key={id}
                className={`p-2 rounded border ${
                  discovered
                    ? 'border-sim-accent/40 bg-sim-accent/10'
                    : 'border-sim-border/30 bg-sim-surface/20 opacity-50'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-sm font-medium" style={{ color: discovered ? info.color : '#a0c8b0' }}>
                    {text(lang as LangCode, { tr: info.nameTr, en: info.name, de: info.name, fr: info.name, ar: info.name })}
                  </span>
                  <span className="text-sm text-sim-muted">
                    {text(lang as LangCode, { tr: `Aşama ${info.stage}`, en: `Stage ${info.stage}`, de: `Stufe ${info.stage}`, fr: `Étape ${info.stage}`, ar: `مرحلة ${info.stage}` })}
                  </span>
                </div>
                <div className="text-sm text-sim-muted">
                  {t(info.descTr, info.desc)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t('Ortaya Çıkış Koşulları', 'Emergence Conditions', 'Entstehungsbedingungen', 'Conditions d\'émergence', 'شروط الظهور')}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {t('İnanç; dindar gen + kaygı + çevre stresi şüphecilik eşiğini aştığında oluşur. Yazı sistemi yüksek aşamaları açar.',
             'Belief forms when religiosity gene + anxiety + environmental stress overcome skepticism threshold. Writing unlocks higher stages.',
             'Glaube entsteht wenn Religiosität + Angst + Umweltstress den Skeptizismuswert überschreiten.',
             'La croyance se forme quand gène religiosité + anxiété + stress environnemental dépasse le seuil de scepticisme.',
             'تتشكل المعتقدات عندما يتجاوز جين التدين + القلق + الضغط البيئي عتبة الشك.')}
        </p>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t('Ritüel Olayları', 'Ritual Events', 'Ritualereignisse', 'Événements rituels', 'أحداث طقسية')}
        </h4>
        {beliefEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {t('Henüz inanç olayı yok.', 'No belief events yet.', 'Noch keine Glaubensereignisse.', 'Pas encore d\'événements de croyance.', 'لا أحداث عقدية بعد.')}
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {beliefEvents.slice(0, 8).map((ev, i) => (
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

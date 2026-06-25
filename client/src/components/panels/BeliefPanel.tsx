import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Flame } from 'lucide-react';
import { translateEventDescription, text, type LangCode } from '../../utils/i18n';

const BELIEF_INFO: Record<string, {
  stage: number;
  name: string; nameTr: string; nameDe: string; nameFr: string; nameAr: string;
  desc: string; descTr: string; descDe: string; descFr: string; descAr: string;
  color: string;
}> = {
  animism:       { stage: 1,
    name: 'Animism',       nameTr: 'Animizm',         nameDe: 'Animismus',        nameFr: 'Animisme',              nameAr: 'الروحانية',
    desc: 'Spirits in all living things',       descTr: 'Her canlıda ruhlar var',             descDe: 'Geister in allen Lebewesen',         descFr: 'Esprits dans tous les êtres vivants',  descAr: 'أرواح في كل الكائنات',
    color: '#6b8e23' },
  ancestor_cult: { stage: 2,
    name: 'Ancestor Cult', nameTr: 'Ata Kültü',       nameDe: 'Ahnenkult',        nameFr: 'Culte des ancêtres',    nameAr: 'عبادة الأجداد',
    desc: 'Ancestor spirits guide the living', descTr: 'Ata ruhları rehberlik eder',          descDe: 'Ahnengeister leiten die Lebenden',    descFr: 'Les esprits des ancêtres guident',     descAr: 'أرواح الأجداد ترشد الأحياء',
    color: '#8b7355' },
  shamanism:     { stage: 2,
    name: 'Shamanism',     nameTr: 'Şamanizm',        nameDe: 'Schamanismus',     nameFr: 'Chamanisme',            nameAr: 'الشامانية',
    desc: 'Shamans commune with spirits',      descTr: 'Şamanlar ruhlarla iletişir',         descDe: 'Schamanen kommunizieren mit Geistern',descFr: 'Chamanes communient avec les esprits', descAr: 'الشامان يتواصل مع الأرواح',
    color: '#9370db' },
  polytheism:    { stage: 3,
    name: 'Polytheism',    nameTr: 'Çok Tanrıcılık',  nameDe: 'Polytheismus',     nameFr: 'Polythéisme',           nameAr: 'تعدد الآلهة',
    desc: 'Multiple deities',                 descTr: 'Çok tanrılılık',                     descDe: 'Mehrere Gottheiten',                  descFr: 'Plusieurs divinités',                  descAr: 'آلهة متعددة',
    color: '#daa520' },
  monotheism:    { stage: 4,
    name: 'Monotheism',    nameTr: 'Tek Tanrıcılık',  nameDe: 'Monotheismus',     nameFr: 'Monothéisme',           nameAr: 'التوحيد',
    desc: 'One all-powerful deity',           descTr: 'Tek güçlü tanrı',                    descDe: 'Eine allmächtige Gottheit',           descFr: 'Une divinité toute-puissante',         descAr: 'إله واحد كلي القدرة',
    color: '#4682b4' },
  philosophical: { stage: 4,
    name: 'Philosophical', nameTr: 'Felsefi Düşünce', nameDe: 'Philosophie',      nameFr: 'Philosophie',           nameAr: 'الفلسفة',
    desc: 'Abstract reasoning about cosmos',  descTr: 'Kozmos üzerine soyut düşünce',       descDe: 'Abstrakte Überlegungen über den Kosmos',descFr: 'Réflexion abstraite sur le cosmos',  descAr: 'تأمل مجرد في الكون',
    color: '#cd853f' },
};

function isBeliefDiscovered(id: string, events: any[]) {
  return events.some(e => {
    if (e.event_type !== 'belief') return false;
    if (e.data?.belief_type === id) return true;
    if (e.data?.type === id) return true;
    const desc = (e.description ?? '').toLowerCase();
    return desc.includes(id.replace('_', ' ')) || desc.includes(id.replace('_', ''));
  });
}

export default function BeliefPanel() {
  const { events, lang } = useSimStore();
  const L = lang as LangCode;
  const t = (tr: string, en: string, de = en, fr = en, ar = en) => text(L, { tr, en, de, fr, ar });

  const beliefEvents = events.filter(e => e.event_type === 'belief' || e.event_type === 'ritual');
  const discoveredCount = Object.keys(BELIEF_INFO).filter(id => isBeliefDiscovered(id, beliefEvents)).length;

  return (
    <DetailPanel panelId="belief" title="Belief" titleTr="İnanç">
      <div className="bg-sim-surface rounded-lg p-3 mb-2 text-center">
        <Flame size={24} className="text-orange-400 mx-auto mb-1" />
        <div className="text-sim-gold font-bold text-lg">{discoveredCount}</div>
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
            const discovered = isBeliefDiscovered(id, beliefEvents);
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
                    {text(L, { tr: info.nameTr, en: info.name, de: info.nameDe, fr: info.nameFr, ar: info.nameAr })}
                  </span>
                  <span className="text-sm text-sim-muted">
                    {text(L, { tr: `Aşama ${info.stage}`, en: `Stage ${info.stage}`, de: `Stufe ${info.stage}`, fr: `Étape ${info.stage}`, ar: `مرحلة ${info.stage}` })}
                  </span>
                </div>
                <div className="text-sm text-sim-muted">
                  {text(L, { tr: info.descTr, en: info.desc, de: info.descDe, fr: info.descFr, ar: info.descAr })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t('Ortaya Çıkış Koşulları', 'Emergence Conditions', 'Entstehungsbedingungen', 'Conditions d\'émergence', 'شروط الظهور')}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {t('İnanç; dindar gen + kaygı + çevre stresi şüphecilik eşiğini aştığında oluşur. Yazı sistemi yüksek aşamaları açar.',
             'Belief forms when religiosity gene + anxiety + environmental stress overcome skepticism threshold. Writing unlocks higher stages.',
             'Glaube entsteht wenn Religiosität + Angst + Umweltstress den Skeptizismuswert überschreiten. Schrift schaltet höhere Stufen frei.',
             'La croyance se forme quand gène religiosité + anxiété + stress dépasse le seuil de scepticisme. L\'écriture débloque les étapes supérieures.',
             'تتشكل المعتقدات عندما يتجاوز جين التدين + القلق + الضغط البيئي عتبة الشك. الكتابة تفتح المراحل الأعلى.')}
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
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', L, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

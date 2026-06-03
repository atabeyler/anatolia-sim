import { translateEventDescription, type LangCode } from '../../utils/i18n';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Scale, ShieldCheck } from 'lucide-react';

const NORM_STAGES = [
  { stage: 1, label: 'Spontaneous Norms', labelTr: 'Kendiliğinden Normlar', norms: ['Reciprocity', 'No Theft', 'Incest Taboo'] },
  { stage: 2, label: 'Social Norms', labelTr: 'Sosyal Normlar', norms: ['Elder Respect', 'Hospitality', 'Blood Feud', 'Communal Work'] },
  { stage: 3, label: 'Proto-Law', labelTr: 'Proto-Hukuk', norms: ['Leader Arbitration', 'Property Rights', 'Exile Punishment'] },
  { stage: 4, label: 'Formal Law', labelTr: 'Resmi Hukuk', norms: ['Written Law', 'Tax System', 'Contract Law'] },
];

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

export default function LawPanel() {
  const { events, lang } = useSimStore();

  const lawEvents = events.filter(e => e.event_type === 'law');
  const normCount = lawEvents.filter(e => e.description?.includes('emerged') || e.description?.includes('norm')).length;
  const violationCount = lawEvents.filter(e => e.description?.toLowerCase().includes('violation')).length;

  return (
    <DetailPanel panelId="law" title="Law" titleTr="Hukuk">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <ShieldCheck size={16} className="text-green-400 mx-auto mb-1" />
          <div className="text-green-400 font-bold text-lg">{normCount}</div>
          <div className="text-sim-muted text-sm">{t(lang, 'Active Norms', 'Aktif Normlar')}</div>
        </div>
        <div className="bg-sim-surface rounded-lg p-2 text-center">
          <Scale size={16} className="text-yellow-400 mx-auto mb-1" />
          <div className="text-yellow-400 font-bold text-lg">{violationCount}</div>
          <div className="text-sim-muted text-sm">{t(lang, 'Violations', 'İhlaller')}</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Norm Progression', 'Norm İlerlemesi')}
        </h4>
        <div className="space-y-3">
          {NORM_STAGES.map(stage => {
            const stageNorms = lawEvents.filter(e =>
              stage.norms.some(n => e.description?.toLowerCase().includes(n.toLowerCase()))
            );
            return (
              <div key={stage.stage}>
                <div className="text-sm text-sim-muted mb-1 font-medium">
                  {t(lang, `Stage ${stage.stage}: ${stage.label}`, `Aşama ${stage.stage}: ${stage.labelTr}`)}
                </div>
                <div className="space-y-0.5">
                  {stage.norms.map(norm => {
                    const active = stageNorms.some(e => e.description?.toLowerCase().includes(norm.toLowerCase()));
                    return (
                      <div
                        key={norm}
                        className={`flex items-center gap-1.5 text-sm px-2 py-0.5 rounded ${active ? 'text-sim-text' : 'text-sim-muted opacity-50'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-sim-border'}`} />
                        {t(lang, norm, norm)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Legal Events', 'Hukuki Olaylar')}
        </h4>
        {lawEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {t(lang, 'No legal events yet.', 'Henüz hukuki olay yok.')}
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {lawEvents.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-green-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', lang as LangCode, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

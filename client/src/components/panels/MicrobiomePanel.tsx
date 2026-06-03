import { translateEventDescription, type LangCode } from '../../utils/i18n';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { AlertTriangle } from 'lucide-react';

const PATHOGEN_INFO: Record<string, { transmission: string; severity: string; color: string; tr: string; trTransmission: string }> = {
  intestinal_parasite: { transmission: 'Fecal-oral', severity: 'Low', color: 'text-yellow-400', tr: 'Bağırsak paraziti', trTransmission: 'Dışkı-ağız' },
  cholera_like:        { transmission: 'Waterborne', severity: 'High', color: 'text-red-400', tr: 'Kolera benzeri', trTransmission: 'Suyla bulaşan' },
  respiratory_common:  { transmission: 'Airborne', severity: 'Low', color: 'text-yellow-400', tr: 'Solunum yolu', trTransmission: 'Hava yoluyla' },
  pneumonia_like:      { transmission: 'Airborne', severity: 'Medium', color: 'text-orange-400', tr: 'Zatürre benzeri', trTransmission: 'Hava yoluyla' },
  plague_like:         { transmission: 'Airborne', severity: 'Critical', color: 'text-red-600', tr: 'Veba benzeri', trTransmission: 'Hava yoluyla' },
  malaria_like:        { transmission: 'Vector', severity: 'Medium', color: 'text-orange-400', tr: 'Sıtma benzeri', trTransmission: 'Vektör ile' },
  wound_infection:     { transmission: 'Contact', severity: 'Medium', color: 'text-orange-400', tr: 'Yara enfeksiyonu', trTransmission: 'Temas ile' },
};

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

export default function MicrobiomePanel() {
  const { stats, events, lang } = useSimStore();

  const sickRate = (stats as any)?.sick_rate ?? 0;
  const epidemicEvents = events.filter(e => e.event_type === 'epidemic');

  return (
    <DetailPanel panelId="microbiome" title="Microbiome" titleTr="Mikrobiyom">
      <div className={`bg-sim-surface rounded-lg p-3 mb-3 flex items-center gap-3 ${sickRate > 0.3 ? 'border border-red-500/40' : ''}`}>
        <AlertTriangle size={20} className={sickRate > 0.3 ? 'text-red-400' : 'text-sim-muted'} />
        <div>
          <div className={`font-bold text-lg ${sickRate > 0.3 ? 'text-red-400' : sickRate > 0.1 ? 'text-yellow-400' : 'text-green-400'}`}>
            {(sickRate * 100).toFixed(1)}%
          </div>
          <div className="text-sim-muted text-sm">{t(lang, 'Population Sick Rate', 'Nüfus Hastalık Oranı')}</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Pathogen Types', 'Patojen Türleri')}
        </h4>
        <div className="space-y-1.5">
          {Object.entries(PATHOGEN_INFO).map(([id, info]) => (
            <div key={id} className="flex items-center gap-2 bg-sim-surface/50 rounded p-1.5">
              <div className="flex-1">
                <div className="text-sm text-sim-text">
                  {t(lang, info.tr, id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
                </div>
                <div className="text-sm text-sim-muted">
                  {t(lang, info.transmission, info.trTransmission)}
                </div>
              </div>
              <span className={`text-sm font-medium ${info.color}`}>{t(lang, info.severity, info.severity)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Gut Microbiome', 'Bağırsak Mikrobiyomu')}
        </h4>
        <p className="text-sim-muted text-sm italic">
          {t(
            lang,
            'Diet diversity → microbiome diversity → immune strength. Monoculture diets increase pathogen susceptibility.',
            'Diyet çeşitliliği → mikrobiyom çeşitliliği → bağışıklık gücü. Tek tip diyetler patojen duyarlılığını artırır.'
          )}
        </p>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Epidemic History', 'Salgın Tarihi')}
        </h4>
        {epidemicEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">
            {t(lang, 'No epidemics recorded.', 'Kayıtlı salgın yok.')}
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {epidemicEvents.map((ev, i) => (
              <div key={i} className="flex gap-2 py-0.5 border-b border-sim-border/30">
                <span className="text-red-400 font-mono text-sm">Y{ev.sim_year}</span>
                <span className="text-sim-muted text-sm">{translateEventDescription(ev.description ?? '', lang as LangCode, ev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

import { translateEventDescription, type LangCode } from '../../utils/i18n';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { AlertTriangle } from 'lucide-react';

const SEVERITY_TR: Record<string, string> = {
  Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik',
};

const PATHOGEN_INFO: Record<string, { name: string; nameTr: string; transmission: string; severity: string; color: string; trTransmission: string }> = {
  intestinal_parasite: { name: 'Intestinal Parasite', nameTr: 'Bağırsak Paraziti',    transmission: 'Fecal-oral', severity: 'Low',      color: 'text-yellow-400', trTransmission: 'Dışkı-ağız' },
  cholera_like:        { name: 'Cholera Like',         nameTr: 'Kolera Benzeri',        transmission: 'Waterborne', severity: 'High',     color: 'text-red-400',    trTransmission: 'Suyla bulaşan' },
  respiratory_common:  { name: 'Respiratory Common',   nameTr: 'Solunum Yolu',          transmission: 'Airborne',   severity: 'Low',      color: 'text-yellow-400', trTransmission: 'Hava yoluyla' },
  pneumonia_like:      { name: 'Pneumonia Like',        nameTr: 'Zatürre Benzeri',       transmission: 'Airborne',   severity: 'Medium',   color: 'text-orange-400', trTransmission: 'Hava yoluyla' },
  plague_like:         { name: 'Plague Like',           nameTr: 'Veba Benzeri',          transmission: 'Airborne',   severity: 'Critical', color: 'text-red-600',    trTransmission: 'Hava yoluyla' },
  malaria_like:        { name: 'Malaria Like',          nameTr: 'Sıtma Benzeri',         transmission: 'Vector',     severity: 'Medium',   color: 'text-orange-400', trTransmission: 'Vektör ile' },
  wound_infection:     { name: 'Wound Infection',       nameTr: 'Yara Enfeksiyonu',      transmission: 'Contact',    severity: 'Medium',   color: 'text-orange-400', trTransmission: 'Temas ile' },
};

function t(lang: string, en: string, tr: string) {
  return lang === 'tr' ? tr : en;
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
                  {lang === 'tr' ? info.nameTr : info.name}
                </div>
                <div className="text-sm text-sim-muted">
                  {lang === 'tr' ? info.trTransmission : info.transmission}
                </div>
              </div>
              <span className={`text-sm font-medium ${info.color}`}>
                {lang === 'tr' ? (SEVERITY_TR[info.severity] ?? info.severity) : info.severity}
              </span>
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

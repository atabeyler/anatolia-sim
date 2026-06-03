import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const LOCI = [
  { id: 'HPA_AXIS', gene: 'COMT', effect: 'Stress Reactivity', desc: 'Blunted under chronic stress' },
  { id: 'BDNF_PROMOTER', gene: 'BDNF', effect: 'Neuroplasticity', desc: 'Early adversity reduces learning' },
  { id: 'MAOA_REGULATION', gene: 'MAOA', effect: 'Aggression', desc: 'Early stress → permanent mark' },
  { id: 'LEPTIN_RESIST', gene: 'Metabolic', effect: 'Fat Storage', desc: 'Famine triggers metabolic shift' },
  { id: 'OXTR_METHYL', gene: 'OXTR', effect: 'Social Bonding', desc: 'Isolation demethylates bonding' },
  { id: 'IMMUNE_PRIMING', gene: 'Immune', effect: 'Pathogen Memory', desc: 'Infection leaves lasting marks' },
];

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

export default function EpigeneticsPanel() {
  const { lang } = useSimStore();

  return (
    <DetailPanel panelId="epigenetics" title="Epigenetics" titleTr="Epigenetik">
      <div className="bg-sim-surface rounded-lg p-3 mb-3">
        <p className="text-sim-muted text-sm italic">
          {t(
            lang,
            'Experience modifies gene expression without changing DNA sequence. Some marks are heritable across generations.',
            'Deneyim, DNA dizisini değiştirmeden gen ifadesini değiştirir. Bazı izler nesiller arasında aktarılır.'
          )}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Monitored Loci', 'İzlenen Lokuslar')}
        </h4>
        <div className="space-y-2">
          {LOCI.map(locus => (
            <div key={locus.id} className="bg-sim-surface/50 rounded p-2">
              <div className="flex justify-between mb-1">
                <span className="text-sim-text text-sm font-medium">{locus.gene}</span>
                <span className="text-sim-accent text-sm">{t(lang, locus.effect, locus.effect)}</span>
              </div>
              <div className="text-sim-muted text-sm italic">
                {t(
                  lang,
                  locus.desc,
                  locus.desc
                    .replace('Blunted under chronic stress', 'Kronik stres altında zayıflar')
                    .replace('Early adversity reduces learning', 'Erken zorluk öğrenmeyi azaltır')
                    .replace('Early stress → permanent mark', 'Erken stres → kalıcı iz')
                    .replace('Famine triggers metabolic shift', 'Kıtlık metabolik kaymayı tetikler')
                    .replace('Isolation demethylates bonding', 'Yalıtım bağlanma izlerini değiştirir')
                    .replace('Infection leaves lasting marks', 'Enfeksiyon kalıcı izler bırakır')
                )}
              </div>
              <div className="mt-1 h-1.5 bg-sim-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: '50%' }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-sm text-sim-muted">{t(lang, 'Active', 'Aktif')}</span>
                <span className="text-sm text-sim-muted">{t(lang, 'Silenced', 'Sessiz')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {t(lang, 'Transgenerational Inheritance', 'Nesiller Arası Aktarım')}
        </h4>
        <div className="space-y-1">
          {[
            { label: t(lang, 'Reversible marks', 'Tersine çevrilebilir izler'), heritability: '20-35%' },
            { label: t(lang, 'Stress marks (MAOA)', 'Stres izleri (MAOA)'), heritability: '40%' },
            { label: t(lang, 'Immune priming', 'Bağışıklık hazırlığı'), heritability: '60%' },
            { label: t(lang, 'Metabolic marks', 'Metabolik izler'), heritability: '50%' },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-0.5 border-b border-sim-border/30 text-sm">
              <span className="text-sim-muted">{row.label}</span>
              <span className="text-sim-accent">{row.heritability}</span>
            </div>
          ))}
        </div>
      </div>
    </DetailPanel>
  );
}

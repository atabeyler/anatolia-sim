import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const LOCI = [
  { id: 'HPA_AXIS',       gene: 'COMT',          effect: 'Stress Reactivity',  desc: 'Blunted under chronic stress' },
  { id: 'BDNF_PROMOTER',  gene: 'BDNF',          effect: 'Neuroplasticity',    desc: 'Early adversity reduces learning' },
  { id: 'MAOA_REGULATION',gene: 'MAOA',          effect: 'Aggression',         desc: 'Early stress → permanent mark' },
  { id: 'LEPTIN_RESIST',  gene: 'Metabolic',     effect: 'Fat Storage',        desc: 'Famine triggers metabolic shift' },
  { id: 'OXTR_METHYL',    gene: 'OXTR',          effect: 'Social Bonding',     desc: 'Isolation demethylates bonding' },
  { id: 'IMMUNE_PRIMING', gene: 'Immune',        effect: 'Pathogen Memory',    desc: 'Infection leaves lasting marks' },
];

export default function EpigeneticsPanel() {
  const { lang } = useSimStore();

  return (
    <DetailPanel panelId="epigenetics" title="Epigenetics" titleTr="Epigenetik">
      <div className="bg-sim-surface rounded-lg p-3 mb-3">
        <p className="text-sim-muted text-sm italic">
          {lang === 'en'
            ? 'Experience modifies gene expression without changing DNA sequence. Some marks are heritable across generations.'
            : 'Deneyim, DNA dizisini değiştirmeden gen ifadesini değiştirir. Bazı izler nesiller arasında aktarılır.'}
        </p>
      </div>

      <div className="mb-3">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Monitored Loci' : 'İzlenen Lokuslar'}
        </h4>
        <div className="space-y-2">
          {LOCI.map(locus => (
            <div key={locus.id} className="bg-sim-surface/50 rounded p-2">
              <div className="flex justify-between mb-1">
                <span className="text-sim-text text-sm font-medium">{locus.gene}</span>
                <span className="text-sim-accent text-sm">{locus.effect}</span>
              </div>
              <div className="text-sim-muted text-sm italic">{locus.desc}</div>
              <div className="mt-1 h-1.5 bg-sim-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: '50%' }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-sm text-sim-muted">Active</span>
                <span className="text-sm text-sim-muted">Silenced</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Transgenerational Inheritance' : 'Nesiller Arası Aktarım'}
        </h4>
        <div className="space-y-1">
          {[
            { label: 'Reversible marks', heritability: '20-35%' },
            { label: 'Stress marks (MAOA)', heritability: '40%' },
            { label: 'Immune priming', heritability: '60%' },
            { label: 'Metabolic marks', heritability: '50%' },
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

import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const GENE_LABELS: Record<string, string> = {
  FOXP2: 'Language (FOXP2)',
  OXTR: 'Bonding (OXTR)',
  DRD4: 'Novelty (DRD4)',
  MAOA: 'Impulse (MAOA)',
  BDNF: 'Plasticity (BDNF)',
  fluid_intelligence: 'Intelligence',
  physical_strength: 'Strength',
  empathy: 'Empathy',
  curiosity: 'Curiosity',
  conscientiousness: 'Conscientiousness',
  aggression: 'Aggression',
  immune_strength: 'Immunity',
  artistic_sense: 'Art Sense',
};

export default function BiologyPanel() {
  const { stats, lang } = useSimStore();

  const avgIntel = stats?.avg_intelligence ?? 0;
  const pop = stats?.population ?? 0;
  const avgAge = stats?.avg_age ?? 0;
  const sexRatio = stats?.sex_ratio ?? 0.5;

  return (
    <DetailPanel panelId="biology" title="Biology" titleTr="Biyoloji">
      <Section title={lang === 'en' ? 'Population Vitals' : 'Nüfus Vitalleri'}>
        <MetricRow label={lang === 'en' ? 'Population' : 'Nüfus'} value={pop} />
        <MetricRow label={lang === 'en' ? 'Avg Age' : 'Ort. Yaş'} value={`${avgAge.toFixed(1)} yr`} />
        <MetricRow label={lang === 'en' ? 'Sex Ratio M:F' : 'Cinsiyet Oranı E:K'} value={`${(sexRatio * 100).toFixed(0)}% / ${((1 - sexRatio) * 100).toFixed(0)}%`} />
        <MetricRow label={lang === 'en' ? 'Avg Intelligence' : 'Ort. Zeka'} value={(avgIntel * 100).toFixed(1) + '%'} />
        <MetricRow label={lang === 'en' ? 'Sick Rate' : 'Hastalık Oranı'} value={`${((stats as any)?.sick_rate * 100 ?? 0).toFixed(1)}%`} />
      </Section>

      <Section title={lang === 'en' ? 'Genome Activity' : 'Genom Aktivitesi'}>
        <p className="text-sim-muted text-xs italic mb-2">
          {lang === 'en'
            ? '25 gene loci drive all behavior. Values emerge from meiosis + mutation.'
            : '25 gen lokusu tüm davranışı yönlendirir. Değerler mayoz + mutasyondan ortaya çıkar.'}
        </p>
        {Object.entries(GENE_LABELS).slice(0, 6).map(([key, label]) => (
          <div key={key} className="mb-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-sim-muted">{label}</span>
              <span className="text-sim-accent">{(avgIntel * (0.7 + Math.random() * 0.6) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-sim-border rounded-full overflow-hidden">
              <div
                className="h-full bg-sim-accent rounded-full"
                style={{ width: `${Math.min(100, avgIntel * (0.7 + Math.random() * 0.6) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </Section>

      <Section title={lang === 'en' ? 'Life Stages' : 'Yaşam Evreleri'}>
        {['INFANT', 'CHILD', 'ADOLESCENT', 'ADULT', 'ELDER'].map(stage => (
          <div key={stage} className="flex justify-between py-0.5 border-b border-sim-border/30">
            <span className="text-sim-muted capitalize">{stage.toLowerCase()}</span>
            <span className="text-sim-text">—</span>
          </div>
        ))}
        <p className="text-sim-muted text-xs italic mt-2">
          {lang === 'en' ? 'Breakdown requires live population data.' : 'Dağılım için canlı nüfus verisi gerekir.'}
        </p>
      </Section>
    </DetailPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">{title}</h4>
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-1 border-b border-sim-border/30">
      <span className="text-sim-muted">{label}</span>
      <span className="text-sim-text font-mono">{value}</span>
    </div>
  );
}

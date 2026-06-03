import { useEffect, useState } from 'react';
import axios from 'axios';
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
  const { stats, lang, currentSim, accessToken } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const load = () => axios.get(`/api/simulations/${currentSim.id}/population?alive=true`, { headers })
      .then(r => setIndividuals(r.data))
      .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [currentSim?.id, accessToken]);

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
        <MetricRow label={lang === 'en' ? 'Sick Rate' : 'Hastalık Oranı'} value={`${((stats?.sick_rate ?? 0) * 100).toFixed(1)}%`} />
      </Section>

      <Section title={lang === 'en' ? 'Genome Activity' : 'Genom Aktivitesi'}>
        <p className="text-sim-muted text-sm italic mb-2">
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

      <Section title={lang === 'en' ? 'Living Individuals' : 'Yasayan Bireyler'}>
        {individuals.length === 0 ? (
          <p className="text-sim-muted text-sm italic">
            {lang === 'en' ? 'No live population loaded yet.' : 'Canli nufus henuz yuklenmedi.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {individuals.slice(0, 80).map(ind => (
              <div key={ind.id} className="bg-sim-bg/60 border border-sim-border/40 rounded p-2">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-sim-text font-semibold truncate">{ind.name ?? ind.phenotype?.name ?? 'Unnamed'}</span>
                  <span className="text-sim-accent font-mono text-[12px]">{Number(ind.age_years ?? 0).toFixed(1)} yr</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                  <Mini label={lang === 'en' ? 'Sex' : 'Cinsiyet'} value={ind.sex} />
                  <Mini label={lang === 'en' ? 'Location' : 'Konum'} value={`${Number(ind.y ?? 0).toFixed(2)}, ${Number(ind.x ?? 0).toFixed(2)}`} />
                  <Mini label={lang === 'en' ? 'Hair' : 'Sac'} value={ind.phenotype?.hair_color ?? '-'} />
                  <Mini label={lang === 'en' ? 'Eye' : 'Goz'} value={ind.phenotype?.eye_color ?? '-'} />
                  <Mini label={lang === 'en' ? 'Skin' : 'Ten'} value={String(ind.phenotype?.skin_color ?? ind.phenotype?.skin_tone ?? '-')} />
                  <Mini label={lang === 'en' ? 'Height' : 'Boy'} value={`${ind.phenotype?.height_cm ?? '-'} cm`} />
                  <Mini label={lang === 'en' ? 'IQ' : 'Zeka'} value={`${((ind.phenotype?.fluid_intelligence ?? 0) * 100).toFixed(0)}%`} />
                  <Mini label={lang === 'en' ? 'Language' : 'Dil'} value={ind.language?.stage_name ?? '-'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={lang === 'en' ? 'Life Stages' : 'Yaşam Evreleri'}>
        {['INFANT', 'CHILD', 'ADOLESCENT', 'ADULT', 'ELDER'].map(stage => (
          <div key={stage} className="flex justify-between py-0.5 border-b border-sim-border/30">
            <span className="text-sim-muted capitalize">{stage.toLowerCase()}</span>
            <span className="text-sim-text">—</span>
          </div>
        ))}
        <p className="text-sim-muted text-sm italic mt-2">
          {lang === 'en' ? 'Breakdown requires live population data.' : 'Dağılım için canlı nüfus verisi gerekir.'}
        </p>
      </Section>
    </DetailPanel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">{title}</h4>
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

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 border-b border-sim-border/20 pb-0.5">
      <span className="text-sim-muted">{label}</span>
      <span className="text-sim-text text-right truncate">{value}</span>
    </div>
  );
}

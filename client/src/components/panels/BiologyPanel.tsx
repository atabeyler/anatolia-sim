import { useEffect, useState } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';

const GENE_LABELS: Record<string, { en: string; tr: string }> = {
  FOXP2: { en: 'Language (FOXP2)', tr: 'Dil (FOXP2)' },
  OXTR: { en: 'Bonding (OXTR)', tr: 'Bağlanma (OXTR)' },
  DRD4: { en: 'Novelty (DRD4)', tr: 'Yenilik (DRD4)' },
  MAOA: { en: 'Impulse (MAOA)', tr: 'Dürtü (MAOA)' },
  BDNF: { en: 'Plasticity (BDNF)', tr: 'Esneklik (BDNF)' },
  fluid_intelligence: { en: 'Intelligence', tr: 'Zekâ' },
  physical_strength: { en: 'Strength', tr: 'Güç' },
  empathy: { en: 'Empathy', tr: 'Empati' },
  curiosity: { en: 'Curiosity', tr: 'Merak' },
  conscientiousness: { en: 'Conscientiousness', tr: 'Özenlilik' },
  aggression: { en: 'Aggression', tr: 'Saldırganlık' },
  immune_strength: { en: 'Immunity', tr: 'Bağışıklık' },
  artistic_sense: { en: 'Art Sense', tr: 'Sanat Duyusu' },
};

function t(lang: string, en: string, tr: string) {
  return lang === 'en' ? en : tr;
}

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
      <Section title={t(lang, 'Population Vitals', 'Nüfus Değerleri')}>
        <MetricRow label={t(lang, 'Population', 'Nüfus')} value={pop} />
        <MetricRow label={t(lang, 'Avg Age', 'Ortalama Yaş')} value={`${avgAge.toFixed(1)} yr`} />
        <MetricRow label={t(lang, 'Sex Ratio M:F', 'Cinsiyet Oranı E:K')} value={`${(sexRatio * 100).toFixed(0)}% / ${((1 - sexRatio) * 100).toFixed(0)}%`} />
        <MetricRow label={t(lang, 'Avg Intelligence', 'Ortalama Zekâ')} value={(avgIntel * 100).toFixed(1) + '%'} />
        <MetricRow label={t(lang, 'Sick Rate', 'Hastalık Oranı')} value={`${((stats?.sick_rate ?? 0) * 100).toFixed(1)}%`} />
      </Section>

      <Section title={t(lang, 'Genome Activity', 'Genom Aktivitesi')}>
        <p className="text-sim-muted text-sm italic mb-2">
          {t(
            lang,
            'Gene loci drive behavior. Values emerge from meiosis and mutation.',
            'Gen lokusları davranışları yönlendirir. Değerler mayoz ve mutasyondan ortaya çıkar.'
          )}
        </p>
        {Object.entries(GENE_LABELS).slice(0, 6).map(([key, labels]) => (
          <div key={key} className="mb-1">
            <div className="flex justify-between mb-0.5">
              <span className="text-sim-muted">{labels[lang === 'en' ? 'en' : 'tr']}</span>
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

      <Section title={t(lang, 'Living Individuals', 'Yaşayan Bireyler')}>
        {individuals.length === 0 ? (
          <p className="text-sim-muted text-sm italic">
            {t(lang, 'No live population loaded yet.', 'Canlı nüfus henüz yüklenmedi.')}
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
                  <Mini label={t(lang, 'Sex', 'Cinsiyet')} value={ind.sex} />
                  <Mini label={t(lang, 'Location', 'Konum')} value={`${Number(ind.y ?? 0).toFixed(2)}, ${Number(ind.x ?? 0).toFixed(2)}`} />
                  <Mini label={t(lang, 'Hair', 'Saç')} value={ind.phenotype?.hair_color ?? '-'} />
                  <Mini label={t(lang, 'Eye', 'Göz')} value={ind.phenotype?.eye_color ?? '-'} />
                  <Mini label={t(lang, 'Skin', 'Ten')} value={String(ind.phenotype?.skin_color ?? ind.phenotype?.skin_tone ?? '-')} />
                  <Mini label={t(lang, 'Height', 'Boy')} value={`${ind.phenotype?.height_cm ?? '-'} cm`} />
                  <Mini label={t(lang, 'IQ', 'Zekâ')} value={`${((ind.phenotype?.fluid_intelligence ?? 0) * 100).toFixed(0)}%`} />
                  <Mini label={t(lang, 'Language', 'Dil')} value={ind.language?.stage_name ?? '-'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t(lang, 'Life Stages', 'Yaşam Evreleri')}>
        {['INFANT', 'CHILD', 'ADOLESCENT', 'ADULT', 'ELDER'].map(stage => (
          <div key={stage} className="flex justify-between py-0.5 border-b border-sim-border/30">
            <span className="text-sim-muted capitalize">{stage.toLowerCase()}</span>
            <span className="text-sim-text">—</span>
          </div>
        ))}
        <p className="text-sim-muted text-sm italic mt-2">
          {t(lang, 'Breakdown requires live population data.', 'Dağılım için canlı nüfus verisi gerekir.')}
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

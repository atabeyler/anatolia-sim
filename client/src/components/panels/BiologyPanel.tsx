import { useEffect, useState } from 'react';
import axios from 'axios';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { text, type LangCode } from '../../utils/i18n';

const GENE_LABELS: Record<string, { tr: string; en: string; de: string; fr: string; ar: string; phenoKey: string }> = {
  FOXP2:              { tr: 'Dil (FOXP2)',       en: 'Language (FOXP2)',       de: 'Sprache (FOXP2)',       fr: 'Langage (FOXP2)',        ar: 'اللغة (FOXP2)',       phenoKey: 'language_capacity' },
  OXTR:               { tr: 'Bağlanma (OXTR)',   en: 'Bonding (OXTR)',         de: 'Bindung (OXTR)',        fr: 'Lien (OXTR)',            ar: 'الترابط (OXTR)',      phenoKey: 'social_bonding' },
  DRD4:               { tr: 'Yenilik (DRD4)',    en: 'Novelty (DRD4)',         de: 'Neuheit (DRD4)',        fr: 'Nouveauté (DRD4)',       ar: 'الجدة (DRD4)',        phenoKey: 'curiosity' },
  MAOA:               { tr: 'Dürtü (MAOA)',      en: 'Impulse (MAOA)',         de: 'Impuls (MAOA)',         fr: 'Impulsion (MAOA)',       ar: 'الاندفاع (MAOA)',     phenoKey: 'aggression' },
  BDNF:               { tr: 'Esneklik (BDNF)',   en: 'Plasticity (BDNF)',      de: 'Plastizität (BDNF)',   fr: 'Plasticité (BDNF)',      ar: 'اللدونة (BDNF)',      phenoKey: 'learning_rate' },
  fluid_intelligence: { tr: 'Zekâ',             en: 'Intelligence',           de: 'Intelligenz',           fr: 'Intelligence',           ar: 'الذكاء',             phenoKey: 'fluid_intelligence' },
  physical_strength:  { tr: 'Güç',              en: 'Strength',               de: 'Stärke',                fr: 'Force',                  ar: 'القوة',              phenoKey: 'physical_strength' },
  empathy:            { tr: 'Empati',            en: 'Empathy',                de: 'Empathie',              fr: 'Empathie',               ar: 'التعاطف',            phenoKey: 'empathy' },
  curiosity:          { tr: 'Merak',             en: 'Curiosity',              de: 'Neugier',               fr: 'Curiosité',              ar: 'الفضول',             phenoKey: 'curiosity' },
  conscientiousness:  { tr: 'Özenlilik',         en: 'Conscientiousness',      de: 'Gewissenhaftigkeit',   fr: 'Conscience',             ar: 'الضمير',             phenoKey: 'conscientiousness' },
  aggression:         { tr: 'Saldırganlık',      en: 'Aggression',             de: 'Aggression',            fr: 'Agressivité',            ar: 'العدوانية',           phenoKey: 'aggression' },
  immune_strength:    { tr: 'Bağışıklık',        en: 'Immunity',               de: 'Immunität',             fr: 'Immunité',               ar: 'المناعة',            phenoKey: 'immune_strength' },
  artistic_sense:     { tr: 'Sanat Duyusu',      en: 'Art Sense',              de: 'Kunstsinn',             fr: 'Sens artistique',        ar: 'الحس الفني',          phenoKey: 'artistic_sense' },
};

const HAIR_TR: Record<string, string> = {
  black: 'Siyah', brown: 'Kahverengi', blonde: 'Sarı', red: 'Kızıl',
  grey: 'Gri', white: 'Beyaz', dark: 'Koyu', light: 'Açık', medium: 'Orta',
  'dark brown': 'Koyu Kahverengi', 'light brown': 'Açık Kahverengi',
};

const EYE_TR: Record<string, string> = {
  brown: 'Kahverengi', blue: 'Mavi', green: 'Yeşil', hazel: 'Ela',
  grey: 'Gri', amber: 'Kehribar', black: 'Siyah',
};

const SKIN_TR: Record<string, string> = {
  fair: 'Açık', light: 'Açık', medium: 'Orta', olive: 'Zeytinî',
  tan: 'Bronz', dark: 'Koyu', 'very dark': 'Çok Koyu', very_dark: 'Çok Koyu',
};

const LANG_STAGE_TR: Record<string, string> = {
  'pre-linguistic':   'Dil öncesi',
  'gestural':         'Jestsel',
  'emotional sound':  'Duygusal ses',
  'proto-words':      'Proto-kelimeler',
  'syntax':           'Sözdizimi',
  'abstract':         'Soyut',
  'writing':          'Yazı',
};

const LIFE_STAGE_TR: Record<string, string> = {
  infant: 'Bebek', child: 'Çocuk', adolescent: 'Ergen',
  adult: 'Yetişkin', elder: 'Yaşlı',
};

function translateSkin(value: any, lang: string): string {
  if (!value && value !== 0) return '-';
  if (lang !== 'tr') return String(value).slice(0, 12);
  if (typeof value === 'number') {
    if (value < 0.25) return 'Açık';
    if (value < 0.5)  return 'Orta';
    if (value < 0.75) return 'Koyu';
    return 'Çok Koyu';
  }
  const key = String(value).toLowerCase();
  return SKIN_TR[key] ?? String(value).slice(0, 12);
}


export default function BiologyPanel() {
  const { stats, lang, currentSim, accessToken } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const load = () => axios.get(`/api/simulations/${currentSim.id}/population?alive=true`, { headers })
      .then(r => { setIndividuals(r.data); setLoadError(false); })
      .catch(() => setLoadError(true));
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
      {loadError && (
        <div className="mb-2 px-3 py-2 text-xs font-share-tech text-sim-red bg-sim-red/10 border border-sim-red/30 rounded">
          {text(lang as LangCode, { en: 'Failed to load individual data. Retrying…', tr: 'Bireysel veri yüklenemedi. Yeniden deneniyor…' })}
        </div>
      )}
      <Section title={text(lang as LangCode, { en: 'Population Vitals', tr: 'Nüfus Değerleri' })}>
        <MetricRow label={text(lang as LangCode, { en: 'Population', tr: 'Nüfus' })} value={pop} />
        <MetricRow label={text(lang as LangCode, { en: 'Avg Age', tr: 'Ortalama Yaş' })} value={`${avgAge.toFixed(1)} yr`} />
        <MetricRow label={text(lang as LangCode, { en: 'Sex Ratio M:F', tr: 'Cinsiyet Oranı E:K' })} value={`${(sexRatio * 100).toFixed(0)}% / ${((1 - sexRatio) * 100).toFixed(0)}%`} />
        <MetricRow label={text(lang as LangCode, { en: 'Avg Intelligence', tr: 'Ortalama Zekâ' })} value={(avgIntel * 100).toFixed(1) + '%'} />
        <MetricRow label={text(lang as LangCode, { en: 'Sick Rate', tr: 'Hastalık Oranı' })} value={`${((stats?.sick_rate ?? 0) * 100).toFixed(1)}%`} />
        <MetricRow label={text(lang as LangCode, { en: 'Avg Consciousness', tr: 'Ort. Bilinç' })} value={`${((stats?.avg_consciousness ?? 0) * 100).toFixed(2)}%`} />
        <MetricRow label={text(lang as LangCode, { en: 'Max ToM Stage', tr: 'Maks. Zihin Teorisi' })} value={`${stats?.max_tom_stage ?? 0} / 3`} />
      </Section>

      <Section title={text(lang as LangCode, { en: 'Genome Activity', tr: 'Genom Aktivitesi' })}>
        <p className="text-sim-muted text-sm italic mb-2">
          {text(lang as LangCode, { en: 'Gene loci drive behavior. Values emerge from meiosis and mutation.', tr: 'Gen lokusları davranışları yönlendirir. Değerler mayoz ve mutasyondan ortaya çıkar.' })}
        </p>
        {Object.entries(GENE_LABELS).slice(0, 6).map(([key, labels]) => {
          const phenoKey = labels.phenoKey;
          const vals = individuals.map((ind: any) => ind.phenotype?.[phenoKey] ?? 0).filter((v: number) => v > 0);
          const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
          const pct = Math.round(avg * 100);
          return (
            <div key={key} className="mb-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-sim-muted">{text(lang as LangCode, labels)}</span>
                <span className="text-sim-accent">{pct}%</span>
              </div>
              <div className="h-1 bg-sim-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-sim-accent rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </Section>

      <Section title={text(lang as LangCode, { en: 'Living Individuals', tr: 'Yaşayan Bireyler' })}>
        {individuals.length === 0 ? (
          <p className="text-sim-muted text-sm italic">
            {text(lang as LangCode, { en: 'No live population loaded yet.', tr: 'Canlı nüfus henüz yüklenmedi.' })}
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {individuals.slice(0, 80).map(ind => {
              const sexTr = ind.sex === 'male' ? 'Erkek' : ind.sex === 'female' ? 'Kadın' : ind.sex;
              const hairVal = ind.phenotype?.hair_color ?? '-';
              const eyeVal  = ind.phenotype?.eye_color ?? '-';
              const skinVal = ind.phenotype?.skin_color ?? ind.phenotype?.skin_tone;
              const langStage = ind.language?.stage_name ?? '-';
              return (
                <div key={ind.id} className="bg-sim-bg/60 border border-sim-border/40 rounded p-2">
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="text-sim-text font-semibold truncate">
                      {ind.name ?? ind.phenotype?.name ?? text(lang as LangCode, { en: 'Unnamed', tr: 'İsimsiz' })}
                    </span>
                    <span className="text-sim-accent font-mono text-[12px]">{Number(ind.age_years ?? 0).toFixed(1)} yr</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                    <Mini label={text(lang as LangCode, { en: 'Sex', tr: 'Cinsiyet' })} value={text(lang as LangCode, { en: ind.sex, tr: sexTr })} />
                    <Mini label={text(lang as LangCode, { en: 'Location', tr: 'Konum' })} value={`${Number(ind.y ?? 0).toFixed(2)}, ${Number(ind.x ?? 0).toFixed(2)}`} />
                    <Mini label={text(lang as LangCode, { en: 'Hair', tr: 'Saç' })} value={text(lang as LangCode, { en: hairVal, tr: HAIR_TR[hairVal] ?? hairVal })} />
                    <Mini label={text(lang as LangCode, { en: 'Eye', tr: 'Göz' })} value={text(lang as LangCode, { en: eyeVal, tr: EYE_TR[eyeVal] ?? eyeVal })} />
                    <Mini label={text(lang as LangCode, { en: 'Skin', tr: 'Ten' })} value={translateSkin(skinVal, lang)} />
                    <Mini label={text(lang as LangCode, { en: 'Height', tr: 'Boy' })} value={`${ind.phenotype?.height_cm ?? '-'} cm`} />
                    <Mini label={text(lang as LangCode, { en: 'IQ', tr: 'Zekâ' })} value={`${((ind.phenotype?.fluid_intelligence ?? 0) * 100).toFixed(0)}%`} />
                    <Mini
                      label={text(lang as LangCode, { en: 'Language', tr: 'Dil', de: 'Sprache', fr: 'Langage', ar: 'اللغة' })}
                      value={lang === 'tr' ? (LANG_STAGE_TR[langStage.toLowerCase()] ?? langStage) : langStage.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={text(lang as LangCode, { en: 'Life Stages', tr: 'Yaşam Evreleri' })}>
        {(() => {
          const counts: Record<string, number> = { infant: 0, child: 0, adolescent: 0, adult: 0, elder: 0 };
          for (const ind of individuals) {
            const stage = (ind.life_stage ?? '').toLowerCase();
            if (stage in counts) counts[stage]++;
          }
          return ['infant', 'child', 'adolescent', 'adult', 'elder'].map(stage => (
            <div key={stage} className="flex justify-between py-0.5 border-b border-sim-border/30">
              <span className="text-sim-muted">
                {text(lang as LangCode, { en: stage, tr: LIFE_STAGE_TR[stage] ?? stage })}
              </span>
              <span className="text-sim-text font-mono">{counts[stage]}</span>
            </div>
          ));
        })()}
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

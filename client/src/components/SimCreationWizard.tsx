import { useState, useEffect } from 'react';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const toCm   = (v: number) => Math.round(150 + Math.max(0, Math.min(1, v)) * 45);
const fromCm = (cm: number) => Math.max(0, Math.min(1, (cm - 150) / 45));
const toKg   = (hv: number, mv: number) => { const h = toCm(hv)/100; return Math.round(h*h*(19+Math.max(0,Math.min(1,mv))*8)); };
const fromKg = (kg: number, hv: number) => { const h = toCm(hv)/100; return Math.max(0, Math.min(1, (kg/(h*h)-19)/8)); };

/* ── option lists ───────────────────────────────────────────────────────── */
const EYE_OPTS  = [
  {v:'brown', tr:'Kahverengi', en:'Brown', c:'#6b3a1f'},
  {v:'hazel',  tr:'Ela',        en:'Hazel', c:'#8b6914'},
  {v:'green',  tr:'Yeşil',      en:'Green', c:'#2d6a2d'},
  {v:'blue',   tr:'Mavi',       en:'Blue',  c:'#1a5276'},
];
const HAIR_OPTS = [
  {v:'black', tr:'Siyah', en:'Black', c:'#111'},
  {v:'dark',  tr:'Koyu',  en:'Dark',  c:'#2c1810'},
  {v:'brown', tr:'Kahve', en:'Brown', c:'#5c3317'},
  {v:'light', tr:'Açık',  en:'Light', c:'#c68642'},
  {v:'blond', tr:'Sarı',  en:'Blond', c:'#d4a017'},
  {v:'red',   tr:'Kızıl', en:'Red',   c:'#8b2500'},
];
const SKIN_OPTS = [
  {v:'fair',  tr:'Açık',   en:'Fair',  c:'#fde8d0'},
  {v:'light', tr:'Bej',    en:'Light', c:'#f5c9a0'},
  {v:'olive', tr:'Buğday', en:'Olive', c:'#c68642'},
  {v:'tan',   tr:'Bronz',  en:'Tan',   c:'#a0614a'},
  {v:'brown', tr:'Esmer',  en:'Brown', c:'#7b4a2d'},
  {v:'dark',  tr:'Koyu',   en:'Dark',  c:'#3d1f0d'},
];

/* ── all genetics traits (20) ────────────────────────────────────────────── */
const ALL_TRAITS = [
  {id:'fluid_intelligence', tr:'Zeka',           en:'Intelligence',   c:'#7c3aed', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'curiosity',          tr:'Merak',           en:'Curiosity',      c:'#f59e0b', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'language_capacity',  tr:'Dil Yeteneği',    en:'Language',       c:'#14b8a6', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'learning_rate',      tr:'Öğrenme Hızı',    en:'Learning Rate',  c:'#818cf8', gTr:'ZİHİN — BİLİŞSEL', gEn:'MIND — COGNITIVE'},
  {id:'conscientiousness',  tr:'Disiplin',        en:'Discipline',     c:'#3b82f6', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'self_awareness',     tr:'Öz Farkındalık',  en:'Self Awareness', c:'#8b5cf6', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'stress_resilience',  tr:'Stres Direnci',   en:'Stress Resil.',  c:'#10b981', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'risk_tolerance',     tr:'Risk Toleransı',  en:'Risk Tolerance', c:'#fb7185', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'innovation',         tr:'İnovasyon',       en:'Innovation',     c:'#e879f9', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'artistic_sense',     tr:'Sanat Duygusu',   en:'Art Sense',      c:'#f97316', gTr:'ZİHİN — KİŞİLİK',  gEn:'MIND — CHARACTER'},
  {id:'empathy',            tr:'Empati',          en:'Empathy',        c:'#ec4899', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'social_bonding',     tr:'Sosyal Bağ',       en:'Social Bonding', c:'#f472b6', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'aggression',         tr:'Saldırganlık',    en:'Aggression',     c:'#ef4444', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'cooperation',        tr:'İşbirliği',       en:'Cooperation',    c:'#34d399', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'dominance',          tr:'Liderlik Eğilimi',en:'Leadership',     c:'#fb923c', gTr:'SOSYAL',            gEn:'SOCIAL'},
  {id:'physical_strength',  tr:'Fiziksel Güç',    en:'Phys. Strength', c:'#fb923c', gTr:'BEDEN',             gEn:'BODY'},
  {id:'endurance',          tr:'Dayanıklılık',    en:'Endurance',      c:'#fbbf24', gTr:'BEDEN',             gEn:'BODY'},
  {id:'immune_strength',    tr:'Bağışıklık',      en:'Immunity',       c:'#22c55e', gTr:'BEDEN',             gEn:'BODY'},
  {id:'fertility',          tr:'Üreme Dürtüsü',   en:'Fertility',      c:'#f43f5e', gTr:'BEDEN',             gEn:'BODY'},
  {id:'longevity',          tr:'Uzun Ömür',       en:'Longevity',      c:'#84cc16', gTr:'BEDEN',             gEn:'BODY'},
];

const TRAIT_DEFAULTS = Object.fromEntries(ALL_TRAITS.map(t => [t.id, 0.5]));

export const founderDefaults = (sex: 'male'|'female') => ({
  name: sex==='male' ? 'Alp Anatol' : 'Ayla Anatol',
  ageYears: sex==='male' ? 22 : 20,
  sex,
  eye_color:'brown', hair_color: sex==='male' ? 'dark' : 'brown', skin_tone:'olive',
  height: sex==='male' ? 0.56 : 0.44, metabolism: 0.45,
  ...TRAIT_DEFAULTS,
  fluid_intelligence:0.68, curiosity:0.60, conscientiousness:0.72,
  language_capacity:0.55,  artistic_sense:0.50, self_awareness:0.55,
  stress_resilience:0.65,  empathy:0.60,  social_bonding:0.75,
  aggression:0.35, cooperation:0.72, dominance:0.50,
  physical_strength:0.72,  endurance:0.70, immune_strength:0.74,
  fertility:0.80, longevity:0.68, learning_rate:0.65,
  risk_tolerance:0.45, innovation:0.55,
});

/* ── step definitions ────────────────────────────────────────────────────── */
type StepDef =
  | { type: 'sim-info' }
  | { type: 'identity';   f: 1|2 }
  | { type: 'physical';   f: 1|2 }
  | { type: 'appearance'; f: 1|2 }
  | { type: 'trait';      f: 1|2; idx: number }
  | { type: 'summary' };

const STEPS: StepDef[] = [
  { type: 'sim-info' },
  { type: 'identity',   f: 1 },
  { type: 'physical',   f: 1 },
  { type: 'appearance', f: 1 },
  ...ALL_TRAITS.map((_, i) => ({ type: 'trait' as const, f: 1 as const, idx: i })),
  { type: 'identity',   f: 2 },
  { type: 'physical',   f: 2 },
  { type: 'appearance', f: 2 },
  ...ALL_TRAITS.map((_, i) => ({ type: 'trait' as const, f: 2 as const, idx: i })),
  { type: 'summary' },
];
const TOTAL = STEPS.length;

/* ── shared styles ───────────────────────────────────────────────────────── */
const CLIP = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';
const inputBase: React.CSSProperties = {
  outline:'none', fontFamily:'Share Tech Mono,monospace',
  background:'rgba(7,7,26,0.9)', border:'1px solid rgba(79,110,247,0.25)',
  padding:'9px 12px', fontSize:14, color:'#e0e0f0', clipPath:CLIP, width:'100%',
};
const btnBase: React.CSSProperties = {
  fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', fontSize:16,
  clipPath:CLIP, cursor:'pointer', padding:'9px 20px',
};
const btnNext  = { ...btnBase, background:'rgba(79,110,247,0.25)', border:'1px solid rgba(79,110,247,0.5)',  color:'#e0e0f0' };
const btnBack  = { ...btnBase, background:'rgba(22,22,58,0.5)',    border:'1px solid rgba(79,110,247,0.2)',  color:'#e0e0f0' };
const btnExit  = { ...btnBase, background:'rgba(150,30,30,0.15)',  border:'1px solid rgba(200,34,34,0.3)',   color:'#e0e0f0', padding:'9px 14px' };
const btnStart = { ...btnBase, fontSize:13, background:'rgba(78,203,113,0.2)', border:'1px solid rgba(78,203,113,0.5)', color:'#4ecb71', padding:'9px 28px' };

/* ── sub-components ──────────────────────────────────────────────────────── */
function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
      letterSpacing:'0.12em', marginBottom:6 }}>
      {children}
    </div>
  );
}

function HudInput({ label, type='text', value, onChange, min, max, step }: any) {
  return (
    <div style={{ marginBottom:16 }}>
      <Lbl>{label}</Lbl>
      <input type={type} value={value} onChange={onChange} min={min} max={max} step={step}
        style={inputBase}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.7)')}
        onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.25)')}
      />
    </div>
  );
}

function NumInput({ value, unit, min, max, color, onChange }: {
  value: number; unit: string; min: number; max: number; color: string;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);
  function commit(s: string) {
    const v = parseInt(s, 10);
    if (!isNaN(v)) { const c = Math.max(min, Math.min(max, v)); onChange(c); setRaw(String(c)); }
    else setRaw(String(value));
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <input type="number" min={min} max={max} value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => { commit(raw); e.currentTarget.style.borderColor = 'rgba(79,110,247,0.25)'; }}
        onKeyDown={e => e.key==='Enter' && commit((e.target as HTMLInputElement).value)}
        style={{ ...inputBase, width:100, fontSize:20, color, textAlign:'center', padding:'8px' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,110,247,0.7)')}
      />
      <span style={{ fontSize:16, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>{unit}</span>
    </div>
  );
}

function SliderBar({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div style={{ position:'relative', height:8, background:'rgba(10,10,30,0.9)',
      border:`1px solid ${color}40`, marginTop:8 }}>
      <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${value*100}%`,
        background:`linear-gradient(90deg,${color}50,${color})`, transition:'width 0.1s' }} />
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }} />
    </div>
  );
}

function ColorPicker({ label, opts, value, onChange, lang }: any) {
  return (
    <div style={{ marginBottom:20 }}>
      <Lbl>{label}</Lbl>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {opts.map((o: any) => (
          <div key={o.v} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}
            onClick={() => onChange(o.v)}>
            <div style={{
              width:38, height:38, background:o.c, clipPath:CLIP,
              border: value===o.v ? '2px solid #4f9ef7' : '2px solid rgba(79,158,247,0.15)',
              boxShadow: value===o.v ? '0 0 10px #4f9ef780' : 'none', transition:'all 0.15s',
            }} />
            <span style={{ fontSize:10, color: value===o.v ? '#4f9ef7' : '#6070a0',
              fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
              {lang==='tr' ? o.tr : o.en}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0',
      borderBottom:'1px solid rgba(79,110,247,0.1)' }}>
      <span style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace' }}>{label}</span>
      <span style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace' }}>{value}</span>
    </div>
  );
}

/* ── main wizard ─────────────────────────────────────────────────────────── */
interface Props {
  lang: 'tr'|'en';
  loading: boolean;
  onSubmit: (form: any, f1: any, f2: any) => void;
  onExit: () => void;
}

export default function SimCreationWizard({ lang, loading, onSubmit, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [simForm, setSimForm] = useState({ name:'', latitude:'', longitude:'' });
  const [f1, setF1] = useState<any>(founderDefaults('male'));
  const [f2, setF2] = useState<any>(founderDefaults('female'));

  const meta  = STEPS[step];
  const isF2  = meta.type !== 'sim-info' && meta.type !== 'summary' && (meta as any).f === 2;
  const fd    = isF2 ? f2 : f1;
  const setFd = isF2 ? setF2 : setF1;
  const setT  = (id: string, val: number) => setFd((p: any) => ({ ...p, [id]: val }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const t    = (tr: string, en: string) => lang === 'tr' ? tr : en;

  const founderLabel = (meta.type !== 'sim-info' && meta.type !== 'summary')
    ? ((meta as any).f === 1 ? t('KURUCU 1 — ERKEK', 'FOUNDER 1 — MALE')
                              : t('KURUCU 2 — KADIN', 'FOUNDER 2 — FEMALE'))
    : null;

  const isSummary = meta.type === 'summary';
  const canNext   = meta.type === 'sim-info' ? simForm.name.trim() !== '' : true;

  /* step title */
  function stepTitle(): string {
    switch (meta.type) {
      case 'sim-info':   return t('SİMÜLASYON BİLGİLERİ', 'SIMULATION INFO');
      case 'identity':   return t('KİMLİK BİLGİLERİ', 'IDENTITY');
      case 'physical':   return t('FİZİKSEL ÖLÇÜLER', 'PHYSICAL');
      case 'appearance': return t('DIŞ GÖRÜNÜŞ', 'APPEARANCE');
      case 'trait': {
        const tr = ALL_TRAITS[meta.idx];
        return lang === 'tr' ? tr.tr.toUpperCase() : tr.en.toUpperCase();
      }
      case 'summary': return t('ÖZET', 'SUMMARY');
    }
  }

  function stepSubtitle(): string | null {
    if (meta.type === 'trait') {
      const tr = ALL_TRAITS[meta.idx];
      return lang === 'tr' ? tr.gTr : tr.gEn;
    }
    return null;
  }

  /* ── step content ────────────────────────────────────────────────────── */
  function renderContent() {

    /* Sim info */
    if (meta.type === 'sim-info') return (
      <>
        <HudInput label={t('SİMÜLASYON ADI', 'SIMULATION NAME')} value={simForm.name}
          onChange={(e: any) => setSimForm(p => ({ ...p, name: e.target.value }))} />
        <HudInput label={t('ENLEM (°N)', 'LATITUDE (°N)')} type="number" step="0.0001" value={simForm.latitude}
          onChange={(e: any) => setSimForm(p => ({ ...p, latitude: e.target.value }))} />
        <HudInput label={t('BOYLAM (°E)', 'LONGITUDE (°E)')} type="number" step="0.0001" value={simForm.longitude}
          onChange={(e: any) => setSimForm(p => ({ ...p, longitude: e.target.value }))} />
      </>
    );

    /* Identity */
    if (meta.type === 'identity') return (
      <>
        <HudInput label={t('İSİM', 'NAME')} value={fd.name}
          onChange={(e: any) => setFd((p: any) => ({ ...p, name: e.target.value }))} />
        <HudInput label={t('YAŞ', 'AGE')} type="number" min={16} max={60} value={fd.ageYears}
          onChange={(e: any) => setFd((p: any) => ({ ...p, ageYears: +e.target.value }))} />
        <div style={{ marginBottom:16 }}>
          <Lbl>{t('CİNSİYET', 'SEX')}</Lbl>
          <div style={{ display:'flex', gap:8 }}>
            {[{ v:'male', tr:'ERKEK', en:'MALE' }, { v:'female', tr:'KADIN', en:'FEMALE' }].map(opt => (
              <button key={opt.v} onClick={() => setFd((p: any) => ({ ...p, sex: opt.v }))}
                style={{ fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', padding:'8px 22px', fontSize:13,
                  background: fd.sex===opt.v ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.5)',
                  border: `1px solid ${fd.sex===opt.v ? 'rgba(79,110,247,0.6)' : 'rgba(79,110,247,0.15)'}`,
                  color:'#e0e0f0', clipPath:CLIP, cursor:'pointer' }}>
                {t(opt.tr, opt.en)}
              </button>
            ))}
          </div>
        </div>
      </>
    );

    /* Physical */
    if (meta.type === 'physical') return (
      <>
        <div style={{ marginBottom:24 }}>
          <Lbl>{t('BOY', 'HEIGHT')}</Lbl>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <NumInput value={toCm(fd.height)} unit="cm" min={145} max={200} color="#06b6d4"
              onChange={cm => setT('height', fromCm(cm))} />
          </div>
          <SliderBar value={fd.height} color="#06b6d4" onChange={v => setT('height', v)} />
        </div>
        <div style={{ marginBottom:12 }}>
          <Lbl>{t('KİLO', 'WEIGHT')}</Lbl>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <NumInput value={toKg(fd.height, fd.metabolism)} unit="kg" min={40} max={130} color="#a855f7"
              onChange={kg => setT('metabolism', fromKg(kg, fd.height))} />
          </div>
          <SliderBar value={fd.metabolism} color="#a855f7" onChange={v => setT('metabolism', v)} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5,
            fontSize:12, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>
            <span>{t('İnce', 'Lean')}</span><span>{t('Orta', 'Average')}</span><span>{t('Kaslı', 'Heavy')}</span>
          </div>
        </div>
      </>
    );

    /* Appearance */
    if (meta.type === 'appearance') return (
      <>
        <ColorPicker label={t('GÖZ RENGİ', 'EYE COLOR')}  opts={EYE_OPTS}  value={fd.eye_color}
          onChange={(v: string) => setFd((p: any) => ({ ...p, eye_color: v }))}  lang={lang} />
        <ColorPicker label={t('SAÇ RENGİ', 'HAIR COLOR')} opts={HAIR_OPTS} value={fd.hair_color}
          onChange={(v: string) => setFd((p: any) => ({ ...p, hair_color: v }))} lang={lang} />
        <ColorPicker label={t('TEN RENGİ', 'SKIN TONE')}  opts={SKIN_OPTS} value={fd.skin_tone}
          onChange={(v: string) => setFd((p: any) => ({ ...p, skin_tone: v }))}  lang={lang} />
      </>
    );

    /* Trait — single slider with big display */
    if (meta.type === 'trait') {
      const trait = ALL_TRAITS[meta.idx];
      const val   = fd[trait.id] ?? 0.5;
      const pct   = `${(val * 100).toFixed(0)}%`;
      return (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:52, color: trait.c, fontFamily:'Orbitron,monospace',
            fontWeight:900, marginBottom:8, textShadow:`0 0 20px ${trait.c}60` }}>
            {pct}
          </div>
          <div style={{ fontSize:13, color:'#8898c8', fontFamily:'Share Tech Mono,monospace',
            letterSpacing:'0.12em', marginBottom:28 }}>
            {lang==='tr' ? trait.gTr : trait.gEn}
          </div>
          <SliderBar value={val} color={trait.c} onChange={v => setT(trait.id, v)} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6,
            fontSize:11, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      );
    }

    /* Summary */
    if (meta.type === 'summary') return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ fontSize:16, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
            letterSpacing:'0.15em', marginBottom:8 }}>
            {t('SİMÜLASYON', 'SIMULATION')}
          </div>
          <SumRow label={t('AD', 'NAME')}    value={simForm.name || '—'} />
          <SumRow label={t('ENLEM', 'LAT')}  value={simForm.latitude || '—'} />
          <SumRow label={t('BOYLAM', 'LNG')} value={simForm.longitude || '—'} />
        </div>
        {([{ fd: f1, sex: 'male' }, { fd: f2, sex: 'female' }] as { fd: any; sex: string }[]).map(({ fd: founder, sex }) => (
          <div key={sex}>
            <div style={{ fontSize:16, color: sex==='male' ? '#4f9ef7' : '#ec4899',
              fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', marginBottom:8 }}>
              {sex==='male' ? t('KURUCU 1 — ERKEK', 'FOUNDER 1 — MALE') : t('KURUCU 2 — KADIN', 'FOUNDER 2 — FEMALE')}
            </div>
            <SumRow label={t('İSİM', 'NAME')}   value={founder.name} />
            <SumRow label={t('YAŞ', 'AGE')}     value={String(founder.ageYears)} />
            <SumRow label={t('BOY', 'HEIGHT')}  value={`${toCm(founder.height)} cm`} />
            <SumRow label={t('KİLO', 'WEIGHT')} value={`${toKg(founder.height, founder.metabolism)} kg`} />
            <SumRow label={t('ZEKA', 'IQ')}     value={`${(founder.fluid_intelligence * 100).toFixed(0)}%`} />
            <SumRow label={t('SOSYAL BAĞ', 'SOC.BOND')} value={`${(founder.social_bonding * 100).toFixed(0)}%`} />
            <SumRow label={t('BAĞIŞIKLIK', 'IMMUNITY')} value={`${(founder.immune_strength * 100).toFixed(0)}%`} />
          </div>
        ))}
      </div>
    );

    return null;
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  const subtitle = stepSubtitle();
  return (
    <div style={{ maxWidth:580, margin:'0 auto', background:'rgba(4,4,15,0.97)',
      border:'1px solid rgba(79,110,247,0.4)', animation:'boot-in 0.3s ease-out both' }}>

      {/* Progress */}
      <div style={{ height:2, background:'rgba(79,110,247,0.1)' }}>
        <div style={{ height:'100%', width:`${((step+1)/TOTAL)*100}%`,
          background:'linear-gradient(90deg,#4f6ef7,#4f9ef7)', transition:'width 0.25s ease-out' }} />
      </div>

      {/* Header */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(79,110,247,0.2)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          {founderLabel && (
            <div style={{ fontSize:12, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.2em', marginBottom:3 }}>
              {founderLabel}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize:11, color:'#8898c8', fontFamily:'Share Tech Mono,monospace',
              letterSpacing:'0.15em', marginBottom:2 }}>
              {subtitle}
            </div>
          )}
          <div style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
            letterSpacing:'0.15em', fontWeight:700 }}>
            {stepTitle()}
          </div>
        </div>
        <div style={{ fontSize:12, color:'#e0e0f0', fontFamily:'Orbitron,monospace', letterSpacing:'0.1em' }}>
          {step+1} / {TOTAL}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'22px 24px', minHeight:260 }}>
        {renderContent()}
      </div>

      {/* Navigation */}
      <div style={{ padding:'12px 24px 20px', borderTop:'1px solid rgba(79,110,247,0.15)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={onExit} style={btnExit}>
          {t('ÇIK', 'EXIT')}
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {step > 0 && (
            <button onClick={back} style={btnBack}>← {t('GERİ', 'BACK')}</button>
          )}
          {isSummary ? (
            <button onClick={() => onSubmit(simForm, f1, f2)} disabled={loading}
              style={{ ...btnStart, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('BAŞLATILIYOR…', 'INITIALIZING…') : t('BAŞLAT', 'LAUNCH')}
            </button>
          ) : (
            <button onClick={next} disabled={!canNext}
              style={{ ...btnNext, opacity: !canNext ? 0.4 : 1, cursor: !canNext ? 'not-allowed' : 'pointer' }}>
              {t('DEVAM ET', 'CONTINUE')} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

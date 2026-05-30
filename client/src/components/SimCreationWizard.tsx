import { useState } from 'react';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const toCm   = (v: number) => Math.round(150 + Math.max(0, Math.min(1, v)) * 45);
const toKg   = (hv: number, mv: number) => { const h = toCm(hv)/100; return Math.round(h*h*(19+Math.max(0,Math.min(1,mv))*8)); };
const fromKg = (kg: number, hv: number) => { const h = toCm(hv)/100; return Math.max(0, Math.min(1, (kg/(h*h)-19)/8)); };

/* ── option lists ───────────────────────────────────────────────────────── */
const EYE_OPTS  = [
  {v:'brown',tr:'Kahverengi',en:'Brown',c:'#6b3a1f'},{v:'hazel',tr:'Ela',en:'Hazel',c:'#8b6914'},
  {v:'green',tr:'Yeşil',en:'Green',c:'#2d6a2d'},{v:'blue',tr:'Mavi',en:'Blue',c:'#1a5276'},
];
const HAIR_OPTS = [
  {v:'black',tr:'Siyah',en:'Black',c:'#111'},{v:'dark',tr:'Koyu',en:'Dark',c:'#2c1810'},
  {v:'brown',tr:'Kahve',en:'Brown',c:'#5c3317'},{v:'light',tr:'Açık',en:'Light',c:'#c68642'},
  {v:'blond',tr:'Sarı',en:'Blond',c:'#d4a017'},{v:'red',tr:'Kızıl',en:'Red',c:'#8b2500'},
];
const SKIN_OPTS = [
  {v:'fair',tr:'Açık',en:'Fair',c:'#fde8d0'},{v:'light',tr:'Bej',en:'Light',c:'#f5c9a0'},
  {v:'olive',tr:'Buğday',en:'Olive',c:'#c68642'},{v:'tan',tr:'Bronz',en:'Tan',c:'#a0614a'},
  {v:'brown',tr:'Esmer',en:'Brown',c:'#7b4a2d'},{v:'dark',tr:'Koyu',en:'Dark',c:'#3d1f0d'},
];

/* ── trait groups ────────────────────────────────────────────────────────── */
const MIND_A = [
  {id:'fluid_intelligence',tr:'Zeka',          en:'Intelligence', c:'#7c3aed'},
  {id:'curiosity',         tr:'Merak',          en:'Curiosity',    c:'#f59e0b'},
  {id:'language_capacity', tr:'Dil Yeteneği',   en:'Language',     c:'#14b8a6'},
  {id:'learning_rate',     tr:'Öğrenme Hızı',   en:'Learning',     c:'#818cf8'},
];
const MIND_B = [
  {id:'conscientiousness', tr:'Disiplin',       en:'Discipline',   c:'#3b82f6'},
  {id:'self_awareness',    tr:'Öz Farkındalık', en:'Self Aware',   c:'#8b5cf6'},
  {id:'stress_resilience', tr:'Stres Direnci',  en:'Stress Res.',  c:'#10b981'},
  {id:'risk_tolerance',    tr:'Risk Toleransı', en:'Risk Toler.',  c:'#fb7185'},
  {id:'innovation',        tr:'İnovasyon',      en:'Innovation',   c:'#e879f9'},
  {id:'artistic_sense',    tr:'Sanat Duygusu',  en:'Art Sense',    c:'#f97316'},
];
const SOCIAL = [
  {id:'empathy',       tr:'Empati',           en:'Empathy',        c:'#ec4899'},
  {id:'social_bonding',tr:'Sosyal Bağ',        en:'Social Bonding', c:'#f472b6'},
  {id:'aggression',    tr:'Saldırganlık',      en:'Aggression',     c:'#ef4444'},
  {id:'cooperation',   tr:'İşbirliği',         en:'Cooperation',    c:'#34d399'},
  {id:'dominance',     tr:'Liderlik Eğilimi',  en:'Leadership',     c:'#fb923c'},
];
const BODY_A = [
  {id:'physical_strength',tr:'Fiziksel Güç',  en:'Strength',  c:'#fb923c'},
  {id:'endurance',        tr:'Dayanıklılık',  en:'Endurance', c:'#fbbf24'},
];
const BODY_B = [
  {id:'immune_strength',tr:'Bağışıklık',    en:'Immunity',  c:'#22c55e'},
  {id:'fertility',      tr:'Üreme Dürtüsü', en:'Fertility', c:'#f43f5e'},
  {id:'longevity',      tr:'Uzun Ömür',     en:'Longevity', c:'#84cc16'},
];

const ALL_TRAIT_IDS = [
  ...MIND_A,...MIND_B,...SOCIAL,...BODY_A,...BODY_B,
  {id:'height',tr:'Boy',en:'Height',c:'#06b6d4'},
  {id:'metabolism',tr:'Metabolizma',en:'Metabolism',c:'#a855f7'},
];
const TRAIT_DEFAULTS = Object.fromEntries(ALL_TRAIT_IDS.map(t=>[t.id,0.5]));

export const founderDefaults = (sex: 'male'|'female') => ({
  name: sex==='male'?'Alp Anatol':'Ayla Anatol',
  ageYears: sex==='male'?22:20,
  sex,
  eye_color:'brown', hair_color:sex==='male'?'dark':'brown', skin_tone:'olive',
  ...TRAIT_DEFAULTS,
  fluid_intelligence:0.68, curiosity:0.60, conscientiousness:0.72,
  language_capacity:0.55,  artistic_sense:0.50, self_awareness:0.55,
  stress_resilience:0.65,  empathy:0.60,  social_bonding:0.75,
  aggression:0.35, cooperation:0.72, dominance:0.50,
  physical_strength:0.72,  endurance:0.70, immune_strength:0.74,
  fertility:0.80, longevity:0.68,  learning_rate:0.65,
  risk_tolerance:0.45, innovation:0.55,
  height: sex==='male'?0.56:0.44, metabolism:0.45,
});

/* ── step metadata (18 steps: 0-17) ─────────────────────────────────────── */
// 0          : Sim info
// 1-8  (f=1-8): Founder 1
// 9-16 (f=1-8): Founder 2
// 17         : Summary
const STEPS = [
  {tr:'SİMÜLASYON BİLGİLERİ', en:'SIMULATION INFO',   ph:null},
  {tr:'KİMLİK BİLGİLERİ',     en:'IDENTITY',          ph:'f1'},
  {tr:'FİZİKSEL ÖLÇÜLER',     en:'PHYSICAL',          ph:'f1'},
  {tr:'DIŞ GÖRÜNÜŞ',          en:'APPEARANCE',        ph:'f1'},
  {tr:'ZİHİN — BİLİŞSEL',    en:'MIND — COGNITIVE',  ph:'f1'},
  {tr:'ZİHİN — KİŞİLİK',     en:'MIND — CHARACTER',  ph:'f1'},
  {tr:'SOSYAL',               en:'SOCIAL',            ph:'f1'},
  {tr:'BEDEN — GÜÇ',         en:'BODY — STRENGTH',   ph:'f1'},
  {tr:'BEDEN — YAŞAM',        en:'BODY — VITALITY',   ph:'f1'},
  {tr:'KİMLİK BİLGİLERİ',     en:'IDENTITY',          ph:'f2'},
  {tr:'FİZİKSEL ÖLÇÜLER',     en:'PHYSICAL',          ph:'f2'},
  {tr:'DIŞ GÖRÜNÜŞ',          en:'APPEARANCE',        ph:'f2'},
  {tr:'ZİHİN — BİLİŞSEL',    en:'MIND — COGNITIVE',  ph:'f2'},
  {tr:'ZİHİN — KİŞİLİK',     en:'MIND — CHARACTER',  ph:'f2'},
  {tr:'SOSYAL',               en:'SOCIAL',            ph:'f2'},
  {tr:'BEDEN — GÜÇ',         en:'BODY — STRENGTH',   ph:'f2'},
  {tr:'BEDEN — YAŞAM',        en:'BODY — VITALITY',   ph:'f2'},
  {tr:'ÖZET',                 en:'SUMMARY',           ph:null},
];
const TOTAL = STEPS.length;

/* ── shared styles ───────────────────────────────────────────────────────── */
const CLIP = 'polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))';
const baseBtn = { fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', fontSize:16,
  clipPath:CLIP, cursor:'pointer', border:'none', padding:'9px 20px' } as const;
const btnNext  = { ...baseBtn, background:'rgba(79,110,247,0.25)', border:'1px solid rgba(79,110,247,0.5)',  color:'#e0e0f0' };
const btnBack  = { ...baseBtn, background:'rgba(22,22,58,0.5)',    border:'1px solid rgba(79,110,247,0.2)',  color:'#e0e0f0' };
const btnExit  = { ...baseBtn, background:'rgba(150,30,30,0.15)',  border:'1px solid rgba(200,34,34,0.3)',   color:'#e0e0f0', padding:'9px 14px' };
const btnStart = { ...baseBtn, fontSize:13, background:'rgba(78,203,113,0.2)',  border:'1px solid rgba(78,203,113,0.5)',  color:'#4ecb71', padding:'9px 28px' };
const inputStyle = {
  width:'100%', outline:'none', fontFamily:'Share Tech Mono,monospace',
  background:'rgba(7,7,26,0.9)', border:'1px solid rgba(79,110,247,0.25)',
  padding:'9px 12px', fontSize:14, color:'#e0e0f0', clipPath:CLIP,
} as const;

/* ── sub-components ──────────────────────────────────────────────────────── */
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', marginBottom:5 }}>{children}</div>;
}

function HudInput({ label, type='text', value, onChange, min, max, step }: any) {
  return (
    <div style={{ marginBottom:14 }}>
      <Lbl>{label}</Lbl>
      <input type={type} value={value} onChange={onChange} min={min} max={max} step={step}
        style={inputStyle}
        onFocus={e=>(e.currentTarget.style.borderColor='rgba(79,110,247,0.7)')}
        onBlur={e=>(e.currentTarget.style.borderColor='rgba(79,110,247,0.25)')}
      />
    </div>
  );
}

function Slider({ id, tr: trLabel, en: enLabel, c: color, value, onChange, lang }: any) {
  const display = id==='height' ? `${toCm(value)} cm` : `${(value*100).toFixed(0)}%`;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:14, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.08em' }}>
          {lang==='tr'?trLabel:enLabel}
        </span>
        <span style={{ fontSize:14, color, fontFamily:'Orbitron,monospace', fontWeight:700 }}>{display}</span>
      </div>
      <div style={{ position:'relative', height:7, background:'rgba(10,10,30,0.9)', border:`1px solid ${color}30`, borderRadius:0 }}>
        <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${value*100}%`,
          background:`linear-gradient(90deg,${color}50,${color})`, boxShadow:`0 0 6px ${color}50`, transition:'width 0.12s' }} />
        <input type="range" min={0} max={1} step={0.01} value={value} onChange={onChange}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }} />
      </div>
    </div>
  );
}

function ColorPicker({ label, opts, value, onChange, lang }: any) {
  return (
    <div style={{ marginBottom:18 }}>
      <Lbl>{label}</Lbl>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {opts.map((o: any) => (
          <button key={o.v} onClick={()=>onChange(o.v)} title={lang==='tr'?o.tr:o.en}
            style={{ width:34, height:34, background:o.c, cursor:'pointer',
              border: value===o.v ? '2px solid #4f9ef7' : '2px solid rgba(79,158,247,0.15)',
              clipPath:CLIP, boxShadow: value===o.v ? '0 0 10px #4f9ef780' : 'none', transition:'all 0.15s' }}
          />
        ))}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label:string; value:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid rgba(79,110,247,0.1)' }}>
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

  const isF2 = step >= 9 && step <= 16;
  const fd   = isF2 ? f2 : f1;
  const setFd = isF2 ? setF2 : setF1;
  const fStep = isF2 ? step - 8 : step; // 1-8 for both founders

  const setT = (id: string, val: number) => setFd((p: any) => ({...p, [id]:val}));

  const next = () => setStep(s => Math.min(s+1, TOTAL-1));
  const back = () => setStep(s => Math.max(s-1, 0));

  const t = (tr: string, en: string) => lang==='tr' ? tr : en;
  const meta = STEPS[step];
  const founderLabel = meta.ph==='f1' ? t('KURUCU 1 — ERKEK','FOUNDER 1 — MALE')
                     : meta.ph==='f2' ? t('KURUCU 2 — KADIN','FOUNDER 2 — FEMALE')
                     : null;
  const isSummary   = step === TOTAL-1;
  const canNext0    = step===0 ? simForm.name.trim()!=='' : true;

  /* ── step content ────────────────────────────────────────────────────── */
  function renderContent() {
    /* 0 — Sim info */
    if (step === 0) return (
      <>
        <HudInput label={t('SİMÜLASYON ADI','SIMULATION NAME')} value={simForm.name}
          onChange={(e:any)=>setSimForm(p=>({...p,name:e.target.value}))} />
        <HudInput label={t('ENLEM (°N)','LATITUDE (°N)')} type="number" step="0.0001" value={simForm.latitude}
          onChange={(e:any)=>setSimForm(p=>({...p,latitude:e.target.value}))} />
        <HudInput label={t('BOYLAM (°E)','LONGITUDE (°E)')} type="number" step="0.0001" value={simForm.longitude}
          onChange={(e:any)=>setSimForm(p=>({...p,longitude:e.target.value}))} />
      </>
    );

    /* 1 / 9 — Identity */
    if (fStep === 1) return (
      <>
        <HudInput label={t('İSİM','NAME')} value={fd.name}
          onChange={(e:any)=>setFd((p:any)=>({...p,name:e.target.value}))} />
        <HudInput label={t('YAŞ','AGE')} type="number" min={16} max={60} value={fd.ageYears}
          onChange={(e:any)=>setFd((p:any)=>({...p,ageYears:+e.target.value}))} />
        <div style={{ marginBottom:14 }}>
          <Lbl>{t('CİNSİYET','SEX')}</Lbl>
          <div style={{ display:'flex', gap:8 }}>
            {[{v:'male',tr:'ERKEK',en:'MALE'},{v:'female',tr:'KADIN',en:'FEMALE'}].map(opt=>(
              <button key={opt.v} onClick={()=>setFd((p:any)=>({...p,sex:opt.v}))}
                style={{ fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', padding:'8px 22px', fontSize:13,
                  background:fd.sex===opt.v?'rgba(79,110,247,0.25)':'rgba(22,22,58,0.5)',
                  border:`1px solid ${fd.sex===opt.v?'rgba(79,110,247,0.6)':'rgba(79,110,247,0.15)'}`,
                  color:'#e0e0f0', clipPath:CLIP, cursor:'pointer' }}>
                {t(opt.tr,opt.en)}
              </button>
            ))}
          </div>
        </div>
      </>
    );

    /* 2 / 10 — Physical */
    if (fStep === 2) return (
      <>
        <Lbl>{t('BOY','HEIGHT')}</Lbl>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <span style={{ fontSize:22, color:'#06b6d4', fontFamily:'Orbitron,monospace', fontWeight:700, minWidth:70 }}>
            {toCm(fd.height)} cm
          </span>
          <div style={{ flex:1, position:'relative', height:7, background:'rgba(10,10,30,0.9)', border:'1px solid #06b6d430' }}>
            <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${fd.height*100}%`,
              background:'linear-gradient(90deg,#06b6d450,#06b6d4)', transition:'width 0.12s' }} />
            <input type="range" min={0} max={1} step={0.01} value={fd.height}
              onChange={e=>setT('height',+e.target.value)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }} />
          </div>
        </div>

        <Lbl>{t('KİLO / AĞIRLIK','WEIGHT')}</Lbl>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8 }}>
          <span style={{ fontSize:22, color:'#a855f7', fontFamily:'Orbitron,monospace', fontWeight:700, minWidth:70 }}>
            {toKg(fd.height, fd.metabolism)} kg
          </span>
          <div style={{ flex:1 }}>
            <div style={{ position:'relative', height:7, background:'rgba(10,10,30,0.9)', border:'1px solid #a855f730' }}>
              <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${fd.metabolism*100}%`,
                background:'linear-gradient(90deg,#a855f750,#a855f7)', transition:'width 0.12s' }} />
              <input type="range" min={0} max={1} step={0.01} value={fd.metabolism}
                onChange={e=>setT('metabolism',+e.target.value)}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:12, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace' }}>
              <span>{t('İnce','Lean')}</span><span>{t('Orta','Average')}</span><span>{t('Kaslı','Heavy')}</span>
            </div>
          </div>
        </div>
      </>
    );

    /* 3 / 11 — Appearance */
    if (fStep === 3) return (
      <>
        <ColorPicker label={t('GÖZ RENGİ','EYE COLOR')}  opts={EYE_OPTS}  value={fd.eye_color}  onChange={(v:string)=>setFd((p:any)=>({...p,eye_color:v}))}  lang={lang} />
        <ColorPicker label={t('SAÇ RENGİ','HAIR COLOR')} opts={HAIR_OPTS} value={fd.hair_color} onChange={(v:string)=>setFd((p:any)=>({...p,hair_color:v}))} lang={lang} />
        <ColorPicker label={t('TEN RENGİ','SKIN TONE')}  opts={SKIN_OPTS} value={fd.skin_tone}  onChange={(v:string)=>setFd((p:any)=>({...p,skin_tone:v}))}  lang={lang} />
      </>
    );

    /* 4 / 12 — Mind A (cognitive) */
    if (fStep === 4) return MIND_A.map(tr => (
      <Slider key={tr.id} {...tr} value={fd[tr.id]} onChange={(e:any)=>setT(tr.id,+e.target.value)} lang={lang} />
    ));

    /* 5 / 13 — Mind B (character) */
    if (fStep === 5) return MIND_B.map(tr => (
      <Slider key={tr.id} {...tr} value={fd[tr.id]} onChange={(e:any)=>setT(tr.id,+e.target.value)} lang={lang} />
    ));

    /* 6 / 14 — Social */
    if (fStep === 6) return SOCIAL.map(tr => (
      <Slider key={tr.id} {...tr} value={fd[tr.id]} onChange={(e:any)=>setT(tr.id,+e.target.value)} lang={lang} />
    ));

    /* 7 / 15 — Body A (strength) */
    if (fStep === 7) return BODY_A.map(tr => (
      <Slider key={tr.id} {...tr} value={fd[tr.id]} onChange={(e:any)=>setT(tr.id,+e.target.value)} lang={lang} />
    ));

    /* 8 / 16 — Body B (vitality) */
    if (fStep === 8) return BODY_B.map(tr => (
      <Slider key={tr.id} {...tr} value={fd[tr.id]} onChange={(e:any)=>setT(tr.id,+e.target.value)} lang={lang} />
    ));

    /* 17 — Summary */
    if (isSummary) return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <div style={{ fontSize:16, color:'#4f9ef7', fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.15em', marginBottom:8 }}>
            {t('SİMÜLASYON','SIMULATION')}
          </div>
          <SumRow label={t('AD','NAME')}    value={simForm.name||'—'} />
          <SumRow label={t('ENLEM','LAT')}  value={simForm.latitude||'—'} />
          <SumRow label={t('BOYLAM','LNG')} value={simForm.longitude||'—'} />
        </div>
        {([{fd:f1,sex:'male'},{fd:f2,sex:'female'}] as {fd:any,sex:string}[]).map(({fd:founder,sex})=>(
          <div key={sex}>
            <div style={{ fontSize:16, color: sex==='male'?'#4f9ef7':'#ec4899',
              fontFamily:'Share Tech Mono,monospace', letterSpacing:'0.12em', marginBottom:8 }}>
              {sex==='male' ? t('KURUCU 1 — ERKEK','FOUNDER 1 — MALE') : t('KURUCU 2 — KADIN','FOUNDER 2 — FEMALE')}
            </div>
            <SumRow label={t('İSİM','NAME')}   value={founder.name} />
            <SumRow label={t('YAŞ','AGE')}     value={String(founder.ageYears)} />
            <SumRow label={t('BOY','HEIGHT')}  value={`${toCm(founder.height)} cm`} />
            <SumRow label={t('KİLO','WEIGHT')} value={`${toKg(founder.height,founder.metabolism)} kg`} />
            <SumRow label={t('ZEKA','IQ')}     value={`${(founder.fluid_intelligence*100).toFixed(0)}%`} />
            <SumRow label={t('SOSYAL BAĞ','SOC.BOND')} value={`${(founder.social_bonding*100).toFixed(0)}%`} />
            <SumRow label={t('BAĞIŞIKLIK','IMMUNITY')} value={`${(founder.immune_strength*100).toFixed(0)}%`} />
          </div>
        ))}
      </div>
    );

    return null;
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth:580, margin:'0 auto', background:'rgba(4,4,15,0.97)',
      border:'1px solid rgba(79,110,247,0.4)', animation:'boot-in 0.3s ease-out both' }}>

      {/* Progress bar */}
      <div style={{ height:2, background:'rgba(79,110,247,0.1)' }}>
        <div style={{ height:'100%', width:`${((step+1)/TOTAL)*100}%`,
          background:'linear-gradient(90deg,#4f6ef7,#4f9ef7)', transition:'width 0.3s ease-out' }} />
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
          <div style={{ fontSize:14, color:'#e0e0f0', fontFamily:'Share Tech Mono,monospace',
            letterSpacing:'0.15em', fontWeight:700 }}>
            {lang==='tr' ? meta.tr : meta.en}
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
          {t('ÇIK','EXIT')}
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {step > 0 && (
            <button onClick={back} style={btnBack}>
              ← {t('GERİ','BACK')}
            </button>
          )}
          {isSummary ? (
            <button onClick={()=>onSubmit(simForm,f1,f2)} disabled={loading}
              style={{ ...btnStart, opacity:loading?0.5:1, cursor:loading?'not-allowed':'pointer' }}>
              {loading ? t('BAŞLATILIYOR…','INITIALIZING…') : t('BAŞLAT','LAUNCH')}
            </button>
          ) : (
            <button onClick={next} disabled={!canNext0}
              style={{ ...btnNext, opacity:!canNext0?0.4:1, cursor:!canNext0?'not-allowed':'pointer' }}>
              {t('DEVAM ET','CONTINUE')} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

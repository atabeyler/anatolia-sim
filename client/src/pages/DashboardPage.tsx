import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, BarChart2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = 'anatolia_founders_v4';
function saveState(form: any, f1: any, f2: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, founder1: f1, founder2: f2 })); } catch {}
}
function loadState(): { form?: any; founder1?: any; founder2?: any } | null {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

// ── Helpers: height ↔ cm, weight ↔ metabolism ────────────────────────────────
// Server formula: height_cm = 150 + height_factor * 45  (range 150–195 cm)
const toCm  = (v: number) => Math.round(150 + Math.max(0, Math.min(1, v)) * 45);
const fromCm = (cm: number) => Math.max(0, Math.min(1, (cm - 150) / 45));
// weight_kg = (height_cm/100)^2 * (19 + metabolism * 8)
const toKg  = (heightVal: number, metabVal: number) => {
  const h = toCm(heightVal) / 100;
  return Math.round(h * h * (19 + Math.max(0, Math.min(1, metabVal)) * 8));
};
const fromKg = (kg: number, heightVal: number) => {
  const h = toCm(heightVal) / 100;
  return Math.max(0, Math.min(1, (kg / (h * h) - 19) / 8));
};

// ── Trait definitions ────────────────────────────────────────────────────────
const TRAIT_GROUPS = [
  {
    group: 'Zihin', groupEn: 'Mind',
    traits: [
      { id: 'fluid_intelligence', label: 'Zeka',            labelEn: 'Intelligence',      color: '#7c3aed' },
      { id: 'curiosity',          label: 'Merak',           labelEn: 'Curiosity',         color: '#f59e0b' },
      { id: 'conscientiousness',  label: 'Disiplin',        labelEn: 'Discipline',        color: '#3b82f6' },
      { id: 'language_capacity',  label: 'Dil Yeteneği',    labelEn: 'Language',          color: '#14b8a6' },
      { id: 'artistic_sense',     label: 'Sanat Duygusu',   labelEn: 'Art Sense',         color: '#f97316' },
      { id: 'self_awareness',     label: 'Öz Farkındalık',  labelEn: 'Self Awareness',    color: '#8b5cf6' },
      { id: 'stress_resilience',  label: 'Stres Direnci',   labelEn: 'Stress Resilience', color: '#10b981' },
      { id: 'learning_rate',      label: 'Öğrenme Hızı',    labelEn: 'Learning Rate',     color: '#818cf8' },
      { id: 'risk_tolerance',     label: 'Risk Toleransı',  labelEn: 'Risk Tolerance',    color: '#fb7185' },
      { id: 'innovation',         label: 'İnovasyon',       labelEn: 'Innovation',        color: '#e879f9' },
    ],
  },
  {
    group: 'Sosyal', groupEn: 'Social',
    traits: [
      { id: 'empathy',        label: 'Empati',           labelEn: 'Empathy',           color: '#ec4899' },
      { id: 'social_bonding', label: 'Sosyal Bağ',       labelEn: 'Social Bonding',    color: '#f472b6' },
      { id: 'aggression',     label: 'Saldırganlık',     labelEn: 'Aggression',        color: '#ef4444' },
      { id: 'cooperation',    label: 'İşbirliği',        labelEn: 'Cooperation',       color: '#34d399' },
      { id: 'dominance',      label: 'Liderlik Eğilimi', labelEn: 'Leadership Drive',  color: '#fb923c' },
    ],
  },
  {
    group: 'Beden', groupEn: 'Body',
    traits: [
      { id: 'height',            label: 'Boy',             labelEn: 'Height',           color: '#06b6d4' },
      { id: 'metabolism',        label: 'Metabolizma',     labelEn: 'Metabolism',       color: '#a855f7' },
      { id: 'physical_strength', label: 'Fiziksel Güç',    labelEn: 'Physical Strength',color: '#fb923c' },
      { id: 'endurance',         label: 'Dayanıklılık',    labelEn: 'Endurance',        color: '#fbbf24' },
      { id: 'immune_strength',   label: 'Bağışıklık',      labelEn: 'Immunity',         color: '#22c55e' },
      { id: 'fertility',         label: 'Üreme Dürtüsü',   labelEn: 'Fertility Drive',  color: '#f43f5e' },
      { id: 'longevity',         label: 'Uzun Ömür',       labelEn: 'Longevity',        color: '#84cc16' },
    ],
  },
];

const EYE_OPTIONS: { value: string; label: string; labelTr: string; color: string }[] = [
  { value: 'brown', label: 'Brown',  labelTr: 'Kahverengi', color: '#6b3a1f' },
  { value: 'hazel', label: 'Hazel',  labelTr: 'Ela',        color: '#8b6914' },
  { value: 'green', label: 'Green',  labelTr: 'Yeşil',      color: '#2d6a2d' },
  { value: 'blue',  label: 'Blue',   labelTr: 'Mavi',       color: '#1a5276' },
];
const HAIR_OPTIONS: { value: string; label: string; labelTr: string; color: string }[] = [
  { value: 'black', label: 'Black', labelTr: 'Siyah', color: '#111' },
  { value: 'dark',  label: 'Dark',  labelTr: 'Koyu',  color: '#2c1810' },
  { value: 'brown', label: 'Brown', labelTr: 'Kahve', color: '#5c3317' },
  { value: 'light', label: 'Light', labelTr: 'Açık',  color: '#c68642' },
  { value: 'blond', label: 'Blond', labelTr: 'Sarı',  color: '#d4a017' },
  { value: 'red',   label: 'Red',   labelTr: 'Kızıl', color: '#8b2500' },
];
const SKIN_OPTIONS: { value: string; label: string; labelTr: string; color: string }[] = [
  { value: 'fair',  label: 'Fair',  labelTr: 'Açık',   color: '#fde8d0' },
  { value: 'light', label: 'Light', labelTr: 'Bej',    color: '#f5c9a0' },
  { value: 'olive', label: 'Olive', labelTr: 'Buğday', color: '#c68642' },
  { value: 'tan',   label: 'Tan',   labelTr: 'Bronz',  color: '#a0614a' },
  { value: 'brown', label: 'Brown', labelTr: 'Esmer',  color: '#7b4a2d' },
  { value: 'dark',  label: 'Dark',  labelTr: 'Koyu',   color: '#3d1f0d' },
];

const ALL_TRAITS = TRAIT_GROUPS.flatMap(g => g.traits);
const TRAIT_DEFAULTS = Object.fromEntries(ALL_TRAITS.map(t => [t.id, 0.5]));

const founderDefaults = (sex: 'male' | 'female') => ({
  name: sex === 'male' ? 'Alp Anatol' : 'Ayla Anatol',
  ageYears: sex === 'male' ? 22 : 20,
  eye_color: 'brown',
  hair_color: sex === 'male' ? 'dark' : 'brown',
  skin_tone: 'olive',
  ...TRAIT_DEFAULTS,
  fluid_intelligence: 0.68,
  curiosity:          0.60,
  conscientiousness:  0.72,
  language_capacity:  0.55,
  artistic_sense:     0.50,
  self_awareness:     0.55,
  stress_resilience:  0.65,
  empathy:            0.60,
  social_bonding:     0.75,
  aggression:         0.35,
  cooperation:        0.72,
  dominance:          0.50,
  physical_strength:  0.72,
  endurance:          0.70,
  immune_strength:    0.74,
  fertility:          0.80,
  longevity:          0.68,
  learning_rate:      0.65,
  risk_tolerance:     0.45,
  innovation:         0.55,
  height: sex === 'male' ? 0.56 : 0.44,
  metabolism: 0.45,
});

// ── Sub-components ────────────────────────────────────────────────────────────
function TraitSlider({ id, label, labelEn, color, value, onChange, lang }: any) {
  const displayValue = id === 'height'
    ? `${toCm(value)} cm`
    : `${(value * 100).toFixed(0)}%`;

  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span style={{ fontSize: 9, color: '#7080a0', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>
          {lang === 'tr' ? label : labelEn}
        </span>
        <span style={{ fontSize: 9, color, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
          {displayValue}
        </span>
      </div>
      <div className="relative h-1.5" style={{ background: 'rgba(10,10,30,0.9)', border: `1px solid ${color}30` }}>
        <div className="absolute inset-y-0 left-0 transition-all duration-200"
          style={{ width: `${value * 100}%`, background: `linear-gradient(90deg, ${color}50, ${color})`, boxShadow: `0 0 6px ${color}50` }} />
        <input type="range" min="0" max="1" step="0.01" value={value}
          onChange={e => onChange(id, parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: '100%' }} />
      </div>
    </div>
  );
}

function ColorChips({ options, value, onChange }: { options: typeof EYE_OPTIONS; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} title={opt.label}
          style={{
            width: 20, height: 20, borderRadius: 2, background: opt.color,
            border: value === opt.value ? '2px solid #a0b4ff' : '2px solid transparent',
            boxShadow: value === opt.value ? '0 0 6px #a0b4ff80' : 'none',
            flexShrink: 0,
          }} />
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(5,5,20,0.9)', border: '1px solid rgba(79,110,247,0.2)',
  padding: '4px 8px', fontSize: 11, color: '#c0d0f0', fontFamily: 'Share Tech Mono, monospace', outline: 'none',
};

function UnitInput({ label, value, unit, min, max, onChange, color = '#c0d0f0' }: {
  label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void; color?: string;
}) {
  // Local raw string while user is typing — only committed on blur
  const [raw, setRaw] = useState(String(value));

  // Sync when parent value changes (e.g., linked slider moves)
  useEffect(() => { setRaw(String(value)); }, [value]);

  function commit(str: string) {
    const v = parseInt(str, 10);
    if (!isNaN(v)) {
      const clamped = Math.max(min, Math.min(max, v));
      onChange(clamped);
      setRaw(String(clamped));
    } else {
      setRaw(String(value)); // revert to last valid value
    }
  }

  return (
    <div>
      <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" min={min} max={max}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => commit(raw)}
          onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }}
          style={{ ...inputStyle, flex: 1, color }}
        />
        <span style={{ fontSize: 9, color: '#5060a0', fontFamily: 'Share Tech Mono', flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  );
}

function FounderCard({ title, sex, data, onChange, lang }: {
  title: string; sex: string; data: any; onChange: (k: string, v: any) => void; lang: string;
}) {
  const accentColor = sex === 'male' ? '#4f9ef7' : '#ec4899';
  const heightCm = toCm(data.height ?? 0.5);
  const weightKg = toKg(data.height ?? 0.5, data.metabolism ?? 0.5);

  const sec = (label: string) => (
    <div style={{ fontSize: 8, color: '#3a5070', letterSpacing: '0.2em', marginBottom: 6, fontFamily: 'Share Tech Mono' }}>
      {label}
    </div>
  );

  return (
    <div style={{ background: 'rgba(4,4,15,0.95)', border: `1px solid ${accentColor}30` }}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${accentColor}20`, background: `${accentColor}08` }}>
        <div className="w-1.5 h-4" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
        <span style={{ fontSize: 10, color: accentColor, fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.15em' }}>
          {title}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* ── KİMLİK ── */}
        <div>
          {sec(lang === 'tr' ? '── KİMLİK ──' : '── IDENTITY ──')}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'İSİM' : 'NAME'}</div>
              <input value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'YAŞ' : 'AGE'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min="15" max="65" value={data.ageYears ?? 20}
                  onChange={e => onChange('ageYears', parseInt(e.target.value || '20', 10))}
                  style={{ ...inputStyle, flex: 1 }} />
                <span style={{ fontSize: 9, color: '#5060a0', fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'yaş' : 'yr'}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'CİNSİYET' : 'SEX'}</div>
              <div style={{ padding: '4px 8px', fontSize: 11, color: accentColor, fontFamily: 'Share Tech Mono', border: `1px solid ${accentColor}30`, background: `${accentColor}08` }}>
                {sex === 'male' ? (lang === 'tr' ? 'ERKEK' : 'MALE') : (lang === 'tr' ? 'KADIN' : 'FEMALE')}
              </div>
            </div>
          </div>
        </div>

        {/* ── BEDENSEL ÖLÇÜLER ── */}
        <div>
          {sec(lang === 'tr' ? '── BEDENSEL ÖLÇÜLER ──' : '── MEASUREMENTS ──')}
          <div className="grid grid-cols-2 gap-2">
            <UnitInput
              label={lang === 'tr' ? 'BOY' : 'HEIGHT'}
              value={heightCm} unit="cm" min={145} max={200} color="#06b6d4"
              onChange={cm => onChange('height', fromCm(cm))}
            />
            <UnitInput
              label={lang === 'tr' ? 'KİLO' : 'WEIGHT'}
              value={weightKg} unit="kg" min={40} max={130} color="#a855f7"
              onChange={kg => onChange('metabolism', fromKg(kg, data.height ?? 0.5))}
            />
          </div>
          {/* BMI preview */}
          {(() => {
            const bmi = weightKg / ((heightCm / 100) ** 2);
            const bmiLabel = bmi < 18.5 ? (lang === 'tr' ? 'Zayıf' : 'Underweight')
              : bmi < 25 ? (lang === 'tr' ? 'Normal' : 'Normal')
              : bmi < 30 ? (lang === 'tr' ? 'Fazla Kilolu' : 'Overweight')
              : (lang === 'tr' ? 'Obez' : 'Obese');
            const bmiColor = bmi < 18.5 ? '#7dd3fc' : bmi < 25 ? '#4ecb71' : bmi < 30 ? '#f59e0b' : '#ef4444';
            return (
              <div style={{ marginTop: 4, fontSize: 8, color: '#3a5070', fontFamily: 'Share Tech Mono', display: 'flex', gap: 8 }}>
                <span>BMI: <span style={{ color: bmiColor, fontFamily: 'Orbitron, monospace' }}>{bmi.toFixed(1)}</span></span>
                <span style={{ color: bmiColor }}>{bmiLabel}</span>
              </div>
            );
          })()}
        </div>

        {/* ── DIŞ GÖRÜNÜŞ ── */}
        <div>
          {sec(lang === 'tr' ? '── DIŞ GÖRÜNÜŞ ──' : '── APPEARANCE ──')}
          <div className="space-y-2">
            {[
              { key: 'eye_color',  label: lang === 'tr' ? 'GÖZ RENGİ'  : 'EYE COLOR',  opts: EYE_OPTIONS  },
              { key: 'hair_color', label: lang === 'tr' ? 'SAÇ RENGİ'  : 'HAIR COLOR', opts: HAIR_OPTIONS },
              { key: 'skin_tone',  label: lang === 'tr' ? 'TEN RENGİ'  : 'SKIN TONE',  opts: SKIN_OPTIONS },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 4, fontFamily: 'Share Tech Mono' }}>
                  {label}&nbsp;
                  <span style={{ color: '#8090c0' }}>— {opts.find(o => o.value === data[key])?.[lang === 'tr' ? 'labelTr' : 'label']}</span>
                </div>
                <ColorChips options={opts} value={data[key]} onChange={v => onChange(key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── GENETİK ÖZELLİKLER ── */}
        {TRAIT_GROUPS.map(group => (
          <div key={group.group}>
            {sec(lang === 'tr' ? `── ${group.group.toUpperCase()} ──` : `── ${group.groupEn.toUpperCase()} ──`)}
            {group.traits
              .filter(t => t.id !== 'height' && t.id !== 'metabolism')
              .map(t => (
                <TraitSlider key={t.id} {...t} value={data[t.id] ?? 0.5} onChange={onChange} lang={lang} />
              ))}
            {/* Height slider shows cm; metabolism slider stays (weight input is the primary control) */}
            {group.group === 'Beden' && (
              <>
                <TraitSlider
                  id="height" label="Boy (ince ayar)" labelEn="Height (fine tune)"
                  color="#06b6d4" value={data.height ?? 0.5} onChange={onChange} lang={lang}
                />
                <TraitSlider
                  id="metabolism" label="Metabolizma" labelEn="Metabolism"
                  color="#a855f7" value={data.metabolism ?? 0.5} onChange={onChange} lang={lang}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout, lang } = useSimStore();
  const [sims, setSims] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // ── State with localStorage persistence ──────────────────────────────────
  const [form, setForm] = useState<{ name: string; latitude: string; longitude: string }>(() => {
    const s = loadState();
    return { name: '', latitude: s?.form?.latitude ?? '39.9334', longitude: s?.form?.longitude ?? '32.8597' };
  });
  const [founder1, setFounder1] = useState<any>(() => {
    const s = loadState();
    return s?.founder1 ? { ...founderDefaults('male'), ...s.founder1 } : founderDefaults('male');
  });
  const [founder2, setFounder2] = useState<any>(() => {
    const s = loadState();
    return s?.founder2 ? { ...founderDefaults('female'), ...s.founder2 } : founderDefaults('female');
  });

  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Persist to localStorage on any change
  useEffect(() => {
    saveState({ latitude: form.latitude, longitude: form.longitude }, founder1, founder2);
  }, [form.latitude, form.longitude, founder1, founder2]);

  useEffect(() => { axios.get('/api/simulations', { headers }).then(r => setSims(r.data)); }, []);

  function makeSetter(setter: any) {
    return (key: string, value: any) => setter((prev: any) => ({ ...prev, [key]: value }));
  }

  async function deleteSim(id: string, name: string) {
    if (!confirm(lang === 'en' ? `Delete "${name}"? This cannot be undone.` : `"${name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await axios.delete(`/api/simulations/${id}`, { headers });
      setSims(s => s.filter(sim => sim.id !== id));
    } catch { alert(lang === 'en' ? 'Delete failed.' : 'Silme başarısız.'); }
  }

  async function createSim() {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/simulations', {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        founder1_params: founder1,
        founder2_params: founder2,
      }, { headers });
      setSims(s => [data, ...s]);
      setShowNew(false);
      setForm(f => ({ ...f, name: '' })); // Only reset name, keep coords + genetics
    } finally { setLoading(false); }
  }

  const runningCount = sims.filter(s => s.status === 'running').length;

  return (
    <div className="min-h-screen text-sim-text overflow-auto" style={{ background: '#030310' }}>

      {/* Scanlines overlay */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)' }} />

      {/* Header */}
      <div className="sticky top-0 z-10"
        style={{
          background: 'rgba(3,3,16,0.97)',
          borderBottom: '1px solid rgba(79,110,247,0.3)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 2px 30px rgba(79,110,247,0.06)',
        }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sim-accent/50 neon-breathe" />
              <Globe size={14} className="text-sim-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(79,110,247,0.8))' }} />
            </div>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="font-orbitron text-sim-accent font-bold tracking-[0.25em]" style={{ fontSize: 12, textShadow: '0 0 10px rgba(79,110,247,0.6)' }}>ANATOLİA-SİM</span>
              <span className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 8 }}>MEDENİYET</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {runningCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1"
                style={{ background: 'rgba(78,203,113,0.1)', border: '1px solid rgba(78,203,113,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
                <span className="font-share-tech text-sim-green tracking-widest" style={{ fontSize: 10 }}>
                  {runningCount} {lang === 'en' ? 'ACTIVE' : 'AKTİF'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 10 }}>{user?.username?.toUpperCase()}</span>
              <button onClick={() => { logout(); navigate('/login'); }}
                className="p-2 text-sim-muted hover:text-red-400 transition-colors" style={{ lineHeight: 0 }}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 relative z-1">

        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-sim-accent" style={{ boxShadow: '0 0 8px rgba(79,110,247,0.8)' }} />
              <h2 className="font-orbitron font-bold tracking-[0.15em] text-sim-text" style={{ fontSize: 16 }}>
                {lang === 'en' ? 'SIMULATION REGISTRY' : 'SİMÜLASYON KAYITLARI'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sims.length >= 2 && (
              <button onClick={() => setCompareMode(c => !c)}
                className="flex items-center gap-2 font-share-tech tracking-widest transition-all duration-150"
                style={{
                  padding: '6px 12px', fontSize: 10,
                  background: compareMode ? 'rgba(79,110,247,0.2)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${compareMode ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.15)'}`,
                  color: compareMode ? '#a0b4ff' : '#6070a0',
                  clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
                }}>
                <BarChart2 size={13} />
                {lang === 'en' ? 'COMPARE' : 'KARŞILAŞTIR'}
              </button>
            )}
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 font-share-tech tracking-widest transition-all duration-150 hover:brightness-110"
              style={{
                padding: '6px 14px', fontSize: 10,
                background: 'rgba(79,110,247,0.2)',
                border: '1px solid rgba(79,110,247,0.5)',
                color: '#a0b4ff',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                boxShadow: '0 0 15px rgba(79,110,247,0.2)',
              }}>
              <Plus size={13} />
              {lang === 'en' ? 'NEW SIMULATION' : 'YENİ SİMÜLASYON'}
            </button>
          </div>
        </div>

        {/* New simulation form */}
        {showNew && (
          <div className="mb-6 relative" style={{
            background: 'rgba(4,4,15,0.97)',
            border: '1px solid rgba(79,110,247,0.3)',
            backdropFilter: 'blur(20px)',
            animation: 'warp-in 0.4s cubic-bezier(0.2,0.8,0.4,1) both',
          }}>
            {/* Corner brackets */}
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <span key={v+h} style={{ position: 'absolute', [v]: -1, [h]: -1, width: 12, height: 12,
                [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: '2px solid rgba(79,110,247,0.9)',
                [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: '2px solid rgba(79,110,247,0.9)', zIndex: 2 }} />
            ))}

            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(79,110,247,0.2)' }}>
              <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
              <span className="font-orbitron text-xs font-semibold tracking-[0.2em] text-sim-accent">
                {lang === 'en' ? 'NEW SIMULATION' : 'YENİ SİMÜLASYON'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 8, color: '#3a5070', fontFamily: 'Share Tech Mono' }}>
                {lang === 'tr' ? '// ayarlar otomatik kaydedilir' : '// settings auto-saved'}
              </span>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-3">
                  <label className="font-share-tech text-sim-muted tracking-widest block mb-1.5" style={{ fontSize: 9 }}>
                    {lang === 'en' ? 'SIMULATION NAME' : 'SİMÜLASYON ADI'}
                  </label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full text-sm focus:outline-none font-share-tech"
                    style={{ background: 'rgba(7,7,26,0.9)', border: '1px solid rgba(79,110,247,0.25)', padding: '8px 12px', color: '#c0c8e8',
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(79,110,247,0.7)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(79,110,247,0.25)'}
                  />
                </div>
                {[
                  { key: 'latitude',  label: lang === 'en' ? 'LATITUDE'  : 'ENLEM'  },
                  { key: 'longitude', label: lang === 'en' ? 'LONGITUDE' : 'BOYLAM' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="font-share-tech text-sim-muted tracking-widest block mb-1.5" style={{ fontSize: 9 }}>{label}</label>
                    <input type="number" step="0.0001" value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full text-sm focus:outline-none font-share-tech"
                      style={{ background: 'rgba(7,7,26,0.9)', border: '1px solid rgba(79,110,247,0.25)', padding: '8px 12px', color: '#c0c8e8',
                        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(79,110,247,0.7)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(79,110,247,0.25)'}
                    />
                  </div>
                ))}
              </div>

              {/* Founder genetics — scrollable section */}
              <div style={{ fontSize: 9, color: '#3a5070', letterSpacing: '0.2em', fontFamily: 'Share Tech Mono', marginBottom: 10 }}>
                {lang === 'tr' ? '// KURUCU GENETİĞİ' : '// FOUNDER GENETICS'}
              </div>
              <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', marginBottom: 12, paddingRight: 2 }}>
                <div className="grid grid-cols-2 gap-3">
                  <FounderCard
                    title={lang === 'tr' ? 'KURUCU 1 — ERKEK' : 'FOUNDER 1 — MALE'}
                    sex="male" data={founder1} onChange={makeSetter(setFounder1)} lang={lang}
                  />
                  <FounderCard
                    title={lang === 'tr' ? 'KURUCU 2 — KADIN' : 'FOUNDER 2 — FEMALE'}
                    sex="female" data={founder2} onChange={makeSetter(setFounder2)} lang={lang}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={createSim} disabled={loading || !form.name}
                  className="font-share-tech tracking-widest transition-all duration-150 disabled:opacity-40"
                  style={{
                    padding: '7px 16px', fontSize: 10,
                    background: 'rgba(79,110,247,0.25)', border: '1px solid rgba(79,110,247,0.5)', color: '#a0b4ff',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    boxShadow: '0 0 15px rgba(79,110,247,0.2)',
                  }}>
                  {loading ? (lang === 'en' ? 'INITIALIZING…' : 'BAŞLATILIYOR…') : (lang === 'en' ? 'INITIALIZE' : 'BAŞLAT')}
                </button>
                <button onClick={() => setShowNew(false)}
                  className="font-share-tech tracking-widest text-sim-muted hover:text-sim-text transition-colors"
                  style={{
                    padding: '7px 16px', fontSize: 10,
                    background: 'rgba(22,22,58,0.5)', border: '1px solid rgba(79,110,247,0.15)',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                  }}>
                  {lang === 'en' ? 'ABORT' : 'İPTAL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare mode */}
        {compareMode && sims.length >= 2 && (
          <div className="mb-6 relative" style={{
            background: 'rgba(4,4,15,0.97)', border: '1px solid rgba(79,110,247,0.2)', animation: 'boot-in 0.4s ease-out both',
          }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(79,110,247,0.15)' }}>
              <BarChart2 size={13} className="text-sim-accent" />
              <span className="font-orbitron text-xs font-semibold tracking-[0.2em] text-sim-accent">
                {lang === 'en' ? 'PARALLEL COMPARISON' : 'PARALEL KARŞILAŞTIRMA'}
              </span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-4">
                      <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 9 }}>{lang === 'en' ? 'METRIC' : 'METRİK'}</span>
                    </th>
                    {sims.slice(0, 4).map(s => (
                      <th key={s.id} className="text-left pb-2 pr-4">
                        <span className="font-share-tech text-sim-accent tracking-widest" style={{ fontSize: 9 }}>{s.name.toUpperCase()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: lang === 'en' ? 'YEAR' : 'YIL', key: 'current_year' },
                    { label: lang === 'en' ? 'STATUS' : 'DURUM', key: 'status' },
                    { label: lang === 'en' ? 'LOCATION' : 'KONUM', key: '_coord' },
                  ].map(row => (
                    <tr key={row.key} style={{ borderBottom: '1px solid rgba(79,110,247,0.08)' }}>
                      <td className="py-1.5 pr-4">
                        <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 9 }}>{row.label}</span>
                      </td>
                      {sims.slice(0, 4).map(s => (
                        <td key={s.id} className="py-1.5 pr-4">
                          {row.key === '_coord'
                            ? <span className="font-share-tech text-sim-text" style={{ fontSize: 10 }}>{s.start_latitude?.toFixed(1)}°N {s.start_longitude?.toFixed(1)}°E</span>
                            : row.key === 'status'
                              ? <span className="font-share-tech tracking-widest" style={{ fontSize: 10, color: s.status === 'running' ? '#4ecb71' : '#6070a0' }}>{s.status.toUpperCase()}</span>
                              : <span className="font-orbitron font-bold text-sim-text" style={{ fontSize: 11 }}>{s[row.key]}</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Simulation list */}
        {sims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20"
            style={{ border: '1px solid rgba(79,110,247,0.1)', background: 'rgba(4,4,15,0.6)' }}>
            <div className="relative w-12 h-12 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full border border-sim-accent/20" style={{ animation: 'ring-expand 3s ease-out infinite' }} />
              <Globe size={22} className="text-sim-muted/50" />
            </div>
            <p className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 10 }}>
              {lang === 'en' ? 'NO SIMULATIONS FOUND' : 'SİMÜLASYON BULUNAMADI'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sims.map((sim, i) => (
              <div key={sim.id}
                className="relative flex items-center gap-4 cursor-pointer transition-all duration-200"
                style={{
                  background: 'rgba(4,4,15,0.9)', border: '1px solid rgba(79,110,247,0.18)', padding: '14px 16px',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                  animation: `boot-in 0.4s ease-out ${i * 60}ms both`,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,110,247,0.45)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,110,247,0.18)'}
                onClick={() => navigate(`/simulation/${sim.id}`)}>

                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{
                    background: sim.status === 'running' ? 'rgba(78,203,113,0.1)' : 'rgba(79,110,247,0.1)',
                    border: `1px solid ${sim.status === 'running' ? 'rgba(78,203,113,0.3)' : 'rgba(79,110,247,0.2)'}`,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                  }}>
                  {sim.status === 'running' ? <div className="w-2 h-2 rounded-full bg-sim-green pulse-live" /> : <Globe size={14} className="text-sim-accent/60" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-orbitron font-bold tracking-[0.1em] truncate" style={{ fontSize: 13, color: '#d0d8f8' }}>{sim.name}</p>
                  <p className="font-share-tech text-sim-muted mt-0.5 tracking-widest" style={{ fontSize: 9 }}>
                    {sim.start_latitude?.toFixed(2)}°N {sim.start_longitude?.toFixed(2)}°E
                    <span className="mx-2 text-sim-border/60">·</span>
                    {lang === 'en' ? 'YEAR' : 'YIL'} <span className="text-sim-accent">{sim.current_year}</span>
                  </p>
                </div>

                <div className="flex-shrink-0 px-3 py-1 font-share-tech tracking-widest" style={{
                  fontSize: 9,
                  background: sim.status === 'running' ? 'rgba(78,203,113,0.1)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${sim.status === 'running' ? 'rgba(78,203,113,0.35)' : 'rgba(79,110,247,0.15)'}`,
                  color: sim.status === 'running' ? '#4ecb71' : '#6070a0',
                }}>
                  {sim.status.toUpperCase()}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); deleteSim(sim.id, sim.name); }}
                  className="flex-shrink-0 p-2 transition-all duration-150"
                  title={lang === 'en' ? 'Delete' : 'Sil'}
                  style={{ background: 'transparent', border: '1px solid rgba(224,90,90,0.25)', color: '#7a3030', lineHeight: 0,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e05a5a'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(224,90,90,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a3030'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(224,90,90,0.25)'; }}>
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/simulation/${sim.id}`); }}
                  className="flex-shrink-0 p-2 transition-all duration-150 hover:brightness-125"
                  style={{ background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.35)', color: '#4f6ef7', lineHeight: 0,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                  <Play size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 relative z-1">
        <span className="font-share-tech text-sim-muted/30 tracking-[0.3em]" style={{ fontSize: 9 }}>
          BOLD ASKERİ TEKNOLOJİ VE SAVUNMA SANAYİ A.Ş. © 2026
        </span>
      </div>
    </div>
  );
}

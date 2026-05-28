import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, BarChart2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

// ── Trait definitions ────────────────────────────────────────────────────────
const TRAIT_GROUPS = [
  {
    group: 'Zihin', groupEn: 'Mind',
    traits: [
      { id: 'fluid_intelligence', label: 'Zeka',          labelEn: 'Intelligence',  color: '#7c3aed' },
      { id: 'curiosity',          label: 'Merak',          labelEn: 'Curiosity',     color: '#f59e0b' },
      { id: 'conscientiousness',  label: 'Disiplin',       labelEn: 'Discipline',    color: '#3b82f6' },
      { id: 'language_capacity',  label: 'Dil Yeteneği',   labelEn: 'Language',      color: '#14b8a6' },
      { id: 'artistic_sense',     label: 'Sanat Duygusu',  labelEn: 'Art Sense',     color: '#f97316' },
    ],
  },
  {
    group: 'Sosyal', groupEn: 'Social',
    traits: [
      { id: 'empathy',            label: 'Empati',         labelEn: 'Empathy',       color: '#ec4899' },
      { id: 'aggression',         label: 'Saldırganlık',   labelEn: 'Aggression',    color: '#ef4444' },
    ],
  },
  {
    group: 'Beden', groupEn: 'Body',
    traits: [
      { id: 'height',             label: 'Boy',            labelEn: 'Height',        color: '#06b6d4' },
      { id: 'metabolism',         label: 'Metabolizma',    labelEn: 'Metabolism',    color: '#a855f7' },
      { id: 'immune_strength',    label: 'Bağışıklık',     labelEn: 'Immunity',      color: '#22c55e' },
      { id: 'fertility',          label: 'Doğurganlık',    labelEn: 'Fertility',     color: '#f43f5e' },
      { id: 'longevity',          label: 'Uzun Ömür',      labelEn: 'Longevity',     color: '#84cc16' },
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
  { value: 'black', label: 'Black', labelTr: 'Siyah',   color: '#111' },
  { value: 'dark',  label: 'Dark',  labelTr: 'Koyu',    color: '#2c1810' },
  { value: 'brown', label: 'Brown', labelTr: 'Kahve',   color: '#5c3317' },
  { value: 'light', label: 'Light', labelTr: 'Açık',    color: '#c68642' },
  { value: 'blond', label: 'Blond', labelTr: 'Sarı',    color: '#d4a017' },
  { value: 'red',   label: 'Red',   labelTr: 'Kızıl',   color: '#8b2500' },
];

const SKIN_OPTIONS: { value: string; label: string; labelTr: string; color: string }[] = [
  { value: 'fair',  label: 'Fair',   labelTr: 'Açık',   color: '#fde8d0' },
  { value: 'light', label: 'Light',  labelTr: 'Bej',    color: '#f5c9a0' },
  { value: 'olive', label: 'Olive',  labelTr: 'Buğday', color: '#c68642' },
  { value: 'tan',   label: 'Tan',    labelTr: 'Bronz',  color: '#a0614a' },
  { value: 'brown', label: 'Brown',  labelTr: 'Esmer',  color: '#7b4a2d' },
  { value: 'dark',  label: 'Dark',   labelTr: 'Koyu',   color: '#3d1f0d' },
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
});

// ── Sub-components ────────────────────────────────────────────────────────────
function TraitSlider({ id, label, labelEn, color, value, onChange, lang }: any) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-0.5">
        <span style={{ fontSize: 9, color: '#7080a0', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>
          {lang === 'tr' ? label : labelEn}
        </span>
        <span style={{ fontSize: 9, color, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
          {(value * 100).toFixed(0)}%
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

function FounderCard({ title, sex, data, onChange, lang }: { title: string; sex: string; data: any; onChange: (k: string, v: any) => void; lang: string }) {
  const accentColor = sex === 'male' ? '#4f9ef7' : '#ec4899';
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
        {/* Identity */}
        <div>
          <div style={{ fontSize: 8, color: '#3a5070', letterSpacing: '0.2em', marginBottom: 6, fontFamily: 'Share Tech Mono' }}>
            {lang === 'tr' ? '── KİMLİK ──' : '── IDENTITY ──'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'İSİM' : 'NAME'}</div>
              <input value={data.name ?? ''} onChange={e => onChange('name', e.target.value)}
                style={{ width: '100%', background: 'rgba(5,5,20,0.9)', border: '1px solid rgba(79,110,247,0.2)', padding: '4px 8px', fontSize: 11, color: '#c0d0f0', fontFamily: 'Share Tech Mono', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'YAŞ' : 'AGE'}</div>
              <input type="number" min="15" max="65" value={data.ageYears ?? 20}
                onChange={e => onChange('ageYears', parseInt(e.target.value || '20', 10))}
                style={{ width: '100%', background: 'rgba(5,5,20,0.9)', border: '1px solid rgba(79,110,247,0.2)', padding: '4px 8px', fontSize: 11, color: '#c0d0f0', fontFamily: 'Share Tech Mono', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 3, fontFamily: 'Share Tech Mono' }}>{lang === 'tr' ? 'CİNSİYET' : 'SEX'}</div>
              <div style={{ padding: '4px 8px', fontSize: 11, color: accentColor, fontFamily: 'Share Tech Mono', border: `1px solid ${accentColor}30`, background: `${accentColor}08` }}>
                {sex === 'male' ? (lang === 'tr' ? 'ERKEK' : 'MALE') : (lang === 'tr' ? 'KADIN' : 'FEMALE')}
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <div style={{ fontSize: 8, color: '#3a5070', letterSpacing: '0.2em', marginBottom: 6, fontFamily: 'Share Tech Mono' }}>
            {lang === 'tr' ? '── DIŞ GÖRÜNÜŞ ──' : '── APPEARANCE ──'}
          </div>
          <div className="space-y-2">
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 4, fontFamily: 'Share Tech Mono' }}>
                {lang === 'tr' ? 'GÖZ RENGİ' : 'EYE COLOR'}&nbsp;
                <span style={{ color: '#8090c0' }}>— {EYE_OPTIONS.find(o => o.value === data.eye_color)?.[lang === 'tr' ? 'labelTr' : 'label']}</span>
              </div>
              <ColorChips options={EYE_OPTIONS} value={data.eye_color} onChange={v => onChange('eye_color', v)} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 4, fontFamily: 'Share Tech Mono' }}>
                {lang === 'tr' ? 'SAÇ RENGİ' : 'HAIR COLOR'}&nbsp;
                <span style={{ color: '#8090c0' }}>— {HAIR_OPTIONS.find(o => o.value === data.hair_color)?.[lang === 'tr' ? 'labelTr' : 'label']}</span>
              </div>
              <ColorChips options={HAIR_OPTIONS} value={data.hair_color} onChange={v => onChange('hair_color', v)} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#5060a0', marginBottom: 4, fontFamily: 'Share Tech Mono' }}>
                {lang === 'tr' ? 'TEN RENGİ' : 'SKIN TONE'}&nbsp;
                <span style={{ color: '#8090c0' }}>— {SKIN_OPTIONS.find(o => o.value === data.skin_tone)?.[lang === 'tr' ? 'labelTr' : 'label']}</span>
              </div>
              <ColorChips options={SKIN_OPTIONS} value={data.skin_tone} onChange={v => onChange('skin_tone', v)} />
            </div>
          </div>
        </div>

        {/* Genetic traits grouped */}
        {TRAIT_GROUPS.map(group => (
          <div key={group.group}>
            <div style={{ fontSize: 8, color: '#3a5070', letterSpacing: '0.2em', marginBottom: 6, fontFamily: 'Share Tech Mono' }}>
              {lang === 'tr' ? `── ${group.group.toUpperCase()} ──` : `── ${group.groupEn.toUpperCase()} ──`}
            </div>
            {group.traits.map(t => (
              <TraitSlider key={t.id} {...t} value={data[t.id] ?? 0.5} onChange={onChange} lang={lang} />
            ))}
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
  const [form, setForm] = useState({ name: '', latitude: '39.9334', longitude: '32.8597' });
  const [founder1, setFounder1] = useState(founderDefaults('male'));
  const [founder2, setFounder2] = useState(founderDefaults('female'));
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

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
      setFounder1(founderDefaults('male'));
      setFounder2(founderDefaults('female'));
    } finally { setLoading(false); }
  }

  const runningCount = sims.filter(s => s.status === 'running').length;

  return (
    <div className="min-h-screen text-sim-text overflow-auto" style={{ background: '#030310' }}>

      {/* Scanlines overlay */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        }} />

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
              <span className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 8 }}>MEDENİYET SIMÜLATÖRÜ</span>
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
                className="p-2 text-sim-muted hover:text-red-400 transition-colors"
                style={{ lineHeight: 0 }}>
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
            <p className="font-share-tech text-sim-muted tracking-widest ml-3" style={{ fontSize: 10 }}>
              {lang === 'en' ? '// EMERGENT CIVILIZATION ENGINE — START FROM 2 INDIVIDUALS' : '// ORTAYA ÇIKAN MEDENİYET — 2 BİREYDEN BAŞLAT'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sims.length >= 2 && (
              <button onClick={() => setCompareMode(c => !c)}
                className="flex items-center gap-2 font-share-tech tracking-widest transition-all duration-150"
                style={{
                  padding: '6px 12px',
                  fontSize: 10,
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
                padding: '6px 14px',
                fontSize: 10,
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
            <span style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid rgba(79,110,247,0.9)',borderLeft:'2px solid rgba(79,110,247,0.9)',zIndex:2 }} />
            <span style={{ position:'absolute',top:-1,right:-1,width:12,height:12,borderTop:'2px solid rgba(79,110,247,0.9)',borderRight:'2px solid rgba(79,110,247,0.9)',zIndex:2 }} />
            <span style={{ position:'absolute',bottom:-1,left:-1,width:12,height:12,borderBottom:'2px solid rgba(79,110,247,0.9)',borderLeft:'2px solid rgba(79,110,247,0.9)',zIndex:2 }} />
            <span style={{ position:'absolute',bottom:-1,right:-1,width:12,height:12,borderBottom:'2px solid rgba(79,110,247,0.9)',borderRight:'2px solid rgba(79,110,247,0.9)',zIndex:2 }} />

            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(79,110,247,0.2)' }}>
              <div className="w-1 h-4 bg-sim-accent" style={{ boxShadow: '0 0 6px rgba(79,110,247,0.8)' }} />
              <span className="font-orbitron text-xs font-semibold tracking-[0.2em] text-sim-accent">
                {lang === 'en' ? 'NEW SIMULATION' : 'YENİ SİMÜLASYON'}
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
                    style={{
                      background: 'rgba(7,7,26,0.9)',
                      border: '1px solid rgba(79,110,247,0.25)',
                      padding: '8px 12px',
                      color: '#c0c8e8',
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(79,110,247,0.7)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(79,110,247,0.25)'}
                  />
                </div>
                <div>
                  <label className="font-share-tech text-sim-muted tracking-widest block mb-1.5" style={{ fontSize: 9 }}>
                    {lang === 'en' ? 'LATITUDE' : 'ENLEM'}
                  </label>
                  <input type="number" step="0.0001" value={form.latitude}
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    className="w-full text-sm focus:outline-none font-share-tech"
                    style={{
                      background: 'rgba(7,7,26,0.9)',
                      border: '1px solid rgba(79,110,247,0.25)',
                      padding: '8px 12px',
                      color: '#c0c8e8',
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(79,110,247,0.7)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(79,110,247,0.25)'}
                  />
                </div>
                <div>
                  <label className="font-share-tech text-sim-muted tracking-widest block mb-1.5" style={{ fontSize: 9 }}>
                    {lang === 'en' ? 'LONGITUDE' : 'BOYLAM'}
                  </label>
                  <input type="number" step="0.0001" value={form.longitude}
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    className="w-full text-sm focus:outline-none font-share-tech"
                    style={{
                      background: 'rgba(7,7,26,0.9)',
                      border: '1px solid rgba(79,110,247,0.25)',
                      padding: '8px 12px',
                      color: '#c0c8e8',
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(79,110,247,0.7)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(79,110,247,0.25)'}
                  />
                </div>
              </div>

              {/* Founder genetics — always visible */}
              <div style={{ fontSize: 9, color: '#3a5070', letterSpacing: '0.2em', fontFamily: 'Share Tech Mono', marginBottom: 10 }}>
                {lang === 'tr' ? '// KURUCU GENETİĞİ' : '// FOUNDER GENETICS'}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <FounderCard
                  title={lang === 'tr' ? 'KURUCU 1 — ERKEK' : 'FOUNDER 1 — MALE'}
                  sex="male" data={founder1} onChange={makeSetter(setFounder1)} lang={lang}
                />
                <FounderCard
                  title={lang === 'tr' ? 'KURUCU 2 — KADIN' : 'FOUNDER 2 — FEMALE'}
                  sex="female" data={founder2} onChange={makeSetter(setFounder2)} lang={lang}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={createSim} disabled={loading || !form.name}
                  className="font-share-tech tracking-widest transition-all duration-150 disabled:opacity-40"
                  style={{
                    padding: '7px 16px',
                    fontSize: 10,
                    background: 'rgba(79,110,247,0.25)',
                    border: '1px solid rgba(79,110,247,0.5)',
                    color: '#a0b4ff',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    boxShadow: '0 0 15px rgba(79,110,247,0.2)',
                  }}>
                  {loading ? (lang === 'en' ? 'INITIALIZING…' : 'BAŞLATILIYOR…') : (lang === 'en' ? 'INITIALIZE' : 'BAŞLAT')}
                </button>
                <button onClick={() => { setShowNew(false); }}
                  className="font-share-tech tracking-widest text-sim-muted hover:text-sim-text transition-colors"
                  style={{
                    padding: '7px 16px',
                    fontSize: 10,
                    background: 'rgba(22,22,58,0.5)',
                    border: '1px solid rgba(79,110,247,0.15)',
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
            background: 'rgba(4,4,15,0.97)',
            border: '1px solid rgba(79,110,247,0.2)',
            animation: 'boot-in 0.4s ease-out both',
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
                      <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 9 }}>
                        {lang === 'en' ? 'METRIC' : 'METRİK'}
                      </span>
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
          <div className="flex flex-col items-center justify-center py-20" style={{
            border: '1px solid rgba(79,110,247,0.1)',
            background: 'rgba(4,4,15,0.6)',
          }}>
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
                  background: 'rgba(4,4,15,0.9)',
                  border: '1px solid rgba(79,110,247,0.18)',
                  padding: '14px 16px',
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                  animation: `boot-in 0.4s ease-out ${i * 60}ms both`,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,110,247,0.45)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,110,247,0.18)'}
                onClick={() => navigate(`/simulation/${sim.id}`)}>

                {/* Status indicator */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                  style={{
                    background: sim.status === 'running' ? 'rgba(78,203,113,0.1)' : 'rgba(79,110,247,0.1)',
                    border: `1px solid ${sim.status === 'running' ? 'rgba(78,203,113,0.3)' : 'rgba(79,110,247,0.2)'}`,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                  }}>
                  {sim.status === 'running'
                    ? <div className="w-2 h-2 rounded-full bg-sim-green pulse-live" />
                    : <Globe size={14} className="text-sim-accent/60" />
                  }
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
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(224,90,90,0.25)',
                    color: '#7a3030',
                    lineHeight: 0,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e05a5a'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(224,90,90,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a3030'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(224,90,90,0.25)'; }}>
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/simulation/${sim.id}`); }}
                  className="flex-shrink-0 p-2 transition-all duration-150 hover:brightness-125"
                  style={{
                    background: 'rgba(79,110,247,0.15)',
                    border: '1px solid rgba(79,110,247,0.35)',
                    color: '#4f6ef7',
                    lineHeight: 0,
                    clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                  }}>
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

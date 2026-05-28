import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

const FOUNDER_TRAITS = [
  { id: 'fluid_intelligence', label: 'Intelligence', labelTr: 'Zeka', color: '#7c3aed' },
  { id: 'empathy',            label: 'Empathy',      labelTr: 'Empati',   color: '#ec4899' },
  { id: 'curiosity',          label: 'Curiosity',    labelTr: 'Merak',    color: '#f59e0b' },
  { id: 'aggression',         label: 'Aggression',   labelTr: 'Saldırganlık', color: '#ef4444' },
  { id: 'conscientiousness',  label: 'Discipline',   labelTr: 'Disiplin', color: '#3b82f6' },
  { id: 'artistic_sense',     label: 'Art Sense',    labelTr: 'Sanat Duygusu', color: '#f97316' },
];

const DEFAULT_TRAITS = Object.fromEntries(FOUNDER_TRAITS.map(t => [t.id, 0.5]));

function TraitSlider({ traitId, label, labelTr, color, value, onChange, lang }: any) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-sim-muted">{lang === 'en' ? label : labelTr}</span>
        <span className="text-xs font-mono" style={{ color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onChange(traitId, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function FounderConfig({ label, traits, onChange, lang }: any) {
  return (
    <div className="bg-sim-bg rounded-lg p-3 border border-sim-border">
      <div className="text-xs font-semibold text-sim-text mb-3">{label}</div>
      {FOUNDER_TRAITS.map(t => (
        <TraitSlider key={t.id} {...t} value={traits[t.id] ?? 0.5} onChange={onChange} lang={lang} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout, lang } = useSimStore();
  const [sims, setSims] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '39.9334', longitude: '32.8597' });
  const [founder1, setFounder1] = useState({ ...DEFAULT_TRAITS });
  const [founder2, setFounder2] = useState({ ...DEFAULT_TRAITS });
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { axios.get('/api/simulations', { headers }).then(r => setSims(r.data)); }, []);

  function setTrait(setter: any) {
    return (traitId: string, value: number) => setter((prev: any) => ({ ...prev, [traitId]: value }));
  }

  async function createSim() {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/simulations', {
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        founder1_params: showAdvanced ? founder1 : undefined,
        founder2_params: showAdvanced ? founder2 : undefined,
      }, { headers });
      setSims(s => [data, ...s]);
      setShowNew(false);
      setFounder1({ ...DEFAULT_TRAITS });
      setFounder2({ ...DEFAULT_TRAITS });
    } finally { setLoading(false); }
  }

  const runningCount = sims.filter(s => s.status === 'running').length;

  return (
    <div className="min-h-screen bg-sim-bg text-sim-text overflow-auto">
      {/* Header */}
      <div className="border-b border-sim-border panel-glass sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-sim-accent" />
            <span className="font-mono font-semibold tracking-wider">ANTİLİA-SİM</span>
          </div>
          <div className="flex items-center gap-3">
            {runningCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-sim-green">
                <span className="w-2 h-2 rounded-full bg-sim-green animate-pulse" />
                {runningCount} {lang === 'en' ? 'running' : 'çalışıyor'}
              </div>
            )}
            <span className="text-sm text-sim-muted">{user?.username}</span>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded hover:bg-sim-border transition-colors text-sim-muted hover:text-red-400">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">{lang === 'en' ? 'My Simulations' : 'Simülasyonlarım'}</h2>
            <p className="text-sm text-sim-muted mt-0.5">
              {lang === 'en' ? 'Start a civilization from 2 individuals' : '2 bireyden bir medeniyet başlatın'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sims.length >= 2 && (
              <button onClick={() => setCompareMode(c => !c)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${compareMode ? 'bg-sim-accent/20 border-sim-accent/40 text-sim-accent' : 'border-sim-border text-sim-muted hover:text-sim-text'}`}>
                <BarChart2 size={15} />
                {lang === 'en' ? 'Compare' : 'Karşılaştır'}
              </button>
            )}
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={15} />
              {lang === 'en' ? 'New Simulation' : 'Yeni Simülasyon'}
            </button>
          </div>
        </div>

        {/* New simulation form */}
        {showNew && (
          <div className="panel-glass rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold mb-4">{lang === 'en' ? 'New Simulation' : 'Yeni Simülasyon'}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-3">
                <label className="block text-xs text-sim-muted mb-1.5">{lang === 'en' ? 'Name' : 'Ad'}</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-sim-muted mb-1.5">{lang === 'en' ? 'Latitude' : 'Enlem'}</label>
                <input type="number" step="0.0001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-sim-muted mb-1.5">{lang === 'en' ? 'Longitude' : 'Boylam'}</label>
                <input type="number" step="0.0001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" />
              </div>
            </div>

            {/* Advanced founder config */}
            <button onClick={() => setShowAdvanced(a => !a)}
              className="flex items-center gap-2 text-xs text-sim-muted hover:text-sim-text mb-3 transition-colors">
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {lang === 'en' ? 'Founder Genetics (Advanced)' : 'Kurucu Genetiği (Gelişmiş)'}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FounderConfig
                  label={lang === 'en' ? 'Founder 1 — Male' : 'Kurucu 1 — Erkek'}
                  traits={founder1} onChange={setTrait(setFounder1)} lang={lang}
                />
                <FounderConfig
                  label={lang === 'en' ? 'Founder 2 — Female' : 'Kurucu 2 — Kadın'}
                  traits={founder2} onChange={setTrait(setFounder2)} lang={lang}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={createSim} disabled={loading || !form.name}
                className="px-4 py-2 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {loading ? (lang === 'en' ? 'Creating…' : 'Oluşturuluyor…') : (lang === 'en' ? 'Create' : 'Oluştur')}
              </button>
              <button onClick={() => { setShowNew(false); setShowAdvanced(false); }}
                className="px-4 py-2 bg-sim-border hover:bg-sim-border/60 rounded-lg text-sm transition-colors">
                {lang === 'en' ? 'Cancel' : 'İptal'}
              </button>
            </div>
          </div>
        )}

        {/* Compare mode — side by side stats */}
        {compareMode && sims.length >= 2 && (
          <div className="panel-glass rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart2 size={14} className="text-sim-accent" />
              {lang === 'en' ? 'Parallel Comparison' : 'Paralel Karşılaştırma'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-sim-muted">
                    <th className="text-left pb-2 pr-4">{lang === 'en' ? 'Metric' : 'Metrik'}</th>
                    {sims.slice(0, 4).map(s => <th key={s.id} className="text-left pb-2 pr-4 text-sim-text">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sim-border/20">
                  {[
                    { label: lang === 'en' ? 'Year' : 'Yıl', key: 'current_year' },
                    { label: lang === 'en' ? 'Status' : 'Durum', key: 'status' },
                    { label: lang === 'en' ? 'Location' : 'Konum', key: '_coord' },
                  ].map(row => (
                    <tr key={row.key}>
                      <td className="py-1.5 pr-4 text-sim-muted">{row.label}</td>
                      {sims.slice(0, 4).map(s => (
                        <td key={s.id} className="py-1.5 pr-4 font-mono text-sim-text">
                          {row.key === '_coord' ? `${s.start_latitude?.toFixed(1)}°N ${s.start_longitude?.toFixed(1)}°E` :
                           row.key === 'status' ? <span className={s.status === 'running' ? 'text-sim-green' : 'text-sim-muted'}>{s.status}</span> :
                           s[row.key]}
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
          <div className="panel-glass rounded-xl p-12 text-center">
            <Globe size={40} className="text-sim-muted mx-auto mb-4" />
            <p className="text-sim-muted">{lang === 'en' ? 'No simulations yet.' : 'Henüz simülasyon yok.'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sims.map(sim => (
              <div key={sim.id}
                className="panel-glass rounded-xl p-5 flex items-center gap-4 hover:border-sim-accent/30 transition-all cursor-pointer"
                onClick={() => navigate(`/simulation/${sim.id}`)}>
                <div className="w-10 h-10 rounded-lg bg-sim-accent/10 flex items-center justify-center flex-shrink-0">
                  <Globe size={18} className="text-sim-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sim.name}</p>
                  <p className="text-xs text-sim-muted mt-0.5 font-mono">
                    {sim.start_latitude?.toFixed(2)}°N {sim.start_longitude?.toFixed(2)}°E · {lang === 'en' ? 'Year' : 'Yıl'} {sim.current_year}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-mono flex-shrink-0 ${sim.status === 'running' ? 'bg-sim-green/10 text-sim-green' : 'bg-sim-border text-sim-muted'}`}>
                  {sim.status}
                </div>
                <button onClick={e => { e.stopPropagation(); navigate(`/simulation/${sim.id}`); }}
                  className="p-2 rounded-lg bg-sim-accent/10 hover:bg-sim-accent/20 text-sim-accent transition-colors flex-shrink-0">
                  <Play size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-sim-muted py-6">
        Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026
      </div>
    </div>
  );
}

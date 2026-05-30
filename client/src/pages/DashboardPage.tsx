import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, BarChart2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import AriaButton from '../components/layout/AriaButton';
import LangToggle from '../components/layout/LangToggle';
import SimCreationWizard from '../components/SimCreationWizard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout, lang } = useSimStore();
  const [sims, setSims]             = useState<any[]>([]);
  const [showNew, setShowNew]       = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading]       = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { axios.get('/api/simulations', { headers }).then(r => setSims(r.data)); }, []);

  async function deleteSim(id: string, name: string) {
    if (!confirm(lang === 'en' ? `Delete "${name}"? This cannot be undone.` : `"${name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await axios.delete(`/api/simulations/${id}`, { headers });
      setSims(s => s.filter(sim => sim.id !== id));
    } catch { alert(lang === 'en' ? 'Delete failed.' : 'Silme başarısız.'); }
  }

  async function createSim(form: any, founder1: any, founder2: any) {
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
    } finally { setLoading(false); }
  }

  const runningCount = sims.filter(s => s.status === 'running').length;

  return (
    <div className="min-h-screen text-sim-text" style={{ background: '#030310' }}>

      {/* Scanlines overlay */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)' }} />

      {/* Header */}
      <div className="sticky top-0 z-10"
        style={{
          background: 'rgba(3,3,16,0.97)',
          borderBottom: '1px solid rgba(200,34,34,0.7)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 2px 30px rgba(200,34,34,0.2)',
        }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sim-accent/50 neon-breathe" />
              <Globe size={16} className="text-sim-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(79,110,247,0.8))' }} />
            </div>
            <div className="flex flex-col leading-none gap-1">
              <span className="font-orbitron text-sim-accent font-bold tracking-[0.25em]" style={{ fontSize: 18, textShadow: '0 0 10px rgba(79,110,247,0.6)' }}>ANATOLİA-SİM</span>
              <span className="font-share-tech tracking-[0.3em]" style={{ fontSize: 16, color: '#e0e0f0' }}>{lang === 'tr' ? 'MEDENİYET' : 'CIVILIZATION'}</span>
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
              <LangToggle />
              <AriaButton />
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

        {/* Wizard overlay — shown instead of list when creating */}
        {showNew ? (
          <SimCreationWizard
            lang={lang}
            loading={loading}
            onSubmit={createSim}
            onExit={() => setShowNew(false)}
          />
        ) : (
          <>
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
                      padding: '8px 14px', fontSize: 16,
                      background: compareMode ? 'rgba(79,110,247,0.2)' : 'rgba(22,22,58,0.6)',
                      border: `1px solid ${compareMode ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.15)'}`,
                      color: compareMode ? '#a0b4ff' : '#6070a0',
                      clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
                    }}>
                    <BarChart2 size={15} />
                    {lang === 'en' ? 'COMPARE' : 'KARŞILAŞTIR'}
                  </button>
                )}
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 font-share-tech tracking-widest transition-all duration-150 hover:brightness-110"
                  style={{
                    padding: '8px 16px', fontSize: 16,
                    background: 'rgba(79,110,247,0.2)',
                    border: '1px solid rgba(79,110,247,0.5)',
                    color: '#e0e0f0',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    boxShadow: '0 0 15px rgba(79,110,247,0.2)',
                  }}>
                  <Plus size={15} />
                  {lang === 'en' ? 'NEW SIMULATION' : 'YENİ SİMÜLASYON'}
                </button>
              </div>
            </div>

            {/* Compare mode */}
            {compareMode && sims.length >= 2 && (
              <div className="mb-6 relative" style={{
                background: 'rgba(4,4,15,0.97)', border: '1px solid rgba(200,34,34,0.6)', animation: 'boot-in 0.4s ease-out both',
              }}>
                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(200,34,34,0.4)' }}>
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
                        <tr key={row.key} style={{ borderBottom: '1px solid rgba(200,34,34,0.2)' }}>
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
                style={{ border: '1px solid rgba(200,34,34,0.4)', background: 'rgba(4,4,15,0.6)' }}>
                <div className="relative w-12 h-12 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border border-sim-accent/20" style={{ animation: 'ring-expand 3s ease-out infinite' }} />
                  <Globe size={22} className="text-sim-muted" />
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
                      background: 'rgba(4,4,15,0.9)', border: '1px solid rgba(200,34,34,0.6)', padding: '14px 16px',
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                      animation: `boot-in 0.4s ease-out ${i * 60}ms both`,
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,34,34,0.9)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,34,34,0.6)'}
                    onClick={() => navigate(`/simulation/${sim.id}`)}>

                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                      style={{
                        background: sim.status === 'running' ? 'rgba(78,203,113,0.1)' : 'rgba(79,110,247,0.1)',
                        border: `1px solid ${sim.status === 'running' ? 'rgba(78,203,113,0.3)' : 'rgba(79,110,247,0.2)'}`,
                        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                      }}>
                      {sim.status === 'running' ? <div className="w-2 h-2 rounded-full bg-sim-green pulse-live" /> : <Globe size={14} className="text-sim-accent" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-orbitron font-bold tracking-[0.1em] truncate" style={{ fontSize: 14, color: '#d0d8f8' }}>{sim.name}</p>
                      <p className="font-share-tech mt-0.5 tracking-widest" style={{ fontSize: 14, color: '#e0e0f0' }}>
                        {sim.start_latitude?.toFixed(2)}°N {sim.start_longitude?.toFixed(2)}°E
                        <span className="mx-2" style={{ color: 'rgba(200,34,34,0.4)' }}>·</span>
                        {lang === 'en' ? 'YEAR' : 'YIL'} <span style={{ color: '#e0e0f0' }}>{sim.current_year}</span>
                      </p>
                    </div>

                    <div className="flex-shrink-0 px-3 py-1 font-share-tech tracking-widest" style={{
                      fontSize: 13,
                      background: sim.status === 'running' ? 'rgba(78,203,113,0.1)' : 'rgba(22,22,58,0.6)',
                      border: `1px solid ${sim.status === 'running' ? 'rgba(78,203,113,0.35)' : 'rgba(79,110,247,0.15)'}`,
                      color: '#e0e0f0',
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 relative z-1">
        <span className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 11 }}>
          {lang === 'tr' ? 'BOLD ASKERİ TEKNOLOJİ VE SAVUNMA SANAYİ A.Ş. © 2026' : 'BOLD MILITARY TECHNOLOGY AND DEFENSE INDUSTRIES INC. © 2026'}
        </span>
      </div>
    </div>
  );
}

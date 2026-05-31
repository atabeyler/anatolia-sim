import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, BarChart2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import SimCreationWizard from '../components/SimCreationWizard';
import SimMenuOverlay from '../components/layout/SimMenuOverlay';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout, lang } = useSimStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sims, setSims]             = useState<any[]>([]);
  const [showNew, setShowNew]       = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading]       = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { axios.get('/api/simulations', { headers }).then(r => setSims(r.data)); }, []);

  // Keep ARIA informed of wizard open/closed state
  useEffect(() => {
    (window as any).__ariaWizardOpen = showNew;
    if (!showNew) (window as any).__ariaWizardStep = -1;
  }, [showNew]);

  const simsRef = useRef<any[]>([]);
  simsRef.current = sims;

  useEffect(() => {
    function onAriaDashboard(e: Event) {
      const { action, index } = (e as CustomEvent).detail;
      switch (action) {
        case 'create_simulation': setShowNew(true); break;
        case 'open_simulation': {
          const sim = simsRef.current[index ?? 0];
          if (sim) navigate(`/simulation/${sim.id}`);
          break;
        }
        case 'toggle_compare': setCompareMode(c => !c); break;
        case 'wizard_exit': setShowNew(false); break;
      }
    }
    window.addEventListener('aria-dashboard', onAriaDashboard);
    return () => window.removeEventListener('aria-dashboard', onAriaDashboard);
  }, [navigate]);

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
          boxShadow: '0 2px 20px rgba(200,34,34,0.5), 0 0 8px rgba(200,34,34,0.3)',
        }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sim-accent/50 neon-breathe" />
              <Globe size={14} style={{ color: '#4f9ef7', filter: 'drop-shadow(0 0 4px rgba(79,158,247,0.8))' }} />
            </div>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="font-orbitron font-bold tracking-[0.2em]" style={{ fontSize: 'clamp(12px, 3.8vw, 18px)', color: '#e0e0f0' }}>ANATOLİA-SİM</span>
              <span className="font-share-tech tracking-[0.25em]" style={{ fontSize: 'clamp(10px, 3vw, 16px)', color: '#cc2222' }}>{lang === 'tr' ? 'MEDENİYET' : 'CIVILIZATION'}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {runningCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1"
                style={{ background: 'rgba(78,203,113,0.1)', border: '1px solid rgba(78,203,113,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
                <span className="font-share-tech text-sim-green tracking-widest" style={{ fontSize: 10 }}>
                  {runningCount} {lang === 'en' ? 'ACTIVE' : 'AKTİF'}
                </span>
              </div>
            )}
            <span className="hidden sm:block font-share-tech text-sim-muted tracking-widest font-bold" style={{ fontSize: 14 }}>{user?.username?.toUpperCase()}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-sim-muted hover:text-red-400 transition-colors"
              style={{ fontFamily:'Share Tech Mono,monospace', fontSize:14, fontWeight:700, letterSpacing:'0.1em' }}>
              <LogOut size={13} />
              <span className="hidden sm:inline">ÇIKIŞ</span>
            </button>
            <button onClick={() => setMenuOpen(true)}
              className="flex items-center gap-1 font-share-tech transition-all hover:brightness-110"
              style={{ padding: '5px 8px', fontSize: 13, border: '1px solid rgba(200,34,34,0.5)', color: '#9abaaa', background: 'transparent', letterSpacing: '0.08em' }}>
              ☰<span className="hidden sm:inline ml-1" style={{ fontSize: 11 }}>MENÜ</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 relative z-1">

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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5 sm:mb-8">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-sim-accent" style={{ boxShadow: '0 0 8px rgba(79,110,247,0.8)' }} />
                <h2 className="font-orbitron font-bold tracking-[0.12em] text-sim-text" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
                  {lang === 'en' ? 'SIMULATION REGISTRY' : 'SİMÜLASYON KAYITLARI'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {sims.length >= 2 && (
                  <button onClick={() => setCompareMode(c => !c)}
                    className="flex items-center gap-1.5 font-share-tech tracking-widest transition-all duration-150"
                    style={{
                      padding: '7px 10px', fontSize: 'clamp(12px, 3vw, 14px)',
                      background: compareMode ? 'rgba(79,110,247,0.2)' : 'rgba(22,22,58,0.6)',
                      border: `1px solid ${compareMode ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.15)'}`,
                      color: '#e0e0f0',
                      clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
                    }}>
                    <BarChart2 size={13} />
                    <span className="hidden sm:inline">{lang === 'en' ? 'COMPARE' : 'KARŞILAŞTIR'}</span>
                    <span className="sm:hidden">{lang === 'en' ? 'CMP' : 'KAR'}</span>
                  </button>
                )}
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 font-share-tech tracking-widest transition-all duration-150 hover:brightness-110"
                  style={{
                    padding: '7px 10px', fontSize: 'clamp(12px, 3vw, 14px)',
                    background: 'rgba(79,110,247,0.2)',
                    border: '1px solid rgba(79,110,247,0.5)',
                    color: '#e0e0f0',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    boxShadow: '0 0 15px rgba(79,110,247,0.2)',
                  }}>
                  <Plus size={13} />
                  <span className="hidden sm:inline">{lang === 'en' ? 'NEW SIMULATION' : 'YENİ SİMÜLASYON'}</span>
                  <span className="sm:hidden">{lang === 'en' ? 'NEW' : 'YENİ'}</span>
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
                          <span className="font-share-tech tracking-widest" style={{ fontSize: 14, color: '#e0e0f0' }}>{lang === 'en' ? 'METRIC' : 'METRİK'}</span>
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
                            <span className="font-share-tech tracking-widest" style={{ fontSize: 14, color: '#e0e0f0' }}>{row.label}</span>
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
                <div className="relative w-16 h-16 flex items-center justify-center mb-5">
                  <div className="absolute inset-0 rounded-full" style={{
                    border: '1.5px solid rgba(200,34,34,0.7)',
                    boxShadow: '0 0 10px rgba(200,34,34,0.5), inset 0 0 10px rgba(200,34,34,0.1)',
                    animation: 'ring-expand 2.4s ease-out infinite',
                  }} />
                  <div className="absolute inset-0 rounded-full" style={{
                    border: '1px solid rgba(200,34,34,0.45)',
                    boxShadow: '0 0 14px rgba(200,34,34,0.35)',
                    animation: 'ring-expand 2.4s ease-out 0.8s infinite',
                  }} />
                  <div className="absolute inset-0 rounded-full" style={{
                    border: '1px solid rgba(200,34,34,0.25)',
                    animation: 'ring-expand 2.4s ease-out 1.6s infinite',
                  }} />
                  <Globe size={26} style={{ color: '#4f9ef7', filter: 'drop-shadow(0 0 8px rgba(79,158,247,0.9)) drop-shadow(0 0 16px rgba(79,158,247,0.5))' }} />
                </div>
                <p className="font-share-tech tracking-[0.3em]" style={{ fontSize: 14, color: '#e0e0f0' }}>
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

      {/* Menu Overlay */}
      <SimMenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Footer */}
      <div className="text-center py-6 px-4 relative z-1">
        <span className="font-share-tech text-sim-muted tracking-[0.2em]" style={{ fontSize: 11, lineHeight: 1.7 }}>
          <span className="hidden sm:inline">
            {lang === 'tr' ? 'BOLD ASKERİ TEKNOLOJİ VE SAVUNMA SANAYİ A.Ş. © 2026' : 'BOLD MILITARY TECHNOLOGY AND DEFENSE INDUSTRIES INC. © 2026'}
          </span>
          <span className="sm:hidden">
            {lang === 'tr' ? <>BOLD ASKERİ TEKNOLOJİ<br />VE SAVUNMA SANAYİ A.Ş. © 2026</> : <>BOLD MILITARY TECHNOLOGY<br />AND DEFENSE INDUSTRIES INC. © 2026</>}
          </span>
        </span>
      </div>
    </div>
  );
}

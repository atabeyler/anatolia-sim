import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut, BarChart2, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import SimCreationWizard from '../components/SimCreationWizard';

const LANGUAGES = [
  { code: 'en' as const, label: 'English',   beta: false },
  { code: 'tr' as const, label: 'Türkçe',    beta: false },
  { code: 'de' as const, label: 'Deutsch',   beta: true  },
  { code: 'fr' as const, label: 'Français',  beta: true  },
  { code: 'ar' as const, label: 'العربية',   beta: true  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout, lang, setLang } = useSimStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState<'about' | 'mission' | 'contact' | 'language' | null>(null);
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
            <button onClick={() => { setMenuOpen(true); setMenuPage(null); }}
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
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setMenuOpen(false); setMenuPage(null); }}>
          <div style={{ background: 'rgba(3,3,16,0.98)', border: '1px solid rgba(200,34,34,0.7)', minWidth: 320, maxWidth: 460, width: '92vw', fontFamily: 'Share Tech Mono, monospace', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid rgba(200,34,34,0.5)', background: 'rgba(3,3,16,0.9)' }}>
              <div style={{ width: 3, height: 14, background: '#cc2222', boxShadow: '0 0 6px rgba(200,34,34,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#e0e0f0', letterSpacing: '0.2em', flex: 1 }}>
                {menuPage === null ? 'ANATOLİA-SİM'
                  : menuPage === 'language' ? (lang === 'en' ? 'LANGUAGE' : 'DİL SEÇENEKLERİ')
                  : menuPage === 'about' ? (lang === 'en' ? 'ABOUT' : 'HAKKIMIZDA')
                  : menuPage === 'mission' ? (lang === 'en' ? 'MISSION & VISION' : 'MİSYON & VİZYON')
                  : (lang === 'en' ? 'CONTACT' : 'İLETİŞİM')}
              </span>
              <button onClick={() => { if (menuPage) { setMenuPage(null); } else { setMenuOpen(false); } }}
                style={{ background: 'transparent', border: 'none', color: '#7a9a88', cursor: 'pointer', fontSize: 9, letterSpacing: '0.1em', padding: '2px 6px', display: 'flex', alignItems: 'center' }}>
                {menuPage ? '← GERİ' : <X size={12} />}
              </button>
            </div>

            {/* Main menu list */}
            {menuPage === null && (
              <div style={{ padding: '6px 0' }}>
                {[
                  { id: 'language', labelTr: '🌐 Dil / Language', labelEn: '🌐 Language' },
                  { id: 'about',    labelTr: 'Hakkımızda',        labelEn: 'About' },
                  { id: 'mission',  labelTr: 'Misyon & Vizyon',   labelEn: 'Mission & Vision' },
                  { id: 'contact',  labelTr: 'İletişim',          labelEn: 'Contact' },
                ].map(item => (
                  <button key={item.id} onClick={() => setMenuPage(item.id as any)}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,30,0.8)', color: '#a0b8c0', fontSize: 11, textAlign: 'left', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
                    › {lang === 'tr' ? item.labelTr : item.labelEn}
                  </button>
                ))}
                <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(200,34,34,0.25)', marginTop: 4 }}>
                  <div style={{ fontSize: 7.5, color: 'rgba(150,50,50,0.5)', letterSpacing: '0.08em' }}>
                    RST Q-Nation 200120401018 · Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026
                  </div>
                </div>
              </div>
            )}

            {/* Language selection */}
            {menuPage === 'language' && (
              <div style={{ padding: '6px 0' }}>
                {LANGUAGES.map(l => (
                  <button key={l.code}
                    onClick={() => { setLang(l.code); setMenuOpen(false); setMenuPage(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '11px 14px',
                      background: lang === l.code ? 'rgba(200,34,34,0.08)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(10,10,30,0.8)',
                      color: lang === l.code ? '#e05a5a' : '#a0b8c0',
                      fontSize: 12, textAlign: 'left', cursor: 'pointer',
                      letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace',
                    }}>
                    <span style={{ flex: 1 }}>› {l.label}</span>
                    {l.beta && <span style={{ fontSize: 8, padding: '1px 5px', border: '1px solid rgba(200,34,34,0.35)', color: '#cc5555' }}>BETA</span>}
                    {lang === l.code && <span style={{ fontSize: 11, color: '#e05a5a' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {/* About / Mission / Contact sub-pages */}
            {menuPage !== null && menuPage !== 'language' && (() => {
              const pages: Record<string, { tr: string; en: string }> = {
                about: {
                  tr: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
                  en: 'ANATOLİA-SİM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., designed to experimentally test the simulation hypothesis.\n\nIt models real biological, genetic, environmental and social mechanisms — observing a population that starts from two individuals, evolving over thousands of years into language, belief, technology and governance.\n\nProject Code: RST Q-Nation 200120401018',
                },
                mission: {
                  tr: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
                  en: "MISSION\nTest the simulation hypothesis on scientific and experimental grounds; reveal the universal patterns of human civilization.\n\nVISION\nBecome the world's most comprehensive artificial life and civilization simulation platform; produce objective data about the origin, consciousness and future of humanity.",
                },
                contact: {
                  tr: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
                  en: 'Project Owner: Yalçın Atabey\nOrganization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nPhone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 All rights reserved.',
                },
              };
              const text = lang === 'tr' ? pages[menuPage].tr : pages[menuPage].en;
              return (
                <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
                  {text.split('\n').map((line, i) => (
                    <p key={i} style={{ fontSize: line === line.toUpperCase() && line.length > 2 ? 8.5 : 9, color: line === line.toUpperCase() && line.length > 2 ? '#cc2222' : '#7aaa90', margin: '0 0 5px 0', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                      {line || <br />}
                    </p>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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

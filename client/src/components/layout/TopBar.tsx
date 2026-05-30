import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Globe, X, Settings, Menu, LogOut, Home, Sliders, Power } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AriaButton from './AriaButton';

const SPEEDS = [1, 10, 100, 1000];

function Seg({ label, value, color = '#c0ccee' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0 px-2">
      <span className="font-share-tech tracking-widest" style={{ fontSize: 7, color: '#6878a8' }}>{label}</span>
      <span className="font-orbitron font-bold" style={{ color, fontSize: 12, textShadow: `0 0 8px ${color}55` }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6 flex-shrink-0" style={{ background: 'rgba(79,110,247,0.25)' }} />;
}

function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const { lang, toggleLang, speedMultiplier, setSpeed } = useSimStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-16 top-14 z-50 w-56 flex flex-col"
      style={{ background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.35)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(79,110,247,0.2)' }}>
        <Settings size={11} className="text-sim-accent" />
        <span className="font-orbitron text-sim-accent tracking-[0.2em]" style={{ fontSize: 9 }}>AYARLAR</span>
        <div className="flex-1" />
        <button onClick={onClose} className="text-sim-muted hover:text-sim-accent"><X size={11} /></button>
      </div>

      <div className="p-3 space-y-3">
        {/* Language */}
        <div>
          <div className="font-share-tech text-sim-muted tracking-widest mb-1.5" style={{ fontSize: 8 }}>DİL / LANGUAGE</div>
          <div className="flex gap-1">
            {(['en', 'tr'] as const).map(l => (
              <button key={l} onClick={() => lang !== l && toggleLang()}
                className="flex-1 font-share-tech tracking-widest transition-all"
                style={{
                  padding: '4px 0', fontSize: 10,
                  background: lang === l ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${lang === l ? 'rgba(79,110,247,0.7)' : 'rgba(79,110,247,0.15)'}`,
                  color: lang === l ? '#c0ccff' : '#4a5578',
                  boxShadow: lang === l ? '0 0 8px rgba(79,110,247,0.3)' : 'none',
                }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Speed */}
        <div>
          <div className="font-share-tech text-sim-muted tracking-widest mb-1.5" style={{ fontSize: 8 }}>SİMÜLASYON HIZI</div>
          <div className="flex gap-1">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="flex-1 font-share-tech tracking-widest transition-all"
                style={{
                  padding: '4px 0', fontSize: 10,
                  background: speedMultiplier === s ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${speedMultiplier === s ? 'rgba(79,110,247,0.7)' : 'rgba(79,110,247,0.15)'}`,
                  color: speedMultiplier === s ? '#c0ccff' : '#4a5578',
                }}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const INFO_PAGES: Record<string, { titleEn: string; titleTr: string; content: string }> = {
  about: {
    titleEn: 'About', titleTr: 'Hakkımızda',
    content: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
  },
  mission: {
    titleEn: 'Mission & Vision', titleTr: 'Misyon & Vizyon',
    content: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
  },
  contact: {
    titleEn: 'Contact', titleTr: 'İletişim',
    content: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
  },
};

function MenuOverlay({ onClose, onTerminate }: { onClose: () => void; onTerminate: () => void }) {
  const { currentSim, user, logout, lang } = useSimStore();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [subPage, setSubPage] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const infoPage = subPage ? INFO_PAGES[subPage] : null;

  return (
    <div ref={ref} className="absolute right-4 top-14 z-50 flex flex-col"
      style={{ width: infoPage ? 280 : 224, background: 'rgba(4,4,18,0.98)', border: '1px solid rgba(79,110,247,0.35)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(79,110,247,0.2)' }}>
        {infoPage ? (
          <button onClick={() => setSubPage(null)} className="text-sim-muted hover:text-sim-accent mr-1">←</button>
        ) : (
          <Menu size={11} className="text-sim-accent" />
        )}
        <span className="font-orbitron text-sim-accent tracking-[0.2em]" style={{ fontSize: 9 }}>
          {infoPage ? (lang === 'en' ? infoPage.titleEn : infoPage.titleTr) : 'MENÜ'}
        </span>
        <div className="flex-1" />
        <button onClick={onClose} className="text-sim-muted hover:text-sim-accent"><X size={11} /></button>
      </div>

      {infoPage ? (
        <div className="p-3 max-h-72 overflow-y-auto">
          {infoPage.content.split('\n').map((line, i) => (
            <p key={i} className={`font-share-tech tracking-wide leading-relaxed ${line === '' ? 'mb-1' : 'mb-0'}`}
              style={{ fontSize: 9, color: line.match(/^[A-ZÇŞĞÜÖİ\s]{3,}$/) ? '#7090ff' : '#8898c8' }}>
              {line || ' '}
            </p>
          ))}
        </div>
      ) : (
        <>
          {currentSim && (
            <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(79,110,247,0.1)', background: 'rgba(79,110,247,0.05)' }}>
              <div className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 7 }}>AKTİF SİMÜLASYON</div>
              <div className="font-orbitron text-sim-accent font-bold tracking-wider mt-0.5" style={{ fontSize: 10 }}>{currentSim.name}</div>
            </div>
          )}

          <div className="p-1.5 space-y-0.5">
            <button onClick={() => { onClose(); navigate('/'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sim-border/30"
              style={{ color: '#8898c8' }}>
              <Home size={12} />
              <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>{lang === 'en' ? 'Home' : 'Ana Sayfa'}</span>
            </button>

            <button onClick={() => setSubPage('about')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sim-border/30"
              style={{ color: '#8898c8' }}>
              <span style={{ fontSize: 11 }}>ℹ</span>
              <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>{lang === 'en' ? 'About' : 'Hakkımızda'}</span>
            </button>

            <button onClick={() => setSubPage('mission')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sim-border/30"
              style={{ color: '#8898c8' }}>
              <span style={{ fontSize: 11 }}>◎</span>
              <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>{lang === 'en' ? 'Mission & Vision' : 'Misyon & Vizyon'}</span>
            </button>

            <button onClick={() => setSubPage('contact')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sim-border/30"
              style={{ color: '#8898c8' }}>
              <span style={{ fontSize: 11 }}>✉</span>
              <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>{lang === 'en' ? 'Contact' : 'İletişim'}</span>
            </button>

            {user?.role === 'admin' && (
              <button onClick={() => { onClose(); navigate('/admin'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sim-border/30"
                style={{ color: '#f97316' }}>
                <Sliders size={12} />
                <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>Admin Paneli</span>
              </button>
            )}

            {currentSim && currentSim.status !== 'completed' && (
              <>
                <div className="h-px mx-2 my-1" style={{ background: 'rgba(249,115,22,0.2)' }} />
                <button onClick={() => { onTerminate(); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-orange-900/20"
                  style={{ color: '#f97316' }}>
                  <Power size={12} />
                  <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>Simülasyonu Sonlandır</span>
                </button>
              </>
            )}

            <div className="h-px mx-2 my-1" style={{ background: 'rgba(79,110,247,0.12)' }} />

            <button onClick={() => { logout(); navigate('/'); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-red-900/20"
              style={{ color: '#e05a5a' }}>
              <LogOut size={12} />
              <span className="font-share-tech tracking-wider" style={{ fontSize: 10 }}>{lang === 'en' ? 'Sign Out' : 'Çıkış Yap'}</span>
            </button>
          </div>

          {user && (
            <div className="px-3 py-1.5 border-t" style={{ borderColor: 'rgba(79,110,247,0.1)' }}>
              <div className="font-share-tech text-sim-muted/50 tracking-widest" style={{ fontSize: 7 }}>
                {user.username} · {user.role?.toUpperCase()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TopBar() {
  const { currentSim, stats, lang, toggleLang, speedMultiplier, setSpeed, accessToken, setCurrentSim } = useSimStore();
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleTerminate() {
    if (!currentSim || !accessToken) return;
    const confirmed = window.confirm(
      lang === 'tr'
        ? `"${currentSim.name}" simülasyonunu kalıcı olarak sonlandırmak istiyor musunuz?`
        : `Permanently terminate simulation "${currentSim.name}"?`
    );
    if (!confirmed) return;
    try {
      await axios.post(`/api/simulations/${currentSim.id}/terminate`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCurrentSim({ ...currentSim, status: 'completed' });
    } catch {}
  }

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  async function toggleSim() {
    if (!currentSim || !accessToken) return;
    setSimLoading(true);
    setSimError('');
    try {
      const action = currentSim.status === 'running' ? 'pause' : 'start';
      await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCurrentSim({ ...currentSim, status: action === 'start' ? 'running' : 'paused' });
    } catch (err: any) {
      setSimError(err.response?.data?.error ?? 'Hata');
      setTimeout(() => setSimError(''), 3000);
    } finally {
      setSimLoading(false);
    }
  }

  const isRunning = currentSim?.status === 'running';
  const hourStr = stats?.hour !== undefined ? String(stats.hour).padStart(2, '0') + ':00' : '--:--';

  return (
    <div className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center px-3 gap-2"
      style={{
        background: 'rgba(3,3,16,0.97)',
        borderBottom: '1px solid rgba(79,110,247,0.4)',
        boxShadow: '0 2px 24px rgba(79,110,247,0.1)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* Logo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 rounded-full border border-sim-accent/60"
            style={{ animation: 'neon-breathe 3.5s ease-in-out infinite' }} />
          <Globe size={13} className="text-sim-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(79,110,247,0.8))' }} />
        </div>
        {!isMobile && (
          <div className="flex flex-col leading-none">
            <span className="font-orbitron text-sim-accent font-bold tracking-[0.2em]" style={{ fontSize: 10 }}>ANATOLİA</span>
            <span className="font-share-tech text-sim-muted tracking-[0.25em]" style={{ fontSize: 7 }}>{lang === 'tr' ? 'SİM MEDENİYET' : 'SIM CIVILIZATION'}</span>
          </div>
        )}
      </div>

      {!isMobile && <Divider />}

      {/* Sim controls */}
      {currentSim ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={toggleSim} disabled={simLoading}
            className="flex items-center gap-1 transition-all duration-200 disabled:opacity-50"
            style={{
              padding: '4px 10px',
              background: isRunning ? 'rgba(212,168,56,0.15)' : 'rgba(78,203,113,0.18)',
              border: `1px solid ${isRunning ? 'rgba(212,168,56,0.5)' : 'rgba(78,203,113,0.5)'}`,
              clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
            }}>
            {simLoading
              ? <span className="font-share-tech" style={{ color: '#8898c8', fontSize: 9 }}>...</span>
              : isRunning
                ? <><Pause size={10} style={{ color: '#d4a838' }} /><span className="font-share-tech" style={{ color: '#d4a838', fontSize: 9 }}>{lang === 'tr' ? 'DURDUR' : 'PAUSE'}</span></>
                : <><Play size={10} style={{ color: '#4ecb71' }} /><span className="font-share-tech" style={{ color: '#4ecb71', fontSize: 9 }}>{lang === 'tr' ? 'BAŞLAT' : 'START'}</span></>
            }
          </button>

          {!isMobile && (
            <div className="flex gap-0.5">
              {SPEEDS.map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className="font-share-tech transition-all"
                  style={{
                    padding: '2px 5px', fontSize: 9,
                    background: speedMultiplier === s ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.6)',
                    border: `1px solid ${speedMultiplier === s ? 'rgba(79,110,247,0.6)' : 'rgba(79,110,247,0.18)'}`,
                    color: speedMultiplier === s ? '#c0ccff' : '#6a7ab0',
                  }}>
                  {s}×
                </button>
              ))}
            </div>
          )}

          {isRunning && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
              {!isMobile && <span className="font-share-tech text-sim-green" style={{ fontSize: 8 }}>LIVE</span>}
            </div>
          )}

          {simError && !isMobile && (
            <span className="font-share-tech text-sim-red" style={{ fontSize: 9 }}>{simError}</span>
          )}
        </div>
      ) : (
        !isMobile && (
          <span className="font-share-tech tracking-widest text-sim-muted" style={{ fontSize: 9 }}>
            {lang === 'tr' ? 'SİMÜLASYON SEÇİLMEDİ' : 'NO SIMULATION'}
          </span>
        )
      )}

      <div className="flex-1" />

      {/* SIM TIME — YIL / GÜN / SAAT */}
      {stats && (
        <div className="flex items-center flex-shrink-0"
          style={{
            background: 'rgba(4,4,20,0.85)',
            border: '1px solid rgba(79,110,247,0.2)',
            padding: '2px 0',
          }}>
          <Divider />
          <Seg label={lang === 'tr' ? 'YIL' : 'YEAR'} value={stats.year.toLocaleString()} color="#7090ff" />
          <Divider />
          <Seg label={lang === 'tr' ? 'GÜN' : 'DAY'} value={stats.day.toLocaleString()} color="#9aabcf" />
          {!isMobile && (
            <>
              <Divider />
              <Seg label={lang === 'tr' ? 'SAAT' : 'HOUR'} value={hourStr} color="#6888cc" />
            </>
          )}
          <Divider />
          <Seg label={lang === 'tr' ? 'NÜFUS' : 'POP'} value={stats.population.toLocaleString()} color="#d4a838" />
          {!isMobile && (
            <>
              <Divider />
              <Seg label={lang === 'tr' ? 'MEVSİM' : 'SEASON'} value={stats.season.toUpperCase().slice(0, 3)} color="#a0b4ff" />
              <Divider />
              <Seg label={lang === 'tr' ? 'ISI' : 'TEMP'} value={`${stats.temperature}°`}
                color={stats.temperature > 30 ? '#e05a5a' : stats.temperature < 5 ? '#00d4ff' : '#a0b4ff'} />
              <Divider />
              <Seg label="TECH" value={`T${stats.technologies}`} color="#4ecb71" />
            </>
          )}
          <Divider />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-1 relative">
        {/* Sesli asistan */}
        {!isMobile && <AriaButton />}

        {/* TR / EN — her ikisi görünür */}
        <div className="flex items-center flex-shrink-0" style={{ border: '1px solid rgba(79,110,247,0.3)', overflow: 'hidden' }}>
          {(['en', 'tr'] as const).map((l, i) => (
            <button key={l} onClick={() => lang !== l && toggleLang()}
              className="font-share-tech tracking-widest transition-all duration-150"
              style={{
                padding: '4px 8px', fontSize: 14,
                background: lang === l ? 'rgba(79,110,247,0.28)' : 'rgba(10,10,30,0.8)',
                color: lang === l ? '#c0ccff' : '#4a5578',
                borderRight: i === 0 ? '1px solid rgba(79,110,247,0.25)' : 'none',
                fontWeight: lang === l ? 700 : 400,
              }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Ayarlar */}
        <button
          onClick={() => { setShowSettings(v => !v); setShowMenu(false); }}
          className="p-1.5 transition-colors"
          style={{ color: showSettings ? '#4f6ef7' : '#6878a8' }}
          title={lang === 'tr' ? 'Ayarlar' : 'Settings'}>
          <Settings size={13} />
        </button>

        {/* Menü / İçindekiler */}
        <button
          onClick={() => { setShowMenu(v => !v); setShowSettings(false); }}
          className="p-1.5 transition-colors"
          style={{ color: showMenu ? '#4f6ef7' : '#6878a8' }}
          title={lang === 'tr' ? 'Menü' : 'Menu'}>
          <Menu size={13} />
        </button>

        {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} onTerminate={handleTerminate} />}
      </div>
    </div>
  );
}

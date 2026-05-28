import { useState } from 'react';
import { Play, Pause, Globe, Menu, Settings } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';

const SPEEDS = [1, 10, 100, 1000];

function Seg({ label, value, color = '#c0ccee' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2.5">
      <span className="font-share-tech tracking-widest" style={{ fontSize: 8, color: '#8898c8' }}>{label}</span>
      <span className="font-orbitron font-bold tracking-wider" style={{ color, fontSize: 13, textShadow: `0 0 8px ${color}66` }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-7 bg-sim-border/50 flex-shrink-0" />;
}

export default function TopBar() {
  const { currentSim, stats, lang, toggleLang, speedMultiplier, setSpeed, accessToken, setCurrentSim } = useSimStore();
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

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

  return (
    <div className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center px-4 gap-2"
      style={{
        background: 'rgba(3,3,16,0.97)',
        borderBottom: '1px solid rgba(79,110,247,0.4)',
        boxShadow: '0 2px 24px rgba(79,110,247,0.1)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sim-accent/60"
            style={{ animation: 'neon-breathe 3.5s ease-in-out infinite' }} />
          <Globe size={13} className="text-sim-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(79,110,247,0.8))' }} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-orbitron text-sim-accent font-bold tracking-[0.2em]" style={{ fontSize: 11 }}>ANATOLİA</span>
          <span className="font-share-tech text-sim-muted tracking-[0.25em]" style={{ fontSize: 8 }}>SİM MEDENİYET</span>
        </div>
      </div>

      <Divider />

      {/* Sim controls */}
      {currentSim ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={toggleSim}
            disabled={simLoading}
            className="flex items-center gap-1.5 transition-all duration-200 disabled:opacity-50"
            style={{
              padding: '5px 12px',
              background: isRunning ? 'rgba(212,168,56,0.15)' : 'rgba(78,203,113,0.18)',
              border: `1px solid ${isRunning ? 'rgba(212,168,56,0.5)' : 'rgba(78,203,113,0.5)'}`,
              boxShadow: isRunning ? '0 0 10px rgba(212,168,56,0.2)' : '0 0 10px rgba(78,203,113,0.2)',
              clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
            }}>
            {simLoading
              ? <span className="font-share-tech tracking-widest" style={{ color: '#8898c8', fontSize: 10 }}>...</span>
              : isRunning
                ? <><Pause size={11} style={{ color: '#d4a838' }} /><span className="font-share-tech tracking-widest" style={{ color: '#d4a838', fontSize: 10 }}>{lang === 'tr' ? 'DURDUR' : 'PAUSE'}</span></>
                : <><Play size={11} style={{ color: '#4ecb71' }} /><span className="font-share-tech tracking-widest" style={{ color: '#4ecb71', fontSize: 10 }}>{lang === 'tr' ? 'BAŞLAT' : 'START'}</span></>
            }
          </button>

          {simError && (
            <span className="font-share-tech text-sim-red tracking-wider" style={{ fontSize: 9 }}>{simError}</span>
          )}

          <div className="flex gap-0.5">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="font-share-tech transition-all duration-150"
                style={{
                  padding: '3px 7px', fontSize: 10,
                  background: speedMultiplier === s ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${speedMultiplier === s ? 'rgba(79,110,247,0.6)' : 'rgba(79,110,247,0.18)'}`,
                  color: speedMultiplier === s ? '#c0ccff' : '#6a7ab0',
                  boxShadow: speedMultiplier === s ? '0 0 8px rgba(79,110,247,0.3)' : 'none',
                }}>
                {s}×
              </button>
            ))}
          </div>

          {isRunning && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
              <span className="font-share-tech text-sim-green tracking-[0.2em]" style={{ fontSize: 9 }}>LIVE</span>
            </div>
          )}
        </div>
      ) : (
        <span className="font-share-tech tracking-widest text-sim-muted" style={{ fontSize: 9 }}>
          {lang === 'tr' ? 'SİMÜLASYON SEÇİLMEDİ' : 'NO SIMULATION'}
        </span>
      )}

      <div className="flex-1" />

      {/* Stats display */}
      {stats ? (
        <div className="flex items-center flex-shrink-0"
          style={{
            background: 'rgba(4,4,20,0.85)',
            border: '1px solid rgba(79,110,247,0.2)',
            padding: '2px 0',
          }}>
          <Divider />
          <Seg label={lang === 'tr' ? 'YIL' : 'YEAR'} value={stats.year.toLocaleString()} color="#7090ff" />
          <Divider />
          <Seg label={lang === 'tr' ? 'GÜN' : 'DAY'} value={stats.day.toLocaleString()} color="#8898c8" />
          <Divider />
          <Seg label={lang === 'tr' ? 'NÜFUS' : 'POP'} value={stats.population.toLocaleString()} color="#d4a838" />
          <Divider />
          <Seg label={lang === 'tr' ? 'MEVSİM' : 'SEASON'} value={stats.season.toUpperCase().slice(0, 3)} color="#a0b4ff" />
          <Divider />
          <Seg label={lang === 'tr' ? 'ISI' : 'TEMP'} value={`${stats.temperature}°`}
            color={stats.temperature > 30 ? '#e05a5a' : stats.temperature < 5 ? '#00d4ff' : '#a0b4ff'} />
          <Divider />
          <Seg label={lang === 'tr' ? 'TEKNOLOJİ' : 'TECH'} value={`T${stats.technologies}`} color="#4ecb71" />
          <Divider />
        </div>
      ) : currentSim && (
        <div className="flex items-center gap-2 px-3" style={{ background: 'rgba(4,4,20,0.85)', border: '1px solid rgba(79,110,247,0.15)', height: 32 }}>
          <div className="w-1.5 h-1.5 rounded-full bg-sim-muted animate-pulse" />
          <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 9 }}>
            {lang === 'tr' ? 'VERİ BEKLENİYOR...' : 'AWAITING DATA...'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        <button onClick={toggleLang}
          className="font-share-tech tracking-widest transition-all duration-150 hover:text-sim-accent hover:border-sim-accent/50"
          style={{
            padding: '5px 10px', fontSize: 10,
            background: 'rgba(22,22,58,0.9)',
            border: '1px solid rgba(79,110,247,0.3)',
            color: '#9aabcf',
          }}>
          {lang === 'en' ? 'TR' : 'EN'}
        </button>
        <button className="p-1.5 text-sim-muted hover:text-sim-accent transition-colors"><Settings size={14} /></button>
        <button className="p-1.5 text-sim-muted hover:text-sim-accent transition-colors"><Menu size={14} /></button>
      </div>
    </div>
  );
}

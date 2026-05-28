import { Play, Pause, Settings, Globe, Menu } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import AriaButton from './AriaButton';

const SPEEDS = [1, 10, 100, 1000];

function SegDisplay({ label, value, color = '#a0b4ff' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span className="font-share-tech text-sim-muted tracking-[0.15em]" style={{ fontSize: 8 }}>{label}</span>
      <span className="font-orbitron font-bold tracking-wider" style={{ color, fontSize: 12, textShadow: `0 0 8px ${color}88` }}>{value}</span>
    </div>
  );
}

export default function TopBar() {
  const { currentSim, stats, lang, toggleLang, speedMultiplier, setSpeed, accessToken, setCurrentSim } = useSimStore();

  async function toggleSim() {
    if (!currentSim || !accessToken) return;
    const action = currentSim.status === 'running' ? 'pause' : 'start';
    await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    setCurrentSim({ ...currentSim, status: action === 'start' ? 'running' : 'paused' });
  }

  const isRunning = currentSim?.status === 'running';

  return (
    <div className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center px-4 gap-3"
      style={{
        background: 'rgba(3,3,16,0.97)',
        borderBottom: '1px solid rgba(79,110,247,0.35)',
        boxShadow: '0 0 30px rgba(79,110,247,0.08), 0 2px 0 rgba(79,110,247,0.06)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* Logo */}
      <div className="flex items-center gap-2 min-w-[170px]">
        <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 rounded-full border border-sim-accent/60"
            style={{ animation: 'neon-breathe 3.5s ease-in-out infinite' }} />
          <Globe size={14} className="text-sim-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(79,110,247,0.8))' }} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-orbitron text-sim-accent font-bold tracking-[0.2em]" style={{ fontSize: 11, textShadow: '0 0 10px rgba(79,110,247,0.6)' }}>ANTİLİA</span>
          <span className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 8 }}>SİM MEDENİYET</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-sim-border/60" />

      {/* Controls */}
      {currentSim && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSim}
            className="flex items-center gap-1.5 transition-all duration-200"
            style={{
              padding: '4px 10px',
              background: isRunning ? 'rgba(212,168,56,0.12)' : 'rgba(78,203,113,0.12)',
              border: `1px solid ${isRunning ? 'rgba(212,168,56,0.4)' : 'rgba(78,203,113,0.4)'}`,
              clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
            }}>
            {isRunning
              ? <><Pause size={11} style={{ color: '#d4a838' }} /><span className="font-share-tech tracking-widest" style={{ color: '#d4a838', fontSize: 10 }}>PAUSE</span></>
              : <><Play size={11} style={{ color: '#4ecb71' }} /><span className="font-share-tech tracking-widest" style={{ color: '#4ecb71', fontSize: 10 }}>START</span></>
            }
          </button>

          <div className="flex gap-0.5">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="font-share-tech transition-all duration-150"
                style={{
                  padding: '3px 7px',
                  fontSize: 10,
                  background: speedMultiplier === s ? 'rgba(79,110,247,0.25)' : 'rgba(22,22,58,0.6)',
                  border: `1px solid ${speedMultiplier === s ? 'rgba(79,110,247,0.6)' : 'rgba(79,110,247,0.15)'}`,
                  color: speedMultiplier === s ? '#a0b4ff' : '#4a5578',
                  boxShadow: speedMultiplier === s ? '0 0 8px rgba(79,110,247,0.3)' : 'none',
                }}>
                {s}×
              </button>
            ))}
          </div>

          {isRunning && (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sim-green pulse-live" />
              <span className="font-share-tech text-sim-green tracking-[0.2em]" style={{ fontSize: 9 }}>LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* Stats segment display */}
      <div className="flex-1" />
      {stats && (
        <div className="flex items-center"
          style={{
            background: 'rgba(4,4,15,0.8)',
            border: '1px solid rgba(79,110,247,0.15)',
            padding: '4px 0',
          }}>
          <div className="w-px h-6 bg-sim-border/40 mx-1" />
          <SegDisplay label="YEAR" value={stats.year.toLocaleString()} color="#4f6ef7" />
          <div className="w-px h-6 bg-sim-border/40" />
          <SegDisplay label="POP" value={stats.population.toLocaleString()} color="#d4a838" />
          <div className="w-px h-6 bg-sim-border/40" />
          <SegDisplay label="SEASON" value={stats.season.toUpperCase().slice(0, 3)} color="#a0b4ff" />
          <div className="w-px h-6 bg-sim-border/40" />
          <SegDisplay label="TEMP" value={`${stats.temperature}°`} color={stats.temperature > 30 ? '#e05a5a' : stats.temperature < 5 ? '#00d4ff' : '#a0b4ff'} />
          <div className="w-px h-6 bg-sim-border/40" />
          <SegDisplay label="TECH" value={`T${stats.technologies}`} color="#4ecb71" />
          <div className="w-px h-6 bg-sim-border/40 mx-1" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-3">
        <AriaButton />
        <button onClick={toggleLang}
          className="font-share-tech tracking-widest transition-all duration-150 hover:text-sim-accent"
          style={{
            padding: '4px 8px',
            fontSize: 10,
            background: 'rgba(22,22,58,0.8)',
            border: '1px solid rgba(79,110,247,0.2)',
            color: '#6070a0',
          }}>
          {lang === 'en' ? 'TR' : 'EN'}
        </button>
        <button className="p-1.5 text-sim-muted hover:text-sim-accent transition-colors">
          <Settings size={14} />
        </button>
        <button className="p-1.5 text-sim-muted hover:text-sim-accent transition-colors">
          <Menu size={14} />
        </button>
      </div>
    </div>
  );
}

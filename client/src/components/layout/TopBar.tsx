import { Play, Pause, Settings, Globe, Menu } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import AriaButton from './AriaButton';

const SPEEDS = [1, 10, 100, 1000];

export default function TopBar() {
  const { currentSim, stats, lang, toggleLang, speedMultiplier, setSpeed, accessToken, setCurrentSim } = useSimStore();

  async function toggleSim() {
    if (!currentSim || !accessToken) return;
    const action = currentSim.status === 'running' ? 'pause' : 'start';
    await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    setCurrentSim({ ...currentSim, status: action === 'start' ? 'running' : 'paused' });
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-12 panel-glass z-50 flex items-center px-4 gap-4 border-b border-sim-border">
      <div className="flex items-center gap-2 min-w-[160px]"><Globe size={18} className="text-sim-accent" /><span className="font-mono text-sm font-semibold text-sim-text tracking-wider">ANTİLİA-SİM</span></div>
      {currentSim && (
        <div className="flex items-center gap-2">
          <button onClick={toggleSim} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sim-border hover:bg-sim-accent/20 transition-colors text-xs">
            {currentSim.status === 'running' ? <><Pause size={13} className="text-sim-gold" /><span className="text-sim-gold">Pause</span></> : <><Play size={13} className="text-sim-green" /><span className="text-sim-green">Start</span></>}
          </button>
          <div className="flex gap-1">{SPEEDS.map(s => <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-1 text-xs rounded font-mono transition-colors ${speedMultiplier===s?'bg-sim-accent text-white':'bg-sim-border text-sim-muted hover:text-sim-text'}`}>{s}×</button>)}</div>
        </div>
      )}
      {currentSim?.status === 'running' && <div className="flex items-center gap-1.5 text-xs text-sim-green"><span className="w-2 h-2 rounded-full bg-sim-green pulse-live" />LIVE</div>}
      <div className="flex-1" />
      {stats && (
        <div className="flex items-center gap-6 text-xs font-mono text-sim-muted">
          <span>Year <span className="text-sim-text font-semibold">{stats.year.toLocaleString()}</span></span>
          <span>Pop <span className="text-sim-gold font-semibold">{stats.population.toLocaleString()}</span></span>
          <span>Season <span className="text-sim-text capitalize">{stats.season}</span></span>
          <span>Temp <span className="text-sim-text">{stats.temperature}°C</span></span>
          <span>Tech <span className="text-sim-accent">{stats.technologies}</span></span>
        </div>
      )}
      <div className="flex items-center gap-2 ml-4">
        <AriaButton />
        <button onClick={toggleLang} className="px-2 py-1 text-xs rounded bg-sim-border hover:bg-sim-accent/20 font-mono transition-colors">{lang === 'en' ? 'TR' : 'EN'}</button>
        <button className="p-1.5 rounded hover:bg-sim-border transition-colors text-sim-muted hover:text-sim-text"><Settings size={15} /></button>
        <button className="p-1.5 rounded hover:bg-sim-border transition-colors text-sim-muted hover:text-sim-text"><Menu size={15} /></button>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Pause, X, Save, FolderOpen, Zap } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { useSimWebSocket } from '../hooks/useSimWebSocket';
import WorldGlobe from '../components/simulation/WorldGlobe';
import PopulationPanel from '../components/panels/PopulationPanel';
import BiologyPanel from '../components/panels/BiologyPanel';
import EnvironmentPanel from '../components/panels/EnvironmentPanel';
import AstronomyPanel from '../components/panels/AstronomyPanel';
import CulturePanel from '../components/panels/CulturePanel';
import LanguagePanel from '../components/panels/LanguagePanel';
import TechnologyPanel from '../components/panels/TechnologyPanel';
import BeliefPanel from '../components/panels/BeliefPanel';
import SocialPanel from '../components/panels/SocialPanel';
import EconomyPanel from '../components/panels/EconomyPanel';
import ArtPanel from '../components/panels/ArtPanel';
import ArchitecturePanel from '../components/panels/ArchitecturePanel';
import LawPanel from '../components/panels/LawPanel';
import MicrobiomePanel from '../components/panels/MicrobiomePanel';
import PsychologyPanel from '../components/panels/PsychologyPanel';
import EpigeneticsPanel from '../components/panels/EpigeneticsPanel';
import GodPanel from '../components/panels/GodPanel';
import TimeMachinePanel from '../components/panels/TimeMachinePanel';
import AnalysisPanel from '../components/panels/AnalysisPanel';
import HypothesisPanel from '../components/panels/HypothesisPanel';

const SPEEDS = [1, 5, 20, 100];

const MODULES = [
  { id: 'population',   label: 'NÜFUS',    labelEn: 'POPUL.' },
  { id: 'olaylar',      label: 'OLAYLAR',  labelEn: 'EVENTS',  special: true },
  { id: 'language',     label: 'DİL',      labelEn: 'LANG.' },
  { id: 'timemachine',  label: 'GEÇMİŞ',   labelEn: 'HISTORY' },
  { id: 'analysis',     label: 'ANALİZ',   labelEn: 'ANALYS.' },
  { id: 'biology',      label: 'MUTASYON', labelEn: 'MUTAT.' },
  { id: 'god',          label: 'TANRI',    labelEn: 'GOD',     accent: '#f97316' },
  { id: 'psychology',   label: 'AKIL',     labelEn: 'MIND' },
  { id: 'environment',  label: 'ÇEVRE',    labelEn: 'ENV.' },
  { id: 'technology',   label: 'TEKNOLOJİ',labelEn: 'TECH' },
  { id: 'belief',       label: 'İNANÇ',    labelEn: 'BELIEF' },
  { id: 'social',       label: 'SOSYAL',   labelEn: 'SOCIAL' },
  { id: 'economy',      label: 'EKONOMİ',  labelEn: 'ECON.' },
  { id: 'culture',      label: 'KÜLTÜR',   labelEn: 'CULT.' },
  { id: 'art',          label: 'SANAT',    labelEn: 'ART' },
  { id: 'astronomy',    label: 'ASTRONOMİ',labelEn: 'ASTRO.' },
  { id: 'hypothesis',   label: 'HİPOTEZ',  labelEn: 'HYPOTH.' },
  { id: 'epigenetics',  label: 'EPİGEN.',  labelEn: 'EPIGEN.' },
];

const TABS = [
  { id: 'harita',  label: 'HARİTA',  labelEn: 'MAP' },
  { id: 'durum',   label: 'DURUM',   labelEn: 'STATUS' },
  { id: 'kontrol', label: 'KONTROL', labelEn: 'CONTROL' },
];

function StatCell({ label, value, color = '#fff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <span style={{ fontSize: 8, color: '#5a7060', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 13, color, fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function SimulationPage() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const { accessToken, setCurrentSim, currentSim, stats, events, activePanel, setActivePanel, lang, toggleLang, speedMultiplier, setSpeed } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'harita' | 'durum' | 'kontrol'>('harita');
  const [realTime, setRealTime] = useState('');
  const [showEventsLog, setShowEventsLog] = useState(true);
  const eventsRef = useRef<HTMLDivElement>(null);
  useSimWebSocket(simId ?? null);

  // Real clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      setRealTime(`${now.getFullYear()} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!simId || !accessToken) return;
    axios.get(`/api/simulations/${simId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => setCurrentSim(r.data));
    const interval = setInterval(() => {
      axios.get(`/api/simulations/${simId}/population?alive=true&limit=500`, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(r => setIndividuals(r.data));
    }, 8000);
    return () => clearInterval(interval);
  }, [simId, accessToken]);

  // Auto-scroll events
  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
  }, [events.length]);

  async function toggleSim() {
    if (!currentSim || !accessToken) return;
    const action = currentSim.status === 'running' ? 'pause' : 'start';
    const { data } = await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    setCurrentSim({ ...currentSim, status: action === 'start' ? 'running' : 'paused' });
  }

  async function changeSpeed(s: number) {
    setSpeed(s);
    if (!simId || !accessToken) return;
    try {
      await axios.post(`/api/simulations/${simId}/speed`, { speed_multiplier: s }, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch { /* optimistic — ignore error */ }
  }

  async function terminateSim() {
    if (!currentSim || !accessToken) return;
    if (!confirm(lang === 'tr' ? 'Simülasyonu sonlandır?' : 'Terminate simulation?')) return;
    await axios.post(`/api/simulations/${currentSim.id}/terminate`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    setCurrentSim({ ...currentSim, status: 'completed' });
  }

  const isRunning = currentSim?.status === 'running';
  const simYear = stats?.year ?? 0;
  const simDay = stats?.day ?? 0;
  const simHour = stats?.hour !== undefined ? `${String(stats.hour).padStart(2,'0')}:00` : '00:00';
  const births = stats?.births ?? 0;
  const deaths = stats?.deaths ?? 0;
  const wordCount = stats?.word_count ?? 0;

  function chipLabel(m: typeof MODULES[0]) {
    return lang === 'tr' ? m.label : m.labelEn;
  }

  // Event log formatting
  function fmtEvent(ev: any) {
    const prefix = `Y${String(ev.sim_year).padStart(4,'0')} G${String(ev.sim_day % 365).padStart(3,'0')}`;
    const icon = ev.event_type?.includes('birth') ? '+' : ev.event_type?.includes('death') ? '†' : ev.event_type?.includes('discovery') ? '◆' : ev.event_type?.includes('disaster') ? '⚠' : '·';
    return `${prefix} ${icon} ${ev.description ?? ev.event_type}`;
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: '#000', color: '#fff', fontFamily: 'Share Tech Mono, monospace' }}>

      {/* ═══ HEADER ═══ */}
      <div className="flex-shrink-0" style={{ background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #1a3a2a' }}>

        {/* Row 1: Logo | Real time | Sim time */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: '1px solid #0d2018' }}>
          <span style={{ fontSize: 13, fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#00e887', letterSpacing: '0.15em' }}>
            ANATOLIA-SIM
          </span>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col items-end">
              <span style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>GERÇEK</span>
              <span style={{ fontSize: 9, color: '#a0c8b0', letterSpacing: '0.05em' }}>{realTime}</span>
            </div>
            <div className="flex flex-col items-end">
              <span style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>SİM</span>
              <span style={{ fontSize: 9, color: '#00e887', letterSpacing: '0.05em', fontFamily: 'Orbitron, monospace' }}>
                Y{String(simYear).padStart(4,'0')} G{String(simDay % 365).padStart(3,'0')} {simHour}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Play/Stop | Stats */}
        <div className="flex items-center gap-2 px-2 py-1" style={{ borderBottom: '1px solid #0d2018' }}>
          <button onClick={toggleSim}
            className="flex items-center gap-1 flex-shrink-0"
            style={{
              padding: '3px 10px', fontSize: 10, fontFamily: 'Share Tech Mono, monospace',
              background: isRunning ? 'rgba(212,56,56,0.15)' : 'rgba(0,232,135,0.15)',
              border: `1px solid ${isRunning ? '#c03030' : '#00e887'}`,
              color: isRunning ? '#e05a5a' : '#00e887',
            }}>
            {isRunning ? <Pause size={9} /> : <Play size={9} />}
            {isRunning ? (lang === 'tr' ? 'DURDUR' : 'PAUSE') : (lang === 'tr' ? 'BAŞLAT' : 'START')}
          </button>

          {isRunning && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00e887', boxShadow: '0 0 6px #00e887', animation: 'pulse 1.5s infinite' }} />}

          <div className="flex-1" />

          <div className="flex gap-3 items-center">
            <StatCell label="NÜFUS" value={stats?.population ?? '—'} color="#00e887" />
            <StatCell label="DOĞUM" value={births} color="#7aff9a" />
            <StatCell label="ÖLÜM" value={deaths} color="#e05a5a" />
            <StatCell label="KELİME" value={wordCount} color="#7dd3fc" />
          </div>
        </div>

        {/* Row 3: Speed | Actions | TR/EN */}
        <div className="flex items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid #0d2018' }}>
          <span style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.1em', marginRight: 2 }}>HIZ</span>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => changeSpeed(s)}
              style={{
                padding: '2px 6px', fontSize: 9, fontFamily: 'Orbitron, monospace',
                background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'transparent',
                border: `1px solid ${speedMultiplier === s ? '#00e887' : '#1a3a2a'}`,
                color: speedMultiplier === s ? '#00e887' : '#4a6a5a',
              }}>
              {s}×
            </button>
          ))}

          <div className="flex-1" />

          <button onClick={terminateSim}
            style={{ padding: '2px 6px', fontSize: 8, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.05em' }}>
            SONLANDIR
          </button>
          <button onClick={() => setActivePanel(activePanel === 'population' ? null : 'population')}
            style={{ padding: '2px 6px', fontSize: 8, border: '1px solid #3a5020', color: '#8aaa50', background: 'transparent', letterSpacing: '0.05em' }}>
            KURUCU
          </button>
          <button onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', padding: '2px 4px', border: '1px solid #1a3a2a', color: '#4a6a5a', background: 'transparent' }}>
            <FolderOpen size={10} />
          </button>
          <button
            onClick={() => toggleLang()}
            style={{
              padding: '2px 6px', fontSize: 8, fontFamily: 'Orbitron, monospace', letterSpacing: '0.1em',
              border: '1px solid #1a4a2a', color: '#00e887', background: 'rgba(0,232,135,0.08)',
            }}>
            {lang.toUpperCase()}
          </button>
        </div>

        {/* Row 4: Module chips (scrollable) */}
        <div className="overflow-x-auto" style={{ borderBottom: '1px solid #0d2018' }}>
          <div className="flex gap-1 px-2 py-1" style={{ minWidth: 'max-content' }}>
            {MODULES.map(mod => {
              const isActive = activePanel === mod.id;
              const accent = (mod as any).accent ?? '#00e887';
              return (
                <button key={mod.id}
                  onClick={() => setActivePanel(isActive ? null : mod.id)}
                  style={{
                    padding: '2px 8px', fontSize: 9, letterSpacing: '0.08em', whiteSpace: 'nowrap',
                    fontFamily: 'Share Tech Mono, monospace',
                    background: isActive ? `${accent}20` : 'transparent',
                    border: `1px solid ${isActive ? accent : '#1a3a2a'}`,
                    color: isActive ? accent : '#4a7060',
                    boxShadow: isActive ? `0 0 8px ${accent}40` : 'none',
                  }}>
                  {chipLabel(mod)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 py-1.5"
                style={{
                  fontSize: 9, letterSpacing: '0.15em',
                  fontFamily: 'Share Tech Mono, monospace',
                  color: isActive ? '#00e887' : '#3a5040',
                  background: isActive ? 'rgba(0,232,135,0.06)' : 'transparent',
                  borderBottom: `2px solid ${isActive ? '#00e887' : 'transparent'}`,
                  borderRight: '1px solid #0d2018',
                }}>
                {lang === 'tr' ? tab.label : tab.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 relative overflow-hidden">

        {/* HARITA tab */}
        {activeTab === 'harita' && (
          <>
            {/* Events log strip */}
            {showEventsLog && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: 'rgba(0,0,0,0.88)', borderBottom: '1px solid #0d2018' }}>
                <div className="flex items-center px-2 py-0.5" style={{ borderBottom: '1px solid #091510' }}>
                  <span style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.15em' }}>KAYITLAR</span>
                  <div className="flex-1" />
                  <button onClick={() => setShowEventsLog(false)} style={{ color: '#1a3a2a', fontSize: 8 }}>✕</button>
                </div>
                <div ref={eventsRef}
                  className="overflow-y-auto"
                  style={{ maxHeight: 64, padding: '2px 8px' }}>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 8, color: '#2a4a3a', fontStyle: 'italic', padding: '4px 0' }}>
                      {lang === 'tr' ? 'Simülasyon başlatılmadı…' : 'Simulation not started…'}
                    </div>
                  ) : (
                    events.slice(0, 30).reverse().map((ev, i) => (
                      <div key={i} style={{
                        fontSize: 8.5, color: i === 0 ? '#a0e8c0' : `rgba(80,160,110,${Math.max(0.25, 1 - i * 0.07)})`,
                        lineHeight: '1.5', fontFamily: 'Share Tech Mono, monospace',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {fmtEvent(ev)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Globe */}
            <div className="absolute inset-0">
              <WorldGlobe individuals={individuals} />
            </div>

            {/* Coordinates overlay */}
            {currentSim && (
              <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid #0d2018', padding: '3px 8px' }}>
                <span style={{ fontSize: 8, color: '#3a6040', fontFamily: 'Share Tech Mono, monospace' }}>
                  {currentSim.start_latitude?.toFixed(3)}°N {currentSim.start_longitude?.toFixed(3)}°E
                </span>
              </div>
            )}

            {/* Reopen log if hidden */}
            {!showEventsLog && (
              <button onClick={() => setShowEventsLog(true)}
                style={{ position: 'absolute', top: 4, left: 4, zIndex: 20, padding: '2px 8px', fontSize: 7, border: '1px solid #0d2018', color: '#3a6040', background: 'rgba(0,0,0,0.8)', letterSpacing: '0.1em' }}>
                KAYITLAR ▼
              </button>
            )}
          </>
        )}

        {/* DURUM tab */}
        {activeTab === 'durum' && (
          <div className="h-full overflow-y-auto p-3" style={{ background: '#000' }}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'NÜFUS', v: stats?.population ?? '—', c: '#00e887' },
                { l: 'YIL', v: stats?.year ?? '—', c: '#7dd3fc' },
                { l: 'GÜN', v: stats?.day ?? '—', c: '#a0b4ff' },
                { l: 'DOĞUM', v: births, c: '#4ecb71' },
                { l: 'ÖLÜM', v: deaths, c: '#e05a5a' },
                { l: 'KELİME', v: wordCount, c: '#7dd3fc' },
                { l: 'ZEKA ORT.', v: stats?.avg_intelligence !== undefined ? (stats.avg_intelligence * 100).toFixed(0) + '%' : '—', c: '#d4a838' },
                { l: 'MUTLULUK', v: stats?.happiness_index !== undefined ? (stats.happiness_index * 100).toFixed(0) + '%' : '—', c: '#ff8ab0' },
                { l: 'HASTALIK', v: stats?.sick_rate !== undefined ? (stats.sick_rate * 100).toFixed(0) + '%' : '—', c: '#f97316' },
                { l: 'TEKNOLOJİ', v: stats?.technologies ?? '—', c: '#4ecb71' },
                { l: 'İNANÇ', v: stats?.beliefs ?? '—', c: '#a855f7' },
                { l: 'MEVSİM', v: stats?.season?.toUpperCase() ?? '—', c: '#a0b4ff' },
                { l: 'SICAKLIK', v: stats?.temperature !== undefined ? `${stats.temperature}°` : '—', c: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#7dd3fc') : '#a0b4ff' },
                { l: 'GRUPLAR', v: stats?.groups ?? '—', c: '#d4a838' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: 'rgba(0,20,10,0.6)', border: '1px solid #0d2018', padding: '8px 12px' }}>
                  <div style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>{l}</div>
                  <div style={{ fontSize: 18, color: c, fontFamily: 'Orbitron, monospace', fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KONTROL tab */}
        {activeTab === 'kontrol' && (
          <div className="h-full overflow-y-auto p-3" style={{ background: '#000' }}>
            <div className="space-y-3">
              <div style={{ border: '1px solid #0d2018', padding: 12 }}>
                <div style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.15em', marginBottom: 8 }}>SİMÜLASYON HIZI</div>
                <div className="flex gap-2">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => changeSpeed(s)}
                      className="flex-1 py-2"
                      style={{
                        fontSize: 12, fontFamily: 'Orbitron, monospace', fontWeight: 700,
                        background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'rgba(0,10,5,0.8)',
                        border: `1px solid ${speedMultiplier === s ? '#00e887' : '#0d2018'}`,
                        color: speedMultiplier === s ? '#00e887' : '#2a5040',
                        boxShadow: speedMultiplier === s ? '0 0 12px rgba(0,232,135,0.3)' : 'none',
                      }}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #0d2018', padding: 12 }}>
                <div style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.15em', marginBottom: 8 }}>DİL</div>
                <div className="flex gap-2">
                  {(['tr', 'en'] as const).map(l => (
                    <button key={l} onClick={() => lang !== l && toggleLang()}
                      className="flex-1 py-2"
                      style={{
                        fontSize: 11, fontFamily: 'Orbitron, monospace',
                        background: lang === l ? 'rgba(0,232,135,0.2)' : 'transparent',
                        border: `1px solid ${lang === l ? '#00e887' : '#0d2018'}`,
                        color: lang === l ? '#00e887' : '#2a5040',
                      }}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {currentSim && (
                <div style={{ border: '1px solid #2a0d0d', padding: 12 }}>
                  <div style={{ fontSize: 8, color: '#6a3030', letterSpacing: '0.15em', marginBottom: 8 }}>TEHLİKELİ BÖLGE</div>
                  <button onClick={terminateSim}
                    className="w-full py-2"
                    style={{ fontSize: 10, border: '1px solid #6a2020', color: '#e05a5a', background: 'rgba(100,20,20,0.15)', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
                    SİMÜLASYONU SONLANDIR
                  </button>
                </div>
              )}

              <button onClick={() => navigate('/')}
                className="w-full py-2"
                style={{ fontSize: 10, border: '1px solid #0d2018', color: '#3a6040', background: 'transparent', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
                ANA SAYFAYA DÖN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ OVERLAY PANELS ═══ */}
      <PopulationPanel />
      <BiologyPanel />
      <EnvironmentPanel />
      <AstronomyPanel />
      <CulturePanel />
      <LanguagePanel />
      <TechnologyPanel />
      <BeliefPanel />
      <SocialPanel />
      <EconomyPanel />
      <ArtPanel />
      <ArchitecturePanel />
      <LawPanel />
      <MicrobiomePanel />
      <PsychologyPanel />
      <EpigeneticsPanel />
      <GodPanel />
      <TimeMachinePanel />
      <AnalysisPanel />
      <HypothesisPanel />
    </div>
  );
}

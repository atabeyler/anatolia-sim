import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Pause, FolderOpen, ChevronLeft, ChevronRight, Users } from 'lucide-react';
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
  { id: 'population',   label: 'NÜFUS',    labelEn: 'POPUL.',   icon: '👥' },
  { id: 'olaylar',      label: 'OLAYLAR',  labelEn: 'EVENTS',   icon: '📋', special: true },
  { id: 'language',     label: 'DİL',      labelEn: 'LANG.',    icon: '🔤' },
  { id: 'timemachine',  label: 'GEÇMİŞ',   labelEn: 'HISTORY',  icon: '⏳' },
  { id: 'analysis',     label: 'ANALİZ',   labelEn: 'ANALYS.',  icon: '📊' },
  { id: 'biology',      label: 'MUTASYON', labelEn: 'MUTAT.',   icon: '🧬' },
  { id: 'god',          label: 'TANRI',    labelEn: 'GOD',      icon: '✦',  accent: '#f97316' },
  { id: 'psychology',   label: 'AKIL',     labelEn: 'MIND',     icon: '🧠' },
  { id: 'environment',  label: 'ÇEVRE',    labelEn: 'ENV.',     icon: '🌿' },
  { id: 'technology',   label: 'TEKNOLOJİ',labelEn: 'TECH',     icon: '⚙' },
  { id: 'belief',       label: 'İNANÇ',    labelEn: 'BELIEF',   icon: '☽' },
  { id: 'social',       label: 'SOSYAL',   labelEn: 'SOCIAL',   icon: '🤝' },
  { id: 'economy',      label: 'EKONOMİ',  labelEn: 'ECON.',    icon: '💰' },
  { id: 'culture',      label: 'KÜLTÜR',   labelEn: 'CULT.',    icon: '🎭' },
  { id: 'art',          label: 'SANAT',    labelEn: 'ART',      icon: '🎨' },
  { id: 'astronomy',    label: 'ASTRONOMİ',labelEn: 'ASTRO.',   icon: '🌙' },
  { id: 'hypothesis',   label: 'HİPOTEZ',  labelEn: 'HYPOTH.',  icon: '💡' },
  { id: 'epigenetics',  label: 'EPİGEN.',  labelEn: 'EPIGEN.',  icon: '🔬' },
];

const TABS = [
  { id: 'harita',  label: 'HARİTA',  labelEn: 'MAP' },
  { id: 'durum',   label: 'DURUM',   labelEn: 'STATUS' },
  { id: 'kontrol', label: 'KONTROL', labelEn: 'CONTROL' },
];

function translateEventDesc(desc: string, type: string): string {
  if (!desc) return type;
  return desc
    .replace('New individual born', 'Yeni birey doğdu')
    .replace('Individual died: starvation', 'Birey açlıktan öldü')
    .replace('Individual died: dehydration', 'Birey susuzluktan öldü')
    .replace('Individual died: disease_', 'Birey hastalıktan öldü: ')
    .replace('Individual died: old_age', 'Birey yaşlılıktan öldü')
    .replace('Individual died: predator', 'Birey yırtıcı tarafından öldürüldü')
    .replace(/Individual died: (.+)/, (_: string, cause: string) => `Birey öldü: ${cause}`)
    .replace('Technology discovered: foraging', 'Teknoloji keşfedildi: Toplayıcılık')
    .replace('Technology discovered: stone_tools', 'Teknoloji keşfedildi: Taş Aletler')
    .replace('Technology discovered: fire_making', 'Teknoloji keşfedildi: Ateş Yakma')
    .replace(/Technology discovered: (.+)/, (_: string, t: string) => `Teknoloji keşfedildi: ${t.replace(/_/g, ' ')}`)
    .replace(/killed (\d+) individuals/, (_: string, n: string) => `${n} bireyi öldürdü`);
}

export default function SimulationPage() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const { accessToken, setCurrentSim, currentSim, stats, events, activePanel, setActivePanel, lang, toggleLang, speedMultiplier, setSpeed } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'harita' | 'durum' | 'kontrol'>('harita');
  const [realTime, setRealTime] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedInd, setSelectedInd] = useState<any>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  useSimWebSocket(simId ?? null);

  // Real clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      setRealTime(`${now.getFullYear()} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
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
    await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
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
    navigate('/');
  }

  const isRunning = currentSim?.status === 'running';
  const simYear = stats?.year ?? 0;
  const simDay = stats?.day ?? 0;
  const simHour = stats?.hour !== undefined ? `${String(stats.hour).padStart(2, '0')}:00` : '00:00';
  const births = stats?.births ?? 0;
  const deaths = stats?.deaths ?? 0;
  const wordCount = stats?.word_count ?? 0;

  function fmtEvent(ev: any) {
    const prefix = `Y${String(ev.sim_year).padStart(4, '0')} G${String(ev.sim_day % 365).padStart(3, '0')}`;
    const icon = ev.event_type?.includes('birth') ? '+' : ev.event_type?.includes('death') ? '†' : ev.event_type?.includes('discovery') ? '◆' : ev.event_type?.includes('disaster') ? '⚠' : '·';
    const rawDesc = ev.description ?? ev.event_type;
    const desc = lang === 'tr' ? translateEventDesc(rawDesc, ev.event_type) : rawDesc;
    return `${prefix} ${icon} ${desc}`;
  }

  function eventColor(ev: any, idx: number): string {
    if (ev.event_type?.includes('birth')) return idx === 0 ? '#7aff9a' : `rgba(100,220,130,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('death')) return idx === 0 ? '#e08080' : `rgba(200,80,80,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('discovery')) return idx === 0 ? '#7dd3fc' : `rgba(100,180,240,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('disaster')) return idx === 0 ? '#f97316' : `rgba(240,100,30,${Math.max(0.3, 1 - idx * 0.1)})`;
    return idx === 0 ? '#a0e8c0' : `rgba(80,160,110,${Math.max(0.25, 1 - idx * 0.07)})`;
  }

  const sidebarW = sidebarExpanded ? 180 : 44;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', color: '#fff', fontFamily: 'Share Tech Mono, monospace' }}>

      {/* ═══ HEADER (2 rows) ═══ */}
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #1a3a2a' }}>

        {/* Row 1: Logo | SIM time | Real clock | BAŞLAT/DURDUR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderBottom: '1px solid #0d2018' }}>
          <span style={{ fontSize: 13, fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#00e887', letterSpacing: '0.15em', flexShrink: 0 }}>
            ANATOLIA-SIM
          </span>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 8 }}>
            <span style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>SİM</span>
            <span style={{ fontSize: 9, color: '#00e887', letterSpacing: '0.05em', fontFamily: 'Orbitron, monospace' }}>
              Y{String(simYear).padStart(4, '0')} G{String(simDay % 365).padStart(3, '0')} {simHour}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>GERÇEK</span>
            <span style={{ fontSize: 9, color: '#a0c8b0', letterSpacing: '0.05em' }}>{realTime}</span>
          </div>

          <button
            onClick={toggleSim}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '3px 10px', fontSize: 10, fontFamily: 'Share Tech Mono, monospace',
              background: isRunning ? 'rgba(212,56,56,0.15)' : 'rgba(0,232,135,0.15)',
              border: `1px solid ${isRunning ? '#c03030' : '#00e887'}`,
              color: isRunning ? '#e05a5a' : '#00e887',
              cursor: 'pointer',
            }}>
            {isRunning ? <Pause size={9} /> : <Play size={9} />}
            {isRunning ? (lang === 'tr' ? 'DURDUR' : 'PAUSE') : (lang === 'tr' ? 'BAŞLAT' : 'START')}
          </button>

          {isRunning && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e887', boxShadow: '0 0 6px #00e887', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
          )}
        </div>

        {/* Row 2: HIZ buttons | SONLANDIR | ÇIKIŞ | TR▸EN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}>
          <span style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.1em', marginRight: 2, flexShrink: 0 }}>HIZ</span>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => changeSpeed(s)}
              style={{
                padding: '2px 6px', fontSize: 9, fontFamily: 'Orbitron, monospace', cursor: 'pointer',
                background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'transparent',
                border: `1px solid ${speedMultiplier === s ? '#00e887' : '#1a3a2a'}`,
                color: speedMultiplier === s ? '#00e887' : '#4a6a5a',
              }}>
              {s}×
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button onClick={terminateSim}
            style={{ padding: '2px 6px', fontSize: 8, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.05em', cursor: 'pointer' }}>
            SONLANDIR
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', border: '1px solid #1a3a2a', color: '#4a7a5a', background: 'transparent', fontSize: 8, letterSpacing: '0.05em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
            <FolderOpen size={9} />
            {lang === 'tr' ? 'ÇIKIŞ' : 'EXIT'}
          </button>
          <button
            onClick={() => toggleLang()}
            title={lang === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
            style={{
              padding: '2px 5px', fontSize: 8, fontFamily: 'Orbitron, monospace', letterSpacing: '0.08em', cursor: 'pointer',
              border: '1px solid #1a4a2a', color: '#00e887', background: 'rgba(0,232,135,0.08)',
            }}>
            {lang === 'tr' ? 'TR▸EN' : 'EN▸TR'}
          </button>
        </div>
      </div>

      {/* ═══ BODY: SIDEBAR + MAIN ═══ */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: sidebarW,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(0,0,0,0.97)',
          borderRight: '1px solid #1a3a2a',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          position: 'relative',
        }}>

          {/* Module buttons */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4 }}>
            {MODULES.map(mod => {
              const isActive = activePanel === mod.id;
              const accent = (mod as any).accent ?? '#00e887';
              return (
                <button
                  key={mod.id}
                  onClick={() => setActivePanel(isActive ? null : mod.id)}
                  title={lang === 'tr' ? mod.label : mod.labelEn}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarExpanded ? 8 : 0,
                    justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                    width: '100%',
                    padding: sidebarExpanded ? '5px 10px' : '7px 0',
                    fontSize: 9,
                    letterSpacing: '0.06em',
                    fontFamily: 'Share Tech Mono, monospace',
                    background: isActive ? `${accent}18` : 'transparent',
                    borderLeft: `2px solid ${isActive ? accent : 'transparent'}`,
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: '1px solid #0a1a0f',
                    color: isActive ? accent : '#4a7060',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxSizing: 'border-box',
                  }}>
                  <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1 }}>{mod.icon}</span>
                  {sidebarExpanded && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lang === 'tr' ? mod.label : mod.labelEn}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mini stats (expanded only) */}
          {sidebarExpanded && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid #0d2018', borderBottom: '1px solid #0d2018', flexShrink: 0 }}>
              <div style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em', marginBottom: 4 }}>
                {lang === 'tr' ? 'İSTATİSTİK' : 'STATS'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <Users size={9} color="#00e887" />
                <span style={{ fontSize: 8, color: '#3a6040' }}>{lang === 'tr' ? 'NÜFUS' : 'POP'}:</span>
                <span style={{ fontSize: 10, color: '#00e887', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
                  {stats?.population ?? '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <div>
                  <span style={{ fontSize: 7, color: '#3a6040' }}>{lang === 'tr' ? 'DOĞUM' : 'BIRTH'}: </span>
                  <span style={{ fontSize: 9, color: '#7aff9a', fontFamily: 'Orbitron, monospace' }}>{births}</span>
                </div>
                <div>
                  <span style={{ fontSize: 7, color: '#3a6040' }}>{lang === 'tr' ? 'ÖLÜM' : 'DEATH'}: </span>
                  <span style={{ fontSize: 9, color: '#e05a5a', fontFamily: 'Orbitron, monospace' }}>{deaths}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div>
                  <span style={{ fontSize: 7, color: '#3a6040' }}>{lang === 'tr' ? 'YIL' : 'YR'}: </span>
                  <span style={{ fontSize: 9, color: '#7dd3fc', fontFamily: 'Orbitron, monospace' }}>{simYear}</span>
                </div>
                <div>
                  <span style={{ fontSize: 7, color: '#3a6040' }}>{lang === 'tr' ? 'GÜN' : 'DAY'}: </span>
                  <span style={{ fontSize: 9, color: '#a0b4ff', fontFamily: 'Orbitron, monospace' }}>{simDay % 365}</span>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed population indicator */}
          {!sidebarExpanded && (
            <div style={{ padding: '6px 0', borderTop: '1px solid #0d2018', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Users size={10} color="#00e887" />
              <span style={{ fontSize: 8, color: '#00e887', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
                {stats?.population !== undefined ? (stats.population > 999 ? `${Math.floor(stats.population / 1000)}k` : stats.population) : '—'}
              </span>
            </div>
          )}

          {/* Events mini log (expanded only) */}
          {sidebarExpanded && (
            <div style={{ flexShrink: 0, borderTop: '1px solid #0d2018', display: 'flex', flexDirection: 'column', maxHeight: 120 }}>
              <div style={{ padding: '3px 10px', borderBottom: '1px solid #091510', flexShrink: 0 }}>
                <span style={{ fontSize: 7, color: '#3a6040', letterSpacing: '0.1em' }}>
                  {lang === 'tr' ? 'OLAYLAR' : 'EVENTS'}
                </span>
              </div>
              <div
                ref={eventsRef}
                style={{ overflowY: 'auto', padding: '2px 6px', flex: 1 }}>
                {events.length === 0 ? (
                  <div style={{ fontSize: 7, color: '#2a4a3a', fontStyle: 'italic', padding: '3px 0' }}>
                    {lang === 'tr' ? 'Henüz olay yok…' : 'No events yet…'}
                  </div>
                ) : (
                  events.slice(-8).reverse().map((ev, i) => (
                    <div key={i} style={{
                      fontSize: 7.5,
                      color: eventColor(ev, i),
                      lineHeight: '1.5',
                      fontFamily: 'Share Tech Mono, monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {fmtEvent(ev)}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setSidebarExpanded(v => !v)}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '6px 0',
              background: 'rgba(0,20,10,0.8)',
              border: 'none',
              borderTop: '1px solid #1a3a2a',
              color: '#3a6040',
              cursor: 'pointer',
              fontSize: 9,
              gap: 4,
            }}>
            {sidebarExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            {sidebarExpanded && <span style={{ fontSize: 7, letterSpacing: '0.08em' }}>{lang === 'tr' ? 'DARALT' : 'COLLAPSE'}</span>}
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #0d2018' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 9,
                    letterSpacing: '0.15em',
                    fontFamily: 'Share Tech Mono, monospace',
                    color: isActive ? '#00e887' : '#3a5040',
                    background: isActive ? 'rgba(0,232,135,0.06)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? '#00e887' : 'transparent'}`,
                    borderRight: '1px solid #0d2018',
                    cursor: 'pointer',
                  }}>
                  {lang === 'tr' ? tab.label : tab.labelEn}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

            {/* HARITA tab */}
            {activeTab === 'harita' && (
              <>
                {/* Globe */}
                <div style={{ position: 'absolute', inset: 0 }}>
                  <WorldGlobe individuals={individuals} onSelect={setSelectedInd} />
                </div>

                {/* Coordinates overlay */}
                {currentSim && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid #0d2018', padding: '3px 8px' }}>
                    <span style={{ fontSize: 8, color: '#3a6040', fontFamily: 'Share Tech Mono, monospace' }}>
                      {currentSim.start_latitude?.toFixed(3)}°N {currentSim.start_longitude?.toFixed(3)}°E
                    </span>
                  </div>
                )}

                {/* Selected individual overlay */}
                {selectedInd && (
                  <div style={{ position: 'absolute', top: 80, right: 8, zIndex: 50, background: 'rgba(0,5,2,0.97)', border: '1px solid #00e887', padding: 12, minWidth: 160, fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 8, color: '#3a6040', marginBottom: 4 }}>// {lang === 'tr' ? 'BİREY' : 'INDIVIDUAL'}</div>
                    <div style={{ fontSize: 12, color: '#00e887', marginBottom: 6 }}>{selectedInd.name ?? (selectedInd.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female'))}</div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Cinsiyet' : 'Sex'}: <span style={{ color: '#fff' }}>{selectedInd.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female')}</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Yaş' : 'Age'}: <span style={{ color: '#fff' }}>{selectedInd.age_years ?? '—'}</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Boy' : 'Height'}: <span style={{ color: '#a0e887' }}>{selectedInd.height_cm ?? selectedInd.phenotype?.height_cm ?? '—'} cm</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}: <span style={{ color: '#a0e887' }}>{selectedInd.weight_kg ?? '—'} kg</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>HP: <span style={{ color: selectedInd.health?.hp > 0.6 ? '#4ecb71' : '#e05a5a' }}>{selectedInd.health?.hp !== undefined ? (selectedInd.health.hp * 100).toFixed(0) + '%' : '—'}</span></div>
                    <button onClick={() => setSelectedInd(null)} style={{ marginTop: 8, fontSize: 8, color: '#3a6040', border: '1px solid #1a3a2a', padding: '2px 8px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
                      {lang === 'tr' ? 'KAPAT' : 'CLOSE'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* DURUM tab */}
            {activeTab === 'durum' && (
              <div style={{ height: '100%', overflowY: 'auto', padding: 12, background: '#000' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'NÜFUS',    v: stats?.population ?? '—',                                                                              c: '#00e887' },
                    { l: 'YIL',      v: stats?.year ?? '—',                                                                                     c: '#7dd3fc' },
                    { l: 'GÜN',      v: stats?.day ?? '—',                                                                                      c: '#a0b4ff' },
                    { l: 'DOĞUM',    v: births,                                                                                                  c: '#4ecb71' },
                    { l: 'ÖLÜM',     v: deaths,                                                                                                  c: '#e05a5a' },
                    { l: 'KELİME',   v: wordCount,                                                                                               c: '#7dd3fc' },
                    { l: 'ZEKA ORT.',v: stats?.avg_intelligence !== undefined ? (stats.avg_intelligence * 100).toFixed(0) + '%' : '—',           c: '#d4a838' },
                    { l: 'MUTLULUK', v: stats?.happiness_index !== undefined ? (stats.happiness_index * 100).toFixed(0) + '%' : '—',             c: '#ff8ab0' },
                    { l: 'HASTALIK', v: stats?.sick_rate !== undefined ? (stats.sick_rate * 100).toFixed(0) + '%' : '—',                         c: '#f97316' },
                    { l: 'TEKNOLOJİ',v: stats?.technologies ?? '—',                                                                             c: '#4ecb71' },
                    { l: 'İNANÇ',    v: stats?.beliefs ?? '—',                                                                                  c: '#a855f7' },
                    { l: 'MEVSİM',   v: stats?.season?.toUpperCase() ?? '—',                                                                    c: '#a0b4ff' },
                    { l: 'SICAKLIK', v: stats?.temperature !== undefined ? `${stats.temperature}°` : '—',                                        c: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#7dd3fc') : '#a0b4ff' },
                    { l: 'GRUPLAR',  v: stats?.groups ?? '—',                                                                                   c: '#d4a838' },
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
              <div style={{ height: '100%', overflowY: 'auto', padding: 12, background: '#000' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ border: '1px solid #0d2018', padding: 12 }}>
                    <div style={{ fontSize: 8, color: '#3a6040', letterSpacing: '0.15em', marginBottom: 8 }}>SİMÜLASYON HIZI</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => changeSpeed(s)}
                          style={{
                            flex: 1, padding: '8px 0', fontSize: 12, fontFamily: 'Orbitron, monospace', fontWeight: 700, cursor: 'pointer',
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

                  <button onClick={toggleLang}
                    style={{ width: '100%', padding: '8px 0', fontSize: 11, fontFamily: 'Orbitron, monospace', letterSpacing: '0.15em', border: '1px solid #1a4a2a', color: '#00e887', background: 'rgba(0,232,135,0.08)', cursor: 'pointer' }}>
                    {lang === 'tr' ? 'TR ▸ EN' : 'EN ▸ TR'}
                  </button>

                  {currentSim && (
                    <div style={{ border: '1px solid #2a0d0d', padding: 12 }}>
                      <div style={{ fontSize: 8, color: '#6a3030', letterSpacing: '0.15em', marginBottom: 8 }}>TEHLİKELİ BÖLGE</div>
                      <button onClick={terminateSim}
                        style={{ width: '100%', padding: '8px 0', fontSize: 10, border: '1px solid #6a2020', color: '#e05a5a', background: 'rgba(100,20,20,0.15)', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                        SİMÜLASYONU SONLANDIR
                      </button>
                    </div>
                  )}

                  <button onClick={() => navigate('/')}
                    style={{ width: '100%', padding: '8px 0', fontSize: 10, border: '1px solid #0d2018', color: '#3a6040', background: 'transparent', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                    ANA SAYFAYA DÖN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Pause, FolderOpen, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { useSimWebSocket } from '../hooks/useSimWebSocket';
import SimMenuOverlay from '../components/layout/SimMenuOverlay';
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
import EventsPanel from '../components/panels/EventsPanel';

const SPEEDS = [1, 5, 20, 100];

const MODULES = [
  { id: 'population',   label: 'NÜFUS',      labelEn: 'POPUL.',   icon: '👥' },
  { id: 'olaylar',      label: 'OLAYLAR',    labelEn: 'EVENTS',   icon: '📋', special: true },
  { id: 'language',     label: 'DİL',        labelEn: 'LANG.',    icon: '🔤' },
  { id: 'timemachine',  label: 'GEÇMİŞ',     labelEn: 'HISTORY',  icon: '⏳' },
  { id: 'analysis',     label: 'ANALİZ',     labelEn: 'ANALYS.',  icon: '📊' },
  { id: 'biology',      label: 'MUTASYON',   labelEn: 'MUTAT.',   icon: '🧬' },
  { id: 'god',          label: 'TANRI',      labelEn: 'GOD',      icon: '✦',  accent: '#f97316' },
  { id: 'psychology',   label: 'AKIL',       labelEn: 'MIND',     icon: '🧠' },
  { id: 'environment',  label: 'ÇEVRE',      labelEn: 'ENV.',     icon: '🌿' },
  { id: 'technology',   label: 'TEKNOLOJİ',  labelEn: 'TECH',     icon: '⚙' },
  { id: 'belief',       label: 'İNANÇ',      labelEn: 'BELIEF',   icon: '☽' },
  { id: 'social',       label: 'SOSYAL',     labelEn: 'SOCIAL',   icon: '🤝' },
  { id: 'economy',      label: 'EKONOMİ',    labelEn: 'ECON.',    icon: '💰' },
  { id: 'culture',      label: 'KÜLTÜR',     labelEn: 'CULT.',    icon: '🎭' },
  { id: 'art',          label: 'SANAT',      labelEn: 'ART',      icon: '🎨' },
  { id: 'astronomy',    label: 'ASTRONOMİ',  labelEn: 'ASTRO.',   icon: '🌙' },
  { id: 'hypothesis',   label: 'HİPOTEZ',    labelEn: 'HYPOTH.',  icon: '💡' },
  { id: 'epigenetics',  label: 'EPİGEN.',    labelEn: 'EPIGEN.',  icon: '🔬' },
  { id: 'architecture', label: 'MİMARİ',     labelEn: 'ARCH.',    icon: '🏛️' },
  { id: 'law',          label: 'HUKUK',      labelEn: 'LAW',      icon: '⚖️' },
  { id: 'microbiome',   label: 'MİKROBİYOM', labelEn: 'MICROB.',  icon: '🦠' },
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

const IMPORTANT_TYPES = ['birth', 'death', 'language', 'belief', 'technology', 'word', 'discovery'];

function DraggableLogPanel({ events, lang, fmtEvent, eventColor }: {
  events: any[]; lang: string; fmtEvent: (ev: any) => string; eventColor: (ev: any, i: number) => string;
}) {
  const isMob = typeof window !== 'undefined' && window.innerWidth < 640;
  const [pos, setPos] = useState({ x: 8, y: 8 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, panelX: 0, panelY: 0 });

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent | TouchEvent) {
      const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      setPos({ x: dragStart.current.panelX + cx - dragStart.current.clientX, y: dragStart.current.panelY + cy - dragStart.current.clientY });
    }
    function onUp() { setDragging(false); }
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  function startDrag(clientX: number, clientY: number) {
    setDragging(true);
    dragStart.current = { clientX, clientY, panelX: pos.x, panelY: pos.y };
  }

  const filtered = events
    .filter(ev => IMPORTANT_TYPES.some(t => ev.event_type?.toLowerCase().includes(t)))
    .slice(0, 3);

  const panelW = isMob ? Math.min(200, window.innerWidth - 60) : 250;

  return (
    <div style={{
      position: 'absolute', left: pos.x, top: pos.y, zIndex: 30,
      width: panelW, background: 'rgba(0,4,2,0.93)', border: '1px solid #4a1a1a',
      userSelect: 'none', cursor: dragging ? 'grabbing' : 'default',
      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
    }}>
      {/* Drag handle — mouse + touch */}
      <div
        onMouseDown={e => { startDrag(e.clientX, e.clientY); e.preventDefault(); }}
        onTouchStart={e => { startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: '1px solid #4a1a1a', cursor: 'grab', background: 'rgba(0,20,10,0.9)', touchAction: 'none' }}>
        <div style={{ width: 3, height: 12, background: '#00e887', boxShadow: '0 0 4px #00e887', flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.2em', fontFamily: 'Share Tech Mono, monospace', flex: 1 }}>
          {lang === 'tr' ? 'OLAY KAYDI' : 'EVENT LOG'}
        </span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e887', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 14, color: '#4ecb71', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
          {lang === 'tr' ? 'CANLI' : 'LIVE'}
        </span>
      </div>
      {/* Events — 3 rows max */}
      <div style={{ padding: '2px 6px' }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 14, color: '#6a9a80', padding: '4px 0', fontFamily: 'Share Tech Mono, monospace', fontStyle: 'italic' }}>
            {lang === 'tr' ? 'Olay bekleniyor...' : 'Awaiting events...'}
          </div>
        ) : filtered.map((ev, i) => (
          <div key={i} style={{
            fontSize: 14, color: eventColor(ev, i), lineHeight: '1.55',
            fontFamily: 'Share Tech Mono, monospace',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,50,20,0.3)' : 'none',
            opacity: Math.max(0.5, 1 - i * 0.15),
          }}>
            {fmtEvent(ev)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const { accessToken, setCurrentSim, currentSim, stats, events, activePanel, setActivePanel, lang, speedMultiplier, setSpeed, resetLiveState, setEvents } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'harita' | 'durum' | 'kontrol'>('harita');
  const [realTime, setRealTime] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640);
  const [selectedInd, setSelectedInd] = useState<any>(null);
  const [globeCoord, setGlobeCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState<'language' | 'guide' | 'about' | 'mission' | 'contact' | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  // Responsive breakpoint
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ARIA tab-switching command listener
  useEffect(() => {
    function onAriaTab(e: Event) {
      const tab = (e as CustomEvent).detail;
      if (tab === 'harita' || tab === 'durum' || tab === 'kontrol') setActiveTab(tab);
    }
    window.addEventListener('aria-set-tab', onAriaTab);
    return () => window.removeEventListener('aria-set-tab', onAriaTab);
  }, []);

  // ARIA simulation control listener
  useEffect(() => {
    function onAriaSimulation(e: Event) {
      const { action } = (e as CustomEvent).detail;
      switch (action) {
        case 'toggle_sidebar':
          setSidebarExpanded(v => !v);
          break;
        case 'open_menu':
          setMenuOpen(true);
          break;
        case 'open_menu_page':
          setMenuPage((e as CustomEvent).detail.menuPage ?? null);
          setMenuOpen(true);
          break;
        case 'close_menu':
          setMenuOpen(false);
          setMenuPage(null);
          break;
        case 'terminate_simulation': {
          const { currentSim: sim, accessToken: tok, lang: l, setCurrentSim: setSim } = useSimStore.getState();
          if (!sim || !tok) return;
          if (!confirm(l === 'tr' ? 'Simülasyonu sonlandır?' : 'Terminate simulation?')) return;
          axios.post(`/api/simulations/${sim.id}/terminate`, {}, { headers: { Authorization: `Bearer ${tok}` } })
            .then(() => { setSim({ ...sim, status: 'completed' }); navigate('/'); })
            .catch(() => {});
          break;
        }
      }
    }
    window.addEventListener('aria-simulation', onAriaSimulation);
    return () => window.removeEventListener('aria-simulation', onAriaSimulation);
  }, [navigate]);
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
    // Clear previous sim's live data, then load this sim's persisted history
    resetLiveState();
    setIndividuals([]);
    const headers = { Authorization: `Bearer ${accessToken}` };
    axios.get(`/api/simulations/${simId}`, { headers }).then(r => setCurrentSim(r.data));
    // Load recent historical events from DB so the event log isn't empty
    axios.get(`/api/simulations/${simId}/events?limit=100`, { headers })
      .then(r => setEvents(r.data)) // DB returns newest-first; store keeps same order
      .catch(() => {});
    const interval = setInterval(() => {
      axios.get(`/api/simulations/${simId}/population?alive=true&limit=500`, { headers })
        .then(r => setIndividuals(r.data));
    }, 8000);
    return () => clearInterval(interval);
  }, [simId, accessToken]);

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

      {/* ═══ HEADER (3 rows) ═══ */}
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #4a1a1a' }}>

        {/* Row 1: Logo | SIM time | [ARIA desktop] | [clock desktop] | BAŞLAT/DURDUR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, padding: isMobile ? '4px 8px' : '5px 10px', borderBottom: '1px solid #4a1a1a' }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: isMobile ? 12 : 14, fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#e0e0f0', letterSpacing: isMobile ? '0.12em' : '0.2em' }}>
              ANATOLIA-SIM
            </span>
            <span style={{ fontSize: isMobile ? 10 : 11, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, color: '#cc2222', letterSpacing: isMobile ? '0.16em' : '0.22em' }}>
              {lang === 'tr' ? 'MEDENİYET' : 'CIVILIZATION'}
            </span>
          </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: isMobile ? 3 : 6 }}>
            <span style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.1em' }}>SİM</span>
            <span style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.04em', fontFamily: 'Orbitron, monospace' }}>
              Y{String(simYear).padStart(4, '0')} G{String(simDay % 365).padStart(3, '0')}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {!isMobile && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 6 }}>
              <span style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.1em' }}>GERÇEK</span>
              <span style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.05em' }}>{realTime}</span>
            </div>
          )}

          <button
            onClick={toggleSim}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              padding: isMobile ? '5px 12px' : '5px 16px',
              fontSize: 14,
              fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.1em',
              background: isRunning ? 'rgba(212,56,56,0.18)' : 'rgba(0,232,135,0.18)',
              border: `1px solid ${isRunning ? '#c03030' : '#00e887'}`,
              color: isRunning ? '#e05a5a' : '#00e887',
              boxShadow: isRunning ? '0 0 10px rgba(200,50,50,0.3)' : '0 0 10px rgba(0,232,135,0.25)',
              cursor: 'pointer',
            }}>
            {isRunning ? <Pause size={11} /> : <Play size={11} />}
            {isRunning ? (lang === 'tr' ? 'DURDUR' : 'PAUSE') : (lang === 'tr' ? 'BAŞLAT' : 'START')}
          </button>

          {isRunning && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e887', boxShadow: '0 0 8px #00e887', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
          )}
        </div>

        {/* Row 2: Stats (scrollable on mobile) | TR▸EN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 10px', borderBottom: '1px solid #4a1a1a', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: isMobile ? 'auto' : 'visible', flex: 1, scrollbarWidth: 'none' }}>
            {[
              { key: 'pop',  label: lang === 'tr' ? 'NÜFUS'  : 'POP',   value: stats?.population ?? '—',   color: '#00e887' },
              { key: 'bir',  label: lang === 'tr' ? 'DOĞUM'  : 'BIRTH', value: births,                      color: '#4ecb71' },
              { key: 'dth',  label: lang === 'tr' ? 'ÖLÜM'   : 'DEATH', value: deaths,                      color: '#e05a5a' },
              { key: 'yr',   label: lang === 'tr' ? 'YIL'    : 'YEAR',  value: stats?.year ?? '—',          color: '#7dd3fc' },
              { key: 'tech', label: lang === 'tr' ? 'TECH' : 'TECH',    value: stats?.technologies ?? '—',  color: '#d4a838' },
              { key: 'temp', label: lang === 'tr' ? 'SICAK' : 'TEMP',   value: stats?.temperature !== undefined ? `${stats.temperature}°` : '—', color: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#7dd3fc') : '#a0b4ff' },
            ].map(({ key, label, value, color }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '2px 7px' : '2px 10px', borderRight: '1px solid #4a1a1a', flexShrink: 0, minWidth: isMobile ? 42 : 52 }}>
                <span style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: 14, color, fontFamily: 'Orbitron, monospace', fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: HIZ buttons | [ARIA mobile] | SONLANDIR | ÇIKIŞ | MENÜ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 4, padding: isMobile ? '3px 8px' : '3px 10px' }}>
          {!isMobile && <span style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.1em', marginRight: 2, flexShrink: 0 }}>HIZ</span>}
          {SPEEDS.map(s => (
            <button key={s} onClick={() => changeSpeed(s)}
              style={{
                padding: isMobile ? '2px 5px' : '2px 6px', fontSize: 14,
                fontFamily: 'Orbitron, monospace', cursor: 'pointer',
                background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'transparent',
                border: `1px solid ${speedMultiplier === s ? '#00e887' : '#4a1a1a'}`,
                color: speedMultiplier === s ? '#00e887' : '#4a6a5a',
                flexShrink: 0,
              }}>
              {s}×
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {!isMobile && (
            <button onClick={terminateSim}
              style={{ padding: '2px 6px', fontSize: 14, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0 }}>
              {lang === 'tr' ? 'SONLANDIR' : 'TERMINATE'}
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', border: '1px solid #4a1a1a', color: '#7aaa88', background: 'transparent', fontSize: 14, letterSpacing: '0.05em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
              <FolderOpen size={9} />
              {lang === 'tr' ? 'ÇIKIŞ' : 'EXIT'}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', border: '1px solid #4a1a1a', color: '#7aaa88', background: 'transparent', fontSize: 14, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
            ☰ {!isMobile && (lang === 'tr' ? 'MENÜ' : 'MENU')}
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
          borderRight: '1px solid #4a1a1a',
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
                    fontSize: 14,
                    letterSpacing: '0.06em',
                    fontFamily: 'Share Tech Mono, monospace',
                    background: isActive ? `${accent}18` : 'transparent',
                    borderLeft: `2px solid ${isActive ? accent : 'transparent'}`,
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: '1px solid #4a1a1a',
                    color: isActive ? accent : '#4a7060',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxSizing: 'border-box',
                  }}>
                  <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{mod.icon}</span>
                  {sidebarExpanded && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lang === 'tr' ? mod.label : mod.labelEn}
                    </span>
                  )}
                </button>
              );
            })}
          </div>


          {/* Collapsed population indicator */}
          {!sidebarExpanded && (
            <div style={{ padding: '6px 0', borderTop: '1px solid #4a1a1a', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Users size={10} color="#00e887" />
              <span style={{ fontSize: 14, color: '#00e887', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
                {stats?.population !== undefined ? (stats.population > 999 ? `${Math.floor(stats.population / 1000)}k` : stats.population) : '—'}
              </span>
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
              borderTop: '1px solid #4a1a1a',
              color: '#6a9a78',
              cursor: 'pointer',
              fontSize: 14,
              gap: 4,
            }}>
            {sidebarExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            {sidebarExpanded && <span style={{ fontSize: 14, letterSpacing: '0.08em' }}>{lang === 'tr' ? 'DARALT' : 'COLLAPSE'}</span>}
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #4a1a1a' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: 14,
                    letterSpacing: '0.15em',
                    fontFamily: 'Share Tech Mono, monospace',
                    color: isActive ? '#00e887' : '#3a5040',
                    background: isActive ? 'rgba(0,232,135,0.06)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? '#00e887' : 'transparent'}`,
                    borderRight: '1px solid #4a1a1a',
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

                  <WorldGlobe
                    individuals={individuals}
                    onSelect={(ind) => { setSelectedInd(ind); setGlobeCoord(null); }}
                    onGlobeClick={(lat, lon) => { setGlobeCoord({ lat, lon }); setSelectedInd(null); }}
                  />
                </div>

                {/* Sim start coord (bottom-left) */}
                {currentSim && (
                  <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid #4a1a1a', padding: '3px 8px' }}>
                    <span style={{ fontSize: 14, color: '#6a9a78', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>
                      {lang === 'tr' ? 'BAŞLANGIÇ' : 'ORIGIN'}: {currentSim.start_latitude?.toFixed(3)}°{(currentSim.start_latitude ?? 0) >= 0 ? 'K' : 'G'}  {currentSim.start_longitude?.toFixed(3)}°{(currentSim.start_longitude ?? 0) >= 0 ? 'D' : 'B'}
                    </span>
                  </div>
                )}

                {/* Globe click coordinate overlay (bottom-right) */}
                {globeCoord && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20, background: 'rgba(0,5,2,0.92)', border: '1px solid #4a1a1a', padding: '5px 10px', fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.1em', marginBottom: 2 }}>
                      {lang === 'tr' ? '// KONUM' : '// COORDS'}
                    </div>
                    <div style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.06em' }}>
                      {Math.abs(globeCoord.lat).toFixed(3)}°{globeCoord.lat >= 0 ? (lang === 'tr' ? 'K' : 'N') : (lang === 'tr' ? 'G' : 'S')}
                      {'  '}
                      {Math.abs(globeCoord.lon).toFixed(3)}°{globeCoord.lon >= 0 ? (lang === 'tr' ? 'D' : 'E') : (lang === 'tr' ? 'B' : 'W')}
                    </div>
                    <button onClick={() => setGlobeCoord(null)} style={{ marginTop: 3, fontSize: 14, color: '#6a9a80', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                )}

                {/* Selected individual overlay */}
                {selectedInd && (
                  <div style={{ position: 'absolute', top: 80, right: 8, zIndex: 50, background: 'rgba(0,5,2,0.97)', border: '1px solid #00e887', padding: 12, minWidth: 160, fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 14, color: '#6a9a78', marginBottom: 4 }}>// {lang === 'tr' ? 'BİREY' : 'INDIVIDUAL'}</div>
                    <div style={{ fontSize: 14, color: '#00e887', marginBottom: 2 }}>
                      {selectedInd.name ?? `${selectedInd.sex === 'male' ? '♂' : '♀'}-${selectedInd.id?.slice(-4).toUpperCase()}`}
                    </div>
                    {!selectedInd.name && (
                      <div style={{ fontSize: 14, color: '#4a6a40', marginBottom: 4, fontStyle: 'italic' }}>
                        {lang === 'tr' ? '// dil henüz gelişmedi' : '// pre-linguistic era'}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Cinsiyet' : 'Sex'}: <span style={{ color: '#fff' }}>{selectedInd.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female')}</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Yaş' : 'Age'}: <span style={{ color: '#fff' }}>{selectedInd.age_years ?? '—'}</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Boy' : 'Height'}: <span style={{ color: '#a0e887' }}>{selectedInd.height_cm ?? selectedInd.phenotype?.height_cm ?? '—'} cm</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}: <span style={{ color: '#a0e887' }}>{selectedInd.weight_kg ?? '—'} kg</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>HP: <span style={{ color: selectedInd.health?.hp > 0.6 ? '#4ecb71' : '#e05a5a' }}>{selectedInd.health?.hp !== undefined ? (selectedInd.health.hp * 100).toFixed(0) + '%' : '—'}</span></div>
                    <button onClick={() => setSelectedInd(null)} style={{ marginTop: 8, fontSize: 14, color: '#6a9a78', border: '1px solid #4a1a1a', padding: '2px 8px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
                      {lang === 'tr' ? 'KAPAT' : 'CLOSE'}
                    </button>
                  </div>
                )}

                {/* Draggable event log panel */}
                <DraggableLogPanel
                  events={events}
                  lang={lang}
                  fmtEvent={fmtEvent}
                  eventColor={eventColor}
                />
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
                    <div key={l} style={{ background: 'rgba(0,20,10,0.6)', border: '1px solid #4a1a1a', padding: '8px 12px' }}>
                      <div style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.1em' }}>{l}</div>
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
                  <div style={{ border: '1px solid #4a1a1a', padding: 12 }}>
                    <div style={{ fontSize: 14, color: '#6a9a78', letterSpacing: '0.15em', marginBottom: 8 }}>SİMÜLASYON HIZI</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => changeSpeed(s)}
                          style={{
                            flex: 1, padding: '8px 0', fontSize: 14, fontFamily: 'Orbitron, monospace', fontWeight: 700, cursor: 'pointer',
                            background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'rgba(0,10,5,0.8)',
                            border: `1px solid ${speedMultiplier === s ? '#00e887' : '#4a1a1a'}`,
                            color: speedMultiplier === s ? '#00e887' : '#2a5040',
                            boxShadow: speedMultiplier === s ? '0 0 12px rgba(0,232,135,0.3)' : 'none',
                          }}>
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentSim && (
                    <div style={{ border: '1px solid #2a0d0d', padding: 12 }}>
                      <div style={{ fontSize: 14, color: '#6a3030', letterSpacing: '0.15em', marginBottom: 8 }}>TEHLİKELİ BÖLGE</div>
                      <button onClick={terminateSim}
                        style={{ width: '100%', padding: '8px 0', fontSize: 14, border: '1px solid #6a2020', color: '#e05a5a', background: 'rgba(100,20,20,0.15)', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                        SİMÜLASYONU SONLANDIR
                      </button>
                    </div>
                  )}

                  <button onClick={() => navigate('/')}
                    style={{ width: '100%', padding: '8px 0', fontSize: 14, border: '1px solid #4a1a1a', color: '#6a9a78', background: 'transparent', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                    ANA SAYFAYA DÖN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '2px 10px', background: 'rgba(0,0,0,0.97)', borderTop: '1px solid #0a1a10' }}>
        <span style={{ fontSize: 14, color: '#1e3a28', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
          Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 Tüm hakları saklıdır. · RST Q-Nation 200120401018 · Yalçın Atabey
        </span>
      </div>

      {/* ═══ MENU OVERLAY ═══ */}
      <SimMenuOverlay
        isOpen={menuOpen}
        onClose={() => { setMenuOpen(false); setMenuPage(null); }}
        menuPage={menuPage}
        onMenuPageChange={setMenuPage}
        mobileActions={isMobile ? (
          <div style={{ padding: '8px 14px', borderTop: '1px solid #4a1a1a', display: 'flex', gap: 8 }}>
            <button onClick={() => { setMenuOpen(false); navigate('/'); }}
              style={{ flex: 1, padding: '7px 0', fontSize: 14, border: '1px solid #4a1a1a', color: '#7aaa88', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
              ← {lang === 'tr' ? 'ÇIKIŞ' : 'EXIT'}
            </button>
            <button onClick={() => { setMenuOpen(false); terminateSim(); }}
              style={{ flex: 1, padding: '7px 0', fontSize: 14, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
              {lang === 'tr' ? 'SONLANDIR' : 'TERMINATE'}
            </button>
          </div>
        ) : undefined}
      />

      {/* ═══ OVERLAY PANELS ═══ */}
      <EventsPanel />
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

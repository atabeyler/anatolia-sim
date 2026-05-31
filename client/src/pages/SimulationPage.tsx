import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Pause, FolderOpen, ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
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
import EventsPanel from '../components/panels/EventsPanel';

const SPEEDS = [1, 5, 20, 100];

const LANGUAGES = [
  { code: 'en' as const, label: 'English',   beta: false },
  { code: 'tr' as const, label: 'Türkçe',    beta: false },
  { code: 'de' as const, label: 'Deutsch',   beta: true  },
  { code: 'fr' as const, label: 'Français',  beta: true  },
  { code: 'ar' as const, label: 'العربية',   beta: true  },
];

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
      width: panelW, background: 'rgba(0,4,2,0.93)', border: '1px solid #cc2222',
      userSelect: 'none', cursor: dragging ? 'grabbing' : 'default',
      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
    }}>
      {/* Drag handle — mouse + touch */}
      <div
        onMouseDown={e => { startDrag(e.clientX, e.clientY); e.preventDefault(); }}
        onTouchStart={e => { startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: '1px solid #cc2222', cursor: 'grab', background: 'rgba(0,20,10,0.9)', touchAction: 'none' }}>
        <div style={{ width: 3, height: 12, background: '#00e887', boxShadow: '0 0 4px #00e887', flexShrink: 0 }} />
        <span style={{ fontSize: 7, color: '#00e887', letterSpacing: '0.2em', fontFamily: 'Share Tech Mono, monospace', flex: 1 }}>
          {lang === 'tr' ? 'OLAY KAYDI' : 'EVENT LOG'}
        </span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e887', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 7, color: '#4ecb71', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace' }}>
          {lang === 'tr' ? 'CANLI' : 'LIVE'}
        </span>
      </div>
      {/* Events — 3 rows max */}
      <div style={{ padding: '2px 6px' }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 7, color: '#6a9a80', padding: '4px 0', fontFamily: 'Share Tech Mono, monospace', fontStyle: 'italic' }}>
            {lang === 'tr' ? 'Olay bekleniyor...' : 'Awaiting events...'}
          </div>
        ) : filtered.map((ev, i) => (
          <div key={i} style={{
            fontSize: isMob ? 7 : 7.5, color: eventColor(ev, i), lineHeight: '1.55',
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
  const { accessToken, setCurrentSim, currentSim, stats, events, activePanel, setActivePanel, lang, setLang, speedMultiplier, setSpeed, resetLiveState, setEvents } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'harita' | 'durum' | 'kontrol'>('harita');
  const [realTime, setRealTime] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640);
  const [selectedInd, setSelectedInd] = useState<any>(null);
  const [globeCoord, setGlobeCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState<'about' | 'mission' | 'contact' | 'guide' | 'language' | null>(null);
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
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #cc2222' }}>

        {/* Row 1: Logo | SIM time | [ARIA desktop] | [clock desktop] | BAŞLAT/DURDUR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, padding: isMobile ? '4px 8px' : '5px 10px', borderBottom: '1px solid #cc2222' }}>
          <span style={{ fontSize: isMobile ? 10 : 13, fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#00e887', letterSpacing: isMobile ? '0.08em' : '0.15em', flexShrink: 0 }}>
            ANATOLIA-SIM
          </span>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: isMobile ? 3 : 6 }}>
            <span style={{ fontSize: 6.5, color: '#6a9a78', letterSpacing: '0.1em' }}>SİM</span>
            <span style={{ fontSize: isMobile ? 8 : 9, color: '#00e887', letterSpacing: '0.04em', fontFamily: 'Orbitron, monospace' }}>
              Y{String(simYear).padStart(4, '0')} G{String(simDay % 365).padStart(3, '0')}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {!isMobile && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 6 }}>
              <span style={{ fontSize: 7, color: '#6a9a78', letterSpacing: '0.1em' }}>GERÇEK</span>
              <span style={{ fontSize: 9, color: '#a0c8b0', letterSpacing: '0.05em' }}>{realTime}</span>
            </div>
          )}

          <button
            onClick={toggleSim}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              padding: isMobile ? '5px 12px' : '5px 16px',
              fontSize: isMobile ? 10 : 11,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 10px', borderBottom: '1px solid #cc2222', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: isMobile ? 'auto' : 'visible', flex: 1, scrollbarWidth: 'none' }}>
            {[
              { key: 'pop',  label: lang === 'tr' ? 'NÜFUS'  : 'POP',   value: stats?.population ?? '—',   color: '#00e887' },
              { key: 'bir',  label: lang === 'tr' ? 'DOĞUM'  : 'BIRTH', value: births,                      color: '#4ecb71' },
              { key: 'dth',  label: lang === 'tr' ? 'ÖLÜM'   : 'DEATH', value: deaths,                      color: '#e05a5a' },
              { key: 'yr',   label: lang === 'tr' ? 'YIL'    : 'YEAR',  value: stats?.year ?? '—',          color: '#7dd3fc' },
              { key: 'tech', label: lang === 'tr' ? 'TECH' : 'TECH',    value: stats?.technologies ?? '—',  color: '#d4a838' },
              { key: 'temp', label: lang === 'tr' ? 'SICAK' : 'TEMP',   value: stats?.temperature !== undefined ? `${stats.temperature}°` : '—', color: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#7dd3fc') : '#a0b4ff' },
            ].map(({ key, label, value, color }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '2px 7px' : '2px 10px', borderRight: '1px solid #cc2222', flexShrink: 0, minWidth: isMobile ? 42 : 52 }}>
                <span style={{ fontSize: 6, color: '#6a9a78', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: isMobile ? 10 : 11, color, fontFamily: 'Orbitron, monospace', fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: HIZ buttons | [ARIA mobile] | SONLANDIR | ÇIKIŞ | MENÜ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 4, padding: isMobile ? '3px 8px' : '3px 10px' }}>
          {!isMobile && <span style={{ fontSize: 8, color: '#6a9a78', letterSpacing: '0.1em', marginRight: 2, flexShrink: 0 }}>HIZ</span>}
          {SPEEDS.map(s => (
            <button key={s} onClick={() => changeSpeed(s)}
              style={{
                padding: isMobile ? '2px 5px' : '2px 6px', fontSize: isMobile ? 8 : 9,
                fontFamily: 'Orbitron, monospace', cursor: 'pointer',
                background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'transparent',
                border: `1px solid ${speedMultiplier === s ? '#00e887' : '#cc2222'}`,
                color: speedMultiplier === s ? '#00e887' : '#4a6a5a',
                flexShrink: 0,
              }}>
              {s}×
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {!isMobile && (
            <button onClick={terminateSim}
              style={{ padding: '2px 6px', fontSize: 8, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0 }}>
              {lang === 'tr' ? 'SONLANDIR' : 'TERMINATE'}
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', border: '1px solid #cc2222', color: '#7aaa88', background: 'transparent', fontSize: 8, letterSpacing: '0.05em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
              <FolderOpen size={9} />
              {lang === 'tr' ? 'ÇIKIŞ' : 'EXIT'}
            </button>
          )}
          <button
            onClick={() => { setMenuOpen(true); setMenuPage(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', border: '1px solid #cc2222', color: '#7aaa88', background: 'transparent', fontSize: 8, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
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
          borderRight: '1px solid #cc2222',
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
                    borderBottom: '1px solid #cc2222',
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


          {/* Collapsed population indicator */}
          {!sidebarExpanded && (
            <div style={{ padding: '6px 0', borderTop: '1px solid #cc2222', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Users size={10} color="#00e887" />
              <span style={{ fontSize: 8, color: '#00e887', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
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
              borderTop: '1px solid #cc2222',
              color: '#6a9a78',
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
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid #cc2222' }}>
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
                    borderRight: '1px solid #cc2222',
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
                  <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid #cc2222', padding: '3px 8px' }}>
                    <span style={{ fontSize: 7, color: '#6a9a78', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>
                      {lang === 'tr' ? 'BAŞLANGIÇ' : 'ORIGIN'}: {currentSim.start_latitude?.toFixed(3)}°{(currentSim.start_latitude ?? 0) >= 0 ? 'K' : 'G'}  {currentSim.start_longitude?.toFixed(3)}°{(currentSim.start_longitude ?? 0) >= 0 ? 'D' : 'B'}
                    </span>
                  </div>
                )}

                {/* Globe click coordinate overlay (bottom-right) */}
                {globeCoord && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20, background: 'rgba(0,5,2,0.92)', border: '1px solid #cc2222', padding: '5px 10px', fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 7, color: '#6a9a78', letterSpacing: '0.1em', marginBottom: 2 }}>
                      {lang === 'tr' ? '// KONUM' : '// COORDS'}
                    </div>
                    <div style={{ fontSize: 10, color: '#00e887', letterSpacing: '0.06em' }}>
                      {Math.abs(globeCoord.lat).toFixed(3)}°{globeCoord.lat >= 0 ? (lang === 'tr' ? 'K' : 'N') : (lang === 'tr' ? 'G' : 'S')}
                      {'  '}
                      {Math.abs(globeCoord.lon).toFixed(3)}°{globeCoord.lon >= 0 ? (lang === 'tr' ? 'D' : 'E') : (lang === 'tr' ? 'B' : 'W')}
                    </div>
                    <button onClick={() => setGlobeCoord(null)} style={{ marginTop: 3, fontSize: 7, color: '#6a9a80', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>✕</button>
                  </div>
                )}

                {/* Selected individual overlay */}
                {selectedInd && (
                  <div style={{ position: 'absolute', top: 80, right: 8, zIndex: 50, background: 'rgba(0,5,2,0.97)', border: '1px solid #00e887', padding: 12, minWidth: 160, fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 8, color: '#6a9a78', marginBottom: 4 }}>// {lang === 'tr' ? 'BİREY' : 'INDIVIDUAL'}</div>
                    <div style={{ fontSize: 12, color: '#00e887', marginBottom: 2 }}>
                      {selectedInd.name ?? `${selectedInd.sex === 'male' ? '♂' : '♀'}-${selectedInd.id?.slice(-4).toUpperCase()}`}
                    </div>
                    {!selectedInd.name && (
                      <div style={{ fontSize: 7, color: '#4a6a40', marginBottom: 4, fontStyle: 'italic' }}>
                        {lang === 'tr' ? '// dil henüz gelişmedi' : '// pre-linguistic era'}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Cinsiyet' : 'Sex'}: <span style={{ color: '#fff' }}>{selectedInd.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'Kadın' : 'Female')}</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Yaş' : 'Age'}: <span style={{ color: '#fff' }}>{selectedInd.age_years ?? '—'}</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Boy' : 'Height'}: <span style={{ color: '#a0e887' }}>{selectedInd.height_cm ?? selectedInd.phenotype?.height_cm ?? '—'} cm</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}: <span style={{ color: '#a0e887' }}>{selectedInd.weight_kg ?? '—'} kg</span></div>
                    <div style={{ fontSize: 9, color: '#6090a0' }}>HP: <span style={{ color: selectedInd.health?.hp > 0.6 ? '#4ecb71' : '#e05a5a' }}>{selectedInd.health?.hp !== undefined ? (selectedInd.health.hp * 100).toFixed(0) + '%' : '—'}</span></div>
                    <button onClick={() => setSelectedInd(null)} style={{ marginTop: 8, fontSize: 8, color: '#6a9a78', border: '1px solid #cc2222', padding: '2px 8px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
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
                    <div key={l} style={{ background: 'rgba(0,20,10,0.6)', border: '1px solid #cc2222', padding: '8px 12px' }}>
                      <div style={{ fontSize: 7, color: '#6a9a78', letterSpacing: '0.1em' }}>{l}</div>
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
                  <div style={{ border: '1px solid #cc2222', padding: 12 }}>
                    <div style={{ fontSize: 8, color: '#6a9a78', letterSpacing: '0.15em', marginBottom: 8 }}>SİMÜLASYON HIZI</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => changeSpeed(s)}
                          style={{
                            flex: 1, padding: '8px 0', fontSize: 12, fontFamily: 'Orbitron, monospace', fontWeight: 700, cursor: 'pointer',
                            background: speedMultiplier === s ? 'rgba(0,232,135,0.2)' : 'rgba(0,10,5,0.8)',
                            border: `1px solid ${speedMultiplier === s ? '#00e887' : '#cc2222'}`,
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
                      <div style={{ fontSize: 8, color: '#6a3030', letterSpacing: '0.15em', marginBottom: 8 }}>TEHLİKELİ BÖLGE</div>
                      <button onClick={terminateSim}
                        style={{ width: '100%', padding: '8px 0', fontSize: 10, border: '1px solid #6a2020', color: '#e05a5a', background: 'rgba(100,20,20,0.15)', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                        SİMÜLASYONU SONLANDIR
                      </button>
                    </div>
                  )}

                  <button onClick={() => navigate('/')}
                    style={{ width: '100%', padding: '8px 0', fontSize: 10, border: '1px solid #cc2222', color: '#6a9a78', background: 'transparent', letterSpacing: '0.1em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
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
        <span style={{ fontSize: 7, color: '#1e3a28', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
          Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026 Tüm hakları saklıdır. · RST Q-Nation 200120401018 · Yalçın Atabey
        </span>
      </div>

      {/* ═══ MENU OVERLAY ═══ */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setMenuOpen(false); setMenuPage(null); }}>
          <div style={{ background: 'rgba(0,4,2,0.98)', border: '1px solid #cc2222', minWidth: 340, maxWidth: 480, padding: 0, fontFamily: 'Share Tech Mono, monospace', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #cc2222', background: 'rgba(0,20,10,0.9)' }}>
              <div style={{ width: 3, height: 14, background: '#00e887', boxShadow: '0 0 6px #00e887', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#00e887', letterSpacing: '0.2em', flex: 1 }}>
                {menuPage === null ? 'ANATOLIA-SIM'
                  : menuPage === 'language' ? (lang === 'tr' ? 'DİL SEÇENEKLERİ' : 'LANGUAGE')
                  : menuPage === 'about' ? (lang === 'tr' ? 'HAKKIMIZDA' : 'ABOUT')
                  : menuPage === 'mission' ? (lang === 'tr' ? 'MİSYON & VİZYON' : 'MISSION & VISION')
                  : menuPage === 'guide' ? (lang === 'tr' ? 'KULLANIM KILAVUZU' : 'USER GUIDE')
                  : (lang === 'tr' ? 'İLETİŞİM' : 'CONTACT')}
              </span>
              <button onClick={() => { if (menuPage) { setMenuPage(null); } else { setMenuOpen(false); } }}
                style={{ background: 'transparent', border: 'none', color: '#6a9a78', cursor: 'pointer', fontSize: 9, letterSpacing: '0.1em', padding: '2px 6px' }}>
                {menuPage ? '← GERİ' : <X size={12} />}
              </button>
            </div>

            {/* Main menu */}
            {menuPage === null && (
              <div style={{ padding: '6px 0' }}>
                {[
                  { id: 'language', labelTr: '🌐 Dil / Language', labelEn: '🌐 Language' },
                  { id: 'guide', labelTr: '📖 Kullanım Kılavuzu', labelEn: '📖 User Guide' },
                  { id: 'about', labelTr: 'Hakkımızda', labelEn: 'About' },
                  { id: 'mission', labelTr: 'Misyon & Vizyon', labelEn: 'Mission & Vision' },
                  { id: 'contact', labelTr: 'İletişim', labelEn: 'Contact' },
                ].map(item => (
                  <button key={item.id} onClick={() => setMenuPage(item.id as any)}
                    style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #0a1a10', color: '#a0c8b0', fontSize: 11, textAlign: 'left', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}>
                    › {lang === 'tr' ? item.labelTr : item.labelEn}
                  </button>
                ))}
                {isMobile && (
                  <div style={{ padding: '8px 14px', borderTop: '1px solid #cc2222', display: 'flex', gap: 8 }}>
                    <button onClick={() => { setMenuOpen(false); navigate('/'); }}
                      style={{ flex: 1, padding: '7px 0', fontSize: 9, border: '1px solid #cc2222', color: '#7aaa88', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                      ← {lang === 'tr' ? 'ÇIKIŞ' : 'EXIT'}
                    </button>
                    <button onClick={() => { setMenuOpen(false); terminateSim(); }}
                      style={{ flex: 1, padding: '7px 0', fontSize: 9, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
                      {lang === 'tr' ? 'SONLANDIR' : 'TERMINATE'}
                    </button>
                  </div>
                )}
                <div style={{ padding: '8px 14px', borderTop: '1px solid #0a1a10', marginTop: isMobile ? 0 : 4 }}>
                  <div style={{ fontSize: 7.5, color: '#1e3a28', letterSpacing: '0.08em' }}>
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
                      width: '100%', padding: '10px 14px',
                      background: lang === l.code ? 'rgba(0,232,135,0.08)' : 'transparent',
                      border: 'none', borderBottom: '1px solid #0a1a10',
                      color: lang === l.code ? '#00e887' : '#a0c8b0',
                      fontSize: 11, textAlign: 'left', cursor: 'pointer',
                      letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace',
                    }}>
                    <span style={{ flex: 1 }}>› {l.label}</span>
                    {l.beta && <span style={{ fontSize: 8, padding: '1px 4px', border: '1px solid rgba(0,232,135,0.3)', color: '#00c870' }}>BETA</span>}
                    {lang === l.code && <span style={{ fontSize: 10, color: '#00e887' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-page content */}
            {menuPage !== null && menuPage !== 'guide' && menuPage !== 'language' && (() => {
              const pages: Record<string, { tr: string; en: string }> = {
                about: {
                  tr: 'ANATOLİA-SİM, Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. bünyesinde Yalçın Atabey tarafından geliştirilen, simülasyon hipotezini deneysel olarak test etmeye yönelik ileri düzey bir medeniyet simülasyon platformudur.\n\nGerçek biyolojik, genetik, çevresel ve sosyal mekanizmaları temel alarak iki bireyden başlayan bir nüfusun binlerce yıl boyunca nasıl evrildiğini, dil, inanç, teknoloji ve devlet yapılarını nasıl geliştirdiğini müdahalesiz biçimde gözlemlemeyi sağlar.\n\nProje Kodu: RST Q-Nation 200120401018',
                  en: 'ANATOLİA-SİM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş., designed to experimentally test the simulation hypothesis.\n\nIt models real biological, genetic, environmental and social mechanisms — observing a population that starts from two individuals, evolving over thousands of years into language, belief, technology and governance.\n\nProject Code: RST Q-Nation 200120401018',
                },
                mission: {
                  tr: 'MİSYON\nSimülasyon hipotezini bilimsel ve deneysel zeminlerde test etmek; insan medeniyetinin evrensel örüntülerini ortaya çıkarmak.\n\nVİZYON\nDünyanın en kapsamlı yapay yaşam ve medeniyet simülasyon platformu olmak; insanlığın kökeni, bilinci ve geleceği hakkında nesnel veriler üretmek.',
                  en: 'MISSION\nTest the simulation hypothesis on scientific and experimental grounds; reveal the universal patterns of human civilization.\n\nVISION\nBecome the world\'s most comprehensive artificial life and civilization simulation platform; produce objective data about the origin, consciousness and future of humanity.',
                },
                contact: {
                  tr: 'Proje Sahibi: Yalçın Atabey\nKuruluş: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-posta: info@boldkimya.com.tr\nTelefon: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 Tüm hakları saklıdır.',
                  en: 'Project Owner: Yalçın Atabey\nOrganization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.\nE-mail: info@boldkimya.com.tr\nPhone: +90 532 217 07 76\nORCID: 0009-0004-9037-5750\n\n© 2026 All rights reserved.',
                },
              };
              const text = (lang === 'tr' ? pages[menuPage].tr : pages[menuPage].en);
              return (
                <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
                  {text.split('\n').map((line, i) => (
                    <p key={i} style={{ fontSize: line === line.toUpperCase() && line.length > 2 ? 8.5 : 9, color: line === line.toUpperCase() && line.length > 2 ? '#00e887' : '#7aaa90', margin: '0 0 5px 0', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                      {line || <br />}
                    </p>
                  ))}
                </div>
              );
            })()}

            {/* User Guide */}
            {menuPage === 'guide' && (() => {
              const H = ({ children }: { children: React.ReactNode }) => (
                <div style={{ fontSize: 8, color: '#00e887', letterSpacing: '0.18em', margin: '14px 0 5px', paddingBottom: 3, borderBottom: '1px solid #0d2a18' }}>{children}</div>
              );
              const Sub = ({ children }: { children: React.ReactNode }) => (
                <div style={{ fontSize: 8.5, color: '#00c870', letterSpacing: '0.08em', margin: '7px 0 3px' }}>{children}</div>
              );
              const Row = ({ label, val }: { label: React.ReactNode; val: React.ReactNode }) => (
                <div style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
                  <span style={{ fontSize: 8.5, color: '#4a8a60', minWidth: 110, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 8.5, color: '#7aaa90', lineHeight: 1.5 }}>{val}</span>
                </div>
              );
              const Note = ({ children }: { children: React.ReactNode }) => (
                <div style={{ fontSize: 8, color: '#6a9a78', margin: '3px 0', lineHeight: 1.5, paddingLeft: 8, borderLeft: '2px solid #0d2a18' }}>{children}</div>
              );
              const Bullet = ({ children }: { children: React.ReactNode }) => (
                <div style={{ fontSize: 8.5, color: '#7aaa90', margin: '2px 0 2px 8px', lineHeight: 1.5 }}>› {children}</div>
              );
              return (
                <div style={{ padding: '10px 14px 14px', maxHeight: 480, overflowY: 'auto', fontSize: 9 }}>

                  <H>{lang === 'tr' ? '1 — SİMÜLASYON OLUŞTURMA' : '1 — CREATING A SIMULATION'}</H>
                  <Row label={lang === 'tr' ? 'Simülasyon Adı' : 'Name'} val={lang === 'tr' ? 'Medeniyetinize anlamlı bir ad verin. Raporlarda ve kontrol panelinde görünür.' : 'Give your civilization a meaningful name. Appears in reports and the control panel.'} />
                  <Row label={lang === 'tr' ? 'Konum Seçimi' : 'Location'} val={lang === 'tr' ? 'Haritadan bir başlangıç noktası seçin. Enlem/boylam, biyom ve iklim koşullarını belirler. Önerilen: Anadolu (36–42°K, 26–45°D), Mezopotamya, Nil Deltası.' : 'Pick a starting point on the map. Latitude/longitude determines biome and climate. Recommended: Anatolia (36–42°N, 26–45°E), Mesopotamia, Nile Delta.'} />
                  <Row label={lang === 'tr' ? 'Kurucu Bireyler' : 'Founders'} val={lang === 'tr' ? 'İki kurucunun adını, yaşını ve görünüşünü özelleştirin. Kurucular 60 yaşına kadar hastalık ve kazadan bağışıktır; tüm medeniyetin atasıdır.' : 'Customize name, age and appearance of both founders. Founders are immune to disease and accidents until age 60 — they are the ancestor of your entire civilization.'} />

                  <H>{lang === 'tr' ? '2 — ANA EKRAN VE HARİTA' : '2 — MAIN SCREEN & MAP'}</H>
                  <Sub>{lang === 'tr' ? '3B Dünya Haritası' : '3D World Map'}</Sub>
                  <Row label={lang === 'tr' ? 'Sol tık + sürükle' : 'Left drag'} val={lang === 'tr' ? 'Dünyayı döndür' : 'Rotate the globe'} />
                  <Row label={lang === 'tr' ? 'Fare tekerleği' : 'Scroll wheel'} val={lang === 'tr' ? 'Yakınlaştır / uzaklaştır' : 'Zoom in / out'} />
                  <Row label={lang === 'tr' ? 'Bir noktaya tıkla' : 'Click a dot'} val={lang === 'tr' ? 'O bireyin detay kartını açar (yaş, sağlık, beceri, ilişkiler)' : 'Opens that individual\'s detail card (age, health, skills, relationships)'} />
                  <Note>{lang === 'tr' ? 'Haritadaki her ışık noktası bir bireydir. Sarı = kurucu, yeşil = yetişkin, mavi = çocuk.' : 'Every dot on the map is an individual. Yellow = founder, green = adult, blue = child.'} </Note>
                  <Sub>{lang === 'tr' ? 'Üst Bar İstatistikleri' : 'Top Bar Stats'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Nüfus: O an hayatta olan birey sayısı' : 'Population: living individuals right now'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Yıl: Simülasyon yılı (1 yıl = 365 simülasyon günü)' : 'Year: simulation year (1 year = 365 sim days)'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Gruplar: Aktif sosyal grup sayısı' : 'Groups: active social groups'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Teknoloji: Keşfedilen teknoloji sayısı' : 'Technologies: number of discovered technologies'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Biyom, sıcaklık, besin ve su bolluğu anlık güncellenir' : 'Biome, temperature, food & water abundance update in real time'} </Bullet>

                  <H>{lang === 'tr' ? '3 — KONTROL BUTONLARI' : '3 — CONTROL BUTTONS'}</H>
                  <Row label='BAŞLAT / START' val={lang === 'tr' ? 'Simülasyonu çalıştırır. Sunucuda çalışır; tarayıcıyı kapatsanız bile simülasyon devam eder.' : 'Starts the simulation on the server. Even if you close the browser, it keeps running.'} />
                  <Row label='DURDUR / PAUSE' val={lang === 'tr' ? 'Simülasyonu duraklatır ve mevcut durumu veritabanına kaydeder. Dilediğinizde devam edebilirsiniz.' : 'Pauses the simulation and saves current state to the database. Resume any time.'} />
                  <Row label={lang === 'tr' ? 'HIZ ×1 → ×1000' : 'SPEED ×1 → ×1000'} val={lang === 'tr' ? '×1: Gerçek zamanlı (yavaş gözlem). ×10: Günlük takip. ×100: Haftalık takip. ×1000: Uzun dönem araştırma. Yüksek hızda ekran güncellemesi azalır, hesaplama hızlanır.' : '×1: real-time (slow observation). ×10: daily tracking. ×100: weekly tracking. ×1000: long-term research. At high speed screen updates slow, computation accelerates.'} />
                  <Row label='SONLANDIR / TERMINATE' val={lang === 'tr' ? 'Simülasyonu kalıcı olarak sonlandırır. Bu işlem geri alınamaz.' : 'Permanently terminates the simulation. This action cannot be undone.'} />
                  <Row label='ÇIKIŞ / EXIT' val={lang === 'tr' ? 'Ana panele döner. Simülasyon arka planda çalışmaya devam eder.' : 'Returns to the main panel. Simulation keeps running in the background.'} />

                  <H>{lang === 'tr' ? '4 — SOL PANEL MODÜLLERİ' : '4 — LEFT PANEL MODULES'}</H>
                  <Note>{lang === 'tr' ? 'Her modül butonu sol panelde bulunur. Tıklanınca sağdan kayarak açılan detay penceresi gelir.' : 'Each module button is on the left panel. Clicking opens a slide-in detail window.'} </Note>

                  <Sub>👥 {lang === 'tr' ? 'NÜFUS' : 'POPULATION'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Yaşayan bireylerin tam listesi, yaş ve cinsiyet dağılımı' : 'Full list of living individuals, age & sex distribution'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Ortalama yaş, doğurganlık oranı, nesil sayısı' : 'Average age, fertility rate, generation count'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Bir bireye tıklayarak genetik profil, sağlık durumu ve sosyal ilişkilerini görün' : 'Click an individual to see genome, health state & social relationships'} </Bullet>

                  <Sub>📋 {lang === 'tr' ? 'OLAYLAR' : 'EVENTS'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Tüm simülasyon olayları kronolojik sırayla: doğum, ölüm, keşif, çatışma, salgın, inanç oluşumu' : 'All simulation events in chronological order: birth, death, discovery, conflict, epidemic, belief formation'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Filtre seç: Tümü / Doğum / Ölüm / Teknoloji / Dil / Keşif / Felaket / İnanç' : 'Filter by: All / Birth / Death / Tech / Language / Discovery / Disaster / Belief'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Her olayın yılı, günü ve açıklaması görünür' : 'Each event shows its year, day and description'} </Bullet>

                  <Sub>🔤 {lang === 'tr' ? 'DİL' : 'LANGUAGE'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Sıfır kelimeden yazıya uzanan 7 aşamalı dil evrimi izlenir' : '7-stage language evolution tracked from zero words to writing'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Aşamalar: Dilöncesi → Ses taklidi → İşaretleşme → Proto-dil → Sözdizimi → Tam dil → Yazı' : 'Stages: Pre-linguistic → Sound imitation → Gesturing → Proto-language → Syntax → Full language → Writing'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Kelime hazinesi ve gramer yapısı gerçek zamanlı güncellenir' : 'Vocabulary and grammar structure update in real time'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Dil gelişimi nüfus büyüklüğü ve grup etkileşimine bağlıdır' : 'Language development depends on population size and group interaction'} </Bullet>

                  <Sub>⏳ {lang === 'tr' ? 'GEÇMİŞ (Zaman Makinesi)' : 'HISTORY (Time Machine)'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Her 365 simülasyon günde bir otomatik kontrol noktası kaydedilir' : 'A checkpoint is saved automatically every 365 simulation days'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Listeden bir noktayı seçerek o anki nüfus anlık görüntüsünü ve dünya durumunu inceleyin' : 'Select any point to examine the population snapshot and world state at that moment'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Nüfus hareketi, grup yapısı ve teknoloji düzeyi geçmişe dönük karşılaştırılabilir' : 'Population movement, group structure and tech level can be compared retrospectively'} </Bullet>

                  <Sub>📊 {lang === 'tr' ? 'ANALİZ' : 'ANALYSIS'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Nüfus eğrileri, genetik çeşitlilik ve akraba yetiştirme katsayıları' : 'Population curves, genetic diversity and inbreeding coefficients'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Kaynak tüketim grafikleri ve medeniyet puanı' : 'Resource consumption graphs and civilization score'} </Bullet>

                  <Sub>🧬 {lang === 'tr' ? 'MUTASYON (Biyoloji)' : 'MUTATION (Biology)'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Genomik varyasyonlar ve fenotipik özellik dağılımları' : 'Genomic variations and phenotypic trait distributions'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Bağışıklık gücü, zeka, fiziksel özellikler ve doğurganlığın nesiller arası evrimi' : 'Evolution of immunity, intelligence, physical traits and fertility across generations'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Yüksek akraba yetiştirme katsayısı genetik hastalık riskini artırır' : 'High inbreeding coefficient increases genetic disease risk'} </Bullet>

                  <Sub>✦ {lang === 'tr' ? 'TANRI MODU' : 'GOD MODE'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Salgın: Nüfusun bir bölümünü etkileyen hastalık dalgası başlatır' : 'Epidemic: launches a disease wave affecting part of the population'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Kuraklık: Besin ve su bolluğunu dramatik biçimde düşürür, göç tetikler' : 'Drought: drastically reduces food & water abundance, triggers migration'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Deprem: Yaralanmalar ve ölümlere yol açar, yapıları hasar görür' : 'Earthquake: causes injuries and deaths, damages structures'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Volkan: Bölgesel kaos, hava soğuması ve zorla göç' : 'Volcano: regional chaos, cooling, forced migration'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Sel: Su bolluğunu geçici olarak artırır, tarım arazilerini tahrip eder' : 'Flood: temporarily increases water, destroys farmland'} </Bullet>
                  <Note>{lang === 'tr' ? 'Tanrı müdahaleleri geri alınamaz. Dikkatli kullanın.' : 'God interventions cannot be undone. Use carefully.'} </Note>

                  <Sub>🧠 {lang === 'tr' ? 'AKIL (Psikoloji)' : 'MIND (Psychology)'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Bireysel ve toplumsal ruh hali, stres ve ölüm farkındalığı' : 'Individual and collective mood, stress and death awareness'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Bilinç gelişimi: Bireyler belirli bir zeka eşiğini geçince ölümlerinin farkına varır' : 'Consciousness: once intelligence crosses a threshold, individuals become aware of their mortality'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Stres, sağlık ve üreme başarısını doğrudan etkiler' : 'Stress directly affects health and reproductive success'} </Bullet>

                  <Sub>🌿 {lang === 'tr' ? 'ÇEVRE' : 'ENVIRONMENT'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Mevsim döngüleri, sıcaklık ve yağış miktarı' : 'Season cycles, temperature and rainfall'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Besin ve su bolluğu: yüksek değer nüfus büyümesini destekler' : 'Food & water abundance: high values support population growth'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Biyom tipi (step, orman, Akdeniz vb.) kaynakları belirler' : 'Biome type (steppe, forest, Mediterranean etc.) determines resource availability'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'İnsan çevresel etkisi nüfus büyüdükçe artar' : 'Human environmental impact grows as the population expands'} </Bullet>

                  <Sub>⚙ {lang === 'tr' ? 'TEKNOLOJİ' : 'TECHNOLOGY'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Keşfedilen teknolojilerin listesi ve her keşfin gerçekleştiği yıl' : 'List of discovered technologies and the year each was found'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Gelişim çizgisi: Besin toplayıcılık → Taş aletler → Tarım → Seramik → Metal işleme → İleri teknolojiler' : 'Development chain: Foraging → Stone tools → Agriculture → Ceramics → Metallurgy → Advanced tech'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Teknoloji keşfi zeka, grup büyüklüğü ve kaynak bolluğuna bağlıdır' : 'Tech discovery depends on intelligence, group size and resource abundance'} </Bullet>

                  <Sub>☽ {lang === 'tr' ? 'İNANÇ' : 'BELIEF'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Ölüm farkındalığı kazanan bireylerde inanç sistemleri kendiliğinden oluşur' : 'Belief systems emerge spontaneously in individuals who develop death awareness'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'İnançların gruplar arası yayılma hızı ve ritüellerin oluşumu izlenir' : 'Speed of belief spread between groups and emergence of rituals tracked'} </Bullet>

                  <Sub>🤝 {lang === 'tr' ? 'SOSYAL' : 'SOCIAL'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Gruplar, liderler, ittifaklar ve rakip gruplar arasındaki dinamikler' : 'Groups, leaders, alliances and rival-group dynamics'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Grup içi gerilim → liderlik yarışması → grup bölünmesi zinciri izlenebilir' : 'Internal tension → leadership contest → group fission chain can be observed'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Roller: Lider, Yaşlı, Savaşçı, Toplayıcı, Şifacı, Üye' : 'Roles: Leader, Elder, Warrior, Gatherer, Healer, Member'} </Bullet>

                  <Sub>💰 {lang === 'tr' ? 'EKONOMİ' : 'ECONOMY'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Kaynak envanteri, üretilen mallar ve ticaret aktivitesi' : 'Resource inventory, produced goods and trade activity'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Gini katsayısı ile zenginlik eşitsizliği ölçülür' : 'Wealth inequality measured with Gini coefficient'} </Bullet>

                  <Sub>🎭 {lang === 'tr' ? 'KÜLTÜR' : 'CULTURE'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Toplulukta ortaya çıkan kültürel unsurlar, değerler ve gelenekler' : 'Cultural elements, values and traditions emerging in the community'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Kültürel ögelerin kuşaklar arası aktarımı izlenir' : 'Intergenerational transmission of cultural elements tracked'} </Bullet>

                  <Sub>🎨 {lang === 'tr' ? 'SANAT' : 'ART'}</Sub>
                  <Bullet>{lang === 'tr' ? 'İlk sembolik ifadelerden karmaşık sanat formlarına uzanan gelişim' : 'Development from first symbolic expressions to complex art forms'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Sanat, topluluğun moralini ve sosyal kimliğini doğrudan güçlendirir' : 'Art directly strengthens community morale and social identity'} </Bullet>

                  <Sub>🌙 {lang === 'tr' ? 'ASTRONOMİ' : 'ASTRONOMY'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Gök cisimlerine yapılan ilk gözlemler ve bunların takvim sistemlerine dönüşümü' : 'First celestial observations and their transformation into calendar systems'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Astronomi bilgisi tarım zamanlaması ve din üzerinde etkilidir' : 'Astronomical knowledge influences farming timing and religion'} </Bullet>

                  <Sub>💡 {lang === 'tr' ? 'HİPOTEZ' : 'HYPOTHESIS'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Simülasyondan çıkarılan istatistiksel örüntüler ve hipotezler' : 'Statistical patterns and hypotheses derived from the simulation'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Hangi koşulların medeniyetin hızlanmasına ya da çöküşüne yol açtığı analiz edilir' : 'Conditions leading to civilizational acceleration or collapse are analyzed'} </Bullet>

                  <Sub>🔬 {lang === 'tr' ? 'EPİGENETİK' : 'EPIGENETICS'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Çevresel faktörlerin genetik ifadeye yansıması izlenir' : 'How environmental factors affect gene expression is tracked'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Ebeveynlerin stres ve beslenme koşulları çocuklara kalıtsal olarak aktarılabilir' : 'Parental stress and nutrition conditions can be inherited by children'} </Bullet>

                  <Sub>🏛️ {lang === 'tr' ? 'MİMARİ' : 'ARCHITECTURE'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Grupların kurduğu yerleşimler ve inşa ettikleri yapılar' : 'Settlements founded by groups and structures they build'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Barınaktan kalıcı yapılara uzanan inşa tarihi izlenebilir' : 'Building history from shelter to permanent structures can be traced'} </Bullet>

                  <Sub>⚖️ {lang === 'tr' ? 'HUKUK' : 'LAW'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Toplulukta kendiliğinden oluşan normlar, kurallar ve yaptırımlar' : 'Norms, rules and sanctions that emerge spontaneously in the community'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Sosyal düzenin kurumsallaşma süreci takip edilir' : 'Institutionalization of social order is tracked'} </Bullet>

                  <Sub>🦠 {lang === 'tr' ? 'MİKROBİYOM' : 'MICROBIOME'}</Sub>
                  <Bullet>{lang === 'tr' ? 'Bireylerin ve topluluğun mikrobiyolojik ekosistemi' : 'Microbiological ecosystem of individuals and the community'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Salgın hastalıkların kaynakları ve bağışıklık geliştirme süreçleri' : 'Sources of epidemic diseases and processes of developing immunity'} </Bullet>

                  <H>{lang === 'tr' ? '5 — OLAY KAYDI' : '5 — EVENT LOG'}</H>
                  <Bullet>{lang === 'tr' ? 'Harita üzerinde sol altta 3 satırlık özet akış görünür' : 'A 3-line summary feed appears bottom-left on the map'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Başlık çubuğundan tutarak ekranın istediğiniz köşesine sürükleyebilirsiniz' : 'Drag the title bar to reposition it anywhere on screen'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Detaylı liste için sol paneldeki OLAYLAR butonuna tıklayın' : 'For the full detailed list click EVENTS in the left panel'} </Bullet>

                  <H>{lang === 'tr' ? '6 — ARIA SES ASISTANI' : '6 — ARIA VOICE ASSISTANT'}</H>
                  <Row label={lang === 'tr' ? 'Uyandırma' : 'Wake word'} val={lang === 'tr' ? '"Antolia" kelimesini söyleyin veya mikrofon ikonuna tıklayın' : 'Say "Antolia" or click the microphone icon'} />
                  <Sub>{lang === 'tr' ? 'Örnek Komutlar' : 'Example Commands'}</Sub>
                  <Bullet>{lang === 'tr' ? '"Simülasyonu başlat" / "Simülasyonu durdur"' : '"Start the simulation" / "Stop the simulation"'} </Bullet>
                  <Bullet>{lang === 'tr' ? '"Hızı artır" / "Hızı düşür" / "Hızı 100 yap"' : '"Increase speed" / "Decrease speed" / "Set speed to 100"'} </Bullet>
                  <Bullet>{lang === 'tr' ? '"Nüfus panelini aç" / "Tanrı modunu aç" / "Olaylar panelini kapat"' : '"Open population panel" / "Open god mode" / "Close events panel"'} </Bullet>
                  <Bullet>{lang === 'tr' ? '"Nüfus kaçtır?" / "Kaçıncı yıldayız?" / "En son ne oldu?"' : '"What is the population?" / "What year is it?" / "What happened last?"'} </Bullet>
                  <Bullet>{lang === 'tr' ? '"Salgın başlat" / "Kuraklık uygula"' : '"Start epidemic" / "Apply drought"'} </Bullet>
                  <Bullet>{lang === 'tr' ? '"Dili değiştir" (Türkçe ↔ İngilizce)' : '"Toggle language" (Turkish ↔ English)'} </Bullet>
                  <Note>{lang === 'tr' ? 'ARIA simülasyonun tam durumunu okuyarak akıllıca yanıt verir. İnternet bağlantısı gerektirir.' : 'ARIA reads the full simulation state to give intelligent answers. Requires internet connection.'} </Note>

                  <H>{lang === 'tr' ? '7 — İPUÇLARI VE STRATEJİLER' : '7 — TIPS & STRATEGIES'}</H>
                  <Bullet>{lang === 'tr' ? 'Her 365 simülasyon günde bir otomatik kayıt yapılır; veri kaybı olmaz' : 'Auto-save runs every 365 simulation days — no data loss'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Yüksek hız (×1000) uzun dönem medeniyetleri gözlemlemek için idealdir' : 'High speed (×1000) is ideal for observing long-term civilizations'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Küçük nüfuslarda akraba yetiştirme kaçınılmazdır; genetik hastalık riskini Biyoloji panelinden takip edin' : 'Inbreeding is inevitable in small populations; monitor genetic disease risk in Biology panel'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'İlk iki kurucu 60 yaşına kadar ölmez; bu sürede mümkün olduğunca çok çocuk sahibi olmaları önemlidir' : 'First two founders cannot die before age 60; having as many children as possible in this window is crucial'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Grup oluşumu en az 2 yetişkin bireyin yakın konumda bulunmasını gerektirir' : 'Group formation requires at least 2 adults to be in close proximity'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Dil gelişimi için nüfusun 5+ kişilik gruplar halinde bir arada yaşaması gerekir' : 'Language development requires groups of 5+ individuals living together'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Tanrı modundaki felaketler nüfus tıkandığında kullanışlıdır; doğal seçilimi hızlandırır' : 'God-mode disasters are useful when population stagnates; they accelerate natural selection'} </Bullet>
                  <Bullet>{lang === 'tr' ? 'Tarayıcıyı kapatmak simülasyonu durdurmaz; sunucu arka planda çalışmayı sürdürür' : 'Closing the browser does not stop the simulation; the server keeps running in the background'} </Bullet>

                  <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #0a1a10', fontSize: 7.5, color: '#1e3a28', letterSpacing: '0.06em' }}>
                    ANATOLİA-SİM · RST Q-Nation 200120401018 · © 2026 Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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

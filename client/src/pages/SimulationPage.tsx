import { useEffect, useState, useRef, type CSSProperties } from 'react';
import FooterBar from '../components/layout/FooterBar';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, Pause, FolderOpen, ChevronLeft, ChevronRight, Users, Globe } from 'lucide-react';
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
import GenealogyPanel from '../components/panels/GenealogyPanel';
import TimeMachinePanel from '../components/panels/TimeMachinePanel';
import AnalysisPanel from '../components/panels/AnalysisPanel';
import HypothesisPanel from '../components/panels/HypothesisPanel';
import StatsPanel from '../components/panels/StatsPanel';
import PopulationPyramidPanel from '../components/panels/PopulationPyramidPanel';
import ReportPanel from '../components/panels/ReportPanel';
import EventsPanel from '../components/panels/EventsPanel';
import { translateEventDescription, translateSeason, type LangCode } from '../utils/i18n';

const SPEEDS = [1, 5, 20, 100];

const MODULES = [
  { id: 'population',   label: 'NÃƒÅ“FUS',      labelEn: 'POPUL.',   icon: 'ÄŸÅ¸â€˜Â¥' },
  { id: 'olaylar',      label: 'OLAYLAR',    labelEn: 'EVENTS',   icon: 'ÄŸÅ¸â€œâ€¹', special: true },
  { id: 'language',     label: 'DÃ„Â°L',        labelEn: 'LANG.',    icon: 'ÄŸÅ¸â€Â¤' },
  { id: 'timemachine',  label: 'GEÃƒâ€¡MÃ„Â°Ã…Â',     labelEn: 'HISTORY',  icon: 'Ã¢ÂÂ³' },
  { id: 'analysis',     label: 'ANALÃ„Â°Z',     labelEn: 'ANALYS.',  icon: 'ÄŸÅ¸â€œÅ ' },
  { id: 'pyramid',      label: 'PÃ„Â°RAMÃ„Â°T',    labelEn: 'PYRAMID',  icon: 'ÄŸÅ¸â€œÂ' },
  { id: 'report',       label: 'RAPOR',      labelEn: 'REPORT',   icon: 'ÄŸÅ¸â€œâ€' },
  { id: 'biology',      label: 'MUTASYON',   labelEn: 'MUTAT.',   icon: 'ÄŸÅ¸Â§Â¬' },
  { id: 'god',          label: 'TANRI',      labelEn: 'GOD',      icon: 'Ã¢Å“Â¦',  accent: '#f97316' },
  { id: 'psychology',   label: 'AKIL',       labelEn: 'MIND',     icon: 'ÄŸÅ¸Â§Â ' },
  { id: 'environment',  label: 'Ãƒâ€¡EVRE',      labelEn: 'ENV.',     icon: 'ÄŸÅ¸Å’Â¿' },
  { id: 'technology',   label: 'TEKNOLOJÃ„Â°',  labelEn: 'TECH',     icon: 'Ã¢Å¡â„¢' },
  { id: 'belief',       label: 'Ã„Â°NANÃƒâ€¡',      labelEn: 'BELIEF',   icon: 'Ã¢ËœÂ½' },
  { id: 'social',       label: 'SOSYAL',     labelEn: 'SOCIAL',   icon: 'ÄŸÅ¸Â¤Â' },
  { id: 'economy',      label: 'EKONOMÃ„Â°',    labelEn: 'ECON.',    icon: 'ÄŸÅ¸â€™Â°' },
  { id: 'culture',      label: 'KÃƒÅ“LTÃƒÅ“R',     labelEn: 'CULT.',    icon: 'ÄŸÅ¸ÂÂ­' },
  { id: 'art',          label: 'SANAT',      labelEn: 'ART',      icon: 'ÄŸÅ¸ÂÂ¨' },
  { id: 'astronomy',    label: 'ASTRONOMÃ„Â°',  labelEn: 'ASTRO.',   icon: 'ÄŸÅ¸Å’â„¢' },
  { id: 'hypothesis',   label: 'HÃ„Â°POTEZ',    labelEn: 'HYPOTH.',  icon: 'ÄŸÅ¸â€™Â¡' },
  { id: 'epigenetics',  label: 'EPÃ„Â°GEN.',    labelEn: 'EPIGEN.',  icon: 'ÄŸÅ¸â€Â¬' },
  { id: 'architecture', label: 'MÃ„Â°MARÃ„Â°',     labelEn: 'ARCH.',    icon: 'ÄŸÅ¸Ââ€ºÃ¯Â¸Â' },
  { id: 'law',          label: 'HUKUK',      labelEn: 'LAW',      icon: 'Ã¢Å¡â€“Ã¯Â¸Â' },
  { id: 'microbiome',   label: 'MÃ„Â°KROBÃ„Â°YOM', labelEn: 'MICROB.',  icon: 'ÄŸÅ¸Â¦Â ' },
];

const TABS = [
  { id: 'harita',  label: 'HARÃ„Â°TA',  labelEn: 'MAP' },
  { id: 'durum',   label: 'DURUM',   labelEn: 'STATUS' },
];

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
      {/* Drag handle Ã¢â‚¬â€ mouse + touch */}
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
      {/* Events Ã¢â‚¬â€ 3 rows max */}
      <div style={{ padding: '2px 6px' }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: 14, color: '#a0c8b0', padding: '4px 0', fontFamily: 'Share Tech Mono, monospace', fontStyle: 'italic' }}>
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
  const { user, accessToken, setCurrentSim, currentSim, stats, events, activePanel, setActivePanel, lang, speedMultiplier, setSpeed, resetLiveState, setEvents } = useSimStore();
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'harita' | 'durum'>('harita');
  const [realTime, setRealTime] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640);
  const [selectedInd, setSelectedInd] = useState<any>(null);
  const [globeCoord, setGlobeCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customSpeed, setCustomSpeed] = useState('');
  const [menuPage, setMenuPage] = useState<'language' | 'guide' | 'about' | 'mission' | 'contact' | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [actionBusy, setActionBusy] = useState(false);
  const [speedBusy, setSpeedBusy] = useState(false);

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
      if (tab === 'harita' || tab === 'durum') setActiveTab(tab);
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
          if (!confirm(l === 'tr' ? 'SimÃƒÂ¼lasyonu sonlandÃ„Â±r?' : 'Terminate simulation?')) return;
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
    axios.get(`/api/simulations/${simId}`, { headers })
      .then(r => { setCurrentSim(r.data); setSpeed(r.data.speed_multiplier ?? 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
    if (!currentSim) { alert('SimÃƒÂ¼lasyon yÃƒÂ¼klenmedi, sayfayÃ„Â± yenileyin.'); return; }
    if (!accessToken) { alert('Oturum sÃƒÂ¼resi dolmuÃ…Å¸, ÃƒÂ§Ã„Â±kÃ„Â±Ã…Å¸ yapÃ„Â±p tekrar giriÃ…Å¸ yapÃ„Â±n.'); return; }
    if (actionBusy) return;
    setActionBusy(true);
    const action = currentSim.status === 'running' ? 'pause' : 'start';
    const previous = currentSim;
    try {
      setCurrentSim({ ...currentSim, status: action === 'start' ? 'running' : 'paused' });
      await axios.post(`/api/simulations/${currentSim.id}/${action}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch (err: any) {
      setCurrentSim(previous);
      alert(`Hata: ${err?.response?.data?.error ?? err?.message ?? 'Bilinmeyen hata'}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function changeSpeed(s: number) {
    if (!Number.isInteger(s) || s < 1 || s > 1000 || !currentSim || !accessToken) return;
    if (speedBusy) return;
    setSpeedBusy(true);
    const previous = speedMultiplier;
    setSpeed(s);
    try {
      await axios.post(`/api/simulations/${simId}/speed`, { speed_multiplier: s }, { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      setSpeed(previous);
    } finally {
      setSpeedBusy(false);
    }
  }

  function applyCustomSpeed() {
    const v = parseInt(customSpeed);
    if (v >= 1 && v <= 1000) { changeSpeed(v); setCustomSpeed(''); }
  }

  async function terminateSim() {
    if (!currentSim || !accessToken) return;
    if (!confirm(lang === 'tr' ? 'SimÃƒÂ¼lasyonu sonlandÃ„Â±r?' : 'Terminate simulation?')) return;
    const previous = currentSim;
    setCurrentSim({ ...currentSim, status: 'completed' });
    try {
      await axios.post(`/api/simulations/${currentSim.id}/terminate`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
      navigate('/');
    } catch {
      setCurrentSim(previous);
    }
  }

  const isRunning = currentSim?.status === 'running';
  const simYear = stats?.year ?? 0;
  const simDay = stats?.day ?? 0;
  const seasonLabel = translateSeason(stats?.season ?? '', lang as LangCode);
  const simHour = stats?.hour !== undefined ? `${String(stats.hour).padStart(2, '0')}:00` : '00:00';
  const births = stats?.births ?? 0;
  const deaths = stats?.deaths ?? 0;
  const wordCount = stats?.word_count ?? 0;

  function fmtEvent(ev: any) {
    const prefix = `Y${String(ev.sim_year).padStart(4, '0')} G${String(ev.sim_day % 365).padStart(3, '0')}`;
    const icon = ev.event_type?.includes('birth') ? '+' : ev.event_type?.includes('death') ? 'Ã¢â‚¬Â ' : ev.event_type?.includes('discovery') ? 'Ã¢â€”â€ ' : ev.event_type?.includes('disaster') ? 'Ã¢Å¡Â ' : 'Ã‚Â·';
    const rawDesc = ev.description ?? ev.event_type;
    const desc = translateEventDescription(rawDesc, lang as LangCode, ev);
    return `${prefix} ${icon} ${desc}`;
  }

  function eventColor(ev: any, idx: number): string {
    if (ev.event_type?.includes('birth')) return idx === 0 ? '#7aff9a' : `rgba(100,220,130,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('death')) return idx === 0 ? '#e08080' : `rgba(200,80,80,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('discovery')) return idx === 0 ? '#7dd3fc' : `rgba(100,180,240,${Math.max(0.3, 1 - idx * 0.1)})`;
    if (ev.event_type?.includes('disaster')) return idx === 0 ? '#f97316' : `rgba(240,100,30,${Math.max(0.3, 1 - idx * 0.1)})`;
    return idx === 0 ? '#a0e8c0' : `rgba(80,160,110,${Math.max(0.25, 1 - idx * 0.07)})`;
  }

  const uiText = {
    live: lang === 'tr' ? 'CANLI' : 'LIVE',
    speed: lang === 'tr' ? 'HIZ' : 'SPEED',
    set: lang === 'tr' ? 'AYARLA' : 'SET',
    creatorTime: lang === 'tr' ? 'KURUCU ZAMANI' : 'CREATOR TIME',
    user: lang === 'tr' ? 'KULLANICI' : 'USER',
  };

  const sidebarW = sidebarExpanded ? 180 : 44;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', color: '#fff', fontFamily: 'Share Tech Mono, monospace' }}>

      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â HEADER (3 rows) Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.97)', borderBottom: '1px solid #4a1a1a' }}>

        {/* Row 1: Logo | SIM time | [ARIA desktop] | [clock desktop] | BAÃ…ÂLAT/DURDUR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, padding: isMobile ? '4px 8px' : '5px 10px', borderBottom: '1px solid #4a1a1a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ position: 'relative', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="neon-breathe" style={{ position: 'absolute', inset: 0, borderRadius: '999px', border: '1px solid rgba(79,158,247,0.5)', boxShadow: '0 0 8px rgba(79,158,247,0.5)' }} />
                <Globe size={11} style={{ color: '#4f9ef7', filter: 'drop-shadow(0 0 6px rgba(79,158,247,0.95)) drop-shadow(0 0 12px rgba(79,158,247,0.45))' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: 2 }}>
                <span style={{ fontSize: isMobile ? 12 : 14, fontFamily: 'Orbitron, monospace', fontWeight: 900, color: '#e0e0f0', letterSpacing: isMobile ? '0.12em' : '0.2em', textShadow: '0 0 10px rgba(79,158,247,0.35)' }}>
                  ANATOLÃ„Â°A-SÃ„Â°M
                </span>
                <span style={{ fontSize: isMobile ? 10 : 11, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, color: '#cc2222', letterSpacing: isMobile ? '0.16em' : '0.22em', textAlign: 'center', width: '100%' }}>
                  {lang === 'tr' ? 'MEDENÃ„Â°YET' : 'CIVILIZATION'}
                </span>
              </div>
            </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: isMobile ? 3 : 6 }}>
            <span style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.1em' }}>
              {lang === 'tr' ? 'SÃ„Â°M ZAMANI' : 'SIM TIME'}
            </span>
            <span style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.04em', fontFamily: 'Orbitron, monospace' }}>
              Y{String(simYear).padStart(4, '0')} G{String(simDay % 365).padStart(3, '0')}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {!isMobile && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 6 }}>
              <span style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.1em' }}>{uiText.creatorTime}</span>
              <span style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.05em' }}>{realTime}</span>
            </div>
          )}

          <button
            onClick={toggleSim}
            disabled={loading || actionBusy}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              padding: isMobile ? '5px 12px' : '5px 16px',
              fontSize: 14,
              fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.1em',
              background: (loading || actionBusy) ? 'rgba(120,120,120,0.18)' : isRunning ? 'rgba(212,56,56,0.18)' : 'rgba(0,232,135,0.18)',
              border: `1px solid ${(loading || actionBusy) ? '#555' : isRunning ? '#c03030' : '#00e887'}`,
              color: (loading || actionBusy) ? '#666' : isRunning ? '#e05a5a' : '#00e887',
              boxShadow: isRunning ? '0 0 10px rgba(200,50,50,0.3)' : '0 0 10px rgba(0,232,135,0.25)',
              cursor: (loading || actionBusy) ? 'not-allowed' : 'pointer',
              opacity: (loading || actionBusy) ? 0.6 : 1,
            }}>
            {loading ? null : isRunning ? <Pause size={11} /> : <Play size={11} />}
            {loading ? (lang === 'tr' ? '...' : '...') : isRunning ? (lang === 'tr' ? 'DURDUR' : 'PAUSE') : (lang === 'tr' ? 'BAÃ…ÂLAT' : 'START')}
          </button>

          {isRunning && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e887', boxShadow: '0 0 8px #00e887', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
          )}
        </div>

        {/* Row 2: Compact metrics + controls */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, padding: '8px 10px', borderBottom: '1px solid #4a1a1a', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(4,4,18,0.85), rgba(2,2,10,0.96))' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: 6, flex: 1, minWidth: 0 }}>
            {[
              { key: 'pop', label: lang === 'tr' ? 'NÃœFUS' : 'POP', value: stats?.population ?? 'â€”', color: '#00e887' },
              { key: 'life', label: lang === 'tr' ? 'DOÄUM / Ã–LÃœM' : 'BIRTH / DEATH', value: `${births} / ${deaths}`, color: '#c0ccff' },
              { key: 'year', label: lang === 'tr' ? 'YIL' : 'YEAR', value: stats?.year ?? 'â€”', color: '#7dd3fc' },
              { key: 'tech', label: lang === 'tr' ? 'TEKNOLOJÄ°' : 'TECH', value: stats?.technologies ?? 'â€”', color: '#d4a838' },
              {
                key: 'env',
                label: lang === 'tr' ? 'MEVSÄ°M / SICAKLIK' : 'SEASON / TEMP',
                value: `${seasonLabel} Â· ${stats?.temperature !== undefined ? `${stats.temperature}Â°` : 'â€”'} Â· ${(() => { const icons: Record<string, string> = { clear: 'â˜€ï¸', rain: 'ğŸŒ§', heavy_rain: 'â›ˆ', snow: 'â„ï¸', blizzard: 'ğŸŒ¨', storm: 'ğŸŒ©', heat_wave: 'ğŸ”¥', drought: 'ğŸœ' }; return icons[(stats as any)?.weather] ?? 'â˜€ï¸'; })()}`,
                color: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#a0b4ff') : '#a0b4ff',
              },
            ].map(({ key, label, value, color }) => (
              <div key={key} style={{ minWidth: 0, padding: '7px 10px', border: '1px solid rgba(74,26,26,0.95)', background: 'rgba(6,6,20,0.72)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
                <div style={{ fontSize: 9, color: '#7b8fb2', letterSpacing: '0.16em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ marginTop: 2, fontSize: isMobile ? 13 : 14, color, fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingLeft: 10, borderLeft: '1px solid rgba(74,26,26,0.9)' }}>
            {user && !isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 1, padding: '2px 8px', border: '1px solid rgba(160,200,176,0.22)', background: 'rgba(10,10,30,0.42)', clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
                <span style={{ fontSize: 8, color: '#a0c8b0', letterSpacing: '0.18em' }}>{uiText.user}</span>
                <span style={{ fontSize: 11, color: '#e0e0f0', letterSpacing: '0.08em', fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>{user.username.toUpperCase()}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#7b8fb2', letterSpacing: '0.16em', marginRight: 2 }}>{uiText.speed}</span>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => changeSpeed(s)} disabled={speedBusy}
                  style={{ minWidth: 32, padding: '4px 6px', fontSize: 11, fontFamily: 'Orbitron, monospace', cursor: speedBusy ? 'not-allowed' : 'pointer', background: speedMultiplier === s ? 'rgba(0,232,135,0.18)' : 'rgba(10,10,30,0.68)', border: `1px solid ${speedMultiplier === s ? '#00e887' : 'rgba(160,200,176,0.24)'}`, color: speedMultiplier === s ? '#00e887' : '#8abda0', flexShrink: 0, opacity: speedBusy ? 0.55 : 1, boxShadow: speedMultiplier === s ? '0 0 12px rgba(0,232,135,0.12)' : 'none' }}>
                  {s}Ã—
                </button>
              ))}
              {!isMobile && (
                <>
                  <input type="number" min={1} max={1000} value={customSpeed} onChange={e => setCustomSpeed(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') applyCustomSpeed(); }} placeholder={`${speedMultiplier}Ã—`} style={{ fontSize: 11, padding: '4px 6px', width: 54, background: 'rgba(10,10,30,0.68)', border: '1px solid rgba(160,200,176,0.24)', color: '#a0c8b0', fontFamily: 'Share Tech Mono, monospace', outline: 'none', flexShrink: 0 }} />
                  <button onClick={applyCustomSpeed} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(0,232,135,0.35)', color: '#00e887', background: 'rgba(0,232,135,0.08)', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0, letterSpacing: '0.05em' }}>
                    {uiText.set}
                  </button>
                </>
              )}
            </div>

            {!isMobile && (
              <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', border: '1px solid rgba(160,200,176,0.28)', color: '#a0c8b0', background: 'rgba(10,10,30,0.55)', fontSize: 11, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
                <FolderOpen size={9} />
                {lang === 'tr' ? 'Ã‡IKIÅ' : 'EXIT'}
              </button>
            )}

            <button onClick={() => setMenuOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid rgba(160,200,176,0.32)', color: '#a0c8b0', background: 'rgba(10,10,30,0.65)', fontSize: 11, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
              â˜° {!isMobile && (lang === 'tr' ? 'MENÃœ' : 'MENU')}
            </button>
          </div>
        </div>
      </div>

      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â BODY: SIDEBAR + MAIN Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ LEFT SIDEBAR Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                    color: isActive ? accent : '#8abda0',
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
                {stats?.population !== undefined ? (stats.population > 999 ? `${Math.floor(stats.population / 1000)}k` : stats.population) : 'Ã¢â‚¬â€'}
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
              color: '#a0c8b0',
              cursor: 'pointer',
              fontSize: 14,
              gap: 4,
            }}>
            {sidebarExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            {sidebarExpanded && <span style={{ fontSize: 14, letterSpacing: '0.08em' }}>{lang === 'tr' ? 'DARALT' : 'COLLAPSE'}</span>}
          </button>
        </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ MAIN CONTENT Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                    color: isActive ? '#00e887' : '#8abda0',
                    background: isActive ? 'rgba(0,232,135,0.06)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? '#00e887' : 'rgba(255,255,255,0.08)'}`,
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
                    <span style={{ fontSize: 14, color: '#a0c8b0', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>
                      {lang === 'tr' ? 'BAÃ…ÂLANGIÃƒâ€¡' : 'ORIGIN'}: {currentSim.start_latitude?.toFixed(3)}Ã‚Â°{(currentSim.start_latitude ?? 0) >= 0 ? 'K' : 'G'}  {currentSim.start_longitude?.toFixed(3)}Ã‚Â°{(currentSim.start_longitude ?? 0) >= 0 ? 'D' : 'B'}
                    </span>
                  </div>
                )}

                {/* Globe click coordinate overlay (bottom-right) */}
                {globeCoord && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20, background: 'rgba(0,5,2,0.92)', border: '1px solid #4a1a1a', padding: '5px 10px', fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.1em', marginBottom: 2 }}>
                      {lang === 'tr' ? '// KONUM' : '// COORDS'}
                    </div>
                    <div style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.06em' }}>
                      {Math.abs(globeCoord.lat).toFixed(3)}Ã‚Â°{globeCoord.lat >= 0 ? (lang === 'tr' ? 'K' : 'N') : (lang === 'tr' ? 'G' : 'S')}
                      {'  '}
                      {Math.abs(globeCoord.lon).toFixed(3)}Ã‚Â°{globeCoord.lon >= 0 ? (lang === 'tr' ? 'D' : 'E') : (lang === 'tr' ? 'B' : 'W')}
                    </div>
                    <button onClick={() => setGlobeCoord(null)} style={{ marginTop: 3, fontSize: 14, color: '#a0c8b0', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>Ã¢Å“â€¢</button>
                  </div>
                )}

                {/* Selected individual overlay */}
                {selectedInd && (
                  <div style={{ position: 'absolute', top: 80, right: 8, zIndex: 50, background: 'rgba(0,5,2,0.97)', border: '1px solid #00e887', padding: 12, minWidth: 160, fontFamily: 'Share Tech Mono, monospace' }}>
                    <div style={{ fontSize: 14, color: '#a0c8b0', marginBottom: 4 }}>// {lang === 'tr' ? 'BÃ„Â°REY' : 'INDIVIDUAL'}</div>
                    <div style={{ fontSize: 14, color: '#00e887', marginBottom: 2 }}>
                      {selectedInd.name ?? `${selectedInd.sex === 'male' ? 'Ã¢â„¢â€š' : 'Ã¢â„¢â‚¬'}-${selectedInd.id?.slice(-4).toUpperCase()}`}
                    </div>
                    {!selectedInd.name && (
                      <div style={{ fontSize: 14, color: '#8abda0', marginBottom: 4, fontStyle: 'italic' }}>
                        {lang === 'tr' ? '// dil henÃƒÂ¼z geliÃ…Å¸medi' : '// pre-linguistic era'}
                      </div>
                    )}
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Cinsiyet' : 'Sex'}: <span style={{ color: '#fff' }}>{selectedInd.sex === 'male' ? (lang === 'tr' ? 'Erkek' : 'Male') : (lang === 'tr' ? 'KadÃ„Â±n' : 'Female')}</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'YaÃ…Å¸' : 'Age'}: <span style={{ color: '#fff' }}>{selectedInd.age_years ?? 'Ã¢â‚¬â€'}</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Boy' : 'Height'}: <span style={{ color: '#a0e887' }}>{selectedInd.height_cm ?? selectedInd.phenotype?.height_cm ?? 'Ã¢â‚¬â€'} cm</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>{lang === 'tr' ? 'Kilo' : 'Weight'}: <span style={{ color: '#a0e887' }}>{selectedInd.weight_kg ?? 'Ã¢â‚¬â€'} kg</span></div>
                    <div style={{ fontSize: 14, color: '#6090a0' }}>HP: <span style={{ color: selectedInd.health?.hp > 0.6 ? '#4ecb71' : '#e05a5a' }}>{selectedInd.health?.hp !== undefined ? (selectedInd.health.hp * 100).toFixed(0) + '%' : 'Ã¢â‚¬â€'}</span></div>
                    <button onClick={() => setSelectedInd(null)} style={{ marginTop: 8, fontSize: 14, color: '#a0c8b0', border: '1px solid #4a1a1a', padding: '2px 8px', background: 'transparent', width: '100%', cursor: 'pointer' }}>
                      {lang === 'tr' ? 'KAPAT' : 'CLOSE'}
                    </button>
                  </div>
                )}

                {/* Stats telemetry panel */}
                <StatsPanel />

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
                    { l: lang === 'tr' ? 'NÃƒÅ“FUS'      : 'POP.',      v: stats?.population ?? 'Ã¢â‚¬â€',                                                                 c: '#00e887' },
                    { l: lang === 'tr' ? 'YIL'        : 'YEAR',      v: stats?.year ?? 'Ã¢â‚¬â€',                                                                        c: '#7dd3fc' },
                    { l: lang === 'tr' ? 'GÃƒÅ“N'        : 'DAY',       v: stats?.day ?? 'Ã¢â‚¬â€',                                                                         c: '#a0b4ff' },
                    { l: lang === 'tr' ? 'DOÃ„ÂUM'      : 'BIRTHS',    v: births,                                                                                     c: '#4ecb71' },
                    { l: lang === 'tr' ? 'Ãƒâ€“LÃƒÅ“M'       : 'DEATHS',    v: deaths,                                                                                     c: '#e05a5a' },
                    { l: lang === 'tr' ? 'KELÃ„Â°ME'     : 'WORDS',     v: wordCount,                                                                                  c: '#7dd3fc' },
                    { l: lang === 'tr' ? 'ZEKA ORT.'  : 'AVG IQ',    v: stats?.avg_intelligence !== undefined ? (stats.avg_intelligence * 100).toFixed(0) + '%' : 'Ã¢â‚¬â€', c: '#d4a838' },
                    { l: lang === 'tr' ? 'MUTLULUK'   : 'HAPPINESS', v: stats?.happiness_index !== undefined ? (stats.happiness_index * 100).toFixed(0) + '%' : 'Ã¢â‚¬â€',   c: '#ff8ab0' },
                    { l: lang === 'tr' ? 'HASTALIK'   : 'DISEASE',   v: stats?.sick_rate !== undefined ? (stats.sick_rate * 100).toFixed(0) + '%' : 'Ã¢â‚¬â€',               c: '#f97316' },
                    { l: lang === 'tr' ? 'TEKNOLOJÃ„Â°'  : 'TECH',      v: stats?.technologies ?? 'Ã¢â‚¬â€',                                                                c: '#4ecb71' },
                    { l: lang === 'tr' ? 'Ã„Â°NANÃƒâ€¡'      : 'BELIEFS',   v: stats?.beliefs ?? 'Ã¢â‚¬â€',                                                                    c: '#a855f7' },
                    { l: lang === 'tr' ? 'SICAKLIK'   : 'TEMP',      v: stats?.temperature !== undefined ? `${stats.temperature}Ã‚Â°` : 'Ã¢â‚¬â€',                          c: stats?.temperature !== undefined ? (stats.temperature > 30 ? '#e05a5a' : '#7dd3fc') : '#a0b4ff' },
                    { l: lang === 'tr' ? 'GRUPLAR'    : 'GROUPS',    v: stats?.groups ?? 'Ã¢â‚¬â€',                                                                      c: '#d4a838' },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'rgba(0,20,10,0.6)', border: '1px solid #4a1a1a', padding: '8px 12px' }}>
                      <div style={{ fontSize: 14, color: '#a0c8b0', letterSpacing: '0.1em' }}>{l}</div>
                      <div style={{ fontSize: 18, color: c, fontFamily: 'Orbitron, monospace', fontWeight: 700, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ FOOTER Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <FooterBar mode="flow" />

      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â MENU OVERLAY Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
      <SimMenuOverlay
        isOpen={menuOpen}
        onClose={() => { setMenuOpen(false); setMenuPage(null); }}
        menuPage={menuPage}
        onMenuPageChange={setMenuPage}
        mobileActions={isMobile ? (
          <div style={{ padding: '8px 14px', borderTop: '1px solid #4a1a1a', display: 'flex', gap: 8 }}>
            <button onClick={() => { setMenuOpen(false); navigate('/'); }}
              style={{ flex: 1, padding: '7px 0', fontSize: 14, border: '1px solid #4a1a1a', color: '#a0c8b0', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
              Ã¢â€ Â {lang === 'tr' ? 'Ãƒâ€¡IKIÃ…Â' : 'EXIT'}
            </button>
            <button onClick={() => { setMenuOpen(false); terminateSim(); }}
              style={{ flex: 1, padding: '7px 0', fontSize: 14, border: '1px solid #6a2020', color: '#c05050', background: 'transparent', letterSpacing: '0.06em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer' }}>
              {lang === 'tr' ? 'SONLANDIR' : 'TERMINATE'}
            </button>
          </div>
        ) : undefined}
      />

      {/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â OVERLAY PANELS Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */}
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
      <GenealogyPanel />
      <GodPanel />
      <TimeMachinePanel />
      <AnalysisPanel />
      <HypothesisPanel />
      <PopulationPyramidPanel />
      <ReportPanel />
    </div>
  );
}
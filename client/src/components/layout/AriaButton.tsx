import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Loader2 } from 'lucide-react';

type AriaState = 'idle' | 'command' | 'processing';

const SR: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
  : null;

const PILL_W = 148;
const PILL_H = 48;

export default function AriaButton() {
  const store = useSimStore();
  const navigate = useNavigate();

  const storeRef = useRef(store);
  storeRef.current = store;

  const [uiState, setUiState]       = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [ariaText, setAriaText]     = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [textInput, setTextInput]   = useState('');
  const textInputRef                = useRef<HTMLInputElement | null>(null);
  const [pos, setPos]               = useState({
    x: 20,
    y: typeof window !== 'undefined' ? window.innerHeight - 100 : 600,
  });

  const posRef       = useRef(pos);
  posRef.current     = pos;
  const dragOffset   = useRef({ dx: 0, dy: 0 });
  const dragging     = useRef(false);
  const didDrag      = useRef(false);
  const dragStart    = useRef({ x: 0, y: 0 });

  /* ── Mouse drag ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const moved = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
      if (moved > 4) didDrag.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - PILL_W, e.clientX - dragOffset.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - PILL_H, e.clientY - dragOffset.current.dy)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    didDrag.current    = false;
    dragStart.current  = { x: e.clientX, y: e.clientY };
    dragOffset.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y };
    dragging.current   = true;
  }

  /* ── Touch drag ─────────────────────────────────────────────────────────── */
  function onTouchStart(e: React.TouchEvent) {
    didDrag.current    = false;
    dragging.current   = true;
    const t = e.touches[0];
    dragStart.current  = { x: t.clientX, y: t.clientY };
    dragOffset.current = { dx: t.clientX - posRef.current.x, dy: t.clientY - posRef.current.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const moved = Math.hypot(t.clientX - dragStart.current.x, t.clientY - dragStart.current.y);
    if (moved > 4) didDrag.current = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth  - PILL_W, t.clientX - dragOffset.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - PILL_H, t.clientY - dragOffset.current.dy)),
    });
  }
  function onTouchEnd() { dragging.current = false; }

  /* ── Core logic refs ────────────────────────────────────────────────────── */
  const uiRef          = useRef<AriaState>('idle');
  const activeRef      = useRef(false);
  const processingRef  = useRef(false);
  const recRef         = useRef<any>(null);
  const watchdogRef    = useRef<any>(null);
  const pendingCmdRef  = useRef<string | null>(null);
  const retryTimerRef  = useRef<any>(null);
  const retryCmd       = useRef<string | null>(null);

  function setUI(s: AriaState) { uiRef.current = s; setUiState(s); }

  function armWatchdog() {
    clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (activeRef.current && processingRef.current) {
        processingRef.current = false;
        startRecognition();
      }
    }, 20000);
  }
  function disarmWatchdog() { clearTimeout(watchdogRef.current); }

  function toggle() {
    if (activeRef.current) {
      activeRef.current     = false;
      processingRef.current = false;
      disarmWatchdog();
      clearTimeout(retryTimerRef.current); retryCmd.current = null;
      killRec(recRef.current); recRef.current = null;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setUI('idle');
      setTranscript('');
      setAriaText('');
      setTextInput('');
    } else {
      activeRef.current     = true;
      processingRef.current = false;
      pendingCmdRef.current = null;
      startRecognition();
    }
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);

  function speak(text: string) {
    const { accessToken, lang } = storeRef.current;
    if (!accessToken) return;
    // Stop any ongoing speech
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    fetch('/api/aria/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ text, lang }),
    })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (!blob || !activeRef.current) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }

  function killRec(rec: any) {
    if (!rec) return;
    rec.onresult = null;
    rec.onerror  = null;
    rec.onend    = null;
    try { rec.abort(); } catch {}
    try { rec.stop();  } catch {}
  }

  function startRecognition() {
    if (!activeRef.current) return;

    killRec(recRef.current);
    recRef.current = null;

    if (!SR) {
      setUI('command');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    setUI('command');
    setTranscript('');

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';

    let resultIdx = 0;

    rec.onresult = (e: any) => {
      if (!activeRef.current) return;
      const results: any[] = Array.from(e.results);
      const live = results.slice(resultIdx).map((r: any) => r[0].transcript).join(' ');
      if (live) setTranscript(live);
      for (let i = resultIdx; i < results.length; i++) {
        if (results[i].isFinal) {
          const cmd = results[i][0].transcript.trim();
          if (!cmd) continue;
          resultIdx = i + 1;
          if (processingRef.current) {
            pendingCmdRef.current = cmd;
          } else {
            processingRef.current = true;
            clearTimeout(retryTimerRef.current); retryCmd.current = null;
            armWatchdog();
            killRec(rec);
            processCommand(cmd);
          }
          return;
        }
      }
    };

    rec.onerror = (e: any) => {
      if (!activeRef.current) return;
      if (e.error === 'aborted' || e.error === 'not-allowed') return;
      recRef.current = null;
      if (!processingRef.current) setTimeout(startRecognition, 800);
    };

    rec.onend = () => {
      recRef.current = null;
      if (!activeRef.current || processingRef.current) return;
      setTimeout(startRecognition, 200);
    };

    try { rec.start(); recRef.current = rec; }
    catch { setTimeout(startRecognition, 1000); }
  }

  async function processCommand(cmd: string) {
    if (!activeRef.current) { processingRef.current = false; return; }
    setUI('processing');

    const { currentSim, accessToken, stats, events, lang } = storeRef.current;
    let responseText: string;

    if (cmd === '__summary__') {
      responseText = buildSummary(stats, lang);
    } else {
      try {
        const { data } = await axios.post('/api/aria/command', {
          message: cmd, lang, stats,
          events: events.slice(0, 8),
          context: (() => {
            const wizardOpen = !!(window as any).__ariaWizardOpen;
            return {
              simStatus: currentSim?.status ?? 'none',
              simId: currentSim?.id ?? null,
              hasActiveSim: !!currentSim,
              page: wizardOpen ? '/wizard' : window.location.pathname,
              wizardOpen,
              ...(wizardOpen && {
                wizardStep: (window as any).__ariaWizardStep,
                wizardStepType: (window as any).__ariaWizardStepType,
                wizardFounder: (window as any).__ariaWizardFounder,
                wizardTraitName: (window as any).__ariaWizardTraitName,
              }),
            };
          })(),
        }, { headers: { Authorization: `Bearer ${accessToken}` } });

        const acts: any[] = (data.actions ?? (data.action != null ? [data.action] : [])).filter(Boolean);
        acts.forEach((a: any) => executeAction(a));
        if (acts.length === 1) {
          const at = acts[0].type;
          const label = at === 'navigate_panel'       ? `📂 ${acts[0].panel}`
            : at === 'change_speed'         ? `⚡ x${acts[0].speed}`
            : at === 'apply_disaster'       ? `⚠ ${acts[0].disaster}`
            : at === 'start_simulation'     ? '▶ başlat'
            : at === 'pause_simulation'     ? '⏸ duraklat'
            : at === 'toggle_simulation'    ? '⏯ sim'
            : at === 'terminate_simulation' ? '⏹ sonlandır'
            : at === 'toggle_sidebar'       ? '◀▶ sidebar'
            : at === 'open_menu'            ? '☰ menü aç'
            : at === 'open_menu_page'       ? `☰ ${acts[0].menuPage}`
            : at === 'close_menu'           ? '✕ menü kapat'
            : at === 'god_mode'             ? '✦ tanrı modu'
            : at === 'set_tab'              ? `🗂 ${acts[0].tab}`
            : at === 'navigate_to'          ? `→ ${acts[0].route}`
            : at === 'create_simulation'    ? '✚ yeni sim'
            : at === 'open_simulation'      ? `▶ sim #${(acts[0].index ?? 0) + 1}`
            : at === 'delete_simulation'    ? `🗑 sim #${(acts[0].index ?? 0) + 1}`
            : at === 'toggle_compare'       ? '⇄ karşılaştır'
            : at === 'logout'               ? '🔓 çıkış'
            : at === 'toggle_lang'          ? '🌐 dil'
            : at === 'set_lang'             ? `🌐 ${acts[0].lang}`
            : at === 'wizard_next'          ? '→ ileri'
            : at === 'wizard_back'          ? '← geri'
            : at === 'wizard_submit'        ? '🚀 başlat'
            : at === 'wizard_exit'          ? '✕ çıkış'
            : at === 'wizard_set'           ? `✎ ${acts[0].field}=${acts[0].value}`
            : at;
          setLastAction(label);
          setTimeout(() => setLastAction(null), 3000);
        } else if (acts.length > 1) {
          setLastAction(`✓ ${acts.length} komut`);
          setTimeout(() => setLastAction(null), 3000);
        }
        responseText = data.text ?? (lang === 'tr' ? 'Tamam.' : 'Done.');
      } catch (err: any) {
        const status = err?.response?.status;
        const retryAfter: number = err?.response?.data?.retry_after ?? 30;
        if (status === 429 && activeRef.current) {
          retryCmd.current = cmd;
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            const pending = retryCmd.current;
            retryCmd.current = null;
            if (pending && activeRef.current && !processingRef.current) {
              processingRef.current = true;
              armWatchdog();
              processCommand(pending);
            }
          }, retryAfter * 1000);
          responseText = lang === 'tr'
            ? `Limit aşıldı — ${retryAfter}s içinde otomatik tekrar deniyor.`
            : `Rate limited — auto-retrying in ${retryAfter}s.`;
        } else {
          const serverMsg = err?.response?.data?.text;
          responseText = serverMsg ?? (lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
        }
      }
    }

    setTranscript('');
    setAriaText(responseText);
    speak(responseText);
    disarmWatchdog();
    processingRef.current = false;
    if (activeRef.current) {
      const pending = pendingCmdRef.current;
      pendingCmdRef.current = null;
      if (pending) {
        processingRef.current = true;
        armWatchdog();
        killRec(recRef.current); recRef.current = null;
        processCommand(pending);
      } else if (SR) {
        startRecognition();
      } else {
        setUI('command');
        setTimeout(() => textInputRef.current?.focus(), 50);
      }
      const ms = Math.min(Math.max(2500, responseText.length * 70), 8000);
      setTimeout(() => setAriaText(t => t === responseText ? '' : t), ms);
    } else {
      setAriaText('');
      setUI('idle');
    }
  }

  function executeAction(action: any) {
    const { currentSim, accessToken, setActivePanel, setSpeed, toggleLang, setLang, setCurrentSim, logout } = storeRef.current;
    if (!action?.type) return;
    switch (action.type) {
      case 'navigate_panel':
      case 'open_panel':
        setActivePanel(action.panel ?? null); break;
      case 'close_panel':
        setActivePanel(null); break;
      case 'change_speed':
      case 'set_speed': {
        const spd = Number(action.speed) || 1;
        setSpeed(spd);
        if (currentSim && accessToken)
          axios.post(`/api/simulations/${currentSim.id}/speed`, { speed_multiplier: spd },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      }
      case 'toggle_simulation':
        if (currentSim && accessToken) {
          const next = currentSim.status === 'running' ? 'pause' : 'start';
          axios.post(`/api/simulations/${currentSim.id}/${next}`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: next === 'start' ? 'running' : 'paused' }))
            .catch(() => {});
        }
        break;
      case 'start_simulation':
        if (currentSim && accessToken && currentSim.status !== 'running')
          axios.post(`/api/simulations/${currentSim.id}/start`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: 'running' }))
            .catch(() => {});
        break;
      case 'pause_simulation':
        if (currentSim && accessToken && currentSim.status === 'running')
          axios.post(`/api/simulations/${currentSim.id}/pause`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: 'paused' }))
            .catch(() => {});
        break;
      case 'apply_disaster':
        if (currentSim && accessToken)
          axios.post(`/api/god/${currentSim.id}/intervene`,
            { type: action.disaster, params: action.params ?? {}, user_note: 'ARIA sesli komut' },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      case 'navigate_to':
        if (action.route) navigate(action.route); break;
      case 'set_tab':
        window.dispatchEvent(new CustomEvent('aria-set-tab', { detail: action.tab })); break;
      case 'toggle_lang':
        toggleLang(); break;
      case 'set_lang':
        if (action.lang) setLang(action.lang); break;
      case 'god_mode':
        setActivePanel('god'); break;
      case 'toggle_sidebar':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'toggle_sidebar' } })); break;
      case 'terminate_simulation':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'terminate_simulation' } })); break;
      case 'open_menu':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'open_menu' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'open_menu' } }));
        break;
      case 'open_menu_page': {
        const detail = { action: 'open_menu_page', menuPage: action.menuPage };
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail }));
        break;
      }
      case 'close_menu':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'close_menu' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'close_menu' } }));
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
      case 'create_simulation':
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'create_simulation' } })); break;
      case 'open_simulation':
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'open_simulation', index: action.index ?? 0 } })); break;
      case 'toggle_compare':
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'toggle_compare' } })); break;
      case 'delete_simulation':
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'delete_simulation', index: action.index ?? 0 } })); break;
      case 'wizard_next':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'next' } })); break;
      case 'wizard_back':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'back' } })); break;
      case 'wizard_submit':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'submit' } })); break;
      case 'wizard_exit':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'exit' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'wizard_exit' } })); break;
      case 'wizard_set':
        window.dispatchEvent(new CustomEvent('aria-wizard', {
          detail: { action: 'set', field: action.field, value: action.value, founder: action.founder },
        })); break;
    }
  }

  function submitTextInput() {
    const cmd = textInput.trim();
    if (!cmd || processingRef.current) return;
    setTextInput('');
    processingRef.current = true;
    armWatchdog();
    processCommand(cmd);
  }

  function buildSummary(stats: any, lang: string): string {
    if (!stats) return lang === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.';
    if (lang === 'tr')
      return `Yıl ${stats.year}, nüfus ${stats.population}. ` +
        `${stats.technologies} teknoloji keşfedildi. ` +
        `Mutluluk %${Math.round((stats.happiness_index ?? 0.5) * 100)}, ` +
        `mevsim ${stats.season ?? '?'}, ${stats.temperature ?? 20}°C.`;
    return `Year ${stats.year}, population ${stats.population}. ` +
      `${stats.technologies} technologies. ` +
      `Happiness ${Math.round((stats.happiness_index ?? 0.5) * 100)}%, ` +
      `season ${stats.season ?? '?'}, ${stats.temperature ?? 20}°C.`;
  }

  /* ── Visuals ────────────────────────────────────────────────────────────── */
  const COLORS: Record<AriaState, string> = {
    idle: '#00e887', command: '#f97316', processing: '#a855f7',
  };
  const color = COLORS[uiState];
  const Icon  = uiState === 'processing' ? Loader2 : uiState === 'command' ? Mic : MicOff;

  const langKey = store.lang === 'tr' ? 'tr' : 'en';
  const stateLabel = {
    tr: { idle: 'ASİSTAN', command: 'DİNLİYOR…', processing: 'İŞLENİYOR…' },
    en: { idle: 'ASSISTANT', command: 'LISTENING…', processing: 'PROCESSING…' },
  }[langKey][uiState];

  const hasOverlay = uiState !== 'idle' && (transcript || ariaText);

  return (
    <>
      <button
        onClick={() => { if (!didDrag.current) toggle(); didDrag.current = false; }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          height: PILL_H,
          borderRadius: 24,
          padding: '0 16px 0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: uiState !== 'idle' ? `${color}22` : 'rgba(4,4,18,0.92)',
          border: `2px solid ${color}`,
          color,
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.1em',
          boxShadow: uiState !== 'idle'
            ? `0 0 18px ${color}90, 0 0 36px ${color}40`
            : `0 0 10px ${color}50`,
          touchAction: 'none',
          cursor: 'grab',
          transition: 'box-shadow 0.3s, background 0.3s, border-color 0.3s',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}>
        <Icon
          size={18}
          className={uiState === 'processing' ? 'animate-spin' : ''}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, flexShrink: 0 }}
        />
        <span style={{ whiteSpace: 'nowrap' }}>{stateLabel}</span>
        {uiState !== 'idle' && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`,
            animation: 'pulse 1s infinite', flexShrink: 0,
          }} />
        )}
      </button>

      {/* Overlay bubble: transcript while listening, ARIA reply after processing */}
      {uiState !== 'idle' && (
        <div style={{
          position: 'fixed',
          left: Math.max(0, Math.min(window.innerWidth - 280, pos.x)),
          top: Math.max(0, pos.y - (hasOverlay ? 90 : 48)),
          zIndex: 9998,
          background: '#07071aee',
          border: `1px solid ${color}55`,
          borderRadius: 8,
          padding: '7px 11px',
          maxWidth: 280,
          boxShadow: `0 0 12px ${color}33`,
          pointerEvents: !SR && uiState === 'command' ? 'auto' : 'none',
        }}>
          {transcript && (
            <div style={{
              color: '#a0b4ff', fontSize: 10, marginBottom: ariaText ? 6 : 0,
              fontFamily: 'Share Tech Mono, monospace',
            }}>
              "{transcript.slice(0, 120)}{transcript.length > 120 ? '…' : ''}"
            </div>
          )}
          {ariaText && (
            <div style={{
              color: '#00e887',
              fontSize: 11,
              fontFamily: 'Share Tech Mono, monospace',
              lineHeight: 1.5,
              marginBottom: 4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {ariaText}
            </div>
          )}
          {!SR && uiState === 'command' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input
                ref={textInputRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitTextInput(); }}
                placeholder={store.lang === 'tr' ? 'komut yaz…' : 'type command…'}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid #00e88766',
                  borderRadius: 4,
                  color: '#00e887',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 10,
                  padding: '3px 6px',
                  outline: 'none',
                  pointerEvents: 'auto',
                }}
              />
              <button
                onClick={submitTextInput}
                style={{
                  background: '#00e88722',
                  border: '1px solid #00e88766',
                  borderRadius: 4,
                  color: '#00e887',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 10,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >↵</button>
            </div>
          )}
          <div style={{
            fontSize: 9, color: '#2a6a48',
            fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.04em',
          }}>
            {store.lang === 'tr' ? '[ tekrar bas = durdur ]' : '[ press again = stop ]'}
          </div>
        </div>
      )}

      {/* Action feedback badge */}
      {lastAction && (
        <div style={{
          position: 'fixed',
          left: Math.max(0, Math.min(window.innerWidth - 180, pos.x + PILL_W + 8)),
          top: pos.y + (PILL_H - 26) / 2,
          zIndex: 9998,
          background: 'rgba(0,232,135,0.12)',
          border: '1px solid #00e88766',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 10,
          color: '#00e887',
          fontFamily: 'Share Tech Mono, monospace',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          ✓ {lastAction}
        </div>
      )}
    </>
  );
}

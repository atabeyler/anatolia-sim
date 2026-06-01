import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Loader2 } from 'lucide-react';

type AriaState = 'idle' | 'listening' | 'processing';

const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
const SpeechRec: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
  : null;
const PILL_W = 148;
const PILL_H = 48;

function buildPrompt(stats: any, events: any[], ctx: any, lang: string): string {
  const respondIn = lang === 'tr' ? 'Turkish' : 'English';
  const page = ctx?.page ?? '/';
  const isWizard = !!ctx?.wizardOpen;
  const isSim = page.startsWith('/simulation/');
  const isDash = page === '/';
  const pageLabel = isWizard ? 'wizard' : isSim ? 'simulation' : isDash ? 'dashboard' : 'login';

  let state = `Page:${pageLabel} Status:${ctx?.simStatus ?? 'none'}`;
  if (isWizard) state += ` WizStep:${ctx.wizardStep} WizType:${ctx.wizardStepType}${ctx.wizardFounder ? ' founder:'+ctx.wizardFounder : ''}${ctx.wizardTraitName ? ' trait:'+ctx.wizardTraitName : ''}`;
  if (stats) state += `\nYear:${stats.year} Pop:${stats.population} Tech:${stats.technologies} Happy:${Math.round((stats.happiness_index??0.5)*100)}% Food:${(stats.food_abundance??0.5).toFixed(2)} Temp:${stats.temperature??20}C`;
  const evtStr = (events??[]).slice(0,6).map((e:any)=>`[${e.event_type}]${e.description}`).join('|');
  if (evtStr) state += `\nEvents:${evtStr}`;

  return `ARIA, ANATOLIA-SIM controller. Reply in ${respondIn}. Output ONLY valid JSON: {"text":"reply","actions":[...]}
STATE: ${state}
${isWizard ? `WIZARD: wizard_next|wizard_back|wizard_submit|wizard_exit|wizard_set{"type":"wizard_set","field":"F","value":"V","founder":1|2}
Fields: sim_name|sim_latitude|sim_longitude|founder_name|founder_age|founder_sex(male/female)|founder_height|founder_weight|founder_eye(brown/hazel/green/blue)|founder_hair(black/dark/brown/light/blond/red)|founder_skin(fair/light/olive/tan/brown/dark)|current_trait(0-100)
TR: zeka=fluid_intelligence merak=curiosity dil=language_capacity öğrenme=learning_rate disiplin=conscientiousness stres=stress_resilience risk=risk_tolerance inovasyon=innovation sanat=artistic_sense empati=empathy işbirliği=cooperation liderlik=dominance güç=physical_strength dayanıklılık=endurance bağışıklık=immune_strength üreme=fertility uzun_ömür=longevity` : ''}
${isSim ? `SIM: navigate_panel{"panel":"ID"}|close_panel|change_speed{"speed":N}|start_simulation|pause_simulation|toggle_simulation|terminate_simulation|toggle_sidebar|god_mode|set_tab{"tab":"harita/durum/kontrol"}|apply_disaster{"disaster":"earthquake/flood/drought/epidemic/volcano/meteor","params":{}}|open_menu|close_menu|open_menu_page{"menuPage":"language/guide/about"}
Panels: population olaylar language timemachine analysis biology god psychology environment technology belief social economy culture art astronomy hypothesis epigenetics architecture law microbiome` : ''}
${isDash ? `DASH: create_simulation|open_simulation{"index":0}|delete_simulation{"index":0}|toggle_compare|logout` : ''}
GLOBAL: navigate_to{"route":"/"}|toggle_lang|set_lang{"lang":"tr/en"}`;
}

export default function AriaButton() {
  const store = useSimStore();
  const navigate = useNavigate();
  const storeRef = useRef(store);
  storeRef.current = store;

  const [uiState, setUiState] = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [ariaText, setAriaText] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [pos, setPos] = useState({
    x: 20,
    y: typeof window !== 'undefined' ? window.innerHeight - 100 : 600,
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ dx: 0, dy: 0 });

  const uiRef = useRef<AriaState>('idle');
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const recRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);
  const pendingCmdRef = useRef<string | null>(null);
  const retryTimerRef = useRef<any>(null);

  function setUI(s: AriaState) { uiRef.current = s; setUiState(s); }
  function armWatchdog() {
    clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (activeRef.current && processingRef.current) { processingRef.current = false; startListening(); }
    }, 20000);
  }
  function disarmWatchdog() { clearTimeout(watchdogRef.current); }

  /* ── Drag mouse ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) > 4) didDrag.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - PILL_W, e.clientX - dragOffset.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - PILL_H, e.clientY - dragOffset.current.dy)),
      });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    didDrag.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y };
    dragging.current = true;
  }
  function onTouchStart(e: React.TouchEvent) {
    didDrag.current = false; dragging.current = true;
    const t = e.touches[0];
    dragStart.current = { x: t.clientX, y: t.clientY };
    dragOffset.current = { dx: t.clientX - posRef.current.x, dy: t.clientY - posRef.current.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    e.preventDefault();
    const t = e.touches[0];
    if (Math.hypot(t.clientX - dragStart.current.x, t.clientY - dragStart.current.y) > 4) didDrag.current = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - PILL_W, t.clientX - dragOffset.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - PILL_H, t.clientY - dragOffset.current.dy)),
    });
  }
  function onTouchEnd() { dragging.current = false; }

  /* ── TTS ────────────────────────────────────────────────────────────────── */
  function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';
    utt.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(storeRef.current.lang === 'tr' ? 'tr' : 'en'));
    if (match) utt.voice = match;
    window.speechSynthesis.speak(utt);
  }
  function stopSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }
  function unlockSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(' ');
    utt.volume = 0; utt.rate = 10;
    window.speechSynthesis.speak(utt);
  }

  /* ── Toggle ─────────────────────────────────────────────────────────────── */
  function toggle() {
    if (activeRef.current) {
      activeRef.current = false;
      processingRef.current = false;
      disarmWatchdog();
      clearTimeout(retryTimerRef.current);
      killRec(); stopSpeech();
      setUI('idle'); setTranscript(''); setAriaText(''); setTextInput('');
    } else {
      activeRef.current = true;
      processingRef.current = false;
      pendingCmdRef.current = null;
      unlockSpeech();
      startListening();
    }
  }

  /* ── Speech recognition ─────────────────────────────────────────────────── */
  function killRec() {
    const rec = recRef.current;
    if (!rec) return;
    rec.onresult = null; rec.onerror = null; rec.onend = null;
    try { rec.abort(); } catch {} try { rec.stop(); } catch {}
    recRef.current = null;
  }

  function startListening() {
    if (!activeRef.current) return;
    killRec();
    if (!SpeechRec) {
      setUI('listening');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }
    setUI('listening'); setTranscript('');
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';
    let idx = 0;
    rec.onresult = (e: any) => {
      if (!activeRef.current) return;
      const results = Array.from(e.results) as any[];
      const live = results.slice(idx).map((r: any) => r[0].transcript).join(' ');
      if (live) setTranscript(live);
      for (let i = idx; i < results.length; i++) {
        if (results[i].isFinal) {
          const cmd = results[i][0].transcript.trim();
          if (!cmd) continue;
          idx = i + 1;
          if (processingRef.current) { pendingCmdRef.current = cmd; }
          else { processingRef.current = true; clearTimeout(retryTimerRef.current); armWatchdog(); killRec(); processCommand(cmd); }
          return;
        }
      }
    };
    rec.onerror = (e: any) => {
      if (!activeRef.current) return;
      if (e.error === 'aborted' || e.error === 'not-allowed') return;
      recRef.current = null;
      if (!processingRef.current) setTimeout(startListening, 800);
    };
    rec.onend = () => {
      recRef.current = null;
      if (!activeRef.current || processingRef.current) return;
      setTimeout(startListening, 200);
    };
    try { rec.start(); recRef.current = rec; } catch { setTimeout(startListening, 1000); }
  }

  /* ── Process command ────────────────────────────────────────────────────── */
  async function processCommand(cmd: string) {
    if (!activeRef.current) { processingRef.current = false; return; }
    setUI('processing');
    const { currentSim, stats, events, lang } = storeRef.current;
    let responseText = lang === 'tr' ? 'Tamam.' : 'Done.';

    if (cmd === '__summary__') {
      responseText = !stats
        ? (lang === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.')
        : lang === 'tr'
          ? `Yıl ${stats.year}, nüfus ${stats.population}. ${stats.technologies} teknoloji. Mutluluk %${Math.round((stats.happiness_index ?? 0.5) * 100)}.`
          : `Year ${stats.year}, population ${stats.population}. ${stats.technologies} technologies. Happiness ${Math.round((stats.happiness_index ?? 0.5) * 100)}%.`;
    } else {
      const wizardOpen = !!(window as any).__ariaWizardOpen;
      const ctx = {
        simStatus: currentSim?.status ?? 'none',
        page: wizardOpen ? '/wizard' : window.location.pathname,
        wizardOpen,
        ...(wizardOpen && {
          wizardStep: (window as any).__ariaWizardStep,
          wizardStepType: (window as any).__ariaWizardStepType,
          wizardFounder: (window as any).__ariaWizardFounder,
          wizardTraitName: (window as any).__ariaWizardTraitName,
        }),
      };
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
      if (!apiKey) {
        responseText = lang === 'tr' ? 'API anahtarı eksik.' : 'API key missing.';
      } else {
        try {
          const sysPrompt = buildPrompt(stats, events.slice(0, 6), ctx, lang);
          const res = await fetch(GEMINI_URL(apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: sysPrompt }] },
              contents: [{ role: 'user', parts: [{ text: cmd }] }],
              generationConfig: { maxOutputTokens: 300, responseMimeType: 'application/json' },
            }),
          });

          if (res.status === 429) {
            if (!activeRef.current) { processingRef.current = false; return; }
            clearTimeout(retryTimerRef.current);
            const msg = lang === 'tr' ? 'Dakika limiti doldu — 60s sonra tekrar deniyor.' : 'Rate limited — retrying in 60s.';
            setTranscript(''); setAriaText(msg); speak(msg); disarmWatchdog();
            setUI('listening');
            if (SpeechRec) startListening(); else setTimeout(() => textInputRef.current?.focus(), 50);
            setTimeout(() => setAriaText(t => t === msg ? '' : t), 8000);
            retryTimerRef.current = setTimeout(() => {
              if (activeRef.current && processingRef.current) { armWatchdog(); processCommand(cmd); }
            }, 60000);
            return;
          } else if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error('Gemini error', res.status, errBody.slice(0, 200));
            responseText = lang === 'tr' ? `AI hatası (${res.status}).` : `AI error (${res.status}).`;
          } else {
            const json = await res.json();
            const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
            let parsed: any;
            try { parsed = JSON.parse(raw); } catch { parsed = { text: raw, actions: [] }; }
            if (!parsed.actions && parsed.action != null) parsed.actions = [parsed.action];
            if (!Array.isArray(parsed.actions)) parsed.actions = [];
            parsed.actions = (parsed.actions as any[]).map((a: any) => {
              if (typeof a === 'string') return { type: a };
              if (a && !a.type) a.type = a.name ?? a.action ?? a.command ?? a.function;
              return a;
            }).filter((a: any) => a?.type);

            (parsed.actions as any[]).forEach((a: any) => executeAction(a));
            if (parsed.actions.length === 1) {
              setLastAction(actionLabel(parsed.actions[0]));
              setTimeout(() => setLastAction(null), 3000);
            } else if (parsed.actions.length > 1) {
              setLastAction(`✓ ${parsed.actions.length}`);
              setTimeout(() => setLastAction(null), 3000);
            }
            responseText = parsed.text ?? (lang === 'tr' ? 'Tamam.' : 'Done.');
          }
        } catch {
          responseText = lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.';
        }
      }
    }

    setTranscript(''); setAriaText(responseText); speak(responseText);
    disarmWatchdog(); processingRef.current = false;

    if (activeRef.current) {
      const pending = pendingCmdRef.current; pendingCmdRef.current = null;
      if (pending) {
        processingRef.current = true; armWatchdog(); killRec(); processCommand(pending);
      } else if (SpeechRec) {
        startListening();
      } else {
        setUI('listening'); setTimeout(() => textInputRef.current?.focus(), 50);
      }
      const ms = Math.min(Math.max(2500, responseText.length * 70), 8000);
      setTimeout(() => setAriaText(t => t === responseText ? '' : t), ms);
    } else {
      setAriaText(''); setUI('idle');
    }
  }

  function actionLabel(a: any): string {
    switch (a.type) {
      case 'navigate_panel': return `📂 ${a.panel}`;
      case 'change_speed': return `⚡ x${a.speed}`;
      case 'apply_disaster': return `⚠ ${a.disaster}`;
      case 'start_simulation': return '▶ başlat';
      case 'pause_simulation': return '⏸ duraklat';
      case 'toggle_simulation': return '⏯ sim';
      case 'terminate_simulation': return '⏹ sonlandır';
      case 'navigate_to': return `→ ${a.route}`;
      case 'create_simulation': return '✚ yeni sim';
      case 'open_simulation': return `▶ sim #${(a.index ?? 0) + 1}`;
      case 'wizard_next': return '→ ileri';
      case 'wizard_back': return '← geri';
      case 'wizard_submit': return '🚀 başlat';
      case 'wizard_set': return `✎ ${a.field}=${a.value}`;
      default: return a.type;
    }
  }

  /* ── Execute action ─────────────────────────────────────────────────────── */
  function executeAction(action: any) {
    if (!action?.type) return;
    const { currentSim, accessToken, setActivePanel, setSpeed, toggleLang, setLang, setCurrentSim, logout } = storeRef.current;
    switch (action.type) {
      case 'navigate_panel': case 'open_panel': setActivePanel(action.panel ?? null); break;
      case 'close_panel': setActivePanel(null); break;
      case 'change_speed': case 'set_speed': {
        const spd = Number(action.speed) || 1; setSpeed(spd);
        if (currentSim && accessToken)
          axios.post(`/api/simulations/${currentSim.id}/speed`, { speed_multiplier: spd }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      }
      case 'toggle_simulation':
        if (currentSim && accessToken) {
          const next = currentSim.status === 'running' ? 'pause' : 'start';
          axios.post(`/api/simulations/${currentSim.id}/${next}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: next === 'start' ? 'running' : 'paused' })).catch(() => {});
        }
        break;
      case 'start_simulation':
        if (currentSim && accessToken && currentSim.status !== 'running')
          axios.post(`/api/simulations/${currentSim.id}/start`, {}, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: 'running' })).catch(() => {});
        break;
      case 'pause_simulation':
        if (currentSim && accessToken && currentSim.status === 'running')
          axios.post(`/api/simulations/${currentSim.id}/pause`, {}, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then(() => setCurrentSim({ ...currentSim, status: 'paused' })).catch(() => {});
        break;
      case 'apply_disaster':
        if (currentSim && accessToken)
          axios.post(`/api/god/${currentSim.id}/intervene`, { type: action.disaster, params: action.params ?? {}, user_note: 'ARIA' }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      case 'navigate_to': if (action.route) navigate(action.route); break;
      case 'set_tab': window.dispatchEvent(new CustomEvent('aria-set-tab', { detail: action.tab })); break;
      case 'toggle_lang': toggleLang(); break;
      case 'set_lang': if (action.lang) setLang(action.lang); break;
      case 'god_mode': setActivePanel('god'); break;
      case 'toggle_sidebar': window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'toggle_sidebar' } })); break;
      case 'terminate_simulation': window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'terminate_simulation' } })); break;
      case 'open_menu':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'open_menu' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'open_menu' } })); break;
      case 'open_menu_page': {
        const d = { action: 'open_menu_page', menuPage: action.menuPage };
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: d }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: d })); break;
      }
      case 'close_menu':
        window.dispatchEvent(new CustomEvent('aria-simulation', { detail: { action: 'close_menu' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'close_menu' } })); break;
      case 'logout': logout(); navigate('/login'); break;
      case 'create_simulation': window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'create_simulation' } })); break;
      case 'open_simulation': window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'open_simulation', index: action.index ?? 0 } })); break;
      case 'toggle_compare': window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'toggle_compare' } })); break;
      case 'delete_simulation': window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'delete_simulation', index: action.index ?? 0 } })); break;
      case 'wizard_next': window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'next' } })); break;
      case 'wizard_back': window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'back' } })); break;
      case 'wizard_submit': window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'submit' } })); break;
      case 'wizard_exit':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'exit' } }));
        window.dispatchEvent(new CustomEvent('aria-dashboard', { detail: { action: 'wizard_exit' } })); break;
      case 'wizard_set':
        window.dispatchEvent(new CustomEvent('aria-wizard', { detail: { action: 'set', field: action.field, value: action.value, founder: action.founder } })); break;
    }
  }

  function submitText() {
    const cmd = textInput.trim();
    if (!cmd || processingRef.current) return;
    setTextInput('');
    processingRef.current = true; armWatchdog(); processCommand(cmd);
  }

  /* ── Visual ─────────────────────────────────────────────────────────────── */
  const COLORS: Record<AriaState, string> = { idle: '#00e887', listening: '#f97316', processing: '#a855f7' };
  const color = COLORS[uiState];
  const Icon = uiState === 'processing' ? Loader2 : uiState === 'listening' ? Mic : MicOff;
  const langKey = store.lang === 'tr' ? 'tr' : 'en';
  const label = { tr: { idle: 'ASİSTAN', listening: 'DİNLİYOR…', processing: 'İŞLENİYOR…' }, en: { idle: 'ASSISTANT', listening: 'LISTENING…', processing: 'PROCESSING…' } }[langKey][uiState];
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
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
          height: PILL_H, borderRadius: 24, padding: '0 16px 0 10px',
          display: 'flex', alignItems: 'center', gap: 8,
          background: uiState !== 'idle' ? `${color}22` : 'rgba(4,4,18,0.92)',
          border: `2px solid ${color}`, color,
          fontFamily: 'Share Tech Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
          boxShadow: uiState !== 'idle' ? `0 0 18px ${color}90, 0 0 36px ${color}40` : `0 0 10px ${color}50`,
          touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
          transition: 'box-shadow 0.3s, background 0.3s, border-color 0.3s',
        }}>
        <Icon size={18} className={uiState === 'processing' ? 'animate-spin' : ''}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        {uiState !== 'idle' && (
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color,
            boxShadow: `0 0 8px ${color}`, animation: 'pulse 1s infinite', flexShrink: 0 }} />
        )}
      </button>

      {uiState !== 'idle' && (
        <div style={{
          position: 'fixed',
          left: Math.max(0, Math.min(window.innerWidth - 280, pos.x)),
          top: Math.max(0, pos.y - (hasOverlay ? 90 : 48)),
          zIndex: 9998, background: '#07071aee', border: `1px solid ${color}55`,
          borderRadius: 8, padding: '7px 11px', maxWidth: 280,
          boxShadow: `0 0 12px ${color}33`,
          pointerEvents: !SpeechRec && uiState === 'listening' ? 'auto' : 'none',
        }}>
          {transcript && (
            <div style={{ color: '#a0b4ff', fontSize: 10, marginBottom: ariaText ? 6 : 0, fontFamily: 'Share Tech Mono, monospace' }}>
              "{transcript.slice(0, 120)}{transcript.length > 120 ? '…' : ''}"
            </div>
          )}
          {ariaText && (
            <div style={{ color: '#00e887', fontSize: 11, fontFamily: 'Share Tech Mono, monospace',
              lineHeight: 1.5, marginBottom: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {ariaText}
            </div>
          )}
          {!SpeechRec && uiState === 'listening' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input ref={textInputRef} value={textInput} onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitText(); }}
                placeholder={store.lang === 'tr' ? 'komut yaz…' : 'type command…'}
                style={{ flex: 1, background: 'transparent', border: '1px solid #00e88766', borderRadius: 4,
                  color: '#00e887', fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
                  padding: '3px 6px', outline: 'none', pointerEvents: 'auto' }} />
              <button onClick={submitText}
                style={{ background: '#00e88722', border: '1px solid #00e88766', borderRadius: 4,
                  color: '#00e887', fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
                  padding: '3px 7px', cursor: 'pointer', pointerEvents: 'auto' }}>↵</button>
            </div>
          )}
          <div style={{ fontSize: 9, color: '#2a6a48', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.04em' }}>
            {store.lang === 'tr' ? '[ tekrar bas = durdur ]' : '[ press again = stop ]'}
          </div>
        </div>
      )}

      {lastAction && (
        <div style={{
          position: 'fixed',
          left: Math.max(0, Math.min(window.innerWidth - 180, pos.x + PILL_W + 8)),
          top: pos.y + (PILL_H - 26) / 2, zIndex: 9998,
          background: 'rgba(0,232,135,0.12)', border: '1px solid #00e88766',
          borderRadius: 6, padding: '4px 10px', fontSize: 10, color: '#00e887',
          fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          ✓ {lastAction}
        </div>
      )}
    </>
  );
}

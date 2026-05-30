import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

type AriaState = 'idle' | 'command' | 'processing' | 'speaking';

const SR: any = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null)
  : null;

export default function AriaButton() {
  const store = useSimStore();
  const navigate = useNavigate();

  const storeRef = useRef(store);
  storeRef.current = store;

  const [uiState, setUiState]     = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [tooltip, setTooltip]     = useState(false);

  const uiRef         = useRef<AriaState>('idle');
  const activeRef     = useRef(false);
  const processingRef = useRef(false); // true while awaiting API / speaking
  const recRef        = useRef<any>(null);
  const audioCtxRef   = useRef<any>(null); // pre-warmed AudioContext

  function setUI(s: AriaState) { uiRef.current = s; setUiState(s); }

  // ── Public toggle ──────────────────────────────────────────────────────────
  function toggle() {
    if (activeRef.current) {
      activeRef.current   = false;
      processingRef.current = false;
      try { recRef.current?.stop(); } catch {}
      recRef.current = null;
      window.speechSynthesis?.cancel();
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
      setUI('idle');
      setTranscript('');
    } else {
      // Pre-warm inside user-gesture so AudioContext + TTS are unlocked
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          ctx.resume().catch(() => {});
          audioCtxRef.current = ctx;
        }
      } catch {}
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          synth.getVoices();                           // trigger voice list load
          const dummy = new SpeechSynthesisUtterance('');
          synth.speak(dummy);
          synth.cancel();
        }
      } catch {}

      activeRef.current = true;
      startRecognition();
    }
  }

  // ── Step 1: Start / restart recognition ───────────────────────────────────
  function startRecognition() {
    if (!activeRef.current) return;
    if (!SR) { processCommand('__summary__'); return; }

    setUI('command');
    setTranscript('');

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';

    let resultIdx = 0; // index of the next result to process

    rec.onresult = (e: any) => {
      if (!activeRef.current || processingRef.current) return;

      const results: any[] = Array.from(e.results);
      // Live transcript from unprocessed results
      const live = results.slice(resultIdx).map((r: any) => r[0].transcript).join(' ');
      if (live) setTranscript(live);

      for (let i = resultIdx; i < results.length; i++) {
        if (results[i].isFinal) {
          const cmd = results[i][0].transcript.trim();
          if (!cmd) continue;
          resultIdx = i + 1;
          processingRef.current = true;
          try { rec.stop(); } catch {} // triggers onend; processingRef guards restart
          processCommand(cmd);
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
      // If we stopped it intentionally for processing, don't restart here —
      // processCommand() will call startRecognition() after it finishes.
      if (!activeRef.current || processingRef.current) return;
      setTimeout(startRecognition, 200);
    };

    try { rec.start(); recRef.current = rec; }
    catch { setTimeout(startRecognition, 1000); }
  }

  // ── Step 2: Send command to backend ───────────────────────────────────────
  async function processCommand(cmd: string) {
    if (!activeRef.current) return;
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
          context: {
            simStatus: currentSim?.status ?? 'none',
            simId: currentSim?.id ?? null,
            hasActiveSim: !!currentSim,
          },
        }, { headers: { Authorization: `Bearer ${accessToken}` } });

        if (data.action) executeAction(data.action);
        responseText = data.text ?? (lang === 'tr' ? 'Tamam.' : 'Done.');
      } catch {
        responseText = lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.';
      }
    }

    setTranscript('');
    await speakText(responseText);

    processingRef.current = false;
    if (activeRef.current) startRecognition(); else setUI('idle');
  }

  // ── Step 3: Speak response ─────────────────────────────────────────────────
  async function speakText(text: string) {
    setUI('speaking');
    const { accessToken } = storeRef.current;

    // A. Try ElevenLabs via pre-warmed AudioContext
    try {
      const resp = await axios.post('/api/aria/speak', { text },
        { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer', timeout: 9000 });
      const ab = resp.data as ArrayBuffer;
      // A real MP3 is >800 bytes; error JSON is tiny
      if (ab.byteLength > 800 && audioCtxRef.current) {
        const ctx = audioCtxRef.current as AudioContext;
        await ctx.resume();
        const buf = await ctx.decodeAudioData(ab);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start();
        await new Promise<void>(res => { src.onended = () => res(); });
        return;
      }
    } catch { /* fall through */ }

    // B. Browser TTS fallback
    await browserSpeak(text);
  }

  function browserSpeak(text: string): Promise<void> {
    return new Promise(res => {
      const synth = window.speechSynthesis;
      if (!synth) { setTimeout(res, 800); return; }

      synth.cancel();

      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';
      utt.volume = 1.0;
      utt.rate   = 0.92;

      let done = false;
      const finish = () => { if (!done) { done = true; res(); } };
      const guard = setTimeout(finish, Math.max(5000, text.length * 80));
      utt.onend  = () => { clearTimeout(guard); finish(); };
      utt.onerror = () => { clearTimeout(guard); finish(); };

      const go = () => {
        if (done) return;
        const voices = synth.getVoices();
        const lang   = utt.lang.split('-')[0];
        const match  = voices.find(v => v.lang.startsWith(lang) && !v.name.toLowerCase().includes('whisper'));
        if (match) utt.voice = match;
        synth.speak(utt);
      };

      if (synth.getVoices().length > 0) {
        go();
      } else {
        let called = false;
        synth.onvoiceschanged = () => { if (!called) { called = true; go(); } };
        setTimeout(() => { if (!called) { called = true; go(); } }, 500);
      }
    });
  }

  // ── Execute action returned by backend ─────────────────────────────────────
  function executeAction(action: any) {
    const { currentSim, accessToken, setActivePanel, setSpeed, toggleLang, setCurrentSim } = storeRef.current;
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
      case 'god_mode':
        setActivePanel('god'); break;
    }
  }

  // ── Summary helper ─────────────────────────────────────────────────────────
  function buildSummary(stats: any, lang: string): string {
    if (!stats) return lang === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.';
    if (lang === 'tr')
      return `ARIA rapor veriyor. Yıl ${stats.year}, nüfus ${stats.population}. ` +
        `${stats.technologies} teknoloji keşfedildi. ` +
        `Ortalama mutluluk yüzde ${Math.round((stats.happiness_index ?? 0.5) * 100)}. ` +
        `Mevsim ${stats.season ?? 'bilinmiyor'}, sıcaklık ${stats.temperature ?? 20} derece. ` +
        `${stats.beliefs ?? 0} inanç sistemi, ${stats.groups ?? 0} sosyal grup mevcut.`;
    return `ARIA reporting. Year ${stats.year}, population ${stats.population}. ` +
      `${stats.technologies} technologies discovered. ` +
      `Average happiness ${Math.round((stats.happiness_index ?? 0.5) * 100)} percent. ` +
      `Season ${stats.season ?? 'unknown'}, temperature ${stats.temperature ?? 20} degrees. ` +
      `${stats.beliefs ?? 0} belief systems, ${stats.groups ?? 0} social groups active.`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const COLORS: Record<AriaState, string> = {
    idle: '#00e887', command: '#f97316', processing: '#a855f7', speaking: '#4ecb71',
  };
  const color = COLORS[uiState];
  const Icon  = uiState === 'idle'       ? MicOff
    : uiState === 'command'    ? Mic
    : uiState === 'processing' ? Loader2
    : Volume2;

  const label = {
    tr: { idle: 'ARIA', command: '🎙 Konuşun…', processing: 'İşleniyor…', speaking: 'Konuşuyor…' },
    en: { idle: 'ARIA', command: '🎙 Speak…',   processing: 'Processing…', speaking: 'Speaking…'  },
  }[store.lang][uiState];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={toggle}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          fontSize: 16, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
          border: `1px solid ${color}`,
          color, fontFamily: 'Share Tech Mono, monospace',
          background: uiState === 'idle' ? 'transparent' : `${color}18`,
          boxShadow: uiState !== 'idle' ? `0 0 8px ${color}55` : 'none',
          transition: 'all 0.2s',
        }}>
        <Icon size={14}
          className={uiState === 'processing' ? 'animate-spin' : ''}
          style={{ filter: uiState !== 'idle' ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
        <span>ARIA</span>
        {uiState !== 'idle' && (
          <span style={{
            width: 4, height: 4, borderRadius: '50%', background: color,
            animation: 'pulse 1s infinite', boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </button>

      {(tooltip || uiState !== 'idle') && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: '#07071a',
          border: `1px solid ${color}66`, padding: '4px 8px',
          zIndex: 9999, fontSize: 9, color, letterSpacing: '0.05em',
          fontFamily: 'Share Tech Mono, monospace', boxShadow: `0 0 10px ${color}33`,
          whiteSpace: 'nowrap', maxWidth: 240,
        }}>
          {label}
          {transcript && (
            <div style={{ color: '#a0b4ff', fontSize: 7.5, marginTop: 2, whiteSpace: 'normal', maxWidth: 220 }}>
              "{transcript.slice(0, 90)}{transcript.length > 90 ? '…' : ''}"
            </div>
          )}
          {uiState !== 'idle' && (
            <div style={{ fontSize: 7, color: '#2a4a38', marginTop: 2 }}>
              {store.lang === 'tr' ? '[ tekrar bas = durdur ]' : '[ press again = stop ]'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

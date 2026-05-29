import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Volume2, Loader2, Radio } from 'lucide-react';

type AriaState = 'idle' | 'command' | 'processing' | 'speaking';

const SR_Class = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export default function AriaButton() {
  const {
    currentSim, accessToken, stats, events, lang,
    setActivePanel, setSpeed, toggleLang, setCurrentSim,
  } = useSimStore();
  const navigate = useNavigate();

  const [uiState, setUiState]     = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [tooltip, setTooltip]     = useState(false);

  // Refs so async callbacks always read the latest value (no stale closures)
  const activeRef    = useRef(false);   // true = listening loop is on
  const recRef       = useRef<any>(null);
  const langRef      = useRef(lang);
  langRef.current = lang;

  // ── Stop recognition and clear ───────────────────────────────────────────
  function abortRec() {
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
  }

  // ── Public toggle: press once → start loop, press again → stop ──────────
  function toggle() {
    if (activeRef.current) {
      activeRef.current = false;
      abortRec();
      setUiState('idle');
      setTranscript('');
    } else {
      activeRef.current = true;
      listenForCommand();
    }
  }

  // ── Start one recognition session (called at start + after each command) ──
  const listenForCommand = useCallback(() => {
    if (!activeRef.current) return;

    if (!SR_Class) {
      // No speech API — just speak a summary
      setUiState('processing');
      speakSummary();
      return;
    }

    setUiState('command');
    setTranscript('');

    const rec = new SR_Class();
    rec.continuous      = true;   // don't auto-stop after silence
    rec.interimResults  = true;
    rec.lang = langRef.current === 'tr' ? 'tr-TR' : 'en-US';

    rec.onresult = (e: any) => {
      const results = Array.from(e.results as any[]);

      // Show interim text in tooltip
      const allText = results.map((r: any) => r[0].transcript).join(' ');
      setTranscript(allText);

      // Process only final utterances
      const finals = results.filter((r: any) => r.isFinal);
      const finalResult = finals.length ? finals[finals.length - 1] as any : null;
      if (finalResult) {
        const cmd: string = finalResult[0].transcript.trim();
        if (!cmd) return;
        abortRec();           // stop recording while we process
        processCommand(cmd);
      }
    };

    rec.onerror = (e: any) => {
      if (!activeRef.current) return;
      if (e.error === 'aborted') return; // we stopped it intentionally
      // On real errors: brief wait then restart
      setTimeout(() => listenForCommand(), 1200);
    };

    rec.onend = () => {
      // If recognition ended on its own (e.g., browser timeout) and we're still active, restart
      if (activeRef.current && uiStateRef.current === 'command') {
        setTimeout(() => listenForCommand(), 400);
      }
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch {
      setTimeout(() => listenForCommand(), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to uiState so `onend` can read it without stale closure
  const uiStateRef = useRef<AriaState>('idle');
  const origSetUiState = setUiState;
  const setUiStateSafe = (s: AriaState) => {
    uiStateRef.current = s;
    origSetUiState(s);
  };

  // ── Send command to backend, execute returned action, then loop back ──────
  async function processCommand(cmd: string) {
    if (!activeRef.current) return;
    setUiStateSafe('processing');

    try {
      const { data } = await axios.post('/api/aria/command', {
        message: cmd,
        lang: langRef.current,
        stats,
        events: events.slice(0, 8),
        context: {
          simStatus: currentSim?.status ?? 'none',
          simId: currentSim?.id ?? null,
          hasActiveSim: !!currentSim,
        },
      }, { headers: { Authorization: `Bearer ${accessToken}` } });

      if (data.action) executeAction(data.action);
      await speakTTS(data.text ?? (langRef.current === 'tr' ? 'Tamam.' : 'Done.'));
    } catch {
      await speakTTS(langRef.current === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
    }

    setTranscript('');

    // Continue loop if still active
    if (activeRef.current) {
      listenForCommand();
    } else {
      setUiStateSafe('idle');
    }
  }

  // ── Fallback when no speech API: read out the summary ────────────────────
  async function speakSummary() {
    const text = buildSummary();
    await speakTTS(text);
    if (activeRef.current) listenForCommand();
    else setUiStateSafe('idle');
  }

  function buildSummary(): string {
    if (!stats) return langRef.current === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.';
    if (langRef.current === 'tr') {
      return `ARIA rapor veriyor. Yıl ${stats.year}, nüfus ${stats.population}. ` +
        `${stats.technologies} teknoloji keşfedildi. ` +
        `Ortalama mutluluk yüzde ${Math.round((stats.happiness_index ?? 0.5) * 100)}. ` +
        `Mevsim ${stats.season ?? 'bilinmiyor'}, sıcaklık ${stats.temperature ?? 20} derece. ` +
        `${stats.beliefs ?? 0} inanç sistemi, ${stats.groups ?? 0} sosyal grup mevcut.`;
    }
    return `ARIA reporting. Year ${stats.year}, population ${stats.population}. ` +
      `${stats.technologies} technologies discovered. ` +
      `Average happiness ${Math.round((stats.happiness_index ?? 0.5) * 100)} percent. ` +
      `Season ${stats.season ?? 'unknown'}, temperature ${stats.temperature ?? 20} degrees. ` +
      `${stats.beliefs ?? 0} belief systems, ${stats.groups ?? 0} social groups active.`;
  }

  // ── Execute action returned by backend ────────────────────────────────────
  function executeAction(action: any) {
    if (!action?.type) return;
    switch (action.type) {

      case 'navigate_panel':
      case 'open_panel':
        setActivePanel(action.panel ?? null);
        break;

      case 'close_panel':
        setActivePanel(null);
        break;

      case 'change_speed':
      case 'set_speed': {
        const speed = Number(action.speed) || 1;
        setSpeed(speed);
        if (currentSim && accessToken)
          axios.post(`/api/simulations/${currentSim.id}/speed`,
            { speed_multiplier: speed },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).catch(() => {});
        break;
      }

      case 'toggle_simulation':
        if (currentSim && accessToken) {
          const next = currentSim.status === 'running' ? 'pause' : 'start';
          axios.post(`/api/simulations/${currentSim.id}/${next}`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).then(() => {
            setCurrentSim({ ...currentSim, status: next === 'start' ? 'running' : 'paused' });
          }).catch(() => {});
        }
        break;

      case 'start_simulation':
        if (currentSim && accessToken && currentSim.status !== 'running')
          axios.post(`/api/simulations/${currentSim.id}/start`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).then(() => {
            setCurrentSim({ ...currentSim, status: 'running' });
          }).catch(() => {});
        break;

      case 'pause_simulation':
        if (currentSim && accessToken && currentSim.status === 'running')
          axios.post(`/api/simulations/${currentSim.id}/pause`, {},
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).then(() => {
            setCurrentSim({ ...currentSim, status: 'paused' });
          }).catch(() => {});
        break;

      case 'apply_disaster':
        if (currentSim && accessToken)
          axios.post(`/api/god/${currentSim.id}/intervene`,
            { type: action.disaster, params: action.params ?? {}, user_note: 'ARIA sesli komut' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).catch(() => {});
        break;

      case 'navigate_to':
        if (action.route) navigate(action.route);
        break;

      case 'set_tab':
        window.dispatchEvent(new CustomEvent('aria-set-tab', { detail: action.tab }));
        break;

      case 'toggle_lang':
        toggleLang();
        break;

      case 'god_mode':
        setActivePanel('god');
        break;
    }
  }

  // ── Text-to-speech ────────────────────────────────────────────────────────
  async function speakTTS(text: string) {
    setUiStateSafe('speaking');
    try {
      const { data } = await axios.post('/api/aria/speak', { text },
        { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer' });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buf = await ctx.decodeAudioData(data as ArrayBuffer);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      await new Promise<void>(res => { src.onended = () => { ctx.close(); res(); }; });
    } catch {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = langRef.current === 'tr' ? 'tr-TR' : 'en-US';
      window.speechSynthesis.speak(utt);
      await new Promise<void>(res => {
        utt.onend = () => res();
        setTimeout(res, 12000);
      });
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  const COLORS: Record<AriaState, string> = {
    idle:       '#4a6a7a',
    command:    '#f97316',
    processing: '#a855f7',
    speaking:   '#4ecb71',
  };
  const color = COLORS[uiState];

  const Icon = uiState === 'idle' ? MicOff
    : uiState === 'command'    ? Mic
    : uiState === 'processing' ? Loader2
    : Volume2;

  const labelTr: Record<AriaState, string> = {
    idle:       'ARIA — tıkla',
    command:    '🎙 Konuşun…',
    processing: 'İşleniyor…',
    speaking:   'ARIA konuşuyor…',
  };
  const labelEn: Record<AriaState, string> = {
    idle:       'ARIA — click',
    command:    '🎙 Speak now…',
    processing: 'Processing…',
    speaking:   'ARIA speaking…',
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={toggle}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        title={lang === 'tr' ? labelTr[uiState] : labelEn[uiState]}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer',
          border: `1px solid ${uiState === 'idle' ? '#1a3a2a' : color}`,
          color,
          background: uiState === 'idle' ? 'transparent' : `${color}18`,
          fontFamily: 'Share Tech Mono, monospace',
          boxShadow: uiState !== 'idle' ? `0 0 8px ${color}55` : 'none',
          transition: 'all 0.2s',
        }}>
        <Icon
          size={10}
          className={uiState === 'processing' ? 'animate-spin' : ''}
          style={{ filter: uiState !== 'idle' ? `drop-shadow(0 0 4px ${color})` : 'none' }}
        />
        <span>ARIA</span>
        {uiState !== 'idle' && (
          <span style={{
            display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
            background: color, animation: 'pulse 1s infinite',
            boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </button>

      {(tooltip || uiState !== 'idle') && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#07071a', border: `1px solid ${color}66`,
          padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 9999,
          fontSize: 9, color, fontFamily: 'Share Tech Mono, monospace',
          letterSpacing: '0.05em', boxShadow: `0 0 10px ${color}33`,
          maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {lang === 'tr' ? labelTr[uiState] : labelEn[uiState]}
          {transcript && (
            <div style={{ color: '#a0b4ff', fontSize: 8, marginTop: 2, whiteSpace: 'normal' }}>
              "{transcript.slice(0, 80)}{transcript.length > 80 ? '…' : ''}"
            </div>
          )}
          {uiState !== 'idle' && (
            <div style={{ fontSize: 7, color: '#3a5a48', marginTop: 2 }}>
              {lang === 'tr' ? '[ tekrar tıkla = durdur ]' : '[ click again = stop ]'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

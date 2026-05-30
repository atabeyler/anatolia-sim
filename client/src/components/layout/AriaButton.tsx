import { useState, useRef, useEffect } from 'react';
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

  const [uiState, setUiState]   = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [pos, setPos]           = useState({ x: 20, y: typeof window !== 'undefined' ? window.innerHeight - 100 : 600 });

  const dragOffset = useRef({ dx: 0, dy: 0 });
  const dragging   = useRef(false);

  // ── Mouse drag (desktop) ───────────────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 132, e.clientX - dragOffset.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 52,  e.clientY - dragOffset.current.dy)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',  onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',  onMouseUp);
    };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.preventDefault();
  }

  // ── Touch drag (mobile) ────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    dragging.current = true;
    const t = e.touches[0];
    dragOffset.current = { dx: t.clientX - pos.x, dy: t.clientY - pos.y };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    e.preventDefault();
    const t = e.touches[0];
    setPos({
      x: Math.max(0, Math.min(window.innerWidth  - 132, t.clientX - dragOffset.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - 52,  t.clientY - dragOffset.current.dy)),
    });
  }
  function onTouchEnd() { dragging.current = false; }

  const uiRef         = useRef<AriaState>('idle');
  const activeRef     = useRef(false);
  const processingRef = useRef(false);
  const recRef        = useRef<any>(null);
  const audioCtxRef   = useRef<any>(null);

  function setUI(s: AriaState) { uiRef.current = s; setUiState(s); }

  function toggle() {
    if (dragging.current) return; // sürükleme ise tıklama sayma
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
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) { const ctx = new Ctx(); ctx.resume().catch(() => {}); audioCtxRef.current = ctx; }
      } catch {}
      try {
        const synth = window.speechSynthesis;
        if (synth) { synth.getVoices(); const d = new SpeechSynthesisUtterance(''); synth.speak(d); synth.cancel(); }
      } catch {}
      activeRef.current = true;
      startRecognition();
    }
  }

  function startRecognition() {
    if (!activeRef.current) return;
    if (!SR) { processCommand('__summary__'); return; }
    setUI('command');
    setTranscript('');
    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';
    let resultIdx = 0;
    rec.onresult = (e: any) => {
      if (!activeRef.current || processingRef.current) return;
      const results: any[] = Array.from(e.results);
      const live = results.slice(resultIdx).map((r: any) => r[0].transcript).join(' ');
      if (live) setTranscript(live);
      for (let i = resultIdx; i < results.length; i++) {
        if (results[i].isFinal) {
          const cmd = results[i][0].transcript.trim();
          if (!cmd) continue;
          resultIdx = i + 1;
          processingRef.current = true;
          try { rec.stop(); } catch {}
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
      if (!activeRef.current || processingRef.current) return;
      setTimeout(startRecognition, 200);
    };
    try { rec.start(); recRef.current = rec; }
    catch { setTimeout(startRecognition, 1000); }
  }

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
          context: { simStatus: currentSim?.status ?? 'none', simId: currentSim?.id ?? null, hasActiveSim: !!currentSim },
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

  async function speakText(text: string) {
    setUI('speaking');
    const { accessToken } = storeRef.current;
    try {
      const resp = await axios.post('/api/aria/speak', { text },
        { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer', timeout: 9000 });
      const ab = resp.data as ArrayBuffer;
      if (ab.byteLength > 800 && audioCtxRef.current) {
        const ctx = audioCtxRef.current as AudioContext;
        await ctx.resume();
        const buf = await ctx.decodeAudioData(ab);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start();
        await new Promise<void>(res => { src.onended = () => res(); });
        return;
      }
    } catch {}
    await browserSpeak(text);
  }

  function browserSpeak(text: string): Promise<void> {
    return new Promise(res => {
      const synth = window.speechSynthesis;
      if (!synth) { setTimeout(res, 800); return; }
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang   = storeRef.current.lang === 'tr' ? 'tr-TR' : 'en-US';
      utt.volume = 1.0; utt.rate = 0.92;
      let done = false;
      const finish = () => { if (!done) { done = true; res(); } };
      const guard = setTimeout(finish, Math.max(5000, text.length * 80));
      utt.onend  = () => { clearTimeout(guard); finish(); };
      utt.onerror = () => { clearTimeout(guard); finish(); };
      const go = () => {
        if (done) return;
        const voices = synth.getVoices();
        const l = utt.lang.split('-')[0];
        const match = voices.find(v => v.lang.startsWith(l) && !v.name.toLowerCase().includes('whisper'));
        if (match) utt.voice = match;
        synth.speak(utt);
      };
      if (synth.getVoices().length > 0) { go(); }
      else { let called = false; synth.onvoiceschanged = () => { if (!called) { called = true; go(); } }; setTimeout(() => { if (!called) { called = true; go(); } }, 500); }
    });
  }

  function executeAction(action: any) {
    const { currentSim, accessToken, setActivePanel, setSpeed, toggleLang, setCurrentSim } = storeRef.current;
    if (!action?.type) return;
    switch (action.type) {
      case 'navigate_panel': case 'open_panel': setActivePanel(action.panel ?? null); break;
      case 'close_panel': setActivePanel(null); break;
      case 'change_speed': case 'set_speed': {
        const spd = Number(action.speed) || 1; setSpeed(spd);
        if (currentSim && accessToken) axios.post(`/api/simulations/${currentSim.id}/speed`, { speed_multiplier: spd }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
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
          axios.post(`/api/god/${currentSim.id}/intervene`, { type: action.disaster, params: action.params ?? {}, user_note: 'Asistan sesli komut' }, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      case 'navigate_to': if (action.route) navigate(action.route); break;
      case 'set_tab': window.dispatchEvent(new CustomEvent('aria-set-tab', { detail: action.tab })); break;
      case 'toggle_lang': toggleLang(); break;
      case 'god_mode': setActivePanel('god'); break;
    }
  }

  function buildSummary(stats: any, lang: string): string {
    if (!stats) return lang === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.';
    if (lang === 'tr')
      return `Asistan rapor veriyor. Yıl ${stats.year}, nüfus ${stats.population}. ` +
        `${stats.technologies} teknoloji keşfedildi. Ortalama mutluluk yüzde ${Math.round((stats.happiness_index ?? 0.5) * 100)}. ` +
        `Mevsim ${stats.season ?? 'bilinmiyor'}, sıcaklık ${stats.temperature ?? 20} derece. ` +
        `${stats.beliefs ?? 0} inanç sistemi, ${stats.groups ?? 0} sosyal grup mevcut.`;
    return `Assistant reporting. Year ${stats.year}, population ${stats.population}. ` +
      `${stats.technologies} technologies discovered. Average happiness ${Math.round((stats.happiness_index ?? 0.5) * 100)} percent. ` +
      `Season ${stats.season ?? 'unknown'}, temperature ${stats.temperature ?? 20} degrees. ` +
      `${stats.beliefs ?? 0} belief systems, ${stats.groups ?? 0} social groups active.`;
  }

  // ── Render: her zaman floating pill ───────────────────────────────────────
  const COLORS: Record<AriaState, string> = {
    idle: '#00e887', command: '#f97316', processing: '#a855f7', speaking: '#4ecb71',
  };
  const color = COLORS[uiState];
  const Icon  = uiState === 'idle' ? MicOff : uiState === 'command' ? Mic : uiState === 'processing' ? Loader2 : Volume2;

  const btnLabel = store.lang === 'tr'
    ? { idle: 'ASİSTAN', command: 'DİNLİYOR', processing: 'İŞLENİYOR', speaking: 'KONUŞUYOR' }[uiState]
    : { idle: 'ASSISTANT', command: 'LISTENING', processing: 'PROCESSING', speaking: 'SPEAKING' }[uiState];

  return (
    <button
      onClick={toggle}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        height: 46, borderRadius: 23,
        padding: '0 18px 0 13px',
        background: uiState !== 'idle' ? `${color}18` : 'rgba(4,4,18,0.94)',
        border: `2px solid ${color}`,
        color,
        display: 'flex', alignItems: 'center', gap: 9,
        boxShadow: uiState !== 'idle'
          ? `0 0 20px ${color}80, 0 0 40px ${color}35, inset 0 0 12px ${color}10`
          : `0 0 12px ${color}45, 0 2px 8px rgba(0,0,0,0.5)`,
        touchAction: 'none', cursor: dragging.current ? 'grabbing' : 'grab',
        transition: 'box-shadow 0.35s, background 0.35s',
        userSelect: 'none',
      }}>
      <Icon size={20}
        className={uiState === 'processing' ? 'animate-spin' : ''}
        style={{ filter: `drop-shadow(0 0 8px ${color})`, flexShrink: 0 }} />
      <span style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        textShadow: `0 0 8px ${color}`, whiteSpace: 'nowrap',
      }}>
        {btnLabel}
      </span>
      {uiState !== 'idle' && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          width: 14, height: 14, borderRadius: '50%',
          background: color, boxShadow: `0 0 10px ${color}`,
          animation: 'pulse 1s infinite',
        }} />
      )}
      {transcript && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
          background: 'rgba(4,4,18,0.96)', border: `1px solid ${color}66`,
          padding: '5px 10px', borderRadius: 8, zIndex: 10000,
          fontSize: 10, color: '#a0b4ff', letterSpacing: '0.04em',
          fontFamily: 'Share Tech Mono, monospace', whiteSpace: 'normal',
          maxWidth: 220, boxShadow: `0 0 12px ${color}33`,
        }}>
          "{transcript.slice(0, 90)}{transcript.length > 90 ? '…' : ''}"
        </div>
      )}
    </button>
  );
}

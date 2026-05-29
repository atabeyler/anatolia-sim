import { useState, useRef, useEffect } from 'react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Volume2, Loader2, Radio } from 'lucide-react';

type AriaState = 'idle' | 'wake' | 'command' | 'processing' | 'speaking';

const WAKE_WORDS = ['antolia', 'anatolia', 'anatolya', 'antolya', 'antoli'];

export default function AriaButton() {
  const { currentSim, accessToken, stats, events, lang, setActivePanel, setSpeed } = useSimStore();
  const [state, setState] = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const recRef = useRef<any>(null);
  const hasSR = typeof window !== 'undefined' && !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  function stopRec() {
    try { recRef.current?.stop(); recRef.current?.abort(); } catch {}
    recRef.current = null;
  }

  function toggle() {
    if (state !== 'idle') { stopRec(); setState('idle'); setTranscript(''); return; }
    if (!hasSR) { startCommandDirect(); return; }
    startWakeListening();
  }

  function startWakeListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript).join(' ').toLowerCase();
      if (WAKE_WORDS.some(w => text.includes(w))) {
        stopRec();
        startCommandListening();
      }
    };
    rec.onerror = () => setState('idle');
    rec.start();
    recRef.current = rec;
    setState('wake');
  }

  function startCommandListening() {
    setState('command');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
    rec.onresult = (e: any) => {
      const cmd = e.results[0][0].transcript;
      setTranscript(cmd);
      processCommand(cmd);
    };
    rec.onerror = () => setState('idle');
    rec.onend = () => { if (state === 'command') setState('idle'); };
    rec.start();
    recRef.current = rec;
    // auto-stop after 8s
    setTimeout(() => { if (recRef.current === rec) { stopRec(); setState('idle'); } }, 8000);
  }

  function startCommandDirect() {
    // No Speech Recognition — speak current status
    const text = lang === 'tr'
      ? `ARIA rapor veriyor. Yıl ${stats?.year ?? 0}. Nüfus ${stats?.population ?? 0}. ${stats?.technologies ?? 0} teknoloji keşfedildi.`
      : `ARIA reporting. Year ${stats?.year ?? 0}. Population ${stats?.population ?? 0}. ${stats?.technologies ?? 0} technologies discovered.`;
    speakTTS(text);
  }

  async function processCommand(cmd: string) {
    setState('processing');
    try {
      const { data } = await axios.post('/api/aria/command', {
        message: cmd, lang,
        stats: { year: stats?.year, population: stats?.population, technologies: stats?.technologies, season: stats?.season },
        events: events.slice(0, 5),
      }, { headers: { Authorization: `Bearer ${accessToken}` } });

      if (data.action) executeAction(data.action);
      setLastResponse(data.text ?? '');
      await speakTTS(data.text ?? 'Done.');
    } catch {
      await speakTTS(lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.');
    }
    setState('idle');
    setTranscript('');
  }

  function executeAction(action: any) {
    if (!action?.type) return;
    switch (action.type) {
      case 'navigate_panel':
        setActivePanel(action.panel ?? null);
        break;
      case 'change_speed':
        setSpeed(Number(action.speed) || 1);
        if (currentSim && accessToken)
          axios.post(`/api/simulations/${currentSim.id}/speed`, { speed_multiplier: action.speed },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      case 'toggle_simulation':
        if (currentSim && accessToken) {
          const a = currentSim.status === 'running' ? 'pause' : 'start';
          axios.post(`/api/simulations/${currentSim.id}/${a}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        }
        break;
      case 'apply_disaster':
        if (currentSim && accessToken)
          axios.post(`/api/god/${currentSim.id}/intervene`,
            { type: action.disaster, params: {}, user_note: 'ARIA command' },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
    }
  }

  async function speakTTS(text: string) {
    setState('speaking');
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
      // browser TTS fallback
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
      window.speechSynthesis.speak(utt);
      await new Promise<void>(res => { utt.onend = () => res(); setTimeout(res, 8000); });
    }
  }

  const COLORS: Record<AriaState, string> = {
    idle: '#4a6a7a',
    wake: '#00d4ff',
    command: '#f97316',
    processing: '#a855f7',
    speaking: '#4ecb71',
  };
  const color = COLORS[state];

  const Icon = state === 'idle' ? MicOff
    : state === 'wake' ? Radio
    : state === 'command' ? Mic
    : state === 'processing' ? Loader2
    : Volume2;

  const labelTr: Record<AriaState, string> = {
    idle: 'ARIA — tıkla',
    wake: 'Uyandırma bekleniyor…',
    command: 'Komut dinleniyor…',
    processing: 'İşleniyor…',
    speaking: 'ARIA konuşuyor…',
  };
  const labelEn: Record<AriaState, string> = {
    idle: 'ARIA — click',
    wake: 'Say "Antolia"…',
    command: 'Listening for command…',
    processing: 'Processing…',
    speaking: 'ARIA speaking…',
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={toggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer',
          border: `1px solid ${state === 'idle' ? '#1a3a2a' : color}`,
          color,
          background: state === 'idle' ? 'transparent' : `${color}18`,
          fontFamily: 'Share Tech Mono, monospace',
          boxShadow: state !== 'idle' ? `0 0 8px ${color}55` : 'none',
          transition: 'all 0.2s',
        }}>
        <Icon size={10} className={state === 'processing' ? 'animate-spin' : ''} style={{ filter: state !== 'idle' ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
        <span>ARIA</span>
        {state !== 'idle' && (
          <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: color, animation: 'pulse 1s infinite', boxShadow: `0 0 6px ${color}` }} />
        )}
      </button>

      {/* Tooltip / status */}
      {(showTooltip || state !== 'idle') && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#07071a', border: `1px solid ${color}66`,
          padding: '3px 8px', whiteSpace: 'nowrap', zIndex: 9999,
          fontSize: 9, color, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em',
          boxShadow: `0 0 10px ${color}33`,
        }}>
          {lang === 'tr' ? labelTr[state] : labelEn[state]}
          {transcript && <div style={{ color: '#a0b4ff', fontSize: 8, marginTop: 2 }}>"{transcript}"</div>}
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Mic, MicOff, Volume2, Loader2, Radio } from 'lucide-react';

type AriaState = 'idle' | 'wake' | 'command' | 'processing' | 'speaking';

const WAKE_WORDS = ['antolia', 'anatolia', 'anatolya', 'antolya', 'antoli'];

export default function AriaButton() {
  const { currentSim, accessToken, stats, events, lang, setActivePanel, setSpeed, toggleLang } = useSimStore();
  const navigate = useNavigate();
  const [state, setState] = useState<AriaState>('idle');
  const [transcript, setTranscript] = useState('');
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
    setTimeout(() => { if (recRef.current === rec) { stopRec(); setState('idle'); } }, 10000);
  }

  function startCommandDirect() {
    if (!stats) {
      speakTTS(lang === 'tr' ? 'Aktif simülasyon yok.' : 'No active simulation.');
      return;
    }
    speakTTS(buildSummary());
  }

  function buildSummary(): string {
    if (!stats) return lang === 'tr' ? 'Simülasyon verisi yok.' : 'No simulation data.';
    if (lang === 'tr') {
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

  async function processCommand(cmd: string) {
    setState('processing');
    try {
      const { data } = await axios.post('/api/aria/command', {
        message: cmd,
        lang,
        stats,
        events: events.slice(0, 8),
        context: {
          simStatus: currentSim?.status ?? 'none',
          simId: currentSim?.id ?? null,
          hasActiveSim: !!currentSim,
        },
      }, { headers: { Authorization: `Bearer ${accessToken}` } });

      if (data.action) executeAction(data.action);
      await speakTTS(data.text ?? (lang === 'tr' ? 'Tamam.' : 'Done.'));
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
          axios.post(`/api/simulations/${currentSim.id}/speed`, { speed_multiplier: speed },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;
      }

      case 'toggle_simulation':
        if (currentSim && accessToken) {
          const a = currentSim.status === 'running' ? 'pause' : 'start';
          axios.post(`/api/simulations/${currentSim.id}/${a}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        }
        break;

      case 'start_simulation':
        if (currentSim && accessToken && currentSim.status !== 'running')
          axios.post(`/api/simulations/${currentSim.id}/start`, {}, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;

      case 'pause_simulation':
        if (currentSim && accessToken && currentSim.status === 'running')
          axios.post(`/api/simulations/${currentSim.id}/pause`, {}, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        break;

      case 'apply_disaster':
        if (currentSim && accessToken) {
          const disasterParams = action.params ?? {};
          axios.post(`/api/god/${currentSim.id}/intervene`,
            { type: action.disaster, params: disasterParams, user_note: 'ARIA sesli komut' },
            { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => {});
        }
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
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
      window.speechSynthesis.speak(utt);
      await new Promise<void>(res => { utt.onend = () => res(); setTimeout(res, 10000); });
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
    wake: '"Antolia" deyin…',
    command: 'Komut dinleniyor…',
    processing: 'İşleniyor…',
    speaking: 'ARIA konuşuyor…',
  };
  const labelEn: Record<AriaState, string> = {
    idle: 'ARIA — click',
    wake: 'Say "Antolia"…',
    command: 'Listening…',
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

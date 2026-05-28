import { useState } from 'react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Volume2, VolumeX, Loader2, MicOff } from 'lucide-react';

export default function AriaButton() {
  const { currentSim, accessToken, stats, lang } = useSimStore();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);

  async function speak() {
    if (!currentSim || loading) return;
    setLoading(true);
    setError(false);
    try {
      const text = lang === 'en'
        ? `ARIA reporting. Year ${stats?.year ?? 0}. Population ${stats?.population ?? 0}. ${stats?.technologies ?? 0} technologies discovered. Season: ${stats?.season ?? 'spring'}. Temperature: ${stats?.temperature ?? 20} degrees.`
        : `ARIA rapor veriyor. Yıl ${stats?.year ?? 0}. Nüfus ${stats?.population ?? 0}. ${stats?.technologies ?? 0} teknoloji keşfedildi. Mevsim: ${({ spring: 'ilkbahar', summer: 'yaz', autumn: 'sonbahar', winter: 'kış' } as any)[stats?.season ?? 'spring'] ?? ''}. Sıcaklık ${stats?.temperature ?? 20} derece.`;
      const { data } = await axios.post('/api/aria/speak', { text }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer',
      });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioCtx.decodeAudioData(data as ArrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
      setActive(true);
      source.onended = () => { setActive(false); audioCtx.close(); };
    } catch {
      setActive(false);
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
    setLoading(false);
  }

  const icon = loading ? <Loader2 size={14} className="animate-spin" />
    : error ? <MicOff size={14} />
    : active ? <Volume2 size={14} />
    : <VolumeX size={14} />;

  return (
    <button
      onClick={speak}
      title={error ? (lang === 'tr' ? 'Ses servisi kullanılamıyor' : 'Voice service unavailable') : lang === 'tr' ? 'ARIA Ses Raporu' : 'ARIA Voice Report'}
      className="p-1.5 transition-all duration-150"
      style={{
        color: error ? '#e05a5a' : active ? '#4f6ef7' : '#6878a8',
        background: active ? 'rgba(79,110,247,0.15)' : 'transparent',
        border: active ? '1px solid rgba(79,110,247,0.4)' : '1px solid transparent',
      }}>
      {icon}
    </button>
  );
}

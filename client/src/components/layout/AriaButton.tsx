import { useState } from 'react';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

export default function AriaButton() {
  const { currentSim, accessToken, stats, lang } = useSimStore();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);

  async function speak() {
    if (!currentSim || loading) return;
    setLoading(true);
    try {
      const text = lang === 'en'
        ? `ARIA reporting. Year ${stats?.year ?? 0}. Population ${stats?.population ?? 0}. ${stats?.technologies ?? 0} technologies discovered. Season: ${stats?.season ?? 'spring'}. Temperature: ${stats?.temperature ?? 20} degrees. Happiness index at ${((stats?.happiness_index as any ?? 0.5) * 100).toFixed(0)} percent.`
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
    } catch { setActive(false); }
    setLoading(false);
  }

  return (
    <button
      onClick={speak}
      title={lang === 'en' ? 'ARIA Voice Report' : 'ARIA Ses Raporu'}
      className={`p-1.5 rounded transition-colors ${active ? 'text-sim-accent bg-sim-accent/20 animate-pulse' : 'text-sim-muted hover:text-sim-text hover:bg-sim-border'}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : active ? <Volume2 size={15} /> : <VolumeX size={15} />}
    </button>
  );
}

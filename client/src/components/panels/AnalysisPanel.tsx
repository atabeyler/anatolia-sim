import { useState, useRef, useEffect } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Send, Bot } from 'lucide-react';

const QUICK_QUESTIONS_EN = [
  'Why did the population stop growing?',
  'What triggered the first belief system?',
  'Is my civilization at risk of collapse?',
  'What technology should emerge next?',
];

const QUICK_QUESTIONS_TR = [
  'Nüfus neden büyümeyi durdurdu?',
  'İlk inanç sistemi neden ortaya çıktı?',
  'Medeniyetim çöküş riski altında mı?',
  'Sıradaki hangi teknoloji ortaya çıkmalı?',
];

export default function AnalysisPanel() {
  const { currentSim, accessToken, lang, stats, events } = useSimStore();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || !currentSim) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/analysis/${currentSim.id}`, { message: msg, stats, events: events.slice(0, 20) }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setMessages(m => [...m, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: lang === 'en' ? 'Analysis failed. Is the simulation running?' : 'Analiz başarısız.' }]);
    }
    setLoading(false);
  }

  const quickQ = lang === 'en' ? QUICK_QUESTIONS_EN : QUICK_QUESTIONS_TR;

  return (
    <DetailPanel panelId="analysis" title="AI Analysis" titleTr="AI Analiz">
      <div className="flex flex-col gap-3" style={{ minHeight: '340px' }}>
        <div className="bg-sim-accent/10 border border-sim-accent/20 rounded-lg p-2 flex items-center gap-2">
          <Bot size={13} className="text-sim-accent flex-shrink-0" />
          <span className="text-sm text-sim-muted">
            {lang === 'en' ? 'BOLD analyzes your civilization using live simulation data.' : 'BOLD, canlı simülasyon verilerini kullanarak medeniyetinizi analiz eder.'}
          </span>
        </div>

        {messages.length === 0 && (
          <div>
            <div className="text-sm text-sim-muted mb-2">{lang === 'en' ? 'Quick questions:' : 'Hızlı sorular:'}</div>
            <div className="space-y-1">
              {quickQ.map(q => (
                <button key={q} onClick={() => send(q)} className="w-full text-left text-sm text-sim-muted hover:text-sim-text bg-sim-surface hover:bg-sim-border rounded px-2 py-1 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto max-h-52">
          {messages.map((m, i) => (
            <div key={i} className={`text-sm px-3 py-2 rounded-lg leading-relaxed ${m.role === 'user' ? 'bg-sim-accent/20 text-sim-text ml-6' : 'bg-sim-surface text-sim-muted mr-2'}`}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="text-sm px-3 py-2 rounded-lg bg-sim-surface text-sim-muted mr-2 animate-pulse">
              {lang === 'en' ? 'Analyzing…' : 'Analiz ediliyor…'}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={lang === 'en' ? 'Ask BOLD…' : 'BOLD\'a sor…'}
            className="flex-1 bg-sim-bg border border-sim-border rounded-lg px-3 py-1.5 text-sm text-sim-text focus:border-sim-accent focus:outline-none"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="p-1.5 bg-sim-accent hover:bg-sim-accent/80 rounded-lg text-white transition-colors disabled:opacity-50 flex-shrink-0">
            <Send size={12} />
          </button>
        </div>
      </div>
    </DetailPanel>
  );
}

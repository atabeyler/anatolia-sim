import { useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Zap, Droplets, Wind, Activity, MessageCircle, Dna } from 'lucide-react';

const INTERVENTIONS = [
  { id: 'earthquake', label: 'Earthquake', labelTr: 'Deprem', icon: Zap, color: 'text-orange-400', params: { magnitude: 6, lat: 0, lon: 0, radius: 100 } },
  { id: 'flood',      label: 'Flood',      labelTr: 'Sel',    icon: Droplets, color: 'text-blue-400',   params: { severity: 0.5, lat: 0, lon: 0, radius: 150 } },
  { id: 'drought',    label: 'Drought',    labelTr: 'Kuraklık', icon: Wind, color: 'text-yellow-400',  params: {} },
  { id: 'epidemic',   label: 'Epidemic',   labelTr: 'Salgın', icon: Activity, color: 'text-red-400',   params: { mortality_rate: 0.2, spread_rate: 0.5 } },
];

export default function GodPanel() {
  const { currentSim, accessToken, lang, stats } = useSimStore();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function intervene(type: string, params: any) {
    if (!currentSim) return;
    try {
      const { data } = await axios.post(`/api/god/${currentSim.id}/intervene`, { type, params, user_note: `Manual: ${type}` }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setStatus(`✓ ${data.affected} affected · ${data.deaths} died`);
    } catch { setStatus('✗ Failed (simulation may not be running)'); }
    setTimeout(() => setStatus(''), 4000);
  }

  async function speakToIndividual() {
    if (!currentSim || !message.trim()) return;
    setChatLoading(true);
    try {
      const pop = await axios.get(`/api/simulations/${currentSim.id}/population?alive=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const target = pop.data[0];
      if (!target) { setResponse(lang === 'en' ? 'No living individuals.' : 'Yaşayan birey yok.'); setChatLoading(false); return; }
      const { data } = await axios.post(`/api/god/${currentSim.id}/talk/${target.id}`, { message }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setResponse(data.response);
    } catch { setResponse('...'); }
    setChatLoading(false);
  }

  return (
    <DetailPanel panelId="god" title="God Mode" titleTr="Tanrı Modu">
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3 text-center">
        <div className="text-2xl mb-1">⚡</div>
        <div className="text-orange-300 text-xs font-medium">
          {lang === 'en' ? 'Divine interventions override physics.' : 'Tanrısal müdahaleler fiziği geçersiz kılar.'}
        </div>
      </div>

      {status && (
        <div className="bg-sim-accent/20 border border-sim-accent/40 rounded px-3 py-2 text-xs text-sim-text mb-3">
          {status}
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Natural Disasters' : 'Doğal Afetler'}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {INTERVENTIONS.map(iv => {
            const Icon = iv.icon;
            return (
              <button key={iv.id} onClick={() => intervene(iv.id, iv.params)}
                className="flex flex-col items-center gap-1.5 p-3 bg-sim-surface hover:bg-sim-border rounded-lg transition-colors border border-sim-border hover:border-sim-accent/40">
                <Icon size={18} className={iv.color} />
                <span className={`text-xs font-medium ${iv.color}`}>{lang === 'en' ? iv.label : iv.labelTr}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sim-gold text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <MessageCircle size={12} />
          {lang === 'en' ? 'Speak to an Individual' : 'Bir Bireyyle Konuş'}
        </h4>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={lang === 'en' ? 'They respond in their language stage…' : 'Dil seviyelerinde yanıt verirler…'}
          className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-xs text-sim-text resize-none h-14 focus:border-sim-accent focus:outline-none mb-2"
        />
        <button onClick={speakToIndividual} disabled={chatLoading || !message.trim()}
          className="w-full px-3 py-1.5 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
          {chatLoading ? '…' : (lang === 'en' ? 'Speak' : 'Konuş')}
        </button>
        {response && (
          <div className="mt-2 bg-sim-surface rounded-lg p-2 text-sim-muted text-xs italic border-l-2 border-sim-accent">
            {response}
          </div>
        )}
      </div>

      <div className="text-xs text-sim-muted text-center pt-2 border-t border-sim-border/30">
        {lang === 'en' ? `Year ${stats?.year ?? 0} · Pop ${stats?.population ?? 0}` : `Yıl ${stats?.year ?? 0} · Nüfus ${stats?.population ?? 0}`}
      </div>
    </DetailPanel>
  );
}

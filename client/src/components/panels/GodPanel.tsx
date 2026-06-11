import { useState, useEffect } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Zap, Droplets, Wind, Activity, MessageCircle, Mountain, Star, Heart, Skull, RefreshCw, Shield } from 'lucide-react';

const INTERVENTIONS = [
  { id: 'earthquake', label: 'Earthquake', labelTr: 'Deprem',   icon: Zap,      color: 'text-orange-400', params: { magnitude: 6, lat: 0, lon: 0, radius: 100 } },
  { id: 'flood',      label: 'Flood',      labelTr: 'Sel',      icon: Droplets, color: 'text-blue-400',   params: { severity: 0.5, lat: 0, lon: 0, radius: 150 } },
  { id: 'drought',    label: 'Drought',    labelTr: 'Kuraklık', icon: Wind,     color: 'text-yellow-400', params: {} },
  { id: 'epidemic',   label: 'Epidemic',   labelTr: 'Salgın',   icon: Activity, color: 'text-red-400',    params: { mortality_rate: 0.2, spread_rate: 0.5 } },
  { id: 'volcano',    label: 'Volcano',    labelTr: 'Volkan',   icon: Mountain, color: 'text-red-600',    params: { power: 7, lat: 0, lon: 0, radius: 200 } },
  { id: 'meteor',     label: 'Meteor',     labelTr: 'Meteor',   icon: Star,     color: 'text-yellow-200', params: { size: 3, lat: 0, lon: 0 } },
];

export default function GodPanel() {
  const { currentSim, accessToken, lang, stats } = useSimStore();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [population, setPopulation] = useState<any[]>([]);
  const [selectedIndId, setSelectedIndId] = useState('');
  const [quarantine, setQuarantine] = useState(false);

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    axios.get(`/api/simulations/${currentSim.id}/population?alive=true&limit=50`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => { setPopulation(r.data); if (r.data.length > 0) setSelectedIndId(r.data[0].id); })
      .catch(() => setPopulation([]));
  }, [currentSim?.id, accessToken]);

  async function intervene(type: string, params: any) {
    if (!currentSim) return;
    try {
      const { data } = await axios.post(`/api/god/${currentSim.id}/intervene`, { type, params, user_note: `Manual: ${type}` }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setStatus(`✓ ${data.affected} affected · ${data.deaths} died`);
    } catch { setStatus('✗ Failed (simulation may not be running)'); }
    setTimeout(() => setStatus(''), 4000);
  }

  async function applyLongevity() {
    if (!currentSim || !selectedIndId) return;
    await intervene('longevity', { individual_id: selectedIndId, extra_years: 50 });
  }

  async function applyDeath() {
    if (!currentSim || !selectedIndId) return;
    if (!window.confirm(lang === 'en' ? 'Instantly kill this individual?' : 'Bu bireyi anında öldür?')) return;
    await intervene('instant_death', { individual_id: selectedIndId });
  }

  async function toggleQuarantine() {
    if (!currentSim) return;
    const next = !quarantine;
    try {
      await axios.post(`/api/god/${currentSim.id}/quarantine`, { enabled: next }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setQuarantine(next);
      setStatus(next ? (lang === 'en' ? '✓ Quarantine ON — disasters suppressed' : '✓ Karantina AKTİF — afetler bastırıldı') : (lang === 'en' ? '✓ Quarantine OFF' : '✓ Karantina KAPALI'));
    } catch { setStatus('✗ Failed'); }
    setTimeout(() => setStatus(''), 4000);
  }

  async function refreshPopulation() {
    if (!currentSim || !accessToken) return;
    const r = await axios.get(`/api/simulations/${currentSim.id}/population?alive=true&limit=50`, { headers: { Authorization: `Bearer ${accessToken}` } });
    setPopulation(r.data);
    if (r.data.length > 0 && !r.data.find((i: any) => i.id === selectedIndId)) setSelectedIndId(r.data[0].id);
  }

  async function speakToIndividual() {
    if (!currentSim || !message.trim()) return;
    const targetId = selectedIndId || population[0]?.id;
    if (!targetId) { setResponse(lang === 'en' ? 'No living individuals.' : 'Yaşayan birey yok.'); return; }
    setChatLoading(true);
    try {
      const { data } = await axios.post(`/api/god/${currentSim.id}/talk/${targetId}`, { message }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setResponse(data.response);
    } catch { setResponse('...'); }
    setChatLoading(false);
  }

  const selectedInd = population.find(i => i.id === selectedIndId);

  return (
    <DetailPanel panelId="god" title="God Mode" titleTr="Tanrı Modu">
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3 text-center">
        <div className="text-2xl mb-1">⚡</div>
        <div className="text-orange-300 text-sm font-medium">
          {lang === 'en' ? 'Divine interventions override physics.' : 'Tanrısal müdahaleler fiziği geçersiz kılar.'}
        </div>
      </div>

      {status && (
        <div className="bg-sim-accent/20 border border-sim-accent/40 rounded px-3 py-2 text-sm text-sim-text mb-3">
          {status}
        </div>
      )}

      {/* Natural Disasters */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Natural Disasters' : 'Doğal Afetler'}
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          {INTERVENTIONS.map(iv => {
            const Icon = iv.icon;
            return (
              <button key={iv.id} onClick={() => intervene(iv.id, iv.params)}
                className="flex flex-col items-center gap-1 p-2 bg-sim-surface hover:bg-sim-border rounded-lg transition-colors border border-sim-border hover:border-sim-accent/40">
                <Icon size={14} className={iv.color} />
                <span className={`text-sm font-medium ${iv.color}`} style={{ fontSize: 12 }}>{lang === 'en' ? iv.label : iv.labelTr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Anomalies */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Zap size={10} />
          {lang === 'en' ? 'Individual Anomalies' : 'Bireysel Anomali'}
        </h4>
        <div className="flex items-center gap-1.5 mb-2">
          <select
            value={selectedIndId}
            onChange={e => setSelectedIndId(e.target.value)}
            className="flex-1 bg-sim-bg border border-sim-border rounded px-2 py-1 text-sm text-sim-text focus:border-sim-accent focus:outline-none"
            style={{ fontSize: 12 }}>
            {population.length === 0
              ? <option value="">{lang === 'en' ? 'No population' : 'Nüfus yok'}</option>
              : population.map(ind => (
                <option key={ind.id} value={ind.id}>
                  {ind.name ?? ind.id.slice(0, 8)} · {lang === 'en' ? ind.sex : (ind.sex === 'M' ? 'E' : 'K')} · {Math.floor((ind.age ?? 0) / 365)}y
                </option>
              ))}
          </select>
          <button onClick={refreshPopulation} className="p-1.5 bg-sim-surface border border-sim-border rounded text-sim-muted hover:text-sim-accent transition-colors" title="Refresh">
            <RefreshCw size={10} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={applyLongevity} disabled={!selectedIndId}
            className="flex items-center justify-center gap-1.5 p-2 bg-sim-surface hover:bg-sim-border rounded-lg transition-colors border border-sim-border hover:border-green-500/40 disabled:opacity-40">
            <Heart size={12} className="text-green-400" />
            <span className="text-sm text-green-400" style={{ fontSize: 12 }}>{lang === 'en' ? 'Longevity' : 'Uzun Ömür'}</span>
          </button>
          <button onClick={applyDeath} disabled={!selectedIndId}
            className="flex items-center justify-center gap-1.5 p-2 bg-sim-surface hover:bg-red-900/20 rounded-lg transition-colors border border-sim-border hover:border-red-500/40 disabled:opacity-40">
            <Skull size={12} className="text-red-400" />
            <span className="text-sm text-red-400" style={{ fontSize: 12 }}>{lang === 'en' ? 'Instant Death' : 'Anında Ölüm'}</span>
          </button>
        </div>
        {selectedInd && (
          <div className="mt-1.5 text-sim-muted text-center" style={{ fontSize: 12 }}>
            {lang === 'en' ? 'Selected' : 'Seçili'}: {selectedInd.name ?? selectedInd.id.slice(0,8)} · IQ {((selectedInd.phenotype?.fluid_intelligence ?? 0.5) * 100).toFixed(0)}
          </div>
        )}
      </div>

      {/* Speak to Individual */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <MessageCircle size={12} />
          {lang === 'en' ? 'Speak to Individual' : 'Bireyyle Konuş'}
        </h4>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={lang === 'en' ? 'They respond in their language stage…' : 'Dil seviyelerinde yanıt verirler…'}
          className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm text-sim-text resize-none h-14 focus:border-sim-accent focus:outline-none mb-2"
        />
        <button onClick={speakToIndividual} disabled={chatLoading || !message.trim()}
          className="w-full px-3 py-1.5 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {chatLoading ? '…' : (lang === 'en' ? 'Speak' : 'Konuş')}
        </button>
        {response && (
          <div className="mt-2 bg-sim-surface rounded-lg p-2 text-sim-muted text-sm italic border-l-2 border-sim-accent">
            {response}
          </div>
        )}
      </div>

      {/* Quarantine Mode */}
      <div className="mb-4">
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Shield size={10} />
          {lang === 'en' ? 'Quarantine Mode' : 'Karantina Modu'}
        </h4>
        <button
          onClick={toggleQuarantine}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors border ${
            quarantine
              ? 'bg-green-700/30 border-green-500/50 text-green-300'
              : 'bg-sim-surface border-sim-border text-sim-muted hover:border-sim-accent/40'
          }`}
        >
          <Shield size={12} />
          <span style={{ fontSize: 12 }}>
            {quarantine
              ? (lang === 'en' ? 'Quarantine: ON (disasters suppressed)' : 'Karantina: AKTİF (afetler bastırıldı)')
              : (lang === 'en' ? 'Quarantine: OFF' : 'Karantina: KAPALI')}
          </span>
        </button>
      </div>

      <div className="text-sm text-sim-muted text-center pt-2 border-t border-sim-border/30">
        {lang === 'en' ? `Year ${stats?.year ?? 0} · Pop ${stats?.population ?? 0}` : `Yıl ${stats?.year ?? 0} · Nüfus ${stats?.population ?? 0}`}
      </div>
    </DetailPanel>
  );
}

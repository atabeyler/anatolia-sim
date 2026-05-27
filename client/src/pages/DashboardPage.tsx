import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Play, LogOut } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useSimStore();
  const [sims, setSims] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '39.9334', longitude: '32.8597' });
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { axios.get('/api/simulations', { headers }).then(r => setSims(r.data)); }, []);

  async function createSim() {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/simulations', { name: form.name, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) }, { headers });
      setSims(s => [data, ...s]); setShowNew(false);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-sim-bg text-sim-text overflow-auto">
      <div className="border-b border-sim-border panel-glass sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2"><Globe size={18} className="text-sim-accent" /><span className="font-mono font-semibold tracking-wider">ANTİLİA-SİM</span></div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-sim-muted">{user?.username}</span>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded hover:bg-sim-border transition-colors text-sim-muted hover:text-sim-red"><LogOut size={15} /></button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-semibold">My Simulations</h2><p className="text-sm text-sim-muted mt-0.5">Start a civilization from 2 individuals</p></div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={15} />New Simulation</button>
        </div>
        {showNew && (
          <div className="panel-glass rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold mb-4">New Simulation</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-3"><label className="block text-xs text-sim-muted mb-1.5">Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" /></div>
              <div><label className="block text-xs text-sim-muted mb-1.5">Latitude</label><input type="number" step="0.0001" value={form.latitude} onChange={e => setForm(f => ({...f,latitude:e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" /></div>
              <div><label className="block text-xs text-sim-muted mb-1.5">Longitude</label><input type="number" step="0.0001" value={form.longitude} onChange={e => setForm(f => ({...f,longitude:e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2 text-sm focus:border-sim-accent focus:outline-none" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={createSim} disabled={loading||!form.name} className="px-4 py-2 bg-sim-accent hover:bg-sim-accent/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{loading ? 'Creating…' : 'Create'}</button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-sim-border hover:bg-sim-border/60 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        )}
        {sims.length === 0 ? (
          <div className="panel-glass rounded-xl p-12 text-center"><Globe size={40} className="text-sim-muted mx-auto mb-4" /><p className="text-sim-muted">No simulations yet.</p></div>
        ) : (
          <div className="grid gap-4">
            {sims.map(sim => (
              <div key={sim.id} className="panel-glass rounded-xl p-5 flex items-center gap-4 hover:border-sim-accent/30 transition-all cursor-pointer" onClick={() => navigate(`/simulation/${sim.id}`)}>
                <div className="w-10 h-10 rounded-lg bg-sim-accent/10 flex items-center justify-center"><Globe size={18} className="text-sim-accent" /></div>
                <div className="flex-1"><p className="font-medium">{sim.name}</p><p className="text-xs text-sim-muted mt-0.5 font-mono">{sim.start_latitude?.toFixed(2)}°N {sim.start_longitude?.toFixed(2)}°E · Year {sim.current_year}</p></div>
                <div className={`px-2 py-1 rounded text-xs font-mono ${sim.status==='running'?'bg-sim-green/10 text-sim-green':'bg-sim-border text-sim-muted'}`}>{sim.status}</div>
                <button onClick={e=>{e.stopPropagation();navigate(`/simulation/${sim.id}`);}} className="p-2 rounded-lg bg-sim-accent/10 hover:bg-sim-accent/20 text-sim-accent transition-colors"><Play size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-center text-xs text-sim-muted py-6">Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026</div>
    </div>
  );
}

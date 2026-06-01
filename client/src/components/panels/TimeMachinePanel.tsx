import { useEffect, useState } from 'react';
import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import axios from 'axios';
import { Clock, RefreshCw } from 'lucide-react';

export default function TimeMachinePanel() {
  const { currentSim, accessToken, lang } = useSimStore();
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [done, setDone] = useState('');

  useEffect(() => {
    if (!currentSim || !accessToken) return;
    axios.get(`/api/simulations/${currentSim.id}/checkpoints`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => setCheckpoints(r.data))
      .catch(() => {});
  }, [currentSim?.id]);

  async function restore(cpId: string) {
    if (!currentSim) return;
    setRestoring(cpId);
    try {
      await axios.post(`/api/simulations/${currentSim.id}/restore/${cpId}`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
      setDone(lang === 'en' ? '✓ Restored. Reload to continue.' : '✓ Geri yüklendi. Yenileyin.');
    } catch {
      setDone(lang === 'en' ? '✗ Restore failed.' : '✗ Geri yükleme başarısız.');
    }
    setRestoring(null);
    setTimeout(() => setDone(''), 5000);
  }

  return (
    <DetailPanel panelId="timemachine" title="Time Machine" titleTr="Zaman Makinesi">
      <div className="bg-sim-surface rounded-lg p-3 mb-3 flex items-center gap-3">
        <Clock size={24} className="text-sim-accent" />
        <div>
          <div className="text-sim-accent font-bold text-lg">{checkpoints.length}</div>
          <div className="text-sim-muted text-sm">
            {lang === 'en' ? 'Saved Checkpoints' : 'Kayıtlı Kontrol Noktaları'}
          </div>
        </div>
      </div>

      <p className="text-sim-muted text-sm italic mb-3">
        {lang === 'en'
          ? 'Checkpoints auto-save every 100 days. Restore any past state.'
          : 'Kontrol noktaları her 100 günde otomatik kaydedilir. Herhangi bir geçmiş duruma geri dönün.'}
      </p>

      {done && (
        <div className="bg-sim-accent/20 border border-sim-accent/40 rounded px-3 py-2 text-sm text-sim-text mb-3">
          {done}
        </div>
      )}

      {checkpoints.length === 0 ? (
        <div className="text-center py-8">
          <Clock size={32} className="text-sim-border mx-auto mb-2" />
          <p className="text-sim-muted italic text-sm">
            {lang === 'en' ? 'No checkpoints yet. Run the simulation.' : 'Henüz kontrol noktası yok.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {checkpoints.map(cp => (
            <div key={cp.id} className="bg-sim-surface rounded-lg p-3 flex items-center justify-between border border-sim-border hover:border-sim-accent/40 transition-colors">
              <div>
                <div className="text-sm font-medium text-sim-text">
                  {lang === 'en' ? 'Year' : 'Yıl'} {cp.sim_year} · {lang === 'en' ? 'Day' : 'Gün'} {cp.sim_day}
                </div>
                <div className="text-sm text-sim-muted">
                  {lang === 'en' ? 'Pop:' : 'Nüfus:'} {cp.population_count}
                </div>
              </div>
              <button
                onClick={() => restore(cp.id)}
                disabled={restoring === cp.id}
                className="flex items-center gap-1 px-2 py-1 rounded bg-sim-accent/20 hover:bg-sim-accent/40 text-sim-accent transition-colors text-sm"
              >
                <RefreshCw size={11} className={restoring === cp.id ? 'animate-spin' : ''} />
                {lang === 'en' ? 'Restore' : 'Geri Al'}
              </button>
            </div>
          ))}
        </div>
      )}
    </DetailPanel>
  );
}

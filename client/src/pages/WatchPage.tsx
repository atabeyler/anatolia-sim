import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

const GROUP_PALETTE = [
  '#4f9ef7', '#f97316', '#22c55e', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#facc15',
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}

interface Agent { id: string; x: number; y: number; sex: string; group_id: string | null; }
interface Group { id: string; name: string | null; size: number; }
interface LiveSnapshot {
  simulation_id: string;
  simulation_name: string;
  current_day: number;
  current_year: number;
  population_count: number;
  agents_snapshot: Agent[];
  stats: Record<string, number>;
  groups: Group[];
  is_running: boolean;
  updated_at: string;
}

const REFRESH_INTERVAL = 15;

export default function WatchPage() {
  const { simId } = useParams<{ simId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useSimStore();
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headers = { Authorization: `Bearer ${accessToken}` };

  const fetchSnapshot = useCallback(async () => {
    try {
      const { data } = await axios.get<LiveSnapshot>(`/api/simulations/live/${simId}`, { headers });
      setSnapshot(data);
      setLastUpdate(new Date());
      setNotFound(false);
    } catch (err: any) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [simId]);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!lastUpdate) return;
    setCountdown(REFRESH_INTERVAL);
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL), 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot?.agents_snapshot?.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const agents = snapshot.agents_snapshot;
    const W = canvas.width, H = canvas.height;

    const xs = agents.map(a => a.x);
    const ys = agents.map(a => a.y);
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = Math.max((maxX - minX) * 0.12, 0.3);
    const padY = Math.max((maxY - minY) * 0.12, 0.3);
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toCanvas = (x: number, y: number) => ({
      cx: ((x - minX) / rangeX) * (W - 24) + 12,
      cy: H - (((y - minY) / rangeY) * (H - 24) + 12),
    });

    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(79,110,247,0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const gx = (i / 8) * W, gy = (i / 8) * H;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    for (const agent of agents) {
      const { cx, cy } = toCanvas(agent.x, agent.y);
      const color = agent.group_id
        ? hashColor(agent.group_id)
        : agent.sex === 'female' ? '#f9719a' : '#4f9ef7';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [snapshot]);

  const base: React.CSSProperties = {
    fontFamily: 'Share Tech Mono, monospace',
    color: '#e0e0f0',
    background: '#020208',
    minHeight: '100vh',
  };

  if (loading) return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, letterSpacing: '0.2em', color: '#64748b' }}>YÜKLENİYOR...</span>
    </div>
  );

  if (notFound || !snapshot) return (
    <div style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <div style={{ fontSize: 13, letterSpacing: '0.2em' }}>CANLI YAYIN BULUNAMADI</div>
      <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', maxWidth: 320 }}>
        Masaüstü uygulamasında <strong>Yerel</strong> modda bir simülasyon çalıştırın.
        Her 20 saniyede bir otomatik sync olur.
      </div>
      <button onClick={() => navigate('/')}
        style={{ marginTop: 8, padding: '8px 20px', background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.4)', color: '#a0b4ff', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', fontSize: 12 }}>
        ← GERİ DÖN
      </button>
    </div>
  );

  const stats = snapshot.stats ?? {};
  const groups: Group[] = snapshot.groups ?? [];

  return (
    <div style={base}>
      {/* Header */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid rgba(79,110,247,0.25)',
        background: 'rgba(2,2,8,0.98)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, padding: 0 }}>←</button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#d0d8f8' }}>{snapshot.simulation_name}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              GÜN {snapshot.current_day} · YIL {snapshot.current_year}
              {' · '}
              {snapshot.is_running
                ? <span style={{ color: '#22c55e' }}>● CANLI</span>
                : <span style={{ color: '#f59e0b' }}>⏸ DURAKLATILDI</span>}
            </div>
          </div>
        </div>
        {lastUpdate && (
          <div style={{ fontSize: 10, color: '#4a5568', textAlign: 'right' }}>
            {lastUpdate.toLocaleTimeString('tr-TR')} güncellendi
            <br />
            <span style={{ color: countdown <= 5 ? '#22c55e' : '#4a5568' }}>
              {countdown}s sonra yenilenecek
            </span>
            <button onClick={fetchSnapshot}
              style={{ marginLeft: 10, padding: '2px 8px', background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.3)', color: '#a0b4ff', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace', fontSize: 10 }}>
              ↻ ŞİMDİ
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 20px', borderBottom: '1px solid rgba(79,110,247,0.1)' }}>
        {([
          { label: 'NÜFUS', value: snapshot.population_count, color: '#4f9ef7' },
          { label: 'TOPLAM DOĞAN', value: stats.total_births ?? '—', color: '#22c55e' },
          { label: 'TOPLAM ÖLEN', value: stats.total_deaths ?? '—', color: '#f97316' },
          { label: 'GRUP SAYISI', value: groups.length, color: '#a855f7' },
        ] as { label: string; value: number | string; color: string }[]).map(s => (
          <div key={s.label} style={{
            background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.15)',
            padding: '8px 14px', minWidth: 90,
          }}>
            <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.15em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Map + groups */}
      <div style={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.15em', marginBottom: 6 }}>
            NÜFUS HARİTASI · {snapshot.agents_snapshot?.length ?? 0} BİREY
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={500}
            style={{
              flex: 1, width: '100%', minHeight: 0,
              border: '1px solid rgba(79,110,247,0.15)',
              background: '#020208', display: 'block',
            }}
          />
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10, color: '#64748b' }}>
            <span><span style={{ color: '#4f9ef7' }}>● </span>Erkek (grupsuz)</span>
            <span><span style={{ color: '#f9719a' }}>● </span>Kadın (grupsuz)</span>
            <span><span style={{ color: '#aaa' }}>● </span>Grup rengi ile gösterilir</span>
          </div>
        </div>

        {/* Groups panel */}
        {groups.length > 0 && (
          <div style={{
            width: 180, borderLeft: '1px solid rgba(79,110,247,0.1)',
            padding: '12px 14px', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.15em', marginBottom: 10 }}>GRUPLAR</div>
            {groups.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: hashColor(g.id), flexShrink: 0, marginTop: 2,
                }} />
                <div>
                  <div style={{ fontSize: 11, color: '#d0d8f8', wordBreak: 'break-all' }}>
                    {g.name || g.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{g.size} birey</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
